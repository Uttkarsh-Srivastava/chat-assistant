import { useEffect, useRef } from 'react';

/**
 * Automatically scrolls a bottom anchor into view whenever `scrollTrigger` changes,
 * as long as the user hasn't manually scrolled up mid-stream.
 *
 * Auto-scroll is enabled at the start of each new session (`sessionKey` change) and
 * disabled the moment the user wheels or touch-scrolls upward. It re-enables again
 * when the next session starts.
 *
 * @param scrollTrigger - Value that changes on every new content chunk (e.g. streamingContent).
 *                        Each change attempts a scroll if auto-scroll is still active.
 * @param active        - Whether streaming is currently in progress. Resets auto-scroll
 *                        to enabled and attaches the wheel/touch listeners while true.
 * @param sessionKey    - Unique key per conversation turn (e.g. last user message ID).
 *                        Changing this re-enables auto-scroll for the new turn.
 * @returns A ref to attach to the bottom sentinel element that will be scrolled into view.
 */
export function useAutoScroll(
  scrollTrigger: string,
  active: boolean,
  sessionKey: unknown,
) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    if (!active) return;

    autoScrollRef.current = true;

    const stop = () => {
      autoScrollRef.current = false;
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchmove', stop);
    };

    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchmove', stop, { passive: true });

    return () => {
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchmove', stop);
    };
  }, [active, sessionKey]);

  useEffect(() => {
    if (!autoScrollRef.current || !bottomRef.current) return;
    bottomRef.current.scrollIntoView({ block: 'end' });
  }, [scrollTrigger]);

  return bottomRef;
}
