// Constants
const DESCRIPTION_SELECTOR =
  "#description-inline-expander, ytd-expander#description, .expandable-video-description-body-main, .expandable-video-description-container, #collapsed-string, #expanded-string";
const AUTHOR_SELECTOR = `#upload-info.ytd-video-owner-renderer, 
div.slim-owner-bylines > h3.slim-owner-channel-name,  
div.cbox > a > h3.reel-player-header-channel-title`;
const ATTRIBUTED_STRING_SELECTOR =
  "yt-attributed-string, .yt-core-attributed-string";
const FORMATTED_STRING_SELECTOR = "yt-formatted-string";
const SNIPPET_TEXT_SELECTOR = "#attributed-snippet-text";
const HORIZONTAL_CHAPTERS_SELECTOR =
  "ytd-horizontal-card-list-renderer, ytd-macro-markers-list-renderer";
const CHAPTER_ITEM_SELECTOR = "ytd-macro-markers-list-item-renderer";
const CHAPTER_TITLE_SELECTOR = "h4.macro-markers, h4.problem-walkthroughs";
const CHAPTER_TIME_SELECTOR = "div#time";
const CHAPTER_HEADER_SELECTOR =
  "ytd-rich-list-header-renderer yt-formatted-string#title";
const CHAPTER_STYLE = `
.ytp-tooltip.ytp-bottom.ytp-preview .ytp-tooltip-title span[data-original-chapter]::after {
    content: attr(data-original-chapter);
    font-size: 12px !important;
    line-height: normal !important;
    color: inherit;
    font-family: inherit;
    display: inline !important;
}

/* Hide all direct children of chapter button with data-original-chapter-button attribute */
.ytp-chapter-title-content[data-original-chapter-button] > * {
    display: none !important;
}

/* Show the original chapter title using the title attribute */
.ytp-chapter-title-content[data-original-chapter-button]::after {
    content: attr(title);
    font-size: var(--ytd-tab-system-font-size-body);
    line-height: var(--ytd-tab-system-line-height-body);
    font-family: var(--ytd-tab-system-font-family);
    color: inherit;
}

/* Hide translated chapter titles in horizontal cards */
ytd-macro-markers-list-item-renderer h4[data-original-chapter-title] {
    color: transparent !important;
    position: relative;
}

/* Show original chapter title using attribute */
ytd-macro-markers-list-item-renderer h4[data-original-chapter-title]::after {
    content: attr(data-original-chapter-title);
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    color: var(--yt-spec-text-primary) !important;
    font-size: inherit;
    line-height: inherit;
    font-family: inherit;
    font-weight: inherit;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-wrap: break-word;
    hyphens: auto;
}
`;

// Chapters functionality
let chaptersObserver = null;
let chapterButtonObserver = null;
let horizontalChaptersObserver = null;

/**
 * Disconnects and cleans up all observers, timers, styles and custom attributes
 * created by the chapters replacement system.
 * Call this before re-initialising the system or on page unload.
 */
function cleanupChaptersObserver() {
  if (chaptersObserver) {
    chaptersObserver.disconnect();
    chaptersObserver = null;
  }

  if (chapterButtonObserver) {
    chapterButtonObserver.disconnect();
    chapterButtonObserver = null;
  }

  if (horizontalChaptersObserver) {
    horizontalChaptersObserver.disconnect();
    horizontalChaptersObserver = null;
  }

  // Remove CSS style
  const style = document.getElementById("ynt-chapters-style");
  if (style) {
    style.remove();
  }

  // Remove all chapter attributes
  document.querySelectorAll("[data-original-chapter]").forEach((el) => {
    el.removeAttribute("data-original-chapter");
  });

  // Remove chapter button attributes
  document.querySelectorAll("[data-original-chapter-button]").forEach((el) => {
    el.removeAttribute("data-original-chapter-button");
  });

  // Remove horizontal chapter attributes
  document.querySelectorAll("[data-original-chapter-title]").forEach((el) => {
    el.removeAttribute("data-original-chapter-title");
  });

  // Remove chapter header attributes
  document.querySelectorAll("[data-original-chapter-header]").forEach((el) => {
    el.removeAttribute("data-original-chapter-header");
  });

  // Remove show all button attributes
  document.querySelectorAll("[data-original-show-all]").forEach((el) => {
    el.removeAttribute("data-original-show-all");
  });
}

