// To run in page environment

chrome.storage.sync.get(
  {
    disabled: false,
    untranslateAudio: false,
  },
  async function (items) {
    if (!items.disabled) {
      const backgroundScript = document.createElement("script");
      backgroundScript.type = "module";
      backgroundScript.src = chrome.runtime.getURL("src/background.js");
      document.body.appendChild(backgroundScript);

      if (items.untranslateAudio) {
        const backgroundAudioScript = document.createElement("script");
        backgroundAudioScript.type = "module";
        backgroundAudioScript.src = chrome.runtime.getURL(
          "src/background_audio.js"
        );
        document.body.appendChild(backgroundAudioScript);
      }
    }
  }
);
