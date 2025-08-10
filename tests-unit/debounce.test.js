import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Side-effect import that registers the util object on window
import "../app/src/global.js";

const { debounce } = window.YoutubeAntiTranslate;

/**
 * Helper: install a requestAnimationFrame stub that uses setTimeout(0)
 * so it cooperates with Vitest's fake-timer clock.
 */
function installRAFStub() {
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}

function restoreRAFStub() {
  delete global.requestAnimationFrame;
  delete global.cancelAnimationFrame;
}

describe("YoutubeAntiTranslate.debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installRAFStub();
    // Ensure default visibility unless the test overrides it
    Object.defineProperty(document, "visible", {
      value: false,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    restoreRAFStub();
  });

  it("executes immediately and throttles subsequent calls when document is visible", () => {
    const fn = vi.fn();
    const rafSpy = vi.spyOn(global, "requestAnimationFrame");

    const debounced = debounce(fn, 30);

    // First call runs immediately
    debounced();
    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(1);

    // Second call within the wait window should schedule but not run yet
    debounced();
    vi.advanceTimersByTime(15); // half of wait window
    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(1);

    // After the wait window, the scheduled call should execute
    vi.advanceTimersByTime(20); // total 35ms > 30ms
    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(2);

    // Should have called requestAnimationFrame
    expect(rafSpy).toHaveBeenCalled();
  });

  it("falls back to setTimeout when document is hidden", () => {
    // Simulate background tab
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });

    const fn = vi.fn();
    const debounced = debounce(fn, 30);

    const setTimeoutSpy = vi.spyOn(global, "setTimeout");
    const rafSpy = vi.spyOn(global, "requestAnimationFrame");

    debounced();

    // Should skip RAF and use setTimeout for scheduling
    expect(setTimeoutSpy).toHaveBeenCalled();
    expect(rafSpy).not.toHaveBeenCalled();

    // Execute timers to allow the debounced function to run
    vi.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
