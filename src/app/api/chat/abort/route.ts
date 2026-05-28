import { NextRequest } from 'next/server';

/**
 * POST /api/chat/abort
 *
 * Receives a JSON body `{ messageId: string }` and logs that the client aborted
 * the given message. The actual stream cancellation is handled client-side via
 * `AbortController`; this endpoint exists as a server-side hook for logging,
 * analytics, or cleanup (e.g. releasing model resources) if needed in the future.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const body = (await req.json()) as { messageId: string };

  if (!body.messageId || typeof body.messageId !== 'string') {
    return new Response('Invalid request body', { status: 400 });
  }

  console.log(`[abort] message ${body.messageId} was aborted by the user`);

  return new Response(null, { status: 204 });
}
