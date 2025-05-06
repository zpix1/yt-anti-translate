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
		  tellThePage();
        }
      );
    }
  );
}

function tellThePage(){
  let message;
  if (document.getElementById('status').innerText == "Enabled"){ 
    //The value is set correctly
    message = "Enable";
  }
  else if (document.getElementById('status').innerText == "Disabled")
  {
    message = "Disable";
  }
  browser.tabs.query(
    { url:"*://*.youtube.com/*" }, 
    function (tabs) {
	  for (var x = 0; x < tabs.length; x++) {
        //sending a message to content script https://stackoverflow.com/questions/14245334/sendmessage-from-extension-background-or-popup-to-content-script-doesnt-work
        browser.tabs.sendMessage(tabs[x].id, message)
          .then(response => { 
            console.log("Message from the content script:",response);
		  })
          .catch(e => {
            console.log(e);
          });
      }  
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
    }
  );
}

function checkboxUpdate() {
  chrome.storage.sync.set({
    autoreloadOption: document.getElementById("reload-checkbox").checked,
    untranslateAudio: document.getElementById("audio-checkbox").checked,
    untranslateDescription: document.getElementById("description-checkbox")
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
}

document.addEventListener("DOMContentLoaded", loadOptions);
document.addEventListener("DOMContentLoaded", addListeners);
