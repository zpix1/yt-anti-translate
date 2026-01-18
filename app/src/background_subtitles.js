(() => {
  const RETRY_DELAY_MS = 150;
  const MAX_RETRIES = 12;

  function sameLang(code1, code2) {
    return (
      (code1 ? code1.split("-")[0] : "") === (code2 ? code2.split("-")[0] : "")
    );
  }

  function turnOffCaptions(player, reason) {
    if (reason) {
      window.YoutubeAntiTranslate.logInfo(reason);
    }
    player.setOption("captions", "track", {});
  }

  async function setSubtitles(attempt = 0) {
    if (!window.YoutubeAntiTranslate.getSettings) {
      if (attempt < MAX_RETRIES) {
        setTimeout(() => setSubtitles(attempt + 1), RETRY_DELAY_MS);
      }
      return;
    }

    const settings = await window.YoutubeAntiTranslate.getSettings();
    if (!settings || settings.subtitlesEnabled !== true) {
      return;
    }

    const player = /** @type {any} */ (
      window.YoutubeAntiTranslate.getCachedPlayer()
    );
    if (!player || typeof player.setOption !== "function") {
      if (attempt < MAX_RETRIES) {
        setTimeout(() => setSubtitles(attempt + 1), RETRY_DELAY_MS);
      } else {
        window.YoutubeAntiTranslate.logError("Player not ready for subtitles.");
      }
      return;
    }

    const response = /** @type {any} */ (
      window.YoutubeAntiTranslate.getPlayerResponseSafely(player)
    );
    const tracks =
      response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks) {
      if (attempt < MAX_RETRIES) {
        setTimeout(() => setSubtitles(attempt + 1), RETRY_DELAY_MS);
      } else {
        window.YoutubeAntiTranslate.logError("Caption tracks not available.");
      }
      return;
    }

    const subtitlesLanguage = (settings.subtitlesLanguage || "original")
      .toString()
      .trim();

    if (subtitlesLanguage === "disabled") {
      turnOffCaptions(player, "Subtitles disabled.");
      return;
    }

    if (subtitlesLanguage === "original") {
      const asrTrack = tracks.find((track) => track.kind === "asr");
      if (!asrTrack) {
        turnOffCaptions(
          player,
          "Cannot determine original language (no ASR track).",
        );
        return;
      }

      const originalTrack = tracks.find(
        (track) =>
          sameLang(track.languageCode, asrTrack.languageCode) && !track.kind,
      );

      if (originalTrack) {
        window.YoutubeAntiTranslate.logInfo(
          `Setting subtitles to original language: "${originalTrack.name.simpleText}" [${originalTrack.languageCode}]`,
        );
        player.setOption("captions", "track", originalTrack);
        return;
      }

      turnOffCaptions(player, "No manual subtitles in original language.");
      return;
    }

    const languageTrack = tracks.find(
      (track) => sameLang(track.languageCode, subtitlesLanguage) && !track.kind,
    );

    if (languageTrack) {
      window.YoutubeAntiTranslate.logInfo(
        `Setting subtitles to selected language: "${languageTrack.name.simpleText}" [${languageTrack.languageCode}]`,
      );
      player.setOption("captions", "track", languageTrack);
      return;
    }

    turnOffCaptions(
      player,
      `Selected language "${subtitlesLanguage}" not available.`,
    );
  }

  setSubtitles();
})();
