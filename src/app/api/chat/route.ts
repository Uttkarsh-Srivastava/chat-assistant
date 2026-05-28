import { NextRequest } from 'next/server';
import { streamAssistantResponse } from '@/lib/streamAssistantResponse';

/**
 * POST /api/chat
 *
 * Accepts a JSON body `{ message: string }` and returns a plain-text streaming
 * response. Tokens are yielded by `streamAssistantResponse` and encoded as UTF-8
 * bytes into a ReadableStream, which the client reads chunk by chunk via the
 * Fetch API's body reader.
 *
 * Headers disable caching and proxy buffering so tokens reach the browser as
 * soon as they are produced rather than being held until the response completes.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const body = (await req.json()) as { message: string };

  if (!body.message || typeof body.message !== 'string') {
    return new Response('Invalid request body', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const token of streamAssistantResponse(body.message)) {
          controller.enqueue(encoder.encode(token));
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
