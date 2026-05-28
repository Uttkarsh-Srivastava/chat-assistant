import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAutoScroll } from './useAutoScroll';

let scrollSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
});

/**
 * The hook returns a ref; in a real component it is attached to a DOM node.
 * Here we attach it to a detached element so `bottomRef.current` is non-null.
 */
function attachRef(ref: React.RefObject<HTMLDivElement | null>) {
  ref.current = document.createElement('div');
}

describe('useAutoScroll', () => {
  it('scrolls the sentinel into view when the trigger changes', () => {
    const { result, rerender } = renderHook(
      ({ trigger }) => useAutoScroll(trigger, true, 'session-1'),
      { initialProps: { trigger: 'a' } },
    );
    attachRef(result.current);

    rerender({ trigger: 'ab' });
    expect(scrollSpy).toHaveBeenCalledWith({ block: 'end' });
  });

  it('stops scrolling once the user scrolls up mid-stream', () => {
    const { result, rerender } = renderHook(
      ({ trigger }) => useAutoScroll(trigger, true, 'session-1'),
      { initialProps: { trigger: 'a' } },
    );
    attachRef(result.current);

    act(() => {
      window.dispatchEvent(new Event('wheel'));
    });
    scrollSpy.mockClear();

    rerender({ trigger: 'ab' });
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('re-enables auto-scroll when a new session starts', () => {
    const { result, rerender } = renderHook(
      ({ trigger, session }) => useAutoScroll(trigger, true, session),
      { initialProps: { trigger: 'a', session: 'session-1' } },
    );
    attachRef(result.current);

    // User scrolls up -> auto-scroll disabled.
    act(() => {
      window.dispatchEvent(new Event('wheel'));
    });
    scrollSpy.mockClear();

    // New conversation turn -> auto-scroll should be active again.
    rerender({ trigger: 'b', session: 'session-2' });
    expect(scrollSpy).toHaveBeenCalledWith({ block: 'end' });
  });

  it('still scrolls on trigger change while inactive, since no scroll-up could be observed', () => {
    const { result, rerender } = renderHook(
      ({ trigger }) => useAutoScroll(trigger, false, 'session-1'),
      { initialProps: { trigger: 'a' } },
    );
    attachRef(result.current);

    // When inactive the wheel/touch listeners are never attached, so auto-scroll
    // stays at its default (enabled) and the trigger effect scrolls the sentinel.
    rerender({ trigger: 'ab' });
    expect(scrollSpy).toHaveBeenCalled();
  });
});
