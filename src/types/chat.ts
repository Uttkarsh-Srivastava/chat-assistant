export type Role = 'user' | 'assistant';
export type StreamingState = 'idle' | 'streaming' | 'error';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
}

export interface ChatStore {
  messages: Message[];
  streamingContent: string;
  streamingState: StreamingState;
  error: string | null;
  sendMessage: (userMessage: string) => Promise<void>;
  abortStream: () => void;
  clearMessages: () => void;
  dismissError: () => void;
}
