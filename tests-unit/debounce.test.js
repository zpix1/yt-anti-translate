import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Side-effect import that registers the util object on window
import "../app/src/global.js";

const { debounce } = window.YoutubeAntiTranslate;

/**
 * Helper: install a requestAnimationFrame stub that uses setTimeout(0)
 * so it cooperates with Vitest's fake-timer clock.
 */
function installRAFStub() {
  global.requestAnimationFrame = (cb) =>
    window.setTimeout(() => cb(Date.now()), 0);
  global.cancelAnimationFrame = (id) => window.clearTimeout(id);
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
    Object.defineProperty(document, "hidden", {
      value: false,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    restoreRAFStub();
  });

  it("executes 1 call immediately, queue 2nd for next time frame", () => {
    const fn = vi.fn();
    const rafSpy = vi.spyOn(global, "requestAnimationFrame");

    const debounced = debounce(fn, 30);

    // First call runs immediately
    debounced();
    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(1);

    // Second call within the wait - should be added to queue but not run yet
    debounced();
    expect(fn).toHaveBeenCalledTimes(1); // no new calls yet

    vi.advanceTimersByTime(15); // half of wait window
    vi.runOnlyPendingTimers(); // still no timers should be pending yet
    expect(fn).toHaveBeenCalledTimes(1); // no new calls yet

    // 1 <debounce> call should be in the queue
    // After the wait window, the scheduled call should execute
    vi.advanceTimersByTime(20); // total 15 + 20ms > 30ms
    vi.runOnlyPendingTimers(); // the raf callback should now be pending
    expect(fn).toHaveBeenCalledTimes(2); // queued call should have executed

    vi.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(2); // No additional calls as queue was now empty

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

    debounced(); // first call this should run immediately

    vi.runOnlyPendingTimers(); // No timers should be pending yet
    expect(fn).toHaveBeenCalledTimes(1);

    debounced(); // second call within wait window - should be added to queue but not run yet

    vi.runOnlyPendingTimers(); // still no timers should be pending yet
    expect(fn).toHaveBeenCalledTimes(1); // no new calls yet

    // Should skip RAF and use setTimeout for scheduling
    expect(setTimeoutSpy).toHaveBeenCalled(); // Fallback to setTimeout should have been used
    expect(rafSpy).not.toHaveBeenCalled(); // RAF should not have been used

    // 1 <debounce> call should be in the queue
    vi.advanceTimersByTime(35); // advance past wait window
    vi.runOnlyPendingTimers(); // the setTimeout callback should now be pending
    expect(fn).toHaveBeenCalledTimes(2); // queued call should have executed
  });

  it("handles instances of the same function calls with different args as the same when includeArgsInSignature is false", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 30);
    debounced("a"); // first call with "a" signature - this should run immediately - no queue or debounce wait
    debounced("b"); // first call with "b" signature - this should run immediately - no queue or debounce wait

    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(1); // only first call executed immediately
    expect(fn).toHaveBeenNthCalledWith(1, "a");

    vi.advanceTimersByTime(35); // advance past wait window

    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(2); // second call from the queue
    expect(fn).toHaveBeenNthCalledWith(2, "b");

    // Nothing in the queue now
    vi.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(2); // No additional calls as queue was empty
  });

  it("uses getSignature to customize debounce key", () => {
    const fn = vi.fn();
    const getSignature = (ctx, args) => args.join(":");
    const debounced = debounce(fn, 30, false, getSignature);

    debounced("x", 1); // first call with "x:1" signature - this should run immediately - no queue or debounce wait
    debounced("x", 2); // first call with "x:2" signature - this should run immediately - no queue or debounce wait

    // No timers should be pending since both calls executed immediately
    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(2); // both calls executed immediately
    expect(fn).toHaveBeenNthCalledWith(1, "x", 1);
    expect(fn).toHaveBeenNthCalledWith(2, "x", 2);

    vi.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(2); // No additional calls as queue was empty
  });

  it("preserves context (this) when calling debounced function", () => {
    const obj = {
      value: 42,
      fn: vi.fn(function () {
        return this.value;
      }),
    };
    const debounced = debounce(obj.fn, 30);
    debounced.call(obj);

    vi.runOnlyPendingTimers();
    expect(obj.fn).toHaveBeenCalledTimes(1); // First call runs immediately
    expect(obj.fn).toHaveReturnedWith(42);

    vi.runAllTimers();
    expect(obj.fn).toHaveBeenCalledTimes(1); // No additional calls as queue was empty
  });

  it("Unique signature include args using includeArgsInSignature are respected on repeated calls; queue any matching signatures", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 30, true);
    const rafSpy = vi.spyOn(global, "requestAnimationFrame");

    debounced("first"); // first call with "first" signature - this should run immediately
    debounced("second"); // first call with "second" signature - this should run immediately
    debounced("third"); // first call with "third" signature - this should run immediately
    debounced("first"); // call again within wait window and signature first - should be added to queue
    debounced("second"); // call again within wait window and signature second - should be added to queue
    debounced("second"); // call again within wait window and signature second - should be skipped as already queued
    debounced("second"); // call again within wait window and signature second - should be skipped as already queued

    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(3); // three immediate calls
    expect(fn).toHaveBeenNthCalledWith(1, "first");
    expect(fn).toHaveBeenNthCalledWith(2, "second");
    expect(fn).toHaveBeenNthCalledWith(3, "third");

    vi.advanceTimersByTime(35); // advance past wait window

    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(5); // two more calls from the queue
    expect(fn).toHaveBeenNthCalledWith(4, "first");
    expect(fn).toHaveBeenNthCalledWith(5, "second");
    expect(fn).not.toHaveBeenNthCalledWith(6, "third");

    vi.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(5); // No additional calls

    // Should have called requestAnimationFrame
    expect(rafSpy).toHaveBeenCalled();
  });

  it("only executes once per wait window for rapid calls; second call is queued; subsequent calls are ignored", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 30);
    const rafSpy = vi.spyOn(global, "requestAnimationFrame");

    debounced(); // First call - should run immediately
    debounced(); // Second call within wait window - should be queued
    debounced(); // Other rapid calls within wait window - should be ignored
    debounced();
    debounced();

    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(1); // First call runs immediately

    vi.advanceTimersByTime(35); // advance past wait window

    vi.runOnlyPendingTimers(); // 1 <debounce> call should be in the queue and should now execute
    expect(fn).toHaveBeenCalledTimes(2); // Second call after wait window - other rapid calls within wait window are ignored

    // Should have called requestAnimationFrame
    expect(rafSpy).toHaveBeenCalled();
  });

  it("If identical call was executed from queue, a new call is queued instead of running immediately", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 30);
    const rafSpy = vi.spyOn(global, "requestAnimationFrame");

    debounced("C"); // First call with "A" signature - should run immediately
    debounced("C"); // Second call with "A" signature within wait window - should be queued

    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(1); // First call runs immediately

    vi.advanceTimersByTime(35); // advance past wait window
    vi.runOnlyPendingTimers(); // 1 <debounce> call should be in the queue and should now execute
    expect(fn).toHaveBeenCalledTimes(2); // Second call after wait window

    debounced("C"); // Third call with "A" signature after previous queued call executed - should be queued again

    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(2); // still 2

    vi.advanceTimersByTime(35); // advance past wait window
    vi.runOnlyPendingTimers(); // queued call should now execute
    expect(fn).toHaveBeenCalledTimes(3); // Third call after wait window

    // Should have called requestAnimationFrame
    expect(rafSpy).toHaveBeenCalled();
  });

  it("Two different debounce instances maintain separate state", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const debounced1 = debounce(fn1, 30);
    const debounced2 = debounce(fn2, 30);
    const rafSpy = vi.spyOn(global, "requestAnimationFrame");

    debounced1(); // First call with "A" signature - should run immediately
    debounced2(); // First call with "A" signature - should run immediately

    vi.runOnlyPendingTimers();
    expect(fn1).toHaveBeenCalledTimes(1); // First call runs immediately
    expect(fn2).toHaveBeenCalledTimes(1); // First call runs immediately

    debounced1(); // Second call with "A" signature within wait window - should be queued
    debounced2(); // Second call with "A" signature within wait window - should be queued

    vi.runOnlyPendingTimers();
    expect(fn1).toHaveBeenCalledTimes(1); // No new calls yet
    expect(fn2).toHaveBeenCalledTimes(1); // No new calls yet

    vi.advanceTimersByTime(35); // advance past wait window
    vi.runOnlyPendingTimers(); // 1 <debounce> call per each instance should be in the queue and should now execute
    expect(fn1).toHaveBeenCalledTimes(2); // Second call after wait window
    expect(fn2).toHaveBeenCalledTimes(2); // Second call after wait window

    vi.runAllTimers();
    expect(fn1).toHaveBeenCalledTimes(2); // No additional calls
    expect(fn2).toHaveBeenCalledTimes(2); // No additional calls

    // Should have called requestAnimationFrame
    expect(rafSpy).toHaveBeenCalled();
  });

  it("debounced async function that takes time are not concurrently executed even when queued call is ready", async () => {
    const rafSpy = vi.spyOn(global, "requestAnimationFrame");

    // create an async function that waits (simulated work)
    const fn = vi.fn(async () => {
      // simulate async work by awaiting a promise that resolves after a timeout
      await new Promise((res) => setTimeout(res, 100));
      return "done";
    });

    const debounced = debounce(fn, 30);

    // First call should run immediately (start executing async function)
    const p1 = debounced();

    // Fast-forward timers to allow any immediate scheduling to run
    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(1);

    // Immediately call again within wait window; it should be queued (not start immediately)
    const p2 = debounced();
    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(1);

    // Advance past the wait window - still should not have executed the queued call
    // as the first call is still in progress
    vi.advanceTimersByTime(30);
    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(1);

    // Finish the async work of the first call by advancing timers for its internal setTimeout
    vi.advanceTimersByTime(70); // total 100ms for async work
    vi.runOnlyPendingTimers();
    await vi.runOnlyPendingTimersAsync(); // allow Promise microtasks to flush

    // Now advance past the debounce wait so the queued call executes
    vi.advanceTimersByTime(1); // total > 100ms + 1ms since first call
    vi.runOnlyPendingTimers();

    // queued call should have executed once async slot is scheduled
    expect(fn).toHaveBeenCalledTimes(2);

    vi.runAllTimers();
    await vi.runAllTimersAsync();

    expect(fn).toHaveBeenCalledTimes(2); // No additional calls

    // Ensure RAF was used to schedule the queued call (when document not hidden)
    expect(rafSpy).toHaveBeenCalled();

    // Await the returned promises to avoid unhandled rejections and to ensure completions
    await p1;
    await p2;
  });

  it("debounced async functions that takes time are not concurrently executed and the queue is still limited to a maximum of one", async () => {
    const rafSpy = vi.spyOn(global, "requestAnimationFrame");

    // create an async function that waits (simulated work)
    const fn = vi.fn(async () => {
      // simulate async work by awaiting a promise that resolves after a timeout
      await new Promise((res) => setTimeout(res, 100));
      return "done";
    });

    const debounced = debounce(fn, 30);

    // First call should run immediately (start executing async function)
    const p1 = debounced();

    // Fast-forward timers to allow any immediate scheduling to run
    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(1);

    // Immediately call again within wait window; it should be queued (not start immediately)
    const p2 = debounced();
    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(1);

    // Advance past the wait window - still should not have executed the queued call
    // as the first call is still in progress
    vi.advanceTimersByTime(30);
    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(1);

    // Attempt to call agin while first call is still in progress and one is already queued
    const p3 = debounced();
    vi.runOnlyPendingTimers();
    expect(fn).toHaveBeenCalledTimes(1); // still only first call

    // Finish the async work of the first call by advancing timers for its internal setTimeout
    vi.advanceTimersByTime(70); // total 100ms for async work
    vi.runOnlyPendingTimers();
    await vi.runOnlyPendingTimersAsync(); // allow Promise microtasks to flush

    // Now advance past the debounce wait so the queued call executes
    vi.advanceTimersByTime(1); // total > 100ms + 1ms since first call
    vi.runOnlyPendingTimers();

    // queued call should have executed once async slot is scheduled
    expect(fn).toHaveBeenCalledTimes(2);

    vi.runAllTimers();
    await vi.runAllTimersAsync();

    expect(fn).toHaveBeenCalledTimes(2); // No additional calls

    // Ensure RAF was used to schedule the queued call (when document not hidden)
    expect(rafSpy).toHaveBeenCalled();

    // Await the returned promises to avoid unhandled rejections and to ensure completions
    await p1;
    await p2;
    await p3;
  });

  it("debounced async functions with zero running time still debounces calls", async () => {
    const rafSpy = vi.spyOn(global, "requestAnimationFrame");

    const fn = vi.fn(async () => {
      await Promise.resolve();
    });

    const debounced = debounce(fn, 30);

    // Call the debounced function multiple times in quick succession
    const p1 = debounced();
    const p2 = debounced();
    const p3 = debounced();

    // Fast-forward timers to allow any immediate scheduling to run
    vi.runOnlyPendingTimers();
    await vi.runOnlyPendingTimersAsync();

    // All calls should have been debounced
    expect(fn).toHaveBeenCalledTimes(1);

    vi.runAllTimers();
    await vi.runAllTimersAsync();

    expect(fn).toHaveBeenCalledTimes(2); // 1 additional call from the queue

    // Ensure RAF was used to schedule the queued call (when document not hidden)
    expect(rafSpy).toHaveBeenCalled();

    // Await the returned promises to avoid unhandled rejections and to ensure completions
    await p1;
    await p2;
    await p3;
  });

  it("debounced synchronous function that takes still respects debounce wait", () => {
    const rafSpy = vi.spyOn(global, "requestAnimationFrame");

    const fn = vi.fn(() => {
      // simulate synchronous work
      for (let i = 0; i < 1e6; i++) {}
    });

    const debounced = debounce(fn, 30);

    // Call the debounced function multiple times in quick succession
    debounced();
    debounced();
    debounced();

    // Fast-forward timers to allow any immediate scheduling to run
    vi.runOnlyPendingTimers();

    // All calls should have been debounced
    expect(fn).toHaveBeenCalledTimes(1);

    vi.runAllTimers();

    expect(fn).toHaveBeenCalledTimes(2); // 1 additional call from the queue

    // Ensure RAF was used to schedule the queued call (when document not hidden)
    expect(rafSpy).toHaveBeenCalled();
  });
});
