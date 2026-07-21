/**
 * E2E: Habitacion-2 reservation via mcp-adeptos-crm HotelTools (same code path as /mcp).
 *
 * Creates contact + purchase order + calendar appointment for a 4-night stay starting tomorrow.
 *
 * Usage (from mcp-adeptos-crm):
 *   npx tsx scripts/e2e-hotel-reservation.ts
 *
 * Env (optional):
 *   ADEPTOS_API_BASE_URL=http://127.0.0.1:4000
 *   ADEPTOS_BUSINESS_ID=1
 *   ADEPTOS_USER_ID=1
 *   JWT_SECRET / JWT from api/.env is loaded automatically when present
 */
import { createHmac } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AdeptosApiClient } from '../src/clients/adeptos-api-client.js';
import { ContactsService } from '../src/services/contacts.service.js';
import { ContactsController } from '../src/controllers/contacts.controller.js';
import { CalendarService } from '../src/services/calendar.service.js';
import { CalendarController } from '../src/controllers/calendar.controller.js';
import { ProductsService } from '../src/services/products.service.js';
import { ProductsController } from '../src/controllers/products.controller.js';
import { OrderService } from '../src/services/order.service.js';
import { OrderController } from '../src/controllers/order.controller.js';
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

async function main() {
  loadEnvFile(resolve(__dirname, '../.env'));
  loadEnvFile(resolve(__dirname, '../../api/.env'));

  const baseUrl =
    process.env.ADEPTOS_API_BASE_URL || 'http://127.0.0.1:4000';
  const businessId = Number(process.env.ADEPTOS_BUSINESS_ID || 1);
  const userId = Number(process.env.ADEPTOS_USER_ID || 1);
  const secret = process.env.JWT_SECRET || '';
  if (!secret) {
    console.error('JWT_SECRET missing (expected in api/.env)');
    process.exit(1);
  }

  const token = process.env.ADEPTOS_JWT_TOKEN || signJwt(userId, secret);
  const agentId = (process.env.ADEPTOS_AGENT_ID || '1').replace(/^\/+/, '');

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const checkout = new Date(tomorrow);
  checkout.setUTCDate(checkout.getUTCDate() + 4);

  const checkIn = ymd(tomorrow);
  const checkOut = ymd(checkout);

  console.log(
    JSON.stringify(
      {
        baseUrl,
        businessId,
        room: 'Habitacion-2',
        checkIn,
        checkOut,
        nights: 4,
        agentId,
      },
      null,
      2
    )
  );

  const client = new AdeptosApiClient({
    accessToken: token,
    baseUrl,
  });

  const hotel = new HotelTools(
    new OrderController(new OrderService(client)),
    new ProductsController(new ProductsService(client)),
    new CalendarController(new CalendarService(client)),
    new ContactsController(new ContactsService(client)),
    businessId,
    agentId
  );

  const availability = await hotel.executeTool('check_room_availability', {
    room: 'Habitacion-2',
    check_in: checkIn,
    check_out: checkOut,
  });
  console.log('\n=== check_room_availability ===');
  console.log(JSON.stringify(availability, null, 2));

  const phone = `+5731${String(Date.now()).slice(-8)}`;
  const reservation = await hotel.executeTool('create_room_reservation', {
    room: 'Habitacion-2',
    check_in: checkIn,
    check_out: checkOut,
    num_guests: 2,
    customer_phone: phone,
    customer_name: 'E2E Hotel Guest',
    customer_email: `e2e.hotel.${Date.now()}@adeptos.test`,
    note: 'Prueba E2E MCP hotel 4 noches',
    agent_id: agentId,
    session_id: `e2e-hotel-${Date.now()}`,
  });

  console.log('\n=== create_room_reservation ===');
  console.log(JSON.stringify(reservation, null, 2));

  const ok = Boolean((reservation as any)?.success);
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
