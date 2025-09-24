async function hasPermanentHostPermission(origin) {
  return new Promise((resolve, reject) => {
    window.YoutubeAntiTranslate.getBrowserOrChrome().permissions.getAll(
      (allPermissions) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(allPermissions.origins?.includes(origin));
        }
      },
    );
  });
}

async function checkPermissions() {
  const permissionWarning = document.getElementById("permission-warning");

  if (!permissionWarning) {
    window.YoutubeAntiTranslate.logInfo("Permission elements not found in DOM");
    return;
  }

  const hasPermanentYouTube = await hasPermanentHostPermission(
    "*://*.youtube.com/*",
  );

  if (!hasPermanentYouTube) {
    permissionWarning.style.display = "block";
  }

  const hasPermanentYouTubeNoCookie = await hasPermanentHostPermission(
    "*://*.youtube-nocookie.com/*",
  );

  if (!hasPermanentYouTubeNoCookie) {
    permissionWarning.style.display = "block";
  }
}

function requestPermissions() {
  chrome.tabs.create({
    url: chrome.runtime.getURL("pages/permission.html"),
  });
  window.close();
}

function renderFooterLinks() {
  const footer = document.getElementById("footer-links");

  if (!footer) {
    return;
  }

  footer.textContent = ""; // Clear existing

  const links = [
    window.YoutubeAntiTranslate.isFirefoxBasedBrowser()
      ? {
          text: "Rate extension",
          href: "https://addons.mozilla.org/firefox/addon/youtube-anti-translate-mv3/",
        }
      : {
          text: "Rate extension",
          href: "https://chrome.google.com/webstore/detail/yt-anti-translate/ndpmhjnlfkgfalaieeneneenijondgag",
        },
    {
      text: "Report issues",
      href: "https://github.com/zpix1/yt-anti-translate",
    },
    window.YoutubeAntiTranslate.isFirefoxBasedBrowser()
      ? {
          text: "Support developer",
          href: "https://github.com/sponsors/namakeingo",
        }
      : { text: "Support developer", href: "https://zpix1.github.io/donate/" },
  ];

  links.forEach((link, i) => {
    const a = document.createElement("a");
    a.href = link.href;
    a.target = "_blank";
    a.textContent = link.text;
    footer.appendChild(a);
    if (i < links.length - 1) {
      footer.appendChild(document.createTextNode(" • "));
    }
  });
}

const reloadActiveYouTubeTab = (toggled = false) => {
  chrome.storage.sync.get(
    {
      disabled: false,
      autoreloadOption: true,
    },
    function (items) {
      if (!items.autoreloadOption) {
        return;
      }

      if (items.disabled && !toggled) {
        return;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.url && tab.url.match(/^.*youtube\.com\/.*$/)) {
          chrome.tabs.reload(tab.id);
          return;
        }
      });

      // Send a message to `content_start.js` to trigger reload in the content script
      // This is needed to reload the pages that are inside iFrames
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs[0];
        if (tab && tab.id) {
          try {
            await chrome.tabs.sendMessage(tab.id, { type: "reload" });
          } catch (error) {
            console.info("The extension is not active in this tab:", error);
          }
        }
      });
    },
  );
};

function saveOptions() {
  reloadActiveYouTubeTab(/*toggled=*/ true);
  chrome.storage.sync.get(
    {
      disabled: false,
      autoreloadOption: true,
      untranslateTitle: true,
      untranslateAudio: true,
      untranslateAudioOnlyAI: false,
      untranslateDescription: true,
      untranslateChannelBranding: true,
      untranslateNotification: true,
      youtubeDataApiKey: null,
    },
    function (items) {
      const disabled = !items.disabled;
      chrome.storage.sync.set(
        {
          disabled: disabled,
        },
        function () {
          document.getElementById("disable-button").innerText = disabled
            ? "Enable"
            : "Disable";
          document.getElementById("status").innerText = disabled
            ? "Disabled"
            : "Enabled";
          document.getElementById("status").className =
            "status " + (disabled ? "disabled" : "enabled");
          document.getElementById("disable-button").className = disabled
            ? "disabled"
            : "enabled";
        },
      );
    },
  );
}

