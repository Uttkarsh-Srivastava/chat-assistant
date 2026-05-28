import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchChatStream, notifyAbort } from './chatApi';

/** Build a ReadableStream that emits the given byte chunks then closes. */
function streamOf(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

const encoder = new TextEncoder();

describe('fetchChatStream', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs the message as JSON to /api/chat with the abort signal', async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockResolvedValue(
      new Response(streamOf([encoder.encode('hi ')]), { status: 200 }),
    );

    await fetchChatStream('hello world', controller.signal, () => {});

    expect(fetch).toHaveBeenCalledWith('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello world' }),
      signal: controller.signal,
    });
  });

  it('invokes onChunk once per decoded fragment, in order', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        streamOf([encoder.encode('Hello '), encoder.encode('there '), encoder.encode('friend')]),
        { status: 200 },
      ),
    );

    const chunks: string[] = [];
    await fetchChatStream('q', new AbortController().signal, (c) => chunks.push(c));

    expect(chunks).toEqual(['Hello ', 'there ', 'friend']);
  });

  it('correctly decodes a multi-byte character split across two chunks', async () => {
    // '€' is the 3 bytes E2 82 AC; split it so no single chunk is a full character.
    const euro = encoder.encode('€'); // Uint8Array(3)
    vi.mocked(fetch).mockResolvedValue(
      new Response(streamOf([euro.slice(0, 2), euro.slice(2)]), { status: 200 }),
    );

    const chunks: string[] = [];
    await fetchChatStream('q', new AbortController().signal, (c) => chunks.push(c));

    // The streaming decoder holds back the incomplete byte and emits the full char later.
    expect(chunks.join('')).toBe('€');
  });

  it('throws when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('nope', { status: 500 }));

    await expect(
      fetchChatStream('q', new AbortController().signal, () => {}),
    ).rejects.toThrow('Request failed: 500');
  });

  it('throws when the response has no body', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await expect(
      fetchChatStream('q', new AbortController().signal, () => {}),
    ).rejects.toThrow('No response body');
  });

  it('propagates an AbortError when the underlying fetch rejects', async () => {
    const abortErr = new DOMException('Aborted', 'AbortError');
    vi.mocked(fetch).mockRejectedValue(abortErr);

    await expect(
      fetchChatStream('q', new AbortController().signal, () => {}),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('notifyAbort', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fires a keepalive POST to /api/chat/abort carrying the message id', () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    notifyAbort('msg-42');

    expect(fetch).toHaveBeenCalledWith('/api/chat/abort', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: 'msg-42' }),
      keepalive: true,
    });
  });

  it('returns void and swallows network failures (fire-and-forget)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));

    // Must not throw synchronously...
    expect(() => notifyAbort('msg-1')).not.toThrow();
    // ...and the rejected promise must be caught, not surface as an unhandled rejection.
    await Promise.resolve();
    await Promise.resolve();
  });
});
