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