/**
 * Converts a timestamp string ("HH:MM:SS" or "MM:SS") into the total number of seconds.
 *
 * @param {string} timeString - Timestamp string (e.g. "1:23" or "01:02:03").
 * @returns {number} The total number of seconds represented by the input string.
 */
function timeStringToSeconds(timeString) {
  const parts = timeString.split(":").map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]; // MM:SS
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
  }
  return 0;
}

/**
 * Extracts chapter information (start time & title) from a video description.
 * Each line that contains a timestamp will be interpreted as a chapter.
 *
 * @param {string} description - The original video description.
 * @returns {Array<{startTime:number, title:string}>} Array of chapter objects sorted by appearance.
 */
function parseChaptersFromDescription(description) {
  const chapters = [];

  description.split("\n").forEach((line) => {
    const trimmedLine = line.trim();

    // More specific regex for YouTube chapter format:
    // - Allows minimal decoration at start (bullets, dashes, etc.)
    // - Timestamp must be near the beginning of the line
    // - Must have a space/separator after timestamp before the title
    const match = trimmedLine.match(
      /^[\s–—•·▪▫‣⁃-]*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*[–—•·▪▫‣⁃:→>-]*\s*(.+)$/,
    );

    if (match) {
      const [, part1, part2, part3, title] = match;

      // Determine hours/minutes/seconds based on the presence of the third timestamp part
      let hours = 0;
      let minutes = 0;
      let seconds = 0;

      if (part3 !== undefined) {
        // Timestamp is in the form HH:MM:SS
        hours = parseInt(part1, 10);
        minutes = parseInt(part2, 10);
        seconds = parseInt(part3, 10);
      } else {
        // Timestamp is in the form MM:SS
        minutes = parseInt(part1, 10);
        seconds = parseInt(part2, 10);
      }

      // Validate timestamp values
      if (minutes >= 60 || seconds >= 60) {
        return;
      }

      // Extract clean title
      const cleanTitle = title.trim();

      // Skip if title is too short (likely not a real chapter)
      if (cleanTitle.length < 2) {
        return;
      }

      const totalSeconds = hours * 3600 + minutes * 60 + seconds;

      chapters.push({
        startTime: totalSeconds,
        title: cleanTitle,
      });
    }
  });

  return chapters;
}

/**
 * Finds the chapter that corresponds to a specific playback time.
 *
 * @param {number} timeInSeconds - Current video time.
 * @param {Array<{startTime:number, title:string}>} chapters - Parsed chapters list.
 * @returns {{startTime:number, title:string}|null} The matching chapter or null if none found.
 */
function findChapterByTime(timeInSeconds, chapters) {
  if (chapters.length === 0) {
    return null;
  }

  let targetChapter = chapters[0];
  for (let i = chapters.length - 1; i >= 0; i--) {
    if (timeInSeconds >= chapters[i].startTime) {
      targetChapter = chapters[i];
      break;
    }
  }

  return targetChapter;
}

// Cache for parsed chapters to avoid re-parsing
let cachedChapters = [];
let lastDescription = "";

/**
 * Updates the chapter title displayed inside the player tooltip so that the
 * original non-translated title is shown.
 * Uses cached chapter information for efficiency.
 */
function updateTooltipChapter() {
  // Don't touch tooltip if YouTube doesn't have chapters enabled
  if (cachedChapters.length === 0) {
    return;
  }

  // Only query for visible tooltips
  const visibleTooltip = document.querySelector(
    '.ytp-tooltip.ytp-bottom.ytp-preview:not([style*="display: none"])',
  );
  if (!visibleTooltip) {
    return;
  }

  const timeElement = visibleTooltip.querySelector(".ytp-tooltip-text");
  const titleElement = visibleTooltip.querySelector(".ytp-tooltip-title span");

  if (!timeElement || !titleElement) {
    return;
  }

  const timeString = timeElement.textContent?.trim();
  if (!timeString) {
    return;
  }

  const timeInSeconds = timeStringToSeconds(timeString);
  const targetChapter = findChapterByTime(timeInSeconds, cachedChapters);

  if (targetChapter) {
    titleElement.textContent = targetChapter.title;
  }
}

