// To run in page environment

chrome.storage.sync.get(
  {
    disabled: false,
    untranslateAudio: false,
  },
  function (items) {
    if (!items.disabled) {
      var backgroundText = document.createElement("script");
      backgroundText.defer = true;
      backgroundText.src = chrome.runtime.getURL("src/background.js");
      document.body.appendChild(backgroundText);

      if (items.untranslateAudio) {
        var backgroundAudio = document.createElement("script");
        backgroundAudio.defer = true;
        backgroundAudio.src = chrome.runtime.getURL("src/background_audio.js");
        document.body.appendChild(backgroundAudio);
      }
    }
  }
);
