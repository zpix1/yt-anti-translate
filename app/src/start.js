// To run in page environment

chrome.storage.sync.get(
  {
    disabled: false,
    untranslateAudio: true,
    untranslateDescription: true,
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

      if (items.untranslateDescription) {
        const descriptionScript = document.createElement("script");
        descriptionScript.type = "module";
        descriptionScript.src = chrome.runtime.getURL("src/background_description.js");
        document.body.appendChild(descriptionScript);
      }
    }
  }
);
