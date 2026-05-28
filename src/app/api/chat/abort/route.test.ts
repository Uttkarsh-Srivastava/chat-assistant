import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/chat/abort', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/chat/abort', () => {
  it('returns 204 and logs the aborted message id', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const res = await POST(postRequest({ messageId: 'msg-7' }));

    expect(res.status).toBe(204);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('msg-7'));
  });

  it('rejects a body with no messageId', async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
  });

  it('rejects a messageId that is not a string', async () => {
    const res = await POST(postRequest({ messageId: 123 }));
    expect(res.status).toBe(400);
  });
});
