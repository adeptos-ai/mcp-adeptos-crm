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
 * Search "HABITACIÓN DOBLE 1" can also return "… DOBLE 10/11".
 * Prefer exact name / slug, then name that equals ignoring accents, then id.
 */
function pickBestProduct(products: any[], roomRef: string | number): any {
  if (!products.length) return null;
  if (typeof roomRef === 'number' || !Number.isNaN(Number(roomRef))) {
    const idNum = Number(roomRef);
    const byId = products.find((p) => Number(p.id) === idNum);
    if (byId) return byId;
  }
  const key = normalizeRoomKey(String(roomRef));
  const exact = products.find((p) => normalizeRoomKey(p.name) === key);
  if (exact) return exact;
  const bySlug = products.find(
    (p) => p.slug && normalizeRoomKey(p.slug) === key
  );
  if (bySlug) return bySlug;
  // Avoid "doble 1" matching "doble 10": require full token boundary on trailing number
  const bounded = products.find((p) => {
    const n = normalizeRoomKey(p.name);
    if (n === key) return true;
    // if key ends with a number, name must not have extra digits after it
    const m = key.match(/^(.*?)(\d+)$/);
    if (!m) return n.includes(key);
    const prefix = m[1].trim();
    const num = m[2];
    const re = new RegExp(
      `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*${num}(?!\\d)`
    );
    return re.test(n);
  });
  return bounded || products[0];
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
          'For products of type RESERVATION only (hotel room, cabin, rental space, court, etc.): check availability between check_in and check_out (YYYY-MM-DD). ' +
          'Pass the exact product id or exact name from get_products (avoid short names like "doble 1" that also match "doble 10"). ' +
          'Do not use for DIGITAL/PHYSICAL/SERVICE products — use create_purchase_order instead. ' +
          'Never hand off to a human just to check availability; call this tool.',
        inputSchema: zodToJsonSchema(CheckRoomAvailabilitySchema) as any,
      },
      {
        name: 'create_room_reservation',
        description:
          'For RESERVATION products only: create contact + purchase order + calendar appointment for a date range. ' +
          'num_guests = number of people (optional). Purchase-order quantity is set automatically to nights (check_out - check_in), NOT guests. ' +
          'Pass exact product id/name from get_products. Call check_room_availability first. ' +
          'If the order is created but calendar linking fails, tell the customer the request was registered (order id) — do NOT invent a confirmed calendar booking and do NOT escalate to a human for that technical detail unless tools are unavailable. ' +
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

  private async findLinkedCalendars(product: any) {
    const calendarsRes = await this.calendarController.handleGetCalendars(
      this.businessId
    );
    const calendars = unwrapList(calendarsRes);
    const productId = Number(product?.id || 0);
    const productKey = normalizeRoomKey(product?.name || '');

    const byProductId = calendars.filter((cal: any) => {
      const pid = cal.productItemId ?? cal.product_item_id;
      return productId > 0 && pid != null && Number(pid) === productId;
    });
    if (byProductId.length > 0) return byProductId;

    // Fallback: exact calendar name === product name (accents-insensitive)
    const byExactName = calendars.filter((cal: any) => {
      const calKey = normalizeRoomKey(cal.name || '');
      return productKey && calKey === productKey;
    });
    if (byExactName.length > 0) return byExactName;

    // Last resort: calendar name contains full product name (still exact key, not prefix of another unit)
    return calendars.filter((cal: any) => {
      const calKey = normalizeRoomKey(cal.name || '');
      if (!productKey || !calKey.includes(productKey)) return false;
      // reject if product is "... 1" and calendar is "... 10"
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

    const productResult = await this.productsController.handleCheckAvailability(
      this.businessId,
      valid.room
    );
    const products = Array.isArray((productResult as any)?.products)
      ? (productResult as any).products
      : [];
    if (!productResult?.success || products.length === 0) {
      return {
        success: false,
        available: false,
        error: {
          message:
            (productResult as any)?.message ||
            `Room/product not found: ${valid.room}`,
        },
      };
    }

    const product = pickBestProduct(products, valid.room);
    if (!product) {
      return {
        success: false,
        available: false,
        error: { message: `Room/product not found: ${valid.room}` },
      };
    }
    logger.info(
      `[HotelTools] resolved room "${valid.room}" → id=${product.id} name=${product.name} (candidates=${products.length})`
    );
    if (
      product.productType &&
      String(product.productType).toUpperCase() !== 'RESERVATION'
    ) {
      logger.warn(
        `[HotelTools] Product ${product.name} type=${product.productType} (expected RESERVATION)`
      );
    }

    let calendarConflict = false;
    let conflictingAppointments = 0;
    let linkedCount = 0;
    try {
      const linked = await this.findLinkedCalendars(product);
      linkedCount = linked.length;
      if (linked.length > 0) {
        const appsRes = await this.calendarController.handleGetAppointments(
          this.businessId
        );
        const appointments = unwrapList(appsRes);
        const linkedIds = new Set(
          linked.map((c: any) => Number(c.id)).filter(Boolean)
        );
        for (const app of appointments) {
          if (String(app.status || '').toLowerCase() === 'cancelled') continue;
          const calId = Number(app.businessCalendarId ?? app.calendarId ?? 0);
          if (linkedIds.size && calId && !linkedIds.has(calId)) continue;
          if (
            overlapsStay(
              app.startTime || app.start,
              app.endTime || app.end,
              valid.check_in,
              valid.check_out
            )
          ) {
            calendarConflict = true;
            conflictingAppointments += 1;
          }
        }
      }
    } catch (err) {
      logger.warn('[HotelTools] calendar check failed', err);
    }

    const available = !calendarConflict && product.available !== false;
    const priceCents = Number(product.priceCents ?? product.price_cents ?? 0);
    const totalCents = priceCents * nights;

    return {
      success: true,
      available,
      room: {
        id: product.id,
        name: product.name,
        productType: product.productType,
        priceCents,
        currency: product.currency || 'USD',
        priceUnit: product.priceUnit || 'día',
      },
      check_in: valid.check_in,
      check_out: valid.check_out,
      nights,
      totalCents,
      linkedCalendars: linkedCount,
      conflictingAppointments,
      message: available
        ? `Disponible ${nights} día(s). Total estimado: ${totalCents / 100} ${product.currency || 'USD'}.`
        : `No disponible entre ${valid.check_in} y ${valid.check_out} (${conflictingAppointments} conflicto(s)).`,
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

    const availability = await this.checkAvailability({
      room: valid.room,
      check_in: valid.check_in,
      check_out: valid.check_out,
    });
    if (!(availability as any).available) {
      return {
        success: false,
        error: {
          message:
            (availability as any).message ||
            'Not available for those dates',
        },
        availability,
      };
    }

    const roomMeta = (availability as any).room;
    const customerName =
      (valid.customer_name || '').trim() || 'Cliente reserva';
    const customerEmail =
      (valid.customer_email || '').trim() ||
      `reserva+${Date.now()}@adeptos.test`;

    // 1) Contact
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

    // 2) Purchase order
    const agentId = this.resolveAgentId(valid.agent_id);
    const noteParts = [
      valid.note,
      `Inicio: ${valid.check_in}`,
      `Fin: ${valid.check_out}`,
      `Noches: ${nights}`,
      valid.num_guests ? `Personas: ${valid.num_guests}` : '',
    ].filter(Boolean);

    // Prefer resolved product id so API search cannot pick "DOBLE 10" for "DOBLE 1"
    const productRef =
      roomMeta?.id != null ? String(roomMeta.id) : String(valid.room);

    const orderRes = await this.orderController.handleCreatePurchaseOrder({
      agent_id: agentId,
      business_id: this.businessId,
      customer_phone: valid.customer_phone,
      customer_name: customerName,
      product: productRef,
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

    // 3) Calendar appointment on linked room calendar
    let appointment: any = null;
    let appointmentError: string | null = null;
    try {
      const linked = await this.findLinkedCalendars({
        id: roomMeta?.id,
        name: roomMeta?.name || valid.room,
      });
      if (linked.length === 0) {
        appointmentError =
          'No calendar linked to this product (set productItemId on a business calendar)';
      } else {
        const calendar = linked[0];
        const contactId = Number(contact?.id || contact?.ID || 0) || undefined;
        const appRes = await this.calendarController.handleCreateAppointment({
          businessCalendarId: Number(calendar.id),
          contactId,
          contactName: customerName,
          contactEmail: customerEmail,
          contactPhone: valid.customer_phone,
          startTime: `${valid.check_in}T15:00:00.000Z`,
          endTime: `${valid.check_out}T11:00:00.000Z`,
          status: 'confirmed',
          title: `Reserva ${roomMeta?.name || valid.room}`,
          description: `Orden #${(orderRes as any)?.order?.id || ''} | ${nights} día(s)${valid.num_guests ? ` | ${valid.num_guests} persona(s)` : ''}`,
          notes: valid.note || '',
        });
        appointment = unwrapEntity(appRes);
      }
    } catch (err) {
      appointmentError =
        err instanceof Error ? err.message : 'Failed to create calendar booking';
      logger.warn('[HotelTools] create appointment failed', err);
    }

    const order = (orderRes as any).order;
    const orderId = order?.id;
    // Order + contact are the business-critical write. Calendar is best-effort.
    // Mark success=true when the order exists so the agent does not invent a human handoff.
    return {
      success: true,
      calendarBooked: !appointmentError,
      partial: Boolean(appointmentError),
      message: appointmentError
        ? `Solicitud registrada (orden #${orderId ?? '?'}): contacto + orden OK. Calendario no bloqueado (${appointmentError}). ` +
          `Informa al cliente que la solicitud quedó registrada con ${nights} noche(s)` +
          (valid.num_guests ? ` y ${valid.num_guests} persona(s)` : '') +
          `. No digas que un asesor humano debe finalizar la reserva por un detalle técnico; reintenta con el id exacto del producto si hace falta.`
        : `Reserva creada: contacto + orden #${orderId ?? ''} + cita en calendario (${nights} noche(s)` +
          (valid.num_guests ? `, ${valid.num_guests} persona(s)` : '') +
          ').',
      nights,
      num_guests: valid.num_guests ?? null,
      check_in: valid.check_in,
      check_out: valid.check_out,
      room: roomMeta,
      contact,
      order,
      appointment,
      warning: appointmentError ? { message: appointmentError } : undefined,
    };
  }
}
