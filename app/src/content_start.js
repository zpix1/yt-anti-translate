// Load scripts that will run in page environment
chrome.storage.sync.get(
  {
    disabled: false,
    untranslateTitle: true,
    whiteListUntranslateTitle: [],
    untranslateAudio: true,
    whiteListUntranslateAudio: [],
    untranslateDescription: true,
    whiteListUntranslateDescription: [],
    untranslateChapters: true,
    whiteListUntranslateChapters: [],
    untranslateChannelBranding: true,
    whiteListUntranslateChannelBranding: [],
    untranslateNotification: true,
    whiteListUntranslateNotification: [],
    untranslateThumbnail: true,
    whiteListUntranslateThumbnail: [],
  },
  async function (items) {
    if (!items.disabled) {
      if (
        items.untranslateTitle ||
        items.untranslateDescription ||
        items.untranslateChannelBranding ||
        items.untranslateThumbnail
      ) {
        const backgroundScript = document.createElement("script");
        backgroundScript.type = "module";
        backgroundScript.src = chrome.runtime.getURL("src/background.js");
        document.body.appendChild(backgroundScript);
      }

      // Inject notification title handler if enabled
      if (items.untranslateNotification) {
        const backgroundNotificationScript = document.createElement("script");
        backgroundNotificationScript.type = "module";
        backgroundNotificationScript.src = chrome.runtime.getURL(
          "src/background_notifications.js",
        );
        document.body.appendChild(backgroundNotificationScript);
      }

      if (items.untranslateAudio) {
        const backgroundAudioScript = document.createElement("script");
        backgroundAudioScript.type = "module";
        backgroundAudioScript.src = chrome.runtime.getURL(
          "src/background_audio.js",
        );
        document.body.appendChild(backgroundAudioScript);
      }

      if (
        items.untranslateDescription ||
        items.untranslateChapters ||
        items.untranslateChannelBranding
      ) {
        const descriptionScript = document.createElement("script");
        descriptionScript.type = "module";
        descriptionScript.src = chrome.runtime.getURL(
          "src/background_description.js",
        );
        document.body.appendChild(descriptionScript);
      }
    }
  },
);

// Listen for reload messages from the extension popup
// This is needed to reload the pages that are inside iFrames
chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === "reload") {
    window.location.reload();
  }
});
