import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ToolProvider } from '../types/tool-provider.js';
import { OrderController } from '../controllers/order.controller.js';
import { ProductsController } from '../controllers/products.controller.js';
import { CalendarController } from '../controllers/calendar.controller.js';
import { ContactsController } from '../controllers/contacts.controller.js';
import {
  CheckRoomAvailabilitySchema,
  CreateRoomReservationSchema,
} from '../types/schemas/order.js';
import { logger } from '../utils/logger.js';

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T00:00:00Z`);
  const b = new Date(`${checkOut}T00:00:00Z`);
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
}

function overlapsStay(
  startIso: string,
  endIso: string,
  checkIn: string,
  checkOut: string
): boolean {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const inMs = new Date(`${checkIn}T00:00:00Z`).getTime();
  const outMs = new Date(`${checkOut}T00:00:00Z`).getTime();
  return start < outMs && end > inMs;
}

function unwrapList(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.result)) return res.data.result;
  if (Array.isArray(res?.result)) return res.result;
  return [];
}

function unwrapEntity(res: any): any {
  if (!res) return null;
  if (res?.data?.result) return res.data.result;
  if (res?.result) return res.result;
  if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
    return res.data;
  }
  return res;
}

/** Normalize for name matching: lower case, strip accents, collapse spaces. */
function normalizeRoomKey(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Rank matching RESERVATION units. Prefer exact id/name, then same type without
 * false "1"→"10" matches. Used to try every unit until one is free + linked.
 */
function rankProducts(products: any[], roomRef: string | number): any[] {
  if (!products.length) return [];
  const key =
    typeof roomRef === 'number' || !Number.isNaN(Number(roomRef))
      ? ''
      : normalizeRoomKey(String(roomRef));
  const idNum =
    typeof roomRef === 'number' || !Number.isNaN(Number(roomRef))
      ? Number(roomRef)
      : NaN;

  const score = (p: any): number => {
    const nameKey = normalizeRoomKey(p.name || '');
    if (!Number.isNaN(idNum) && Number(p.id) === idNum) return 0;
    if (key && nameKey === key) return 1;
    if (key && p.slug && normalizeRoomKey(p.slug) === key) return 2;
    if (key) {
      const m = key.match(/^(.*?)(\d+)$/);
      if (m) {
        const re = new RegExp(
          `^${m[1].trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*${m[2]}(?!\\d)`
        );
        if (re.test(nameKey)) return 3;
        return 90;
      }
      if (nameKey.includes(key) || key.includes(nameKey)) return 4;
    }
    return 50;
  };

  return [...products].sort((a, b) => {
    const d = score(a) - score(b);
    if (d !== 0) return d;
    return normalizeRoomKey(a.name).localeCompare(normalizeRoomKey(b.name));
  });
}

/** Stay block in COT (UTC-5): check-in 15:00 → check-out 11:00 local. */
function stayAppointmentBounds(checkIn: string, checkOut: string) {
  return {
    startTime: `${checkIn}T15:00:00.000-05:00`,
    endTime: `${checkOut}T11:00:00.000-05:00`,
  };
}

export class HotelTools implements ToolProvider {
  constructor(
    private orderController: OrderController,
    private productsController: ProductsController,
    private calendarController: CalendarController,
    private contactsController: ContactsController,
    private businessId: number,
    private defaultAgentId: string = ''
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'check_room_availability',
        description:
          'For products of type RESERVATION only (room, cabin, rental, space, court, etc.): check if ANY matching unit is free between check_in and check_out (YYYY-MM-DD). ' +
          'Pass product id, exact unit name, or type name (e.g. "Habitación Doble") — the tool picks a free linked calendar unit. ' +
          'Do not use for DIGITAL/PHYSICAL/SERVICE. Never hand off to a human just to check availability.',
        inputSchema: zodToJsonSchema(CheckRoomAvailabilitySchema) as any,
      },
      {
        name: 'create_room_reservation',
        description:
          'For RESERVATION products only: create contact + purchase order + calendar appointment on a free linked unit. ' +
          'num_guests = people; order quantity = nights automatically. ' +
          'Pass id, exact unit, or type name; tool assigns a free unit with productItemId calendar link. ' +
          'Call check_room_availability first. Never escalate to a human to "sync the calendar" — retry or report the tool error. ' +
          'For non-RESERVATION products use create_purchase_order.',
        inputSchema: zodToJsonSchema(CreateRoomReservationSchema) as any,
      },
    ];
  }

  private resolveAgentId(fromTool: unknown): string {
    const headerId = (this.defaultAgentId || '').trim();
    const argId =
      typeof fromTool === 'string' ? fromTool.trim() : String(fromTool ?? '').trim();
    if (headerId) {
      if (argId && argId !== headerId) {
        logger.warn(
          `[HotelTools] Ignoring LLM agent_id=${argId}; using x-agent-id=${headerId}`
        );
      }
      return headerId;
    }
    return argId;
  }

  async executeTool(
    toolName: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    switch (toolName) {
      case 'check_room_availability':
        return this.checkAvailability(params);
      case 'create_room_reservation':
        return this.createReservation(params);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private calendarsForProduct(calendars: any[], product: any): any[] {
    const productId = Number(product?.id || 0);
    const productKey = normalizeRoomKey(product?.name || '');

    const byProductId = calendars.filter((cal: any) => {
      const pid = cal.productItemId ?? cal.product_item_id;
      return productId > 0 && pid != null && Number(pid) === productId;
    });
    if (byProductId.length > 0) return byProductId;

    const byExactName = calendars.filter((cal: any) => {
      const calKey = normalizeRoomKey(cal.name || '');
      return productKey && calKey === productKey;
    });
    if (byExactName.length > 0) return byExactName;

    return calendars.filter((cal: any) => {
      const calKey = normalizeRoomKey(cal.name || '');
      if (!productKey || !calKey.includes(productKey)) return false;
      const m = productKey.match(/^(.*?)(\d+)$/);
      if (!m) return true;
      const prefix = m[1].trim();
      const num = m[2];
      const re = new RegExp(
        `${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*${num}(?!\\d)`
      );
      return re.test(calKey);
    });
  }

  private countStayConflicts(
    appointments: any[],
    calendarIds: Set<number>,
    checkIn: string,
    checkOut: string
  ): number {
    let n = 0;
    for (const app of appointments) {
      if (String(app.status || '').toLowerCase() === 'cancelled') continue;
      const calId = Number(app.businessCalendarId ?? app.calendarId ?? 0);
      if (calendarIds.size && calId && !calendarIds.has(calId)) continue;
      if (
        overlapsStay(
          app.startTime || app.start,
          app.endTime || app.end,
          checkIn,
          checkOut
        )
      ) {
        n += 1;
      }
    }
    return n;
  }

  /**
   * Find a free RESERVATION unit that has a linked calendar.
   * Primary source of truth = calendars with productItemId (dashboard link),
   * not the storefront availableInStore flag.
   */
  private async resolveBookableUnit(
    roomRef: string | number,
    checkIn: string,
    checkOut: string
  ) {
    const calendarsRes = await this.calendarController.handleGetCalendars(
      this.businessId
    );
    const calendars = unwrapList(calendarsRes);
    const appsRes = await this.calendarController.handleGetAppointments(
      this.businessId
    );
    const appointments = unwrapList(appsRes);

    logger.info(
      `[HotelTools] resolveBookableUnit room="${roomRef}" calendars=${calendars.length} appointments=${appointments.length}`
    );

    const key =
      typeof roomRef === 'string' && Number.isNaN(Number(roomRef))
        ? normalizeRoomKey(roomRef)
        : '';
    const idNum =
      typeof roomRef === 'number' || !Number.isNaN(Number(roomRef))
        ? Number(roomRef)
        : NaN;

    // Calendars that look like this room/type (by productItemId or name).
    const candidateCals = calendars
      .filter((cal: any) => {
        if (cal.enabled === false) return false;
        const pid = Number(cal.productItemId ?? cal.product_item_id ?? 0);
        const calKey = normalizeRoomKey(cal.name || '');
        if (!Number.isNaN(idNum) && pid === idNum) return true;
        if (!key) return pid > 0;
        if (calKey === key) return true;
        // "familiar" matches "habitacion familiar 1"…"6"; avoid "1"→"10"
        const m = key.match(/^(.*?)(\d+)$/);
        if (m) {
          const re = new RegExp(
            `${m[1].trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*${m[2]}(?!\\d)`
          );
          return re.test(calKey);
        }
        return calKey.includes(key) || key.includes(calKey);
      })
      .sort((a: any, b: any) =>
        normalizeRoomKey(a.name).localeCompare(normalizeRoomKey(b.name))
      );

    logger.info(
      `[HotelTools] candidate calendars for "${roomRef}": ${candidateCals.length} → ${candidateCals
        .map((c: any) => `${c.id}:${c.name}:pid=${c.productItemId ?? c.product_item_id}`)
        .join(', ')}`
    );

    // Also try product catalog (enabled RESERVATION; store flag ignored).
    const productResult = await this.productsController.handleCheckAvailability(
      this.businessId,
      roomRef
    );
    let products = Array.isArray((productResult as any)?.products)
      ? (productResult as any).products
      : [];

    if (
      products.length < 2 &&
      typeof roomRef === 'string' &&
      Number.isNaN(Number(roomRef))
    ) {
      try {
        const allRes = await this.productsController.handleGetProducts(
          this.businessId,
          { productType: 'RESERVATION', limit: 200 }
        );
        const all = Array.isArray((allRes as any)?.data)
          ? (allRes as any).data
          : unwrapList(allRes);
        const extra = all.filter((p: any) => {
          const n = normalizeRoomKey(p.name || '');
          return !key || n.includes(key) || key.includes(n);
        });
        const byId = new Map<number, any>();
        for (const p of [...products, ...extra]) {
          byId.set(Number(p.id), p);
        }
        products = [...byId.values()];
      } catch (err) {
        logger.warn('[HotelTools] broaden RESERVATION search failed', err);
      }
    }

    logger.info(
      `[HotelTools] products matched=${products.length} for "${roomRef}"`
    );

    const productById = new Map<number, any>(
      products.map((p: any) => [Number(p.id), p])
    );

    const linkedBusy: Array<{ product: any; calendar: any; conflicts: number }> =
      [];

    // Prefer free calendars that match the request.
    for (const calendar of candidateCals) {
      const pid = Number(calendar.productItemId ?? calendar.product_item_id ?? 0);
      let product =
        (pid > 0 ? productById.get(pid) : null) ||
        products.find(
          (p: any) =>
            normalizeRoomKey(p.name) === normalizeRoomKey(calendar.name || '')
        );

      // Synthesize minimal product from calendar link if catalog search missed it.
      if (!product && pid > 0) {
        product = {
          id: pid,
          name: calendar.name,
          productType: 'RESERVATION',
          priceCents: 0,
          currency: 'COP',
          available: true,
        };
      }
      if (!product) continue;

      const conflicts = this.countStayConflicts(
        appointments,
        new Set([Number(calendar.id)]),
        checkIn,
        checkOut
      );
      if (conflicts === 0) {
        logger.info(
          `[HotelTools] free unit id=${product.id} "${product.name}" calendar=${calendar.id}`
        );
        return {
          available: true as const,
          product,
          calendar,
          linkedCalendars: 1,
          productsTried: Math.max(products.length, candidateCals.length),
          conflictingAppointments: 0,
        };
      }
      linkedBusy.push({ product, calendar, conflicts });
    }

    // Fallback: product → calendar (old path) if name match on calendars failed.
    const ranked = rankProducts(products, roomRef);
    for (const product of ranked) {
      const linked = this.calendarsForProduct(calendars, product);
      if (linked.length === 0) continue;
      if (candidateCals.some((c: any) => Number(c.id) === Number(linked[0].id))) {
        continue; // already evaluated
      }
      const conflicts = this.countStayConflicts(
        appointments,
        new Set(linked.map((c: any) => Number(c.id)).filter(Boolean)),
        checkIn,
        checkOut
      );
      if (conflicts === 0) {
        return {
          available: true as const,
          product,
          calendar: linked[0],
          linkedCalendars: linked.length,
          productsTried: ranked.length,
          conflictingAppointments: 0,
        };
      }
      linkedBusy.push({ product, calendar: linked[0], conflicts });
    }

    if (linkedBusy.length > 0) {
      const best = linkedBusy[0];
      return {
        available: false as const,
        product: best.product,
        linkedCalendars: linkedBusy.length,
        productsTried: Math.max(products.length, candidateCals.length),
        conflictingAppointments: best.conflicts,
        error: `No free unit for "${roomRef}" between ${checkIn} and ${checkOut} (${linkedBusy.length} linked unit(s) busy).`,
      };
    }

    return {
      available: false as const,
      productsTried: products.length,
      linkedCalendars: candidateCals.length,
      error:
        candidateCals.length === 0 && products.length === 0
          ? `No se encontró producto/calendario para "${roomRef}". Verifica nombres y vínculo producto↔calendario.`
          : `No calendar linked to RESERVATION products matching "${roomRef}". In Calendarios, set "Producto / servicio vinculado" on each unit.`,
    };
  }

  private async checkAvailability(params: Record<string, unknown>) {
    const valid = CheckRoomAvailabilitySchema.parse(params);
    const nights = nightsBetween(valid.check_in, valid.check_out);
    if (nights <= 0) {
      return {
        success: false,
        available: false,
        error: { message: 'check_out must be after check_in' },
      };
    }

    const resolved = await this.resolveBookableUnit(
      valid.room,
      valid.check_in,
      valid.check_out
    );

    if (!resolved.available || !('product' in resolved) || !resolved.product) {
      const notFound = (resolved.productsTried ?? 0) === 0;
      return {
        success: !notFound,
        available: false,
        room:
          'product' in resolved && resolved.product
            ? {
                id: resolved.product.id,
                name: resolved.product.name,
                productType: resolved.product.productType,
              }
            : undefined,
        check_in: valid.check_in,
        check_out: valid.check_out,
        nights,
        linkedCalendars: resolved.linkedCalendars ?? 0,
        productsTried: resolved.productsTried ?? 0,
        conflictingAppointments: resolved.conflictingAppointments ?? 0,
        message: resolved.error || 'Not available',
        error: notFound ? { message: resolved.error || 'Not found' } : undefined,
      };
    }

    const product = resolved.product;
    const priceCents = Number(product.priceCents ?? product.price_cents ?? 0);
    const totalCents = priceCents * nights;

    return {
      success: true,
      available: true,
      room: {
        id: product.id,
        name: product.name,
        productType: product.productType,
        priceCents,
        currency: product.currency || 'USD',
        priceUnit: product.priceUnit || 'día',
      },
      calendarId: resolved.calendar?.id,
      check_in: valid.check_in,
      check_out: valid.check_out,
      nights,
      totalCents,
      linkedCalendars: resolved.linkedCalendars,
      productsTried: resolved.productsTried,
      conflictingAppointments: 0,
      message: `Disponible ${nights} noche(s) en ${product.name}. Total estimado: ${totalCents / 100} ${product.currency || 'USD'}.`,
    };
  }

  private async createReservation(params: Record<string, unknown>) {
    const valid = CreateRoomReservationSchema.parse(params);
    const nights = nightsBetween(valid.check_in, valid.check_out);
    if (nights <= 0) {
      return {
        success: false,
        error: { message: 'check_out must be after check_in' },
      };
    }

    const resolved = await this.resolveBookableUnit(
      valid.room,
      valid.check_in,
      valid.check_out
    );
    if (!resolved.available || !resolved.product || !resolved.calendar) {
      return {
        success: false,
        error: {
          message: resolved.error || 'Not available for those dates',
        },
        availability: resolved,
      };
    }

    const roomMeta = resolved.product;
    const calendar = resolved.calendar;
    const customerName =
      (valid.customer_name || '').trim() || 'Cliente reserva';
    const customerEmail =
      (valid.customer_email || '').trim() ||
      `reserva+${Date.now()}@adeptos.test`;

    let contact: any = null;
    try {
      const contactRes = await this.contactsController.handleCreateContact(
        this.businessId,
        {
          name: customerName,
          phone: valid.customer_phone,
          email: customerEmail,
          type: 'customer',
          enabled: true,
          notes: `Reserva ${roomMeta?.name || valid.room}: ${valid.check_in} → ${valid.check_out}`,
        }
      );
      contact = unwrapEntity(contactRes);
    } catch (err) {
      logger.warn('[HotelTools] create contact failed', err);
      return {
        success: false,
        error: {
          message:
            err instanceof Error
              ? err.message
              : 'Failed to create contact for reservation',
        },
      };
    }

    const agentId = this.resolveAgentId(valid.agent_id);
    const noteParts = [
      valid.note,
      `Inicio: ${valid.check_in}`,
      `Fin: ${valid.check_out}`,
      `Noches: ${nights}`,
      valid.num_guests ? `Personas: ${valid.num_guests}` : '',
      `Unidad: ${roomMeta.name}`,
      `Calendario: ${calendar.name || calendar.id}`,
    ].filter(Boolean);

    const orderRes = await this.orderController.handleCreatePurchaseOrder({
      agent_id: agentId,
      business_id: this.businessId,
      customer_phone: valid.customer_phone,
      customer_name: customerName,
      product: String(roomMeta.id),
      variant: valid.variant || '',
      quantity: nights,
      note: noteParts.join(' | '),
      session_id: valid.session_id || '',
      check_in: valid.check_in,
      check_out: valid.check_out,
      num_guests: valid.num_guests,
    });

    if (!(orderRes as any)?.success) {
      return {
        success: false,
        error: (orderRes as any)?.error || {
          message: 'Failed to create purchase order',
        },
        contact,
        order: orderRes,
      };
    }

    let appointment: any = null;
    let appointmentError: string | null = null;
    const bounds = stayAppointmentBounds(valid.check_in, valid.check_out);
    try {
      const contactId = Number(contact?.id || contact?.ID || 0) || undefined;
      logger.info(
        `[HotelTools] booking calendar id=${calendar.id} "${calendar.name}" ${bounds.startTime} → ${bounds.endTime}`
      );
      const appRes = await this.calendarController.handleCreateAppointment({
        businessCalendarId: Number(calendar.id),
        contactId,
        contactName: customerName,
        contactEmail: customerEmail,
        contactPhone: valid.customer_phone,
        startTime: bounds.startTime,
        endTime: bounds.endTime,
        status: 'confirmed',
        title: `Reserva ${roomMeta.name}`,
        description: `Orden #${(orderRes as any)?.order?.id || ''} | ${nights} noche(s)${valid.num_guests ? ` | ${valid.num_guests} persona(s)` : ''}`,
        notes: valid.note || '',
      });
      appointment = unwrapEntity(appRes);
      if (!appointment?.id && !appointment?.ID) {
        appointmentError =
          'Calendar API returned no appointment id — check MCP calendar permissions';
        logger.warn(
          '[HotelTools] create appointment unexpected response',
          appRes
        );
      }
    } catch (err) {
      appointmentError =
        err instanceof Error ? err.message : 'Failed to create calendar booking';
      logger.warn('[HotelTools] create appointment failed', err);
    }

    const order = (orderRes as any).order;
    const orderId = order?.id;
    const calendarBooked = !appointmentError;

    return {
      success: calendarBooked,
      calendarBooked,
      partial: !calendarBooked,
      message: calendarBooked
        ? `Reserva creada: contacto + orden #${orderId ?? ''} + cita en calendario "${calendar.name}" (${nights} noche(s)` +
          (valid.num_guests ? `, ${valid.num_guests} persona(s)` : '') +
          ').'
        : `Orden #${orderId ?? '?'} creada, pero el calendario NO se bloqueó: ${appointmentError}. ` +
          `NO digas que un humano debe sincronizar el calendario. Reporta el error o reintenta create_room_reservation.`,
      nights,
      num_guests: valid.num_guests ?? null,
      check_in: valid.check_in,
      check_out: valid.check_out,
      room: {
        id: roomMeta.id,
        name: roomMeta.name,
        productType: roomMeta.productType,
      },
      calendar: { id: calendar.id, name: calendar.name },
      contact,
      order,
      appointment,
      warning: appointmentError ? { message: appointmentError } : undefined,
      error: appointmentError ? { message: appointmentError } : undefined,
    };
  }
}