/**
 * Retrieves the current playback time of the active video element.
 *
 * @returns {number} Current playback time (seconds). Returns 0 if the video element cannot be found.
 */
function getCurrentVideoTime() {
  const video =
    document.querySelector("#movie_player video") ||
    document.querySelector("video");
  if (video && "currentTime" in video) {
    const time = Math.floor(video.currentTime);
    return time;
  }

  window.YoutubeAntiTranslate.logWarning(
    "Video element not found or no currentTime property",
  );
  return 0;
}

/**
 * Replaces the chapter button text (next to the progress bar) with the original
 * chapter title that matches the current playback position.
 */
function updateChapterButton() {
  const chapterButton = document.querySelector(
    ".ytp-chapter-title .ytp-chapter-title-content",
  );
  if (!chapterButton) {
    return;
  }

  const currentTime = getCurrentVideoTime();
  const targetChapter = findChapterByTime(currentTime, cachedChapters);

  if (targetChapter) {
    // Always update or create the span with current YouTube content
    let span = chapterButton.querySelector(`span[ynt-chapter-span]`);
    if (!span) {
      span = document.createElement("span");
      span.setAttribute("ynt-chapter-span", "current");
      span.textContent = chapterButton.textContent;
      chapterButton.textContent = "";
      chapterButton.appendChild(span);
    } else {
      // Update existing span with current YouTube content
      const currentYouTubeText = Array.from(chapterButton.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join("");

      if (currentYouTubeText && currentYouTubeText.trim()) {
        span.textContent = currentYouTubeText;
        chapterButton.childNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = "";
          }
        });
      }
    }

    window.YoutubeAntiTranslate.logDebug(
      `Chapter button updated: Time ${currentTime}s -> from "${span.textContent}" to "${targetChapter.title}"`,
    );
    chapterButton.setAttribute("title", targetChapter.title);
    chapterButton.setAttribute(
      "data-original-chapter-button",
      targetChapter.title,
    );
  }
}

/**
 * Observes DOM mutations inside the chapter button so it can be updated when
 * YouTube changes its content.
 */
function setupChapterButtonObserver() {
  const chapterButton = document.querySelector(".ytp-chapter-title");
  if (!chapterButton) {
    return;
  }

  chapterButtonObserver = new MutationObserver((mutations) => {
    let shouldUpdate = false;

    mutations.forEach((mutation) => {
      if (mutation.type === "childList" || mutation.type === "characterData") {
        const target = mutation.target;
        if (
          target.classList?.contains("ytp-chapter-title-content") ||
          target.closest(".ytp-chapter-title-content")
        ) {
          shouldUpdate = true;
        }
      }
    });

    if (shouldUpdate) {
      setTimeout(updateChapterButton, 50);
    }
  });

  chapterButtonObserver.observe(chapterButton, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // Initial update
  updateChapterButton();
}

/**
 * Entry point that initialises the whole chapters replacement workflow.
 * It parses the original description for chapter data, sets up observers,
 * interval timers and injects the required CSS to restore original titles.
 *
 * @param {string} originalDescription - Untranslated video description obtained from the player API.
 */
function setupChapters(originalDescription) {
  // Early return if description hasn't changed - avoid expensive cleanup/setup
  if (originalDescription === lastDescription) {
    window.YoutubeAntiTranslate.logDebug(
      "Description unchanged, skipping chapters setup",
    );
    return;
  }

  // Clean up any existing observer first
  cleanupChaptersObserver();

  // Cache chapters if description hasn't changed
  if (originalDescription !== lastDescription) {
    cachedChapters = parseChaptersFromDescription(originalDescription);
    lastDescription = originalDescription;
  }

  // Sort chapters by start time
  cachedChapters.sort((a, b) => a.startTime - b.startTime);

  if (cachedChapters.length === 0) {
    window.YoutubeAntiTranslate.logInfo("No chapters found in description");
    return;
  }

  window.YoutubeAntiTranslate.logInfo(
    `Found ${cachedChapters.length} original chapters`,
  );

  // Create CSS that hides chapter title text and shows custom content
  const style = document.createElement("style");
  style.id = "ynt-chapters-style";
  style.textContent = CHAPTER_STYLE;
  document.head.appendChild(style);

  // More targeted observer - watch for tooltip changes and visibility
  chaptersObserver = new MutationObserver((mutations) => {
    let shouldUpdate = false;

    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            // More specific targeting
            if (
              element.classList?.contains("ytp-tooltip") &&
              element.classList?.contains("ytp-preview")
            ) {
              shouldUpdate = true;
            }
          }
        });
      }

      // Watch for attribute changes (style changes that show/hide tooltips)
      if (mutation.type === "attributes") {
        const target = mutation.target;
        if (
          target.classList?.contains("ytp-tooltip") &&
          target.classList?.contains("ytp-preview") &&
          (mutation.attributeName === "style" ||
            mutation.attributeName === "class")
        ) {
          shouldUpdate = true;
        }
      }

      // Only watch for changes in tooltip text content
      if (mutation.type === "characterData") {
        const parent = mutation.target.parentElement;
        if (parent?.classList?.contains("ytp-tooltip-text")) {
          shouldUpdate = true;
        }
      }
    });

    if (shouldUpdate) {
      // Debounce updates
      setTimeout(updateTooltipChapter, 16); // ~60fps instead of immediate
    }
  });

  const player = document.getElementById("movie_player");
  if (player) {
    chaptersObserver.observe(player, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  }

  // Initial update for any existing visible tooltips
  setTimeout(updateTooltipChapter, 50);

  setupChapterButtonObserver();

  setupHorizontalChaptersObserver();

  window.YoutubeAntiTranslate.logInfo(
    "Optimized chapters replacement initialized with chapter button and horizontal chapters support",
  );
}

