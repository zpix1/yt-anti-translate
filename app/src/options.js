// Whitelist save buttons
const whitelistIds = [
  {
    saveButtonId: "save-whitelist-title-button",
    textareaId: "whitelist-title-input",
    statusId: "whitelist-title-status",
    storageKey: "whiteListUntranslateTitle",
    saveToAllButtonId: "save-to-all-whitelist-title-button",
  },
  {
    saveButtonId: "save-whitelist-audio-button",
    textareaId: "whitelist-audio-input",
    statusId: "whitelist-audio-status",
    storageKey: "whiteListUntranslateAudio",
    saveToAllButtonId: "save-to-all-whitelist-audio-button",
  },
  {
    saveButtonId: "save-whitelist-description-button",
    textareaId: "whitelist-description-input",
    statusId: "whitelist-description-status",
    storageKey: "whiteListUntranslateDescription",
    saveToAllButtonId: "save-to-all-whitelist-description-button",
  },
  {
    saveButtonId: "save-whitelist-chapters-button",
    textareaId: "whitelist-chapters-input",
    statusId: "whitelist-chapters-status",
    storageKey: "whiteListUntranslateChapters",
    saveToAllButtonId: "save-to-all-whitelist-chapters-button",
  },
  {
    saveButtonId: "save-whitelist-channel-branding-button",
    textareaId: "whitelist-channel-branding-input",
    statusId: "whitelist-channel-branding-status",
    storageKey: "whiteListUntranslateChannelBranding",
    saveToAllButtonId: "save-to-all-whitelist-channel-branding-button",
  },
  {
    saveButtonId: "save-whitelist-thumbnail-button",
    textareaId: "whitelist-thumbnail-input",
    statusId: "whitelist-thumbnail-status",
    storageKey: "whiteListUntranslateThumbnail",
    saveToAllButtonId: "save-to-all-whitelist-thumbnail-button",
  },
];

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
      whiteListUntranslateTitle: [],
      untranslateAudio: true,
      untranslateAudioOnlyAI: false,
      whiteListUntranslateAudio: [],
      untranslateDescription: true,
      whiteListUntranslateDescription: [],
      untranslateChapters: true,
      whiteListUntranslateChapters: [],
      untranslateChannelBranding: true,
      whiteListUntranslateChannelBranding: [],
      untranslateNotification: true,
      untranslateThumbnail: true,
      whiteListUntranslateThumbnail: [],
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
      whiteListUntranslateTitle: [],
      untranslateAudio: true,
      untranslateAudioOnlyAI: false,
      whiteListUntranslateAudio: [],
      untranslateDescription: true,
      whiteListUntranslateDescription: [],
      untranslateChapters: true,
      whiteListUntranslateChapters: [],
      untranslateChannelBranding: true,
      whiteListUntranslateChannelBranding: [],
      untranslateNotification: true,
      untranslateThumbnail: true,
      whiteListUntranslateThumbnail: [],
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
      /** @type {HTMLInputElement} */ (
        document.getElementById("reload-checkbox")
      ).checked = items.autoreloadOption;
      /** @type {HTMLInputElement} */ (
        document.getElementById("title-checkbox")
      ).checked = items.untranslateTitle;
      /** @type {HTMLInputElement} */ (
        document.getElementById("audio-checkbox")
      ).checked = items.untranslateAudio;
      /** @type {HTMLInputElement} */ (
        document.getElementById("audio-only-ai-checkbox")
      ).checked = items.untranslateAudioOnlyAI;
      /** @type {HTMLInputElement} */ (
        document.getElementById("description-checkbox")
      ).checked = items.untranslateDescription;
      /** @type {HTMLInputElement} */ (
        document.getElementById("chapters-checkbox")
      ).checked = items.untranslateChapters;
      /** @type {HTMLInputElement} */ (
        document.getElementById("channel-branding-checkbox")
      ).checked = items.untranslateChannelBranding;
      /** @type {HTMLInputElement} */ (
        document.getElementById("notification-checkbox")
      ).checked = items.untranslateNotification;
      /** @type {HTMLInputElement} */ (
        document.getElementById("api-key-input")
      ).value = items.youtubeDataApiKey;
      /** @type {HTMLInputElement} */ (
        document.getElementById("thumbnail-checkbox")
      ).checked = items.untranslateThumbnail;
      /** @type {HTMLTextAreaElement} */ (
        document.getElementById("whitelist-title-input")
      ).value = items.whiteListUntranslateTitle.join("\n");
      /** @type {HTMLTextAreaElement} */ (
        document.getElementById("whitelist-audio-input")
      ).value = items.whiteListUntranslateAudio.join("\n");
      /** @type {HTMLTextAreaElement} */ (
        document.getElementById("whitelist-description-input")
      ).value = items.whiteListUntranslateDescription.join("\n");
      /** @type {HTMLTextAreaElement} */ (
        document.getElementById("whitelist-chapters-input")
      ).value = items.whiteListUntranslateChapters.join("\n");
      /** @type {HTMLTextAreaElement} */ (
        document.getElementById("whitelist-channel-branding-input")
      ).value = items.whiteListUntranslateChannelBranding.join("\n");
      /** @type {HTMLTextAreaElement} */ (
        document.getElementById("whitelist-thumbnail-input")
      ).value = items.whiteListUntranslateThumbnail.join("\n");
    },
  );
}

