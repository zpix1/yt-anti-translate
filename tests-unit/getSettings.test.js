import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "../app/src/global.js";

const getSettings = window.YoutubeAntiTranslate.getSettings.bind(
  window.YoutubeAntiTranslate,
);

describe("YoutubeAntiTranslate.getSettings (actual async impl)", () => {
  let origQuerySelector;
  let origChrome;

  beforeEach(() => {
    origQuerySelector = document.querySelector;
    origChrome = window.chrome;
  });

  afterEach(() => {
    document.querySelector = origQuerySelector;
    window.chrome = origChrome;
    vi.restoreAllMocks();
  });

  it("returns settings from DOM script tag if present and valid", async () => {
    const fakeSettings = { foo: 1, bar: "baz" };
    document.querySelector = vi.fn().mockReturnValue({
      dataset: { ytantitranslatesettings: JSON.stringify(fakeSettings) },
    });
    const settings = await getSettings();
    expect(settings).toEqual(fakeSettings);
  });

  it("falls back to chrome.storage.sync.get if DOM script tag is missing", async () => {
    document.querySelector = vi.fn().mockReturnValue(null);
    window.chrome = {
      storage: {
        sync: {
          get: vi
            .fn()
            .mockImplementation(async (defaults) => ({ ...defaults, foo: 42 })),
        },
      },
    };
    const settings = await getSettings();
    expect(settings).toHaveProperty("foo", 42);
    expect(settings).toHaveProperty("disabled", false);
    expect(settings).toHaveProperty("untranslateTitle", true);
  });

  it("falls back to chrome.storage.sync.get if DOM script tag is invalid JSON", async () => {
    document.querySelector = vi.fn().mockReturnValue({
      dataset: { ytantitranslatesettings: "not-json" },
    });
    window.chrome = {
      storage: {
        sync: {
          get: vi
            .fn()
            .mockImplementation(async (defaults) => ({ ...defaults, foo: 99 })),
        },
      },
    };
    const settings = await getSettings();
    expect(settings).toHaveProperty("foo", 99);
    expect(settings).toHaveProperty("disabled", false);
  });

  it("returns {} if neither DOM nor chrome.storage.sync.get is available", async () => {
    document.querySelector = vi.fn().mockReturnValue(null);
    window.chrome = undefined;
    const settings = await getSettings();
    expect(settings).toEqual({});
  });
  it("falls back to chrome.storage.sync.get if DOM script tag has no dataset", async () => {
    document.querySelector = vi.fn().mockReturnValue({});
    window.chrome = {
      storage: {
        sync: {
          get: vi.fn().mockImplementation(async (defaults) => ({
            ...defaults,
            foo: 123,
          })),
        },
      },
    };
    const settings = await getSettings();
    expect(settings).toHaveProperty("foo", 123);
    expect(settings).toHaveProperty("disabled", false);
  });

  it("falls back to chrome.storage.sync.get if DOM script tag has no ytantitranslatesettings", async () => {
    document.querySelector = vi.fn().mockReturnValue({ dataset: {} });
    window.chrome = {
      storage: {
        sync: {
          get: vi.fn().mockImplementation(async (defaults) => ({
            ...defaults,
            foo: 456,
          })),
        },
      },
    };
    const settings = await getSettings();
    expect(settings).toHaveProperty("foo", 456);
    expect(settings).toHaveProperty("disabled", false);
  });

  it("returns {} if chrome.storage.sync.get is missing", async () => {
    document.querySelector = vi.fn().mockReturnValue(null);
    window.chrome = { storage: { sync: {} } };
    const settings = await getSettings();
    expect(settings).toEqual({});
  });
});
