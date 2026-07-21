/**
 * E2E smoke: MCP CRM auto-auth using a scoped service token.
 *
 * Usage:
 *   MCP_URL=http://127.0.0.1:3005 \
 *   MCP_SERVICE_TOKEN=<token> \
 *   MCP_BUSINESS_ID=1 \
 *   npx tsx scripts/test-auto-auth.ts
 */
const mcpUrl = process.env.MCP_URL || 'http://127.0.0.1:3005/mcp';
const token = process.env.MCP_SERVICE_TOKEN || '';
const businessId = process.env.MCP_BUSINESS_ID || '1';

async function main() {
  if (!token) {
    console.error('MCP_SERVICE_TOKEN is required (scoped service token from Adeptos API)');
    process.exit(1);
  }

  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'get_purchase_orders_summary',
      arguments: {
        business_id: businessId,
      },
    },
  };

  const res = await fetch(mcpUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${token}`,
      'x-business-id': businessId,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log('status', res.status);
  console.log(text);

  if (!res.ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
