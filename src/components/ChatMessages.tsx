'use client';

import { memo } from 'react';
import useChatStore, { selectMessages } from '@/store/chatStore';
import MessageBubble from './MessageBubble';
import StreamingBubble from './StreamingBubble';

/**
 * Renders the list of committed messages.
 *
 * Isolated into its own memoized component so that streaming updates (which only
 * change `streamingContent` in the store) never cause the message list to re-render.
 * `memo` ensures React skips this component entirely when its parent re-renders
 * without changing its props.
 */
const MessageList = memo(function MessageList() {
  const messages = useChatStore(selectMessages);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Ask a question to get started
      </div>
    );
  }

  return (
    <>
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </>
  );
});

/**
 * Scrollable container for the full conversation.
 *
 * Owns no Zustand subscription itself — it is a layout wrapper only. This keeps
 * it out of Zustand's subscriber graph so streaming updates never trigger a
 * re-render here or cascade into the MessageList above.
 */
export default function ChatMessages() {
  return (
    <div className="flex-1 overflow-y-auto pt-4 pb-32 flex flex-col gap-3">
      <MessageList />
      <StreamingBubble />
    </div>
  );
}
