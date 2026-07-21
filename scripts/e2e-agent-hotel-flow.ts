/**
 * Full agent-style simulation for hotel reservation on business 1.
 * Calls MCP CRM tools in the same order an agent would:
 *   get_products → get_calendars → check_room_availability →
 *   create_contact → get_pipelines → create_opportunity →
 *   create_room_reservation → move_opportunity → verify lists
 *
 * Usage:
 *   ADEPTOS_AGENT_ID=demo-negocio-1 pnpm exec tsx scripts/e2e-agent-hotel-flow.ts
 */
import { createHmac } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AdeptosApiClient } from '../src/clients/adeptos-api-client.js';
import { ContactsService } from '../src/services/contacts.service.js';
import { ContactsController } from '../src/controllers/contacts.controller.js';
import { ContactTools } from '../src/tools/contact-tools.js';
import { CalendarService } from '../src/services/calendar.service.js';
import { CalendarController } from '../src/controllers/calendar.controller.js';
import { CalendarTools } from '../src/tools/calendar-tools.js';
import { ProductsService } from '../src/services/products.service.js';
import { ProductsController } from '../src/controllers/products.controller.js';
import { ProductTools } from '../src/tools/product-tools.js';
import { OrderService } from '../src/services/order.service.js';
import { OrderController } from '../src/controllers/order.controller.js';
import { OrderTools } from '../src/tools/order-tools.js';
import { OpportunityService } from '../src/services/opportunity.service.js';
import { OpportunityController } from '../src/controllers/opportunity.controller.js';
import { OpportunityTools } from '../src/tools/opportunity-tools.js';
import { HotelTools } from '../src/tools/hotel-tools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(userId: number, secret: string, hours = 24): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      user_id: userId,
      exp: Math.floor(Date.now() / 1000) + hours * 3600,
    })
  );
  const data = `${header}.${payload}`;
  const sig = createHmac('sha256', secret).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function unwrapList(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.result)) return res.data.result;
  if (Array.isArray(res?.result)) return res.result;
  if (Array.isArray(res?.data?.result?.result)) return res.data.result.result;
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

function logStep(name: string, payload: unknown) {
  console.log(`\n========== ${name} ==========`);
  console.log(JSON.stringify(payload, null, 2));
}

