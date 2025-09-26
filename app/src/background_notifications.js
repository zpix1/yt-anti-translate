// Stand-alone utility functions (no external imports)

/**
 * Fetches the original (untranslated) title via YouTube oEmbed and caches it in sessionStorage.
 * @param {string} videoId
 * @returns {Promise<{ originalTitle: string|null }>}
 */
async function fetchOriginalTitle(videoId) {
  const cacheKey = `ytat_oembed_${videoId}`;
  const cached = window.YoutubeAntiTranslate.getSessionCache(cacheKey);
  if (cached) {
    return { originalTitle: cached };
  }

  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`;
  try {
    let response = await window.YoutubeAntiTranslate.cachedRequest(oembedUrl);
    if (
      !response ||
      !response.response ||
      !response.response.ok ||
      !response.data?.thumbnail_url
    ) {
      if (response?.response?.status === 401) {
        // 401 likely means the video is restricted try again with youtubeI
        response =
          await window.YoutubeAntiTranslate.getVideoTitleFromYoutubeI(videoId);
        if (!response?.response?.ok || !response.data?.title) {
          window.YoutubeAntiTranslate.logWarning(
            `YoutubeI title request failed for video ${videoId}`,
          );
          return;
        }
      }
    }

    if (
      await window.YoutubeAntiTranslate.isWhitelistedChannel(
        "whiteListUntranslateTitle",
        null,
        response.data.author_url,
      )
    ) {
      window.YoutubeAntiTranslate.logInfo(
        "Channel is whitelisted, skipping notification titles untranslation",
      );
      return { originalTitle: null };
    }

    return { originalTitle: response.data.title };
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
  const dropdown = window.YoutubeAntiTranslate.getFirstVisible(
    document.querySelectorAll(
      'ytd-popup-container tp-yt-iron-dropdown[vertical-align="top"]',
    ),
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

  // Handle :
  const colonIdx = message.indexOf(":");
  if (colonIdx !== -1) {
    return message.slice(0, colonIdx + 1) + " " + originalTitle;
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

    const videoId = window.YoutubeAntiTranslate.extractVideoIdFromUrl(
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
      !window.YoutubeAntiTranslate.doesStringInclude(
        currentTitle,
        originalTitle,
      )
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
