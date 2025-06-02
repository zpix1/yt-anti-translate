// Load global.js in page environment
// This is separate so that it can be injected early as it is needed by other scripts
chrome.storage.sync.get(
  {
    disabled: false,
  },
  async function (items) {
    if (!items.disabled) {
      const globalPropertiesScript = document.createElement("script");
      globalPropertiesScript.type = "module";
      globalPropertiesScript.src = chrome.runtime.getURL("src/global.js");
      document.body.appendChild(globalPropertiesScript);
    }
  },
);
