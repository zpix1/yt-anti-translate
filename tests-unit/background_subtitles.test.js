import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("background_subtitles", () => {
  let originalYoutubeAntiTranslate;

  async function loadModule() {
    vi.resetModules();
    await import("../app/src/background_subtitles.js");
    await Promise.resolve();
    await Promise.resolve();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    originalYoutubeAntiTranslate = window.YoutubeAntiTranslate;
    window.YoutubeAntiTranslate = {
      getSettings: vi.fn(),
      getCachedPlayer: vi.fn(),
      getPlayerResponseSafely: vi.fn(),
      logInfo: vi.fn(),
    };
  });

  afterEach(() => {
    window.YoutubeAntiTranslate = originalYoutubeAntiTranslate;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('turns off captions when "disabled" is selected after the player becomes available', async () => {
    const player = {
      setOption: vi.fn(),
    };

    window.YoutubeAntiTranslate.getSettings.mockResolvedValue({
      subtitlesEnabled: true,
      subtitlesLanguage: "disabled",
    });
    window.YoutubeAntiTranslate.getCachedPlayer
      .mockReturnValueOnce(null)
      .mockReturnValue(player);
    window.YoutubeAntiTranslate.getPlayerResponseSafely.mockReturnValue({
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [
            {
              languageCode: "en",
              name: { simpleText: "English" },
            },
          ],
        },
      },
    });

    await loadModule();

    expect(player.setOption).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(150);

    expect(player.setOption).toHaveBeenCalledWith("captions", "track", {});
    expect(window.YoutubeAntiTranslate.logInfo).toHaveBeenCalledWith(
      "Subtitles disabled.",
    );
    expect(window.YoutubeAntiTranslate.getPlayerResponseSafely).toHaveBeenCalled();
  });

  it("sets the selected manual track when subtitles are enabled", async () => {
    const player = {
      setOption: vi.fn(),
    };
    const englishTrack = {
      languageCode: "en",
      name: { simpleText: "English" },
    };

    window.YoutubeAntiTranslate.getSettings.mockResolvedValue({
      subtitlesEnabled: true,
      subtitlesLanguage: "en",
    });
    window.YoutubeAntiTranslate.getCachedPlayer.mockReturnValue(player);
    window.YoutubeAntiTranslate.getPlayerResponseSafely.mockReturnValue({
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [englishTrack],
        },
      },
    });

    await loadModule();

    expect(player.setOption).toHaveBeenCalledWith(
      "captions",
      "track",
      englishTrack,
    );
    expect(window.YoutubeAntiTranslate.logInfo).toHaveBeenCalledWith(
      'Setting subtitles to selected language: "English" [en]',
    );
  });
});
