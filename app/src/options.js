function saveOptions() {
  if (document.getElementById("reload-checkbox").checked) {
    chrome.tabs.reload();
  }
  chrome.storage.sync.get(
    {
      disabled: false,
      autoreloadOption: true,
      untranslateAudio: true,
      untranslateDescription: true,
      untranslateChannelBranding: false,
      youtubeDataApiKey: null
    },
    function (items) {
      let disabled = !items.disabled;
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
        }
      );
    }
  );
}

function loadOptions() {
  chrome.storage.sync.get(
    {
      disabled: false,
      autoreloadOption: true,
      untranslateAudio: true,
      untranslateDescription: true,
      untranslateChannelBranding: false,
      youtubeDataApiKey: null
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
      document.getElementById("audio-checkbox").checked =
        items.untranslateAudio;
      document.getElementById("description-checkbox").checked =
        items.untranslateDescription;

      const untranslateChannelBrandingCheckbox = document.getElementById("channel-branding-checkbox");
      const apiKeyInput = document.getElementById("api-key-input");
      const additionalFeaturesContainer = document.getElementById("additional-features");

      if (items.youtubeDataApiKey) {
        untranslateChannelBrandingCheckbox.checked = items.untranslateChannelBranding;
        apiKeyInput.value = items.youtubeDataApiKey;
        additionalFeaturesContainer.style.display = "flex";
      }
      else {
        additionalFeaturesContainer.style.display = "none";
        untranslateChannelBrandingCheckbox.checked = false;
      }
    }
  );
}

function checkboxUpdate() {
  chrome.storage.sync.set({
    autoreloadOption: document.getElementById("reload-checkbox").checked,
    untranslateAudio: document.getElementById("audio-checkbox").checked,
    untranslateDescription: document.getElementById("description-checkbox").checked,
    untranslateChannelBranding: document.getElementById("channel-branding-checkbox").checked
  });
}

function apiKeyUpdate() {
  const newApiKey = document.getElementById("api-key-input").value.trim();
  const saveButton = document.getElementById("save-api-key-button");
  const saveButtonText = document.getElementById("save-api-key-text");
  const additionalFeaturesContainer = document.getElementById("additional-features");
  // Additional feutures checkboxes:
  const untranslateChannelBrandingCheckbox = document.getElementById("channel-branding-checkbox");

  // Save API key
  chrome.storage.sync.get(
    {
      untranslateChannelBranding: false,
      youtubeDataApiKey: null
    },
    function (items) {
      if (items.youtubeDataApiKey === newApiKey) return; // No change, no update needed

      chrome.storage.sync.set(
        {
          youtubeDataApiKey: newApiKey
        },
        () => {
          console.log("API key saved:", newApiKey);

          // Only show features if key is non-empty
          if (newApiKey) {
            additionalFeaturesContainer.style.display = "block";
            untranslateChannelBrandingCheckbox.checked = items.untranslateChannelBranding;
          }
          else {
            additionalFeaturesContainer.style.display = "none";
            untranslateChannelBrandingCheckbox.checked = false;
          }
        }
      );
    });

  // Show feedback in the button
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
    .getElementById("disable-button")
    .addEventListener("click", saveOptions);
  document
    .getElementById("reload-checkbox")
    .addEventListener("click", checkboxUpdate);
  document
    .getElementById("audio-checkbox")
    .addEventListener("click", checkboxUpdate);
  document
    .getElementById("description-checkbox")
    .addEventListener("click", checkboxUpdate);
  document
    .getElementById("channel-branding-checkbox")
    .addEventListener("click", checkboxUpdate);
  document
    .getElementById("save-api-key-button")
    .addEventListener("click", apiKeyUpdate);
}

document.addEventListener("DOMContentLoaded", loadOptions);
document.addEventListener("DOMContentLoaded", addListeners);