/**
 * Retrieves the YouTube player response object in a resilient way that works
 * across desktop and mobile layouts.
 *
 * @param {HTMLElement|null} playerEl - Player element if already located.
 * @returns {object|null} The player response object or null if it cannot be found.
 */
function getPlayerResponseSafely(playerEl) {
  let response = null;

  // Attempt standard desktop API first
  try {
    if (playerEl && typeof playerEl.getPlayerResponse === "function") {
      response = playerEl.getPlayerResponse();
    }
  } catch (err) {
    window.YoutubeAntiTranslate?.logDebug?.("getPlayerResponse failed", err);
  }

  // Fallback to embedded player API
  if (!response) {
    try {
      if (
        playerEl &&
        typeof playerEl.getEmbeddedPlayerResponse === "function"
      ) {
        response = playerEl.getEmbeddedPlayerResponse();
      }
    } catch (err) {
      window.YoutubeAntiTranslate?.logDebug?.(
        "getEmbeddedPlayerResponse failed",
        err,
      );
    }
  }

  // Legacy/alternate location used by some mobile builds
  if (
    !response &&
    window.ytplayer &&
    window.ytplayer.config &&
    window.ytplayer.config.args &&
    window.ytplayer.config.args.player_response
  ) {
    try {
      response = JSON.parse(window.ytplayer.config.args.player_response);
    } catch (err) {
      window.YoutubeAntiTranslate.logWarning(
        "Failed to parse ytplayer.config.args.player_response",
        err,
      );
    }
  }

  return response || null;
}

/**
 * Uses the YouTube player API to obtain the original (untranslated) video description.
 *
 * @returns {string|null} The original description or null if it cannot be retrieved.
 */
function fetchOriginalDescription() {
  const player = window.YoutubeAntiTranslate.getFirstVisible(
    document.querySelectorAll(window.YoutubeAntiTranslate.getPlayerSelector()),
  );

  const playerResponse = getPlayerResponseSafely(player);
  if (!playerResponse && window.YoutubeAntiTranslate.isMobile()) {
    // Fallback for mobile layout when player response is unavailable
    const mobileDescription = getDescriptionMobile();
    if (mobileDescription) {
      return mobileDescription;
    }
    return null;
  }

  return playerResponse.videoDetails?.shortDescription || null;
}

/**
 * Uses the YouTube player API to obtain the original (untranslated) channel author name.
 *
 * @returns {string|null} The original author or null if it cannot be retrieved.
 */
