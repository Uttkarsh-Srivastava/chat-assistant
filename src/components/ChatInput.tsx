'use client';

import { useState, useRef, useLayoutEffect } from 'react';
import useChatStore, {
  selectStreamingState,
  selectSendMessage,
  selectAbortStream,
} from '@/store/chatStore';

/**
 * Controlled text input for composing and submitting chat messages.
 *
 * The textarea auto-grows up to 200 px as the user types and resets to a single
 * row after a message is sent. Submission is blocked while the assistant is
 * streaming; the Send button is replaced with a Stop button that aborts the
 * in-flight request.
 */
export default function ChatInput() {
  const streamingState = useChatStore(selectStreamingState);
  const sendMessage = useChatStore(selectSendMessage);
  const abortStream = useChatStore(selectAbortStream);
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = streamingState === 'streaming';

  // useLayoutEffect runs synchronously after the DOM commit but before paint,
  // so the resized height is the one the browser paints. 
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [inputValue]);

  /** Trims whitespace, sends the message, and clears the input. */
  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) return;
    setInputValue('');
    sendMessage(trimmed);
  };

  /** Submits on Enter, allows Shift+Enter for newlines. */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex-none py-3 border-t border-gray-200 bg-gray-50">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          rows={1}
          placeholder="Ask a question..."
          className="flex-1 resize-none overflow-hidden rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {isStreaming ? (
          <button
            onClick={abortStream}
            className="flex-none px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={inputValue.trim().length === 0}
            className="flex-none px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
