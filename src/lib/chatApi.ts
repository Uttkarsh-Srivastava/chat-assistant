/**
 * Sends a chat message to the API and streams the response back chunk by chunk.
 *
 * Reads the raw byte stream from the response body using a ReadableStream reader
 * and calls `onChunk` for each decoded text fragment as it arrives. The caller
 * is responsible for accumulating chunks into a full string.
 *
 * @param message  - The user's message text to send.
 * @param signal   - AbortSignal used to cancel the request mid-stream.
 * @param onChunk  - Callback invoked with each decoded text fragment as it arrives.
 */
export async function fetchChatStream(
  message: string,
  signal: AbortSignal,
  onChunk: (chunk: string) => void
): Promise<void> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: false });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
    // Flush any bytes the decoder held back waiting for a complete multi-byte character.
    const remainder = decoder.decode();
    if (remainder) onChunk(remainder);
  } finally {
    reader.releaseLock();
  }
}

/**
 * Notifies the server that the client aborted an in-flight stream.
 *
 * Fire-and-forget: the actual cancellation already happened client-side via
 * `AbortController`. This POST lets the server log the abort (and, in future,
 * release any per-message resources). Failures are swallowed so a flaky network
 * never surfaces an error to the user for an action that already succeeded.
 *
 * @param messageId - The id of the assistant message that was being streamed.
 */
export function notifyAbort(messageId: string): void {
  void fetch('/api/chat/abort', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId }),
    keepalive: true,
  }).catch(() => {
    /* best-effort; cancellation already happened client-side */
  });
}