function fetchOriginalAuthor() {
  const player = window.YoutubeAntiTranslate.getFirstVisible(
    document.querySelectorAll(window.YoutubeAntiTranslate.getPlayerSelector()),
  );

  const playerResponse = getPlayerResponseSafely(player);
  if (!playerResponse && window.YoutubeAntiTranslate.isMobile()) {
    // Fallback for mobile layout when player response is unavailable
    const mobileAuthor = getAuthorMobile();
    if (mobileAuthor) {
      return mobileAuthor;
    }
    return null;
  }

  return playerResponse.videoDetails?.author || null;
}

/**
 * Restores the original (untranslated) description and author name in the DOM and
 * triggers the chapters replacement logic.
 */
function restoreOriginalDescriptionAndAuthor() {
  const originalDescription = fetchOriginalDescription();
  const originalAuthor = fetchOriginalAuthor();

  if (!originalDescription && !originalAuthor) {
    return;
  }

  if (originalDescription) {
    const descriptionContainer = window.YoutubeAntiTranslate.getFirstVisible(
      document.querySelectorAll(DESCRIPTION_SELECTOR),
    );

    if (descriptionContainer) {
      updateDescriptionContent(descriptionContainer, originalDescription);
    } else {
      window.YoutubeAntiTranslate.logWarning(
        `Video Description container not found`,
      );
    }

    setupChapters(originalDescription);
  }

  if (originalAuthor) {
    handleAuthor(originalAuthor);
  }
}

/**
 * Restores the original (untranslated) author name only
 */
function restoreOriginalAuthorOnly() {
  const originalAuthor = fetchOriginalAuthor();

  if (!originalAuthor) {
    return;
  }

  if (originalAuthor) {
    handleAuthor(originalAuthor);
  }
}

// Author handler
function handleAuthor(originalAuthor) {
  // We should skip this operation if the video player was embedded as it does not have the author above the description
  const player = window.YoutubeAntiTranslate.getFirstVisible(
    document.querySelectorAll(window.YoutubeAntiTranslate.getPlayerSelector()),
  );
  if (player && player.id === "c4-player") {
    return;
  }

  const authorContainers = window.YoutubeAntiTranslate.getAllVisibleNodes(
    document.querySelectorAll(AUTHOR_SELECTOR),
  );

  if (authorContainers) {
    for (const authorContainer of authorContainers) {
      updateAuthorContent(authorContainer, originalAuthor);
    }
  } else {
    window.YoutubeAntiTranslate.logWarning(`Video Author container not found`);
  }
}

/**
 * Replaces the translated description shown to the user with the provided original text.
 *
 * @param {HTMLElement} container - Element that contains the description.
 * @param {string} originalText - Original (untranslated) description.
 */
function updateDescriptionContent(container, originalText) {
  // Find the text containers
  const mainTextContainer = window.YoutubeAntiTranslate.getFirstVisible(
    container.querySelectorAll(
      `${ATTRIBUTED_STRING_SELECTOR}, ${FORMATTED_STRING_SELECTOR}`,
    ),
  );
  const snippetTextContainer = window.YoutubeAntiTranslate.getFirstVisible(
    container.querySelectorAll(SNIPPET_TEXT_SELECTOR),
  );

  if (!mainTextContainer && !snippetTextContainer) {
    window.YoutubeAntiTranslate.logWarning(
      `No video description text containers found`,
    );
    return;
  }

  let formattedContent = null;
  const originalTextFirstLine = originalText.split("\n")[0];

  // Helper function to check if a container needs updating
  function needsUpdate(textContainer) {
    if (!textContainer || !textContainer.hasChildNodes()) {
      return false;
    }

    // Check first line comparison
    if (
      textContainer.firstChild.hasChildNodes() &&
      textContainer.firstChild.firstChild.textContent === originalTextFirstLine
    ) {
      // If first lines match, create formatted content and do full comparison
      if (!formattedContent) {
        formattedContent =
          window.YoutubeAntiTranslate.createFormattedContent(originalText);
      }

      // Compare full content
      return (
        textContainer.firstChild.textContent !== formattedContent.textContent
      );
    }

    // First line is different, so update is needed
    return true;
  }

  // Check each container independently
  const mainNeedsUpdate = mainTextContainer
    ? needsUpdate(mainTextContainer)
    : false;
  const snippetNeedsUpdate = snippetTextContainer
    ? needsUpdate(snippetTextContainer)
    : false;

  // If neither container needs updating, return early
  if (!mainNeedsUpdate && !snippetNeedsUpdate) {
    return;
  }

  // Create formatted content if not already created
  if (!formattedContent) {
    formattedContent =
      window.YoutubeAntiTranslate.createFormattedContent(originalText);
  }

  // Update containers that need updating
  if (mainNeedsUpdate && mainTextContainer) {
    window.YoutubeAntiTranslate.replaceContainerContent(
      mainTextContainer,
      formattedContent.cloneNode(true),
    );
  }

  if (snippetNeedsUpdate && snippetTextContainer) {
    window.YoutubeAntiTranslate.replaceContainerContent(
      snippetTextContainer,
      formattedContent.cloneNode(true),
    );
  }
}

