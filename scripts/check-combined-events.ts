import { createHmac } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

loadEnvFile(resolve(__dirname, '../.env'));
loadEnvFile(resolve(__dirname, '../../api/.env'));

const secret = process.env.JWT_SECRET || '';
if (!secret) {
  console.error('JWT_SECRET missing');
  process.exit(1);
}

const h = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const p = b64url(
  JSON.stringify({ user_id: 1, exp: Math.floor(Date.now() / 1000) + 3600 })
);
const d = `${h}.${p}`;
const token = `${d}.${b64url(createHmac('sha256', secret).update(d).digest())}`;

const url =
  'http://127.0.0.1:4000/api/v1/calendar/combined-events?businessId=1&agentInstanceId=1&timeMin=2026-07-01T00:00:00Z&timeMax=2026-07-31T23:59:59Z';

const res = await fetch(url, {
  headers: {
    Authorization: `Bearer ${token}`,
    Cookie: `adeptosJWT=${token}`,
    Accept: 'application/json',
  },
});
const json: any = await res.json();
const items = json.result?.items || json.items || json.result || [];
const list = Array.isArray(items) ? items : [];
const local = list.filter(
  (x: any) => x.source === 'local' || String(x.id).startsWith('local')
);
console.log(
  JSON.stringify(
    {
      status: res.status,
      localCount: local.length,
      events: local.map((x: any) => ({
        id: x.id,
        title: x.title,
        businessCalendarId: x.businessCalendarId,
        contactId: x.contactId,
        contactName: x.contactName,
        start: x.startTime,
        end: x.endTime,
      })),
    },
    null,
    2
  )
);