function checkboxUpdate() {
  chrome.storage.sync.set(
    {
      autoreloadOption: /** @type {HTMLInputElement} */ (
        document.getElementById("reload-checkbox")
      ).checked,
      untranslateTitle: /** @type {HTMLInputElement} */ (
        document.getElementById("title-checkbox")
      ).checked,
      untranslateAudio: /** @type {HTMLInputElement} */ (
        document.getElementById("audio-checkbox")
      ).checked,
      untranslateAudioOnlyAI: /** @type {HTMLInputElement} */ (
        document.getElementById("audio-only-ai-checkbox")
      ).checked,
      untranslateDescription: /** @type {HTMLInputElement} */ (
        document.getElementById("description-checkbox")
      ).checked,
      untranslateChapters: /** @type {HTMLInputElement} */ (
        document.getElementById("chapters-checkbox")
      ).checked,
      untranslateChannelBranding: /** @type {HTMLInputElement} */ (
        document.getElementById("channel-branding-checkbox")
      ).checked,
      untranslateNotification: /** @type {HTMLInputElement} */ (
        document.getElementById("notification-checkbox")
      ).checked,
      untranslateThumbnail: /** @type {HTMLInputElement} */ (
        document.getElementById("thumbnail-checkbox")
      ).checked,
    },
    () => {
      reloadActiveYouTubeTab();
    },
  );
}

