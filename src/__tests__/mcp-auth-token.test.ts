import { describe, expect, it } from 'vitest';

/** Mirrors AdeptosApiClient.parseMcpAccessToken */
function parseMcpAccessToken(
  token: string
): { clientId: string; clientSecret: string } | null {
  const raw = (token || '').trim();
  if (!raw.startsWith('mcpv1.')) return null;
  const rest = raw.slice('mcpv1.'.length);
  const dot = rest.indexOf('.');
  if (dot <= 0 || dot === rest.length - 1) return null;
  return {
    clientId: rest.slice(0, dot),
    clientSecret: rest.slice(dot + 1),
  };
}

describe('MCP durable auth token format', () => {
  it('parses mcpv1.client_id.secret', () => {
    const parsed = parseMcpAccessToken('mcpv1.abc123.deadbeefcafe');
    expect(parsed).toEqual({
      clientId: 'abc123',
      clientSecret: 'deadbeefcafe',
    });
  });

  it('rejects JWT and empty', () => {
    expect(parseMcpAccessToken('eyJhbGciOiJIUzI1NiJ9.xx.yy')).toBeNull();
    expect(parseMcpAccessToken('')).toBeNull();
    expect(parseMcpAccessToken('mcpv1.onlyclient')).toBeNull();
  });
});
