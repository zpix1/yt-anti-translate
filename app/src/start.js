// To run in page environment

chrome.storage.sync.get(
  {
    disabled: false,
    untranslateAudio: false,
  },
  function (items) {
    if (!items.disabled) {
      window.ytAntiTranslateConfig = {
        untranslateAudio: items.untranslateAudio,
      };
      var s = document.createElement("script");
      s.defer = true;
      s.src = chrome.runtime.getURL("src/background.js");
      document.body.appendChild(s);
    }
  }
);
