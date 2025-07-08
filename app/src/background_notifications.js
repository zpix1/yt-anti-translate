// Stand-alone utility functions (no external imports)

/**
 * Normalizes text for comparison (unicode NFKC, single-space, trimmed, lower-case).
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return (text || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Extracts the YouTube video ID from a given URL.
 * Supports /watch?v=, /shorts/, and full URLs.
 * @param {string} url
 * @returns {string|null}
 */
function extractVideoIdFromUrl(url) {
  try {
    const u = new URL(url, window.location.origin);
    if (u.pathname === "/watch") {
      return u.searchParams.get("v");
    }
    if (u.pathname.startsWith("/shorts/")) {
      return u.pathname.split("/")[2] || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches the original (untranslated) title via YouTube oEmbed and caches it in sessionStorage.
 * @param {string} videoId
 * @returns {Promise<{ originalTitle: string|null }>}
 */
async function fetchOriginalTitle(videoId) {
  const cacheKey = `ytat_oembed_${videoId}`;
  const cached = window.YoutubeAntiTranslate.getSessionCache(cacheKey);
  if (cached !== null) {
    return { originalTitle: cached };
  }

  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`;
  try {
    const response = await fetch(oembedUrl);
    if (!response.ok) {
      window.YoutubeAntiTranslate.logWarning(
        `oEmbed request failed (${response.status}) for video ${videoId}`,
      );
      window.YoutubeAntiTranslate.setSessionCache(cacheKey, null);
      return { originalTitle: null };
    }
    const data = await response.json();
    const title = data.title || null;
    window.YoutubeAntiTranslate.setSessionCache(cacheKey, title);
    return { originalTitle: title };
  } catch (err) {
    window.YoutubeAntiTranslate.logWarning(
      `oEmbed fetch error for video ${videoId}:`,
      err,
    );
    window.YoutubeAntiTranslate.setSessionCache(cacheKey, null);
    return { originalTitle: null };
  }
}

// Observer and refresh logic for notification popup titles
/** @type {MutationObserver | null} */
let notificationMutationObserver = null;

function setupNotificationTitlesObserver() {
  // Clean up any existing observer
  cleanupNotificationTitlesObserver();

  // Wait for the notification popup to appear in the DOM
  const dropdown = document.querySelector(
    'ytd-popup-container tp-yt-iron-dropdown[vertical-align="top"]',
  );
  if (!dropdown) {
    return;
  }

  // Initial refresh when popup opens
  refreshNotificationTitles();

  // Observe mutations inside the popup (new notifications loaded on scroll)
  const contentWrapper = dropdown.querySelector("#contentWrapper");
  if (!contentWrapper) {
    return;
  }

  notificationMutationObserver = new MutationObserver(() => {
    refreshNotificationTitles();
  });

  notificationMutationObserver.observe(contentWrapper, {
    childList: true,
    subtree: true,
  });
}

function cleanupNotificationTitlesObserver() {
  if (notificationMutationObserver) {
    notificationMutationObserver.disconnect();
    notificationMutationObserver = null;
  }
}

/**
 * Replaces only the last quoted segment inside a notification message with the original title.
 * Supports standard double quotes (") and angle quotes («»).
 * If no suitable quoted segment is found, returns the originalTitle alone.
 * @param {string} message
 * @param {string} originalTitle
 * @returns {string}
 */
function replaceVideoTitleInNotification(message, originalTitle) {
  if (!message) {
    return originalTitle;
  }

  // Handle standard double quotes first
  let endIdx = message.lastIndexOf('"');
  if (endIdx !== -1) {
    const startIdx = message.lastIndexOf('"', endIdx - 1);
    if (startIdx !== -1) {
      return (
        message.slice(0, startIdx + 1) + originalTitle + message.slice(endIdx)
      );
    }
  }

  // Handle angle quotes « »
  endIdx = message.lastIndexOf("»");
  if (endIdx !== -1) {
    const startIdx = message.lastIndexOf("«", endIdx - 1);
    if (startIdx !== -1) {
      return (
        message.slice(0, startIdx + 1) + originalTitle + message.slice(endIdx)
      );
    }
  }

  // Fallback – return originalTitle
  return originalTitle;
}

/**
 * Refreshes the titles inside the notifications pop-up, replacing any translated
 * titles with their original versions.
 * @returns {Promise<void>}
 */
async function refreshNotificationTitles() {
  // Select all notification title elements
  /** @type {NodeListOf<HTMLElement>} */
  const notificationTitleElements = document.querySelectorAll(
    ".ytd-notification-renderer .message",
  );
  for (const titleElement of notificationTitleElements) {
    const anchor = titleElement.closest("a");
    if (!anchor) {
      continue;
    }
    const href = anchor.getAttribute("href");
    if (!href) {
      continue;
    }

    const videoId = extractVideoIdFromUrl(
      href.startsWith("http") ? href : window.location.origin + href,
    );
    if (!videoId) {
      continue;
    }

    const currentTitle = titleElement.textContent;
    const titleFetchResult = await fetchOriginalTitle(videoId);
    const originalTitle = titleFetchResult.originalTitle;
    if (!originalTitle) {
      continue;
    }

    if (
      originalTitle &&
      !normalizeText(currentTitle).includes(normalizeText(originalTitle))
    ) {
      const replaced = replaceVideoTitleInNotification(
        currentTitle,
        originalTitle,
      );
      titleElement.textContent = replaced;

      // Log the replacement using the extension-wide logger (no console colors)
      window.YoutubeAntiTranslate.logInfo(
        `Updated notification title for video ${videoId}`,
        {
          before: currentTitle,
          after: replaced,
        },
      );
    }
  }
}
// --- Auto setup similar to background.js ---

// Observe DOM changes and (re)initialize notification observer when the pop-up appears/disappears
const notificationDropdownObserver = new MutationObserver(() => {
  const dropdownExists = document.querySelector(
    'ytd-popup-container tp-yt-iron-dropdown[vertical-align="top"]',
  );
  if (dropdownExists) {
    setupNotificationTitlesObserver();
  } else {
    // In case the pop-up has been closed/remove, disconnect our inner observer
    cleanupNotificationTitlesObserver();
  }
});

// Start observing the whole document body for relevant changes
if (document.body) {
  notificationDropdownObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
