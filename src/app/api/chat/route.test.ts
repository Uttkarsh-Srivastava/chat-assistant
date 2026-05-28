import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/chat', () => {
  it('rejects a body with no message', async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
  });

  it('rejects a body whose message is not a string', async () => {
    const res = await POST(postRequest({ message: 42 }));
    expect(res.status).toBe(400);
  });

  it('streams a plain-text response with buffering disabled', async () => {
    const res = await POST(postRequest({ message: 'hello' }));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toBe('no-cache, no-transform');
    expect(res.headers.get('X-Accel-Buffering')).toBe('no');
  });

  it('streams back tokens that echo the user message', async () => {
    const res = await POST(postRequest({ message: 'weather forecast' }));
    const text = await res.text();

    // The mock generator echoes the (truncated) user message back into its output.
    expect(text).toContain('weather forecast');
    expect(text).toContain('streamed token by token');
  });
});
