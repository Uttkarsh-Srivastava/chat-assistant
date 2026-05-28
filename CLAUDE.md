# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server on http://localhost:3000 (no Turbopack)
npm run build    # Production build — must pass with zero TypeScript errors and no `any`
npm start        # Serve the production build (npm start -- -p 8080 for a different port)
npm run lint     # ESLint (eslint-config-next)
```

There is no test runner configured. Verification is manual (see the checklist in `IMPLEMENTATION.md`) plus `npm run build` for type safety.

## Next.js version caveat

This is **Next.js 16** (React 19, Tailwind v4). APIs, conventions, and file structure differ from older Next.js. When unsure about framework behavior, consult `node_modules/next/dist/docs/` rather than relying on memory of earlier versions, and heed deprecation notices.

## Architecture

A streaming chat UI. There is **no real AI** — `src/lib/streamAssistantResponse.ts` is a mock async generator that yields canned tokens every 30ms (marked "Do not modify"). The entire app is built around streaming those tokens to the browser and rendering them without thrashing React.

**Data flow for one message:**
1. `ChatInput` calls `sendMessage` (Zustand action in `src/store/chatStore.ts`).
2. The store appends the user `Message`, sets `streamingState: 'streaming'`, and creates an `AbortController` (held in a module-level variable, *not* in store state).
3. `fetchChatStream` (`src/lib/chatApi.ts`) POSTs to `/api/chat`, gets a `ReadableStream` reader, decodes chunks with a streaming `TextDecoder`, and fires an `onChunk` callback per fragment.
4. Each chunk: the store does `set({ streamingContent: partial })`.
5. On completion (or `AbortError`), the accumulated text is committed as a permanent assistant `Message` and `streamingContent` is cleared back to `''`.
6. `/api/chat` (`route.ts`) wraps the mock generator in a `ReadableStream`, returns `text/plain` with `Cache-Control: no-transform` + `X-Accel-Buffering: no` headers so proxies don't buffer the stream.

Cancellation is client-side: `abortStream` (`chatStore.ts`) calls `abortController.abort()`, which trips the `AbortError` path in `sendMessage` and commits whatever was streamed so far. It then fires `notifyAbort` (`chatApi.ts`), a best-effort `POST /api/chat/abort` carrying the in-flight assistant message id. That endpoint is a logging-only stub (returns 204); the POST is fire-and-forget (`keepalive`, errors swallowed) since the real cancellation already happened locally.

## The core constraint: re-render isolation

The defining design goal is that **the committed message list never re-renders while tokens stream in.** Tokens arrive every 30ms; re-rendering the whole conversation on each would be wasteful. This shapes nearly every structural choice, so preserve it when editing:

- **Granular selectors only.** `chatStore.ts` exports per-field selectors (`selectMessages`, `selectStreamingContent`, etc.). Components subscribe to the narrowest slice they need — never the whole store.
- **`streamingContent` is isolated.** Only `StreamingBubble` subscribes to it, so only it re-renders per token. When streaming ends, that text moves into `messages` and `streamingContent` resets.
- **`ChatMessages` has no subscription.** It's a pure layout wrapper; the actual list lives in a `memo`'d `MessageList` child that subscribes to `messages` only. This keeps the list out of Zustand's per-token subscriber graph.
- **`set({ x })`, never `set({ ...state, x })`.** Spreading creates new references for untouched fields and defeats Zustand's shallow-equality bail-out, causing spurious re-renders.
- **`MessageBubble` and `StreamingBubble` must share identical base bubble classes** (`max-w-[75%] rounded-2xl px-4 py-3 text-sm` + role styling) so there's no visual flash when a streaming bubble is replaced by the committed one.

## Auto-scroll

`useAutoScroll` (`src/hooks/useAutoScroll.ts`) scrolls a bottom sentinel into view on each content change, but disables itself the moment the user scrolls up (wheel/touch) mid-stream, and re-enables on the next turn (keyed by the last user message id). State is held in refs to avoid re-renders.

## Layout note

`page.tsx` is a server component. The flex column wrapping `ChatMessages` needs `min-h-0` for the inner `overflow-y-auto` to actually constrain height; the root uses `h-dvh` (not `h-screen`) to avoid mobile-toolbar overlap.
