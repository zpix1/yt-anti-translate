document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("request-permission-button");
  const status = document.getElementById("status");

  button.addEventListener("click", async () => {
    try {
      const granted = await chrome.permissions.request({
        origins: ["*://*.youtube.com/*", "*://*.youtube-nocookie.com/*"],
      });

      if (granted) {
        status.textContent =
          "✅ Permission granted! You can close this page now 😊";
        status.className = "success";
      } else {
        status.textContent =
          "❌ Permission denied. Please retry and select 'Allow' when prompted";
        status.className = "error";
      }
    } catch (e) {
      window.YoutubeAntiTranslate.logInfo("Permission request error:", e);
      status.textContent =
        "❌ Failed to request permission - An error occurred.";
      status.className = "error";
    }
  });
});
