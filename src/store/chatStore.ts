import { create, type StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ChatStore, Message } from '@/types/chat';
import { fetchChatStream } from '@/lib/fetchChatStream';

let abortController: AbortController | null = null;

const storeImpl: StateCreator<ChatStore, [], []> = (set, get) => ({
  messages: [],
  streamingContent: '',
  streamingState: 'idle',
  error: null,

  /**
   * Sends a user message and streams the assistant's response token by token.
   *
   * Immediately appends the user message to `messages` and sets `streamingState`
   * to 'streaming'. Each incoming chunk is appended to `streamingContent`, which
   * re-renders `StreamingBubble`. When the stream finishes (or is aborted), the
   * accumulated text is committed as a permanent assistant message and
   * `streamingContent` is cleared.
   */
  sendMessage: async (userMessage: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };

    abortController = new AbortController();
    const assistantMsgId = crypto.randomUUID();

    set({
      messages: [...get().messages, userMsg],
      streamingState: 'streaming',
      streamingContent: '',
      error: null,
    });

    let partial = '';

    try {
      await fetchChatStream(userMessage, abortController.signal, (chunk) => {
        partial += chunk;
        set({ streamingContent: partial });
      });
      set((state) => ({
        messages: [
          ...state.messages,
          { id: assistantMsgId, role: 'assistant' as const, content: partial, timestamp: Date.now() },
        ],
        streamingContent: '',
        streamingState: 'idle',
      }));
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        set((state) => ({
          messages: [
            ...state.messages,
            { id: assistantMsgId, role: 'assistant' as const, content: partial || '...', timestamp: Date.now() },
          ],
          streamingContent: '',
          streamingState: 'idle',
        }));
        return;
      }
      set({
        streamingState: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        streamingContent: '',
      });
    } finally {
      abortController = null;
    }
  },

  /** Cancels the in-flight fetch request, triggering the AbortError path in sendMessage. */
  abortStream: () => {
    abortController?.abort();
  },

  /** Resets the store to its initial empty state. */
  clearMessages: () => {
    set({ messages: [], streamingContent: '', streamingState: 'idle', error: null });
  },

  /** Clears the error banner without discarding the message history. */
  dismissError: () => {
    set({ error: null, streamingState: 'idle' });
  },
});

const useChatStore =
  process.env.NODE_ENV !== 'production'
    ? create<ChatStore>()(devtools(storeImpl as StateCreator<ChatStore, [['zustand/devtools', never]]>, { name: 'ChatStore' }))
    : create<ChatStore>()(storeImpl);

export default useChatStore;

export const selectMessages         = (s: ChatStore) => s.messages;
export const selectStreamingContent = (s: ChatStore) => s.streamingContent;
export const selectStreamingState   = (s: ChatStore) => s.streamingState;
export const selectSendMessage      = (s: ChatStore) => s.sendMessage;
export const selectAbortStream      = (s: ChatStore) => s.abortStream;
export const selectLastUserMsgId    = (s: ChatStore) => s.messages.findLast((m) => m.role === 'user')?.id;