function loadOptions() {
  chrome.storage.sync.get(
    {
      disabled: false,
      autoreloadOption: true,
      untranslateTitle: true,
      untranslateAudio: true,
      untranslateAudioOnlyAI: false,
      untranslateDescription: true,
      untranslateChannelBranding: true,
      untranslateNotification: true,
      youtubeDataApiKey: null,
    },
    function (items) {
      document.getElementById("disable-button").innerText = items.disabled
        ? "Enable"
        : "Disable";
      document.getElementById("status").innerText = items.disabled
        ? "Disabled"
        : "Enabled";
      document.getElementById("status").className =
        "status " + (items.disabled ? "disabled" : "enabled");
      document.getElementById("disable-button").className = items.disabled
        ? "disabled"
        : "enabled";
      document.getElementById("reload-checkbox").checked =
        items.autoreloadOption;
      document.getElementById("title-checkbox").checked =
        items.untranslateTitle;
      document.getElementById("audio-checkbox").checked =
        items.untranslateAudio;
      document.getElementById("audio-only-ai-checkbox").checked =
        items.untranslateAudioOnlyAI;
      document.getElementById("description-checkbox").checked =
        items.untranslateDescription;
      document.getElementById("channel-branding-checkbox").checked =
        items.untranslateChannelBranding;
      document.getElementById("notification-checkbox").checked =
        items.untranslateNotification;
      document.getElementById("api-key-input").value = items.youtubeDataApiKey;
    },
  );
}

function checkboxUpdate() {
  chrome.storage.sync.set(
    {
      autoreloadOption: document.getElementById("reload-checkbox").checked,
      untranslateTitle: document.getElementById("title-checkbox").checked,
      untranslateAudio: document.getElementById("audio-checkbox").checked,
      untranslateAudioOnlyAI: document.getElementById("audio-only-ai-checkbox")
        .checked,
      untranslateDescription: document.getElementById("description-checkbox")
        .checked,
      untranslateChannelBranding: document.getElementById(
        "channel-branding-checkbox",
      ).checked,
      untranslateNotification: document.getElementById("notification-checkbox")
        .checked,
    },
    () => {
      reloadActiveYouTubeTab();
    },
  );
}

function apiKeyUpdate() {
  const newApiKey = document.getElementById("api-key-input").value.trim();
  const saveButton = document.getElementById("save-api-key-button");
  const saveButtonText = document.getElementById("save-api-key-text");

  chrome.storage.sync.get(
    {
      youtubeDataApiKey: null,
    },
    function (items) {
      if (items.youtubeDataApiKey === newApiKey) {
        return;
      }

      chrome.storage.sync.set(
        {
          youtubeDataApiKey: newApiKey,
        },
        () => {
          window.YoutubeAntiTranslate.logInfo("API key saved");
        },
      );
    },
  );

  const originalText = saveButtonText.textContent;
  saveButtonText.classList.add("saving");
  saveButtonText.textContent = "Saved!";
  saveButton.disabled = true;
  setTimeout(() => {
    saveButtonText.textContent = originalText;
    saveButton.disabled = false;
    saveButtonText.classList.remove("saving");
  }, 1500);
}

function addListeners() {
  document
    .getElementById("request-permission-button")
    .addEventListener("click", requestPermissions);
  document
    .getElementById("disable-button")
    .addEventListener("click", saveOptions);
  document
    .getElementById("reload-checkbox")
    .addEventListener("click", checkboxUpdate);
  document
    .getElementById("title-checkbox")
    .addEventListener("click", checkboxUpdate);
  document
    .getElementById("audio-checkbox")
    .addEventListener("click", checkboxUpdate);
  document
    .getElementById("audio-only-ai-checkbox")
    .addEventListener("click", checkboxUpdate);
  document
    .getElementById("description-checkbox")
    .addEventListener("click", checkboxUpdate);
  document
    .getElementById("channel-branding-checkbox")
    .addEventListener("click", checkboxUpdate);
  document
    .getElementById("notification-checkbox")
    .addEventListener("click", checkboxUpdate);
  document
    .getElementById("save-api-key-button")
    .addEventListener("click", apiKeyUpdate);
}

document.addEventListener("DOMContentLoaded", renderFooterLinks);
document.addEventListener("DOMContentLoaded", checkPermissions);
document.addEventListener("DOMContentLoaded", loadOptions);
document.addEventListener("DOMContentLoaded", addListeners);
