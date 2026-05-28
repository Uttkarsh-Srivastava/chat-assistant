import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom does not implement scrollIntoView; stub it so useAutoScroll can call it.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// React Testing Library: unmount components rendered in a test before the next one.
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
