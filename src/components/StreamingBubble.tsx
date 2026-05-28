'use client';

import useChatStore, {
  selectLastUserMsgId,
  selectStreamingContent,
  selectStreamingState,
} from '@/store/chatStore';
import { useAutoScroll } from '@/hooks/useAutoScroll';

/**
 * Displays the assistant's response while it is being streamed.
 *
 * Renders nothing when `streamingState` is not 'streaming', so it disappears
 * cleanly once the response is committed to the message list. While streaming:
 * - Shows an animated typing indicator (three bouncing dots) until the first
 *   chunk arrives.
 * - Renders the accumulated text with a blinking cursor once content is present.
 * - Keeps the bottom of the scroll container in view via `useAutoScroll`, but
 *   stops auto-scrolling if the user manually scrolls up.
 */
export default function StreamingBubble() {
  const streamingContent = useChatStore(selectStreamingContent);
  const streamingState = useChatStore(selectStreamingState);
  const lastUserMsgId = useChatStore(selectLastUserMsgId);

  const bottomRef = useAutoScroll(
    streamingContent,
    streamingState === 'streaming',
    lastUserMsgId,
  );

  if (streamingState !== 'streaming') return null;

  return (
    <>
      <div className="flex justify-start">
        <div className="max-w-[75%] rounded-2xl px-4 py-3 text-sm bg-white border border-gray-200 rounded-bl-sm shadow-sm text-gray-800">
          {streamingContent === '' ? (
            <span className="flex gap-1 items-center h-4">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
            </span>
          ) : (
            <>
              {streamingContent}
              <span className="inline-block w-0.5 h-3.5 bg-gray-600 ml-0.5 align-middle animate-[blink_1s_step-end_infinite]" />
            </>
          )}
        </div>
      </div>
      <div ref={bottomRef} />
    </>
  );
}
