import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the API layer so the store is tested in isolation from the network.
vi.mock('@/lib/chatApi', () => ({
  fetchChatStream: vi.fn(),
  notifyAbort: vi.fn(),
}));

import { fetchChatStream, notifyAbort } from '@/lib/chatApi';
import useChatStore, {
  selectLastUserMsgId,
  selectMessages,
  selectStreamingContent,
  selectStreamingState,
} from './chatStore';

const mockFetchChatStream = vi.mocked(fetchChatStream);
const mockNotifyAbort = vi.mocked(notifyAbort);

/**
 * The shape the store detects as an abort: an Error whose name is 'AbortError'.
 * (A real fetch abort throws a DOMException with this name; we use a plain Error
 * because jsdom's DOMException is not an instance of its Error.)
 */
function abortError(): Error {
  const err = new Error('Aborted');
  err.name = 'AbortError';
  return err;
}

const initialState = {
  messages: [],
  streamingContent: '',
  streamingState: 'idle' as const,
  error: null,
};

beforeEach(() => {
  // Partial merge resets the data fields while leaving the action methods in place.
  useChatStore.setState(initialState);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('sendMessage — success path', () => {
  it('appends the user message immediately and enters the streaming state', async () => {
    // A stream we can hold open to observe the intermediate state.
    let resolveStream!: () => void;
    mockFetchChatStream.mockImplementation(() => new Promise((r) => (resolveStream = r)));

    const promise = useChatStore.getState().sendMessage('Hi there');

    const state = useChatStore.getState();
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toMatchObject({ role: 'user', content: 'Hi there' });
    expect(state.streamingState).toBe('streaming');
    expect(state.streamingContent).toBe('');

    resolveStream();
    await promise;
  });

  it('accumulates chunks into streamingContent as they arrive', async () => {
    const seen: string[] = [];
    mockFetchChatStream.mockImplementation(async (_msg, _signal, onChunk) => {
      onChunk('Hello ');
      seen.push(useChatStore.getState().streamingContent);
      onChunk('world');
      seen.push(useChatStore.getState().streamingContent);
    });

    await useChatStore.getState().sendMessage('q');

    expect(seen).toEqual(['Hello ', 'Hello world']);
  });

  it('commits the assistant message and clears streaming state on completion', async () => {
    mockFetchChatStream.mockImplementation(async (_msg, _signal, onChunk) => {
      onChunk('Final ');
      onChunk('answer');
    });

    await useChatStore.getState().sendMessage('q');

    const state = useChatStore.getState();
    expect(state.messages).toHaveLength(2);
    expect(state.messages[1]).toMatchObject({ role: 'assistant', content: 'Final answer' });
    expect(state.streamingContent).toBe('');
    expect(state.streamingState).toBe('idle');
  });
});

describe('sendMessage — abort path', () => {
  it('commits whatever streamed so far when aborted, and notifies the server', async () => {
    mockFetchChatStream.mockImplementation((_msg, signal, onChunk) => {
      onChunk('Partial ');
      onChunk('text');
      return new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(abortError()));
      });
    });

    const promise = useChatStore.getState().sendMessage('q');
    useChatStore.getState().abortStream();
    await promise;

    const state = useChatStore.getState();
    expect(state.messages).toHaveLength(2);
    expect(state.messages[1]).toMatchObject({ role: 'assistant', content: 'Partial text' });
    expect(state.streamingState).toBe('idle');
    expect(state.streamingContent).toBe('');
    expect(mockNotifyAbort).toHaveBeenCalledTimes(1);
    // The id passed to notifyAbort must match the committed assistant message id.
    expect(mockNotifyAbort).toHaveBeenCalledWith(state.messages[1].id);
  });

  it('commits a placeholder when aborted before any token arrived', async () => {
    mockFetchChatStream.mockImplementation((_msg, signal) =>
      new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(abortError()));
      }),
    );

    const promise = useChatStore.getState().sendMessage('q');
    useChatStore.getState().abortStream();
    await promise;

    expect(useChatStore.getState().messages[1]).toMatchObject({
      role: 'assistant',
      content: '...',
    });
  });
});

describe('sendMessage — error path', () => {
  it('records the error and does not commit an assistant message', async () => {
    mockFetchChatStream.mockRejectedValue(new Error('boom'));

    await useChatStore.getState().sendMessage('q');

    const state = useChatStore.getState();
    expect(state.streamingState).toBe('error');
    expect(state.error).toBe('boom');
    expect(state.streamingContent).toBe('');
    expect(state.messages).toHaveLength(1); // only the user message
  });
});

describe('abortStream when idle', () => {
  it('is a no-op and does not notify the server', () => {
    useChatStore.getState().abortStream();
    expect(mockNotifyAbort).not.toHaveBeenCalled();
  });
});

describe('clearMessages / dismissError', () => {
  it('clearMessages resets the store to empty', () => {
    useChatStore.setState({
      messages: [{ id: '1', role: 'user', content: 'x', timestamp: 0 }],
      streamingContent: 'partial',
      streamingState: 'streaming',
      error: 'oops',
    });

    useChatStore.getState().clearMessages();

    expect(useChatStore.getState()).toMatchObject({
      messages: [],
      streamingContent: '',
      streamingState: 'idle',
      error: null,
    });
  });

  it('dismissError clears the error but keeps the message history', () => {
    useChatStore.setState({
      messages: [{ id: '1', role: 'user', content: 'x', timestamp: 0 }],
      streamingState: 'error',
      error: 'oops',
    });

    useChatStore.getState().dismissError();

    const state = useChatStore.getState();
    expect(state.error).toBeNull();
    expect(state.streamingState).toBe('idle');
    expect(state.messages).toHaveLength(1);
  });
});

describe('selectors', () => {
  it('expose narrow slices of state', () => {
    useChatStore.setState({
      messages: [
        { id: 'u1', role: 'user', content: 'hi', timestamp: 0 },
        { id: 'a1', role: 'assistant', content: 'yo', timestamp: 1 },
        { id: 'u2', role: 'user', content: 'again', timestamp: 2 },
      ],
      streamingContent: 'abc',
      streamingState: 'streaming',
    });

    const state = useChatStore.getState();
    expect(selectMessages(state)).toHaveLength(3);
    expect(selectStreamingContent(state)).toBe('abc');
    expect(selectStreamingState(state)).toBe('streaming');
    // selectLastUserMsgId returns the most recent *user* message id, skipping the assistant.
    expect(selectLastUserMsgId(state)).toBe('u2');
  });

  it('selectLastUserMsgId is undefined when there are no messages', () => {
    expect(selectLastUserMsgId(useChatStore.getState())).toBeUndefined();
  });
});
