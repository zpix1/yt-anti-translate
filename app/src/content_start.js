// Load scripts that will run in page environment
chrome.storage.sync.get(
  {
    disabled: false,
    untranslateAudio: true,
    untranslateDescription: true,
    untranslateNotification: true,
  },
  async function (items) {
    if (!items.disabled) {
      const backgroundScript = document.createElement("script");
      backgroundScript.type = "module";
      backgroundScript.src = chrome.runtime.getURL("src/background.js");
      document.body.appendChild(backgroundScript);

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

      if (items.untranslateDescription) {
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

// Listen for reload messages from the extension (chrome.runtime messaging)
chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === "reload") {
    window.location.reload();
  }
});