/**
 * Replaces the translated author text shown to the user with the original one.
 *
 * @param {HTMLElement} container - Element that contains the author name.
 * @param {string} originalText - Original (untranslated) author name.
 */
function updateAuthorContent(container, originalText) {
  // Find the text containers
  const mainTextContainer = window.YoutubeAntiTranslate.getFirstVisible(
    container.querySelectorAll(FORMATTED_STRING_SELECTOR),
  );
  const snippetTextContainer = window.YoutubeAntiTranslate.getFirstVisible(
    container.querySelectorAll(
      `${FORMATTED_STRING_SELECTOR} a, ${ATTRIBUTED_STRING_SELECTOR}`,
    ),
  );

  if (!mainTextContainer && !snippetTextContainer) {
    window.YoutubeAntiTranslate.logWarning(
      `No video author text containers found`,
    );
    return;
  }

  // Update both containers if they exist
  if (mainTextContainer) {
    if (mainTextContainer.title !== originalText) {
      mainTextContainer.title = originalText;
    }
  }

  if (snippetTextContainer) {
    if (snippetTextContainer.innerText !== originalText) {
      const storeStyleDisplay =
        snippetTextContainer.parentElement.style.display;
      snippetTextContainer.parentElement.style.display = "none";
      snippetTextContainer.innerText = originalText;
      // Force reflow
      setTimeout(() => {
        snippetTextContainer.parentElement.style.display = storeStyleDisplay;
      }, 50);
    }
  }
}

async function handleDescriptionMutation() {
  const descriptionElement = window.YoutubeAntiTranslate.getFirstVisible(
    document.querySelectorAll(DESCRIPTION_SELECTOR),
  );
  const player = window.YoutubeAntiTranslate.getFirstVisible(
    document.querySelectorAll(window.YoutubeAntiTranslate.getPlayerSelector()),
  );
  if (descriptionElement && player) {
    restoreOriginalDescriptionAndAuthor();
  }

  // On mobile the author is visible even when the description is not
  // so we need to check separately
  if (window.YoutubeAntiTranslate.isMobile()) {
    const authorElement = window.YoutubeAntiTranslate.getFirstVisible(
      document.querySelectorAll(AUTHOR_SELECTOR),
    );

    if (authorElement && player) {
      restoreOriginalAuthorOnly();
    }
  }
}
// Initialize the mutation observer for description
const targetNode = document.body;
const observerConfig = { childList: true, subtree: true };
const descriptionObserver = new MutationObserver(
  window.YoutubeAntiTranslate.debounce(handleDescriptionMutation, 100),
);
descriptionObserver.observe(targetNode, observerConfig);

// Add global click handler for timecode links
document.addEventListener("click", (event) => {
  const link = event.target.closest(".yt-timecode-link");
  if (!link) {
    return;
  }

  event.preventDefault();
  const seconds = parseInt(link.getAttribute("data-seconds"), 10);
  if (isNaN(seconds)) {
    return;
  }

  // Use YouTube's API to seek to the timestamp
  const player = window.YoutubeAntiTranslate.getFirstVisible(
    document.querySelectorAll(window.YoutubeAntiTranslate.getPlayerSelector()),
  );
  if (player && typeof player.seekTo === "function") {
    try {
      player.seekTo(seconds, true);
      window.YoutubeAntiTranslate.logInfo(
        `Seeking to ${link.textContent} (${seconds}s)`,
      );
    } catch (error) {
      window.YoutubeAntiTranslate.logWarning(
        `Error seeking to timestamp:`,
        error,
      );
    }
  } else {
    window.YoutubeAntiTranslate.logInfo(
      `Player not found or seekTo not available`,
    );
  }
});