function validateAndSaveWhitelist(textareaId, statusTextId, storageKey) {
  chrome.storage.sync.get(
    {
      autoreloadOption: true,
    },
    function (items) {
      // Verify that the textarea has:
      // - one handle per line
      // - begins with @
      // - at least one character after @
      // - have no spaces
      // - does not contain urls special characters
      // note: underscores (_), hyphens (-), periods (.), Latin middle dots (·) allowed
      //       with exceptions of usage the beginning or end of a handle

      const textarea = /** @type {HTMLTextAreaElement} */ (
        document.getElementById(textareaId)
      );

      const lines = textarea.value.split("\n");
      let validLines = [];
      const invalidLines = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0) {
          continue; // Skip empty lines
        }
        if (
          trimmed.startsWith("@") &&
          !trimmed.includes(" ") &&
          !/[^\w\s_\-.·@]/.test(trimmed) &&
          !/[_.\-·]$/.test(trimmed) &&
          !/^@[_.\-·]/.test(trimmed) &&
          !/^@+$/.test(trimmed)
        ) {
          validLines.push(trimmed);
        } else {
          invalidLines.push(trimmed);
        }
      }

      const status = document.getElementById(statusTextId);
      if (invalidLines.length > 0) {
        if (status) {
          status.textContent = `❌ Invalid entries: ${invalidLines.join(", ")}`;
          status.className = "whitelist-status error";
          hideSaveToAllButtons();
        }
        if (validLines.length === 0) {
          status.removeAttribute("hidden");
          return;
        }
      }

      status.setAttribute("hidden", "true");
      const button = textarea.parentElement.querySelector("button");
      const buttonText = button.querySelector("span");
      const originalText = buttonText.textContent;
      buttonText.classList.add("saving");
      buttonText.textContent = "Saving...";
      button.disabled = true;

      //dedupe valid lines (case insensitive)
      validLines = Array.from(
        new Set(validLines.map((line) => line.toLowerCase())),
      );

      chrome.storage.sync.set(
        {
          [storageKey]: validLines,
        },
        () => {
          if (status) {
            if (invalidLines.length > 0) {
              buttonText.textContent = `${validLines.length} Valid entries saved`;
              status.textContent += `\n✅ ${validLines.length} Valid entries saved: ${validLines.join(", ")}`;
              status.className = "whitelist-status partial-success";
              hideSaveToAllButtons();
              status.removeAttribute("hidden");
              setTimeout(() => {
                buttonText.textContent = originalText;
                button.disabled = false;
                buttonText.classList.remove("saving");
              }, 1500);
              setTimeout(() => {
                status.textContent = status.textContent.split("\n")[0]; // Keep only the first line (errors)
                status.className = "whitelist-status error";
              }, 3000);
              if (items.autoreloadOption && isPopup()) {
                reloadActiveYouTubeTab();
              }
              return;
            }
            buttonText.textContent = `${validLines.length} Whitelist entries saved!`;
            textarea.value = validLines.join("\n");
            // Reveal the "Save to All Whitelists" button when there are ONLY valid lines or saved as empty
            revealSaveToAllButton(textareaId, validLines);
            setTimeout(() => {
              buttonText.textContent = originalText;
              button.disabled = false;
              buttonText.classList.remove("saving");
            }, 1500);
            if (items.autoreloadOption && isPopup()) {
              reloadActiveYouTubeTab();
            }
          }
        },
      );
    },
  );
}

// Map to store last valid values for each whitelist input id
const lastValidWhitelistValues = new Map();

function hideSaveToAllButtons() {
  for (const btnId of whitelistIds.map((w) => w.saveToAllButtonId)) {
    const btn = document.getElementById(btnId);
    const parentSpan = btn?.parentElement;
    if (btn && btn.tagName === "BUTTON" && parentSpan) {
      parentSpan.hidden = true;
      btn.onclick = null;
    }
  }
}

function revealSaveToAllButton(textareaId, validLines) {
  lastValidWhitelistValues.set(textareaId, validLines);

  const btnId = whitelistIds.find(
    (w) => w.textareaId === textareaId,
  )?.saveToAllButtonId;
  if (!btnId) {
    return;
  }
  /** @type {HTMLElement|null} */
  const saveToAllBtn = document.getElementById(btnId);
  const parentSpan = saveToAllBtn?.parentElement;
  if (saveToAllBtn && saveToAllBtn.tagName === "BUTTON" && parentSpan) {
    /** @type {HTMLButtonElement} */
    parentSpan.hidden = false;
    saveToAllBtn.onclick = () => openConfirmModal(textareaId);
  }
}

function openConfirmModal(textareaId) {
  const values = lastValidWhitelistValues.get(textareaId) || [];
  const modal = document.getElementById("confirm-modal");
  const msg = document.getElementById("confirm-modal-message");
  const btnCancel = /** @type {HTMLButtonElement} */ (
    document.getElementById("confirm-modal-cancel")
  );
  const btnYes = /** @type {HTMLButtonElement} */ (
    document.getElementById("confirm-modal-yes")
  );
  if (!modal || !msg || !btnCancel || !btnYes) {
    return;
  }
  if (values.length === 0) {
    msg.textContent = `This will delete the values inside all the other whitelists. Are you sure you want to proceed?`;
  } else {
    msg.textContent = `This will overwrite the values inside all the other whitelists with "${values.join(", ")}". Are you sure you want to proceed?`;
  }
  modal.style.display = "flex";
  const close = () => {
    modal.style.display = "none";
    btnCancel.onclick = null;
    btnYes.onclick = null;
  };
  btnCancel.onclick = close;
  btnYes.onclick = () => {
    saveValuesToAllOtherWhitelists(textareaId, values);
    close();
  };
}

