// Load scripts that will run in page environment
chrome.storage.sync.get(
  {
    disabled: false,
    untranslateAudio: true,
    whiteListUntranslateAudio: [],
  },
  async function (items) {
    if (
      !items.disabled &&
      items.untranslateAudio &&
      window.location.hostname === "m.youtube.com"
    ) {
      const mobileAudioScript = document.createElement("script");
      mobileAudioScript.type = "module";
      mobileAudioScript.dataset.ytantitranslatesettings = JSON.stringify(items);
      mobileAudioScript.src = chrome.runtime.getURL(
        "src/mobile-audio/background_mobile_audio.js",
      );
      document.head.prepend(mobileAudioScript);
    }
  },
);