async function main() {
  loadEnvFile(resolve(__dirname, '../.env'));
  loadEnvFile(resolve(__dirname, '../../api/.env'));

  const baseUrl = process.env.ADEPTOS_API_BASE_URL || 'http://127.0.0.1:4000';
  const businessId = Number(process.env.ADEPTOS_BUSINESS_ID || 1);
  const userId = Number(process.env.ADEPTOS_USER_ID || 1);
  const secret = process.env.JWT_SECRET || '';
  if (!secret) {
    console.error('JWT_SECRET missing');
    process.exit(1);
  }
  const token = process.env.ADEPTOS_JWT_TOKEN || signJwt(userId, secret);
  const agentId = (process.env.ADEPTOS_AGENT_ID || 'demo-negocio-1').replace(
    /^\/+/,
    ''
  );

  // Stay AFTER the previous E2E (22-26): 4 nights starting Jul 27
  const checkIn = '2026-07-27';
  const checkOut = '2026-07-31';
  const room = 'Habitacion-2';
  const stamp = Date.now();
  const phone = `+5731${String(stamp).slice(-8)}`;
  const email = `agente.hotel.${stamp}@adeptos.test`;
  const guestName = 'Agente Hotel Guest';

  console.log(
    JSON.stringify({ baseUrl, businessId, agentId, room, checkIn, checkOut }, null, 2)
  );

  const client = new AdeptosApiClient({ accessToken: token, baseUrl });
  const contacts = new ContactTools(
    new ContactsController(new ContactsService(client)),
    businessId
  );
  const calendar = new CalendarTools(
    new CalendarController(new CalendarService(client)),
    businessId
  );
  const products = new ProductTools(
    new ProductsController(new ProductsService(client)),
    businessId
  );
  const orders = new OrderTools(
    new OrderController(new OrderService(client)),
    businessId,
    agentId
  );
  const opportunities = new OpportunityTools(
    new OpportunityController(new OpportunityService(client)),
    businessId
  );
  const hotel = new HotelTools(
    new OrderController(new OrderService(client)),
    new ProductsController(new ProductsService(client)),
    new CalendarController(new CalendarService(client)),
    new ContactsController(new ContactsService(client)),
    businessId,
    agentId
  );

  // 1) Catalog
  const productList = await products.executeTool('get_products', {
    productType: 'RESERVATION',
    search: room,
  });
  logStep('get_products (RESERVATION)', productList);

  // 2) Calendars
  const calendars = await calendar.executeTool('get_calendars', {});
  logStep('get_calendars', calendars);

  // 3) Availability
  const availability = await hotel.executeTool('check_room_availability', {
    room,
    check_in: checkIn,
    check_out: checkOut,
  });
  logStep('check_room_availability', availability);
  if (!(availability as any)?.available) {
    console.error('Room not available — abort');
    process.exit(1);
  }

  // 4) Contact (explicit tool, as agent would)
  const contactRes = await contacts.executeTool('create_contact', {
    name: guestName,
    phone,
    email,
    type: 'customer',
    enabled: true,
    notes: `Lead hotel ${room} ${checkIn}→${checkOut}`,
  });
  logStep('create_contact', contactRes);
  const contact = unwrapEntity(contactRes);
  const contactId = Number(contact?.id);
  if (!contactId) {
    console.error('No contact id');
    process.exit(1);
  }

  // 5) Pipelines + opportunity
  const pipelinesRes = await opportunities.executeTool('get_pipelines', {});
  logStep('get_pipelines', pipelinesRes);
  const pipelines = unwrapList(pipelinesRes);
  const pipeline = pipelines[0] || unwrapEntity(pipelinesRes);
  const stages =
    pipeline?.stages ||
    pipeline?.Stages ||
    unwrapList(pipeline) ||
    [];
  // Prefer "Nuevo Lead" / first stage
  let stageId =
    stages.find((s: any) => /nuevo|lead/i.test(String(s.name || '')))?.id ||
    stages[0]?.id;
  if (!stageId) {
    // Fallback known for business 1 Marketing Pipeline
    stageId = 43;
  }

  const oppRes = await opportunities.executeTool('create_opportunity', {
    customerId: contactId,
    stageId: Number(stageId),
    name: `Reserva ${room} ${checkIn}`,
    value: Number((availability as any)?.totalCents || 0) / 100,
    status: 'open',
  });
  logStep('create_opportunity', oppRes);
  const opportunity = unwrapEntity(oppRes);
  const oppId = Number(opportunity?.id);

  // 6) Full reservation (order + calendar booking; also creates a contact again — ok)
  const reservation = await hotel.executeTool('create_room_reservation', {
    room,
    check_in: checkIn,
    check_out: checkOut,
    num_guests: 2,
    customer_phone: phone,
    customer_name: guestName,
    customer_email: email,
    note: 'Simulación agente MCP: contacto + oportunidad + orden + calendario',
    agent_id: agentId,
    session_id: `agent-sim-${stamp}`,
  });
  logStep('create_room_reservation', reservation);
  if (!(reservation as any)?.success) {
    console.error('Reservation failed');
    process.exit(1);
  }

  // 7) Move opportunity forward (Calificado)
  if (oppId) {
    const nextStage =
      stages.find((s: any) => /calific/i.test(String(s.name || '')))?.id ||
      stages[1]?.id ||
      44;
    const moved = await opportunities.executeTool('move_opportunity', {
      opp_id: oppId,
      stageId: Number(nextStage),
    });
    logStep('move_opportunity', moved);
  }

  // 8) Verify via list tools
  const orderList = await orders.executeTool('get_purchase_orders', {
    search: guestName,
    limit: 10,
  });
  logStep('get_purchase_orders', orderList);

  const apps = await calendar.executeTool('get_appointments', {});
  logStep('get_appointments', apps);

  const opps = await opportunities.executeTool('get_opportunities', {});
  logStep('get_opportunities', opps);

  const summary = {
    contactId,
    opportunityId: oppId || null,
    orderId: (reservation as any)?.order?.id ?? null,
    appointmentId: (reservation as any)?.appointment?.id ?? null,
    checkIn,
    checkOut,
    room,
    phone,
  };
  logStep('SUMMARY', summary);

  if (!summary.orderId || !summary.appointmentId) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
