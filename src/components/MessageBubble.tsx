'use client';

import { memo, useState } from 'react';
import type { Message } from '@/types/chat';

interface Props {
  message: Message;
}

/**
 * Renders a single chat bubble for either a user or assistant message.
 *
 * User messages are right-aligned with a blue background; assistant messages are
 * left-aligned with a white card style. A copy button appears on hover.
 *
 * Wrapped in `memo` so React skips re-rendering when the parent re-renders but
 * the message object reference hasn't changed.
 */
function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`group flex items-end gap-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {isUser && (
        <CopyButton copied={copied} onCopy={handleCopy} />
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-200 rounded-bl-sm shadow-sm text-gray-800'
        }`}
      >
        {message.content}
      </div>
      {!isUser && (
        <CopyButton copied={copied} onCopy={handleCopy} />
      )}
    </div>
  );
}

export default memo(MessageBubble);

/**
 * Icon button that copies text to the clipboard and shows a checkmark for 2 seconds
 * as confirmation. Visible only on group hover or focus.
 */
function CopyButton({
  copied,
  onCopy,
}: {
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <button
      onClick={onCopy}
      aria-label={copied ? 'Copied' : 'Copy message'}
      className="flex-none p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150 opacity-0 group-hover:opacity-100 focus:opacity-100"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
        </svg>
      )}
    </button>
  );
}
