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
      untranslateChannelBranding: true,
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
      untranslateChannelBranding: true,
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
      document.getElementById("channel-branding-checkbox").checked =
        items.untranslateChannelBranding;
    }
  );
}

function checkboxUpdate() {
  chrome.storage.sync.set({
    autoreloadOption: document.getElementById("reload-checkbox").checked,
    untranslateAudio: document.getElementById("audio-checkbox").checked,
    untranslateDescription: document.getElementById("description-checkbox")
      .checked,
    untranslateChannelBranding: document.getElementById("channel-branding-checkbox")
      .checked,
  });
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
}

document.addEventListener("DOMContentLoaded", loadOptions);
document.addEventListener("DOMContentLoaded", addListeners);