/**
 * Updates the horizontal chapter card list below the video with original chapter titles.
 */
function updateHorizontalChapters() {
  const horizontalChapters = document.querySelectorAll(
    HORIZONTAL_CHAPTERS_SELECTOR,
  );

  horizontalChapters.forEach((container) => {
    const chapterItems = container.querySelectorAll(CHAPTER_ITEM_SELECTOR);

    chapterItems.forEach((item) => {
      const timeElement = item.querySelector(CHAPTER_TIME_SELECTOR);
      const titleElements = item.querySelectorAll(CHAPTER_TITLE_SELECTOR);

      if (!timeElement || titleElements.length === 0) {
        return;
      }

      const timeString = timeElement.textContent?.trim();
      if (!timeString) {
        return;
      }

      const timeInSeconds = timeStringToSeconds(timeString);
      const targetChapter = findChapterByTime(timeInSeconds, cachedChapters);

      if (targetChapter) {
        titleElements.forEach((titleElement) => {
          const currentOriginalTitle = titleElement.getAttribute(
            "data-original-chapter-title",
          );

          if (currentOriginalTitle !== targetChapter.title) {
            window.YoutubeAntiTranslate.logDebug(
              `Horizontal chapter updated: Time ${timeString} (${timeInSeconds}s) -> "${targetChapter.title}"`,
            );
            titleElement.setAttribute(
              "data-original-chapter-title",
              targetChapter.title,
            );
            titleElement.setAttribute("title", targetChapter.title);
          }
        });
      }
    });
  });
}

/**
 * Observes DOM changes that may affect the horizontal chapter cards and performs
 * updates when necessary.
 */
function setupHorizontalChaptersObserver() {
  horizontalChaptersObserver = new MutationObserver((mutations) => {
    let shouldUpdate = false;

    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            // Check if horizontal chapters were added
            if (
              element.matches?.(HORIZONTAL_CHAPTERS_SELECTOR) ||
              element.querySelector?.(HORIZONTAL_CHAPTERS_SELECTOR)
            ) {
              shouldUpdate = true;
            }
          }
        });
      }

      // Watch for text changes in chapter titles
      if (mutation.type === "characterData") {
        const parent = mutation.target.parentElement;
        if (
          parent?.matches?.(CHAPTER_TITLE_SELECTOR) ||
          parent?.matches?.(CHAPTER_HEADER_SELECTOR)
        ) {
          shouldUpdate = true;
        }
      }
    });

    if (shouldUpdate) {
      setTimeout(() => {
        updateHorizontalChapters();
      }, 100);
    }
  });

  horizontalChaptersObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // Initial update
  updateHorizontalChapters();
}

// Extract video metadata window.ytPubsubPubsubInstance
function extractVideoDataField(fieldName) {
  try {
    const pubsub = window.ytPubsubPubsubInstance;
    if (!pubsub) {
      return null;
    }

    const visited = new WeakSet();

    function search(obj, depth = 0) {
      if (!obj || typeof obj !== "object" || depth > 20 || visited.has(obj)) {
        return null;
      }
      visited.add(obj);

      if (obj.videoData && typeof obj.videoData[fieldName] === "string") {
        const videoId = obj.videoData.videoId;
        const currentVideoId =
          window.YoutubeAntiTranslate.extractVideoIdFromUrl(
            document.location.href,
          );

        if (
          videoId &&
          typeof videoId === "string" &&
          videoId !== currentVideoId
        ) {
          // If the videoId does not match the page this is an Advert
          // Ignore Advert video data
        } else {
          return obj.videoData[fieldName];
        }
      }

      const children = Array.isArray(obj) ? obj : Object.values(obj);
      for (const child of children) {
        const res = search(child, depth + 1);
        if (res) {
          return res;
        }
      }

      return null;
    }

    return search(pubsub);
  } catch (err) {
    window.YoutubeAntiTranslate?.logDebug?.(
      `extractVideoDataField(${fieldName}) failed`,
      err,
    );
    return null;
  }
}

// Get Description from the VideoData
function getDescriptionMobile() {
  return extractVideoDataField("shortDescription");
}

// Get Author from the VideoData
function getAuthorMobile() {
  return extractVideoDataField("author");
}
