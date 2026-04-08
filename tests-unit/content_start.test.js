import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("content_start", () => {
  let originalChrome;

  async function loadModuleWithItems(items) {
    vi.resetModules();

    window.chrome = /** @type {any} */ ({
      storage: {
        sync: {
          get: vi.fn((defaults, callback) =>
            callback({ ...defaults, ...items }),
          ),
        },
      },
      runtime: {
        getURL: vi.fn((path) => `chrome-extension://test/${path}`),
        onMessage: {
          addListener: vi.fn(),
        },
      },
    });
    global.chrome = window.chrome;

    await import("../app/src/content_start.js");
    await Promise.resolve();
  }

  function getInjectedScriptSources() {
    return Array.from(document.querySelectorAll("script")).map(
      (script) => script.getAttribute("src") || "",
    );
  }

  beforeEach(() => {
    originalChrome = window.chrome;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.chrome = originalChrome;
    global.chrome = originalChrome;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("does not inject the subtitles script when the subtitles checkbox is off", async () => {
    await loadModuleWithItems({
      untranslateTitle: false,
      untranslateAudio: false,
      untranslateDescription: false,
      untranslateChapters: false,
      untranslateChannelBranding: false,
      untranslateNotification: false,
      untranslateThumbnail: false,
      subtitlesEnabled: false,
    });

    expect(getInjectedScriptSources()).not.toContain(
      "chrome-extension://test/src/background_subtitles.js",
    );
  });

  it("injects the subtitles script when the subtitles checkbox is on", async () => {
    await loadModuleWithItems({
      untranslateTitle: false,
      untranslateAudio: false,
      untranslateDescription: false,
      untranslateChapters: false,
      untranslateChannelBranding: false,
      untranslateNotification: false,
      untranslateThumbnail: false,
      subtitlesEnabled: true,
    });

    expect(getInjectedScriptSources()).toContain(
      "chrome-extension://test/src/background_subtitles.js",
    );
  });
});