function saveValuesToAllOtherWhitelists(sourceTextareaId, values) {
  const allIds = whitelistIds.map((w) => w.textareaId);
  const targetIds = allIds.filter((id) => id !== sourceTextareaId);

  const toSet = {};
  for (const id of targetIds) {
    const key = whitelistIds.find((w) => w.textareaId === id)?.storageKey;
    toSet[key] = values;
    // update textarea UI immediately
    const textarea = /** @type {HTMLTextAreaElement} */ (
      document.getElementById(id)
    );
    if (textarea) {
      textarea.value = values.join("\n");
    }
  }

  chrome.storage.sync.set(toSet, () => {
    window.YoutubeAntiTranslate?.logInfo?.(
      "Whitelists overwritten across all categories",
    );
    hideSaveToAllButtons();
  });
}

function apiKeyUpdate() {
  const newApiKey = /** @type {HTMLInputElement} */ (
    document.getElementById("api-key-input")
  ).value.trim();
  const saveButton = /** @type {HTMLButtonElement} */ (
    document.getElementById("save-api-key-button")
  );
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

function isPopup() {
  try {
    return chrome.extension.getViews({ type: "popup" }).includes(window);
  } catch {
    // In case the API isn't available (e.g. not in extension context)
    return false;
  }
}

function isMobile() {
  // Simple mobile detection (covers iOS, Android, and most mobile browsers)
  return /\b(Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile)\b/i.test(
    navigator.userAgent,
  );
}

function optionTabChanges() {
  // If window type is not popup OR it is in any mobile browser
  if (!isPopup() || isMobile()) {
    const scrollWrapper = /** @type {HTMLElement} */ (
      document.querySelector(".scroll-wrapper")
    );
    if (scrollWrapper) {
      scrollWrapper.style.maxHeight = "none";
    }
    const expandLink = document.getElementById("expand-popup-link");
    if (expandLink) {
      expandLink.style.visibility = "hidden";
    }
    const whitelistsSection = document.getElementById("whitelists");
    if (whitelistsSection) {
      whitelistsSection.removeAttribute("hidden");
    }
    const manageWhitelists = document.getElementById("manage-whitelists");
    if (manageWhitelists) {
      manageWhitelists.setAttribute("hidden", "true");
    }
  }
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
    .getElementById("chapters-checkbox")
    .addEventListener("click", checkboxUpdate);
  document
    .getElementById("channel-branding-checkbox")
    .addEventListener("click", checkboxUpdate);
  document
    .getElementById("notification-checkbox")
    .addEventListener("click", checkboxUpdate);
  document
    .getElementById("thumbnail-checkbox")
    .addEventListener("click", checkboxUpdate);
  document
    .getElementById("save-api-key-button")
    .addEventListener("click", apiKeyUpdate);

  for (const whitelist of whitelistIds) {
    const button = document.getElementById(whitelist.saveButtonId);
    if (button) {
      button.addEventListener("click", () => {
        validateAndSaveWhitelist(
          whitelist.textareaId,
          whitelist.statusId,
          whitelist.storageKey,
        );
      });
    }

    const saveToAllBtnSpan = document.getElementById(
      whitelist.saveToAllButtonId,
    )?.parentElement;
    if (saveToAllBtnSpan) {
      // Handlers attached when revealed; keep hidden by default
      saveToAllBtnSpan.hidden = true;
    }

    // Add input event listener to hide "Save to All" button on changes
    const textarea = document.getElementById(whitelist.textareaId);
    if (textarea) {
      textarea.addEventListener("input", () => {
        hideSaveToAllButtons();
      });
    }
  }
}

document.addEventListener("DOMContentLoaded", optionTabChanges);
document.addEventListener("DOMContentLoaded", renderFooterLinks);
document.addEventListener("DOMContentLoaded", checkPermissions);
document.addEventListener("DOMContentLoaded", loadOptions);
document.addEventListener("DOMContentLoaded", addListeners);
