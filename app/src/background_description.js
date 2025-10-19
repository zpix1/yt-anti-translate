// Constants
const DESCRIPTION_SELECTOR =
  "#description-inline-expander, ytd-expander#description, .expandable-video-description-body-main, .expandable-video-description-container, #collapsed-string, #expanded-string, #anchored-panel ytd-text-inline-expander";
const AUTHOR_SELECTOR = `#upload-info.ytd-video-owner-renderer, 
ytm-slim-owner-renderer div.slim-owner-bylines,  
div.cbox > a.reel-player-header-channel-endpoint.cbox`;
const ATTRIBUTED_STRING_SELECTOR = "yt-attributed-string";

const ATTRIBUTED_STRING_CLASS_SELECTOR = ".yt-core-attributed-string";
const FORMATTED_STRING_SELECTOR = "yt-formatted-string";
const SNIPPET_TEXT_SELECTOR =
  "#attributed-snippet-text, #formatted-snippet-text, #plain-snippet-text";
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
  // Simplified timestamp pattern – captures [hours:]minutes:seconds
  const TIMESTAMP_REGEX = /(\d{1,3}):(\d{2})(?::(\d{2}))?/;
  // Characters that frequently separate timestamp and title (bullets, dashes, etc.)
  const TRIM_CHARS_REGEX = /^[\s–—•·▪▫‣⁃:→>-]+|[\s–—•·▪▫‣⁃:→>-]+$/g;

  const chapters = [];

  description.split("\n").forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }

    const tsMatch = line.match(TIMESTAMP_REGEX);
    if (!tsMatch) {
      return; // No timestamp – not a chapter line
    }

    const [fullTs, part1, part2, part3] = tsMatch;
    const before = line.slice(0, tsMatch.index).trim();
    const after = line.slice(tsMatch.index + fullTs.length).trim();

    // Parse time components
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    if (part3 !== undefined) {
      hours = parseInt(part1, 10);
      minutes = parseInt(part2, 10);
      seconds = parseInt(part3, 10);
    } else {
      minutes = parseInt(part1, 10);
      seconds = parseInt(part2, 10);
    }

    // Validate time values
    // Always ensure seconds < 60.
    if (seconds >= 60) {
      return;
    }
    // If hours component is present (part3 defined) then minutes must be < 60.
    if (part3 !== undefined && minutes >= 60) {
      return;
    }

    // Decide which side of the timestamp contains the title
    let title = after.length ? after : before;
    title = title.replace(TRIM_CHARS_REGEX, "").trim();
    if (title.length < 2) {
      return; // Likely not a valid title
    }

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    chapters.push({ startTime: totalSeconds, title });
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

  const timeElement = window.YoutubeAntiTranslate.getFirstVisible(
    visibleTooltip.querySelectorAll(
      ".ytp-tooltip-text, .ytp-tooltip-progress-bar-pill-time-stamp",
    ),
  );
  const titleElement = window.YoutubeAntiTranslate.getFirstVisible(
    visibleTooltip.querySelectorAll(
      ".ytp-tooltip-title span, .ytp-tooltip-progress-bar-pill-title",
    ),
  );

  if (timeElement && titleElement) {
    const timeString = timeElement.textContent?.trim();
    if (timeString) {
      const timeInSeconds = timeStringToSeconds(timeString);
      const targetChapter = findChapterByTime(timeInSeconds, cachedChapters);

      if (targetChapter) {
        titleElement.textContent = targetChapter.title;
      }
    }
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
    const time = Math.floor(Number(video.currentTime));
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
      if (
        (mutation.type === "childList" || mutation.type === "characterData") &&
        mutation.target.nodeType === Node.ELEMENT_NODE
      ) {
        const target = /** @type {Element} */ (mutation.target);
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
            const element = /** @type {Element} */ (node);
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
      if (
        mutation.type === "attributes" &&
        mutation.target.nodeType === Node.ELEMENT_NODE
      ) {
        const target = /** @type {Element} */ (mutation.target);
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
      // YouTube updates tooltip text on every mouse move along timeline [#132](https://github.com/zpix1/yt-anti-translate/issues/132)
      // debounce using requestAnimationFrame because setTimeout is too slow and no debounce at all is laggy
      // requestAnimationFrame only works with tab visible but that's acceptable for this use case as user won't be able to use the tooltip when tab is not visible
      requestAnimationFrame(updateTooltipChapter);
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
 * Uses the YouTube player API to obtain the original (untranslated) video description.
 *
 * @returns {Promise<{shortDescription: string|null, title: string|null, channelId: string|null}>} The original description or null if it cannot be retrieved.
 */
async function fetchOriginalDescription() {
  const player = window.YoutubeAntiTranslate.getFirstVisible(
    document.querySelectorAll(window.YoutubeAntiTranslate.getPlayerSelector()),
    /*shouldBeInsideViewport=*/ false,
  );

  const playerResponse =
    window.YoutubeAntiTranslate.getPlayerResponseSafely(player);
  if (!playerResponse && window.YoutubeAntiTranslate.isMobile()) {
    // Fallback for mobile layout when player response is unavailable
    const mobileDescription = await getDescriptionMobile();
    if (mobileDescription) {
      return mobileDescription;
    }
    return null;
  }

  return {
    shortDescription:
      playerResponse?.["videoDetails"]?.shortDescription ||
      playerResponse?.["videoDetails"]?.title ||
      null,
    title: playerResponse?.["videoDetails"]?.title || null,
    channelId: playerResponse?.["videoDetails"]?.channelId || null,
  };
}

/**
 * Uses the YouTube player API to obtain the original (untranslated) channel author name.
 *
 * @returns {string|null} The original author or null if it cannot be retrieved.
 */
function fetchOriginalAuthor() {
  const player = window.YoutubeAntiTranslate.getFirstVisible(
    document.querySelectorAll(window.YoutubeAntiTranslate.getPlayerSelector()),
    /*shouldBeInsideViewport=*/ false,
  );

  const playerResponse =
    window.YoutubeAntiTranslate.getPlayerResponseSafely(player);
  if (!playerResponse && window.YoutubeAntiTranslate.isMobile()) {
    // Fallback for mobile layout when player response is unavailable
    const mobileAuthor = getAuthorMobile();
    if (mobileAuthor) {
      return mobileAuthor;
    }
    return null;
  }

  return playerResponse?.["videoDetails"]?.author || null;
}

/**
 * Restores the original (untranslated) description and author name in the DOM and
 * triggers the chapters replacement logic.
 */
async function restoreOriginalDescriptionAndAuthor() {
  const settings = await window.YoutubeAntiTranslate.getSettings();

  const originalDescriptionData =
    settings.untranslateDescription || settings.untranslateChapters
      ? await fetchOriginalDescription()
      : null;
  const originalAuthor = fetchOriginalAuthor();
  const originalTitle = settings.untranslateChannelBranding
    ? await getTitle(document.location.href)
    : null;

  if (!originalDescriptionData && !originalAuthor && !originalTitle) {
    return;
  }

  if (originalDescriptionData.shortDescription) {
    if (settings.untranslateDescription) {
      const descriptionContainer = window.YoutubeAntiTranslate.getFirstVisible(
        document.querySelectorAll(DESCRIPTION_SELECTOR),
      );

      if (descriptionContainer) {
        if (
          await window.YoutubeAntiTranslate.isWhitelistedChannel(
            "whiteListUntranslateDescription",
            null,
            null,
            originalDescriptionData.channelId,
          )
        ) {
          window.YoutubeAntiTranslate.logInfo(
            "Channel is whitelisted, skipping video description untranslation",
          );
        } else {
          updateDescriptionContent(
            descriptionContainer,
            originalDescriptionData.shortDescription,
          );
        }
      } else {
        window.YoutubeAntiTranslate.logWarning(
          `Video Description container not found`,
        );
      }
    }

    if (settings.untranslateChapters) {
      if (
        await window.YoutubeAntiTranslate.isWhitelistedChannel(
          "whiteListUntranslateChapters",
          null,
          null,
          null,
          originalAuthor,
        )
      ) {
        window.YoutubeAntiTranslate.logInfo(
          "Channel is whitelisted, skipping video chapters untranslation",
        );
      } else {
        setupChapters(originalDescriptionData.shortDescription);
      }
    }
  }

  if (settings.untranslateChannelBranding && originalAuthor) {
    await handleAuthor(originalAuthor, originalTitle);
  }
}

/**
 * Restores the original (untranslated) author name only
 */
async function restoreOriginalAuthorOnly() {
  const originalAuthor = fetchOriginalAuthor();

  if (!originalAuthor) {
    return;
  }

  await handleAuthor(originalAuthor);
}

// Author handler
async function handleAuthor(originalAuthor, originalTitle = null) {
  if (
    await window.YoutubeAntiTranslate.isWhitelistedChannel(
      "whiteListUntranslateChannelBranding",
      null,
      null,
      null,
      originalAuthor,
    )
  ) {
    window.YoutubeAntiTranslate.logInfo(
      "Channel is whitelisted, skipping channel branding untranslation",
    );
  } else {
    // We should skip this operation if the video player was embedded as it does not have the author above the description
    const player = window.YoutubeAntiTranslate.getFirstVisible(
      document.querySelectorAll(
        window.YoutubeAntiTranslate.getPlayerSelector(),
      ),
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
      window.YoutubeAntiTranslate.logWarning(
        `Video Author container not found`,
      );
    }
  }

  if (originalTitle) {
    const avatarStack = window.YoutubeAntiTranslate.getFirstVisible(
      document.querySelectorAll("#owner #avatar-stack"),
    );
    if (avatarStack) {
      await updateCollaboratorAuthors(avatarStack, originalAuthor);
    } else {
      window.YoutubeAntiTranslate.logInfo(
        "Video Avatar Stack container not found",
      );
    }
  }
}

/**
 * Replaces the translated description shown to the user with the provided original text.
 *
 * @param {Element} container - Element that contains the description.
 * @param {string} originalText - Original (untranslated) description.
 */
function updateDescriptionContent(container, originalText) {
  // Find the text containers
  const mainTextContainer = window.YoutubeAntiTranslate.getFirstVisible(
    container.querySelectorAll(
      `${ATTRIBUTED_STRING_SELECTOR}, ${ATTRIBUTED_STRING_CLASS_SELECTOR}, ${FORMATTED_STRING_SELECTOR}`,
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
    ? !mainTextContainer.closest(
        SNIPPET_TEXT_SELECTOR,
      ) /*mainTextContainer selector can include the children of snippetTextContainer so make sure that snippetTextContainer is not a parent*/ &&
      !mainTextContainer.querySelector(
        "#description-placeholder",
      ) /*ignore placeholder*/ &&
      (!window.YoutubeAntiTranslate.isMobile ||
        (window.YoutubeAntiTranslate.isDarkTheme() &&
          !mainTextContainer.querySelector(
            '[style="color: rgb(170, 170, 170);"]',
          )) ||
        (!window.YoutubeAntiTranslate.isDarkTheme() &&
          !mainTextContainer.querySelector(
            '[style="color: rgb(96, 96, 96);"]',
          ))) /*ignore grey text on mobile*/ &&
      needsUpdate(mainTextContainer)
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
 * @param {Element} container - Element that contains the author name.
 * @param {string} originalText - Original (untranslated) author name.
 */
function updateAuthorContent(container, originalText) {
  // Find the text containers
  const singularChannelNameTitleContainer =
    window.YoutubeAntiTranslate.getFirstVisible(
      container.querySelectorAll(`#channel-name ${FORMATTED_STRING_SELECTOR}`),
    );
  const singularChannelNameTextContainer =
    window.YoutubeAntiTranslate.getFirstVisible(
      container.querySelectorAll(
        `#channel-name ${FORMATTED_STRING_SELECTOR} a, #channel-name ${ATTRIBUTED_STRING_SELECTOR}, #channel-name ${ATTRIBUTED_STRING_CLASS_SELECTOR}, .slim-owner-channel-name > ${ATTRIBUTED_STRING_CLASS_SELECTOR}, 
        .reel-player-header-channel-title > ${ATTRIBUTED_STRING_CLASS_SELECTOR}`,
      ),
    );

  const multipleChannelNameContainers =
    window.YoutubeAntiTranslate.getFirstVisible(
      container.querySelectorAll(
        `#attributed-channel-name ${ATTRIBUTED_STRING_CLASS_SELECTOR} a.yt-core-attributed-string__link`,
      ),
    );

  if (
    !singularChannelNameTitleContainer &&
    !singularChannelNameTextContainer &&
    !multipleChannelNameContainers
  ) {
    window.YoutubeAntiTranslate.logInfo(
      `No video author text containers found`,
    );
    return;
  }

  // Update both containers if they exist
  if (singularChannelNameTitleContainer) {
    if (
      singularChannelNameTitleContainer.getAttribute("title") !== originalText
    ) {
      singularChannelNameTitleContainer.setAttribute("title", originalText);
    }
  }

  if (singularChannelNameTextContainer) {
    if (singularChannelNameTextContainer.textContent !== originalText) {
      const storeStyleDisplay =
        singularChannelNameTextContainer.parentElement.style.display;
      singularChannelNameTextContainer.parentElement.style.display = "none";
      singularChannelNameTextContainer.textContent = originalText;
      // Force reflow
      setTimeout(() => {
        singularChannelNameTextContainer.parentElement.style.display =
          storeStyleDisplay;
      }, 50);
    }
  }

  if (multipleChannelNameContainers) {
    // Check that we have two text nodes before replacing
    const textNodes = Array.from(
      multipleChannelNameContainers.childNodes,
    ).filter((node) => node.nodeType === Node.TEXT_NODE);

    // Check also the text node of the first span with no classes as some languages have that in the structure too
    // e.g.: <span class style>...</span>
    const firstSpan =
      multipleChannelNameContainers.querySelector("span[class='']");
    let firstSpanTextNodes;

    if (firstSpan) {
      firstSpanTextNodes = Array.from(firstSpan.childNodes).filter(
        (node) => node.nodeType === Node.TEXT_NODE,
      );
    }

    if (!textNodes && !firstSpanTextNodes) {
      return;
    }

    if (
      textNodes &&
      textNodes.length < 2 &&
      firstSpanTextNodes &&
      firstSpanTextNodes.length < 2
    ) {
      window.YoutubeAntiTranslate.logDebug(
        `Not enough text nodes found for this type of updateAuthorContent`,
      );
      return;
    }

    let firstTextNode;
    if (textNodes && textNodes.length >= 2) {
      firstTextNode = window.YoutubeAntiTranslate.getFirstTextNode(
        multipleChannelNameContainers,
      );
    } else if (firstSpanTextNodes && firstSpanTextNodes.length >= 2) {
      firstTextNode = window.YoutubeAntiTranslate.getFirstTextNode(firstSpan);
    }

    if (firstTextNode && firstTextNode.textContent !== originalText) {
      firstTextNode.textContent = originalText;
    }
  }
}

async function updateCollaboratorAuthors(avatarStack, originalAuthor) {
  const avatarStackImages = avatarStack.querySelectorAll("yt-avatar-shape img");

  const authors = [];

  if (avatarStackImages && avatarStackImages.length > 1) {
    for (const avatarImage of avatarStackImages) {
      const imgSrc = avatarImage.src;
      if (!imgSrc || imgSrc.trim() === "") {
        continue;
      }

      const originalDescriptionData = await fetchOriginalDescription();

      const originalCollaborators =
        await window.YoutubeAntiTranslate.getOriginalCollaboratorsItemsWithYoutubeI(
          `${originalAuthor} ${originalDescriptionData.title}`,
        );

      const originalItem = originalCollaborators?.find(
        (item) => item.avatarImage === avatarImage.src,
      );
      if (!originalItem) {
        continue;
      }

      authors.push(originalItem.name);
    }

    if (authors.length > 0) {
      const mainAuthor = originalAuthor;
      // Remove main author from collaborators list
      const collaboratorAuthorsOnly = authors.filter(
        (name) => name !== mainAuthor,
      );

      if (collaboratorAuthorsOnly && collaboratorAuthorsOnly.length === 1) {
        if (
          await window.YoutubeAntiTranslate.isWhitelistedChannel(
            "whiteListUntranslateChannelBranding",
            null,
            null,
            null,
            collaboratorAuthorsOnly[0],
          )
        ) {
          window.YoutubeAntiTranslate.logInfo(
            "Channel is whitelisted, skipping channel branding untranslation",
          );
          return;
        }

        const multipleChannelNameContainer =
          window.YoutubeAntiTranslate.getFirstVisible(
            avatarStack
              .closest("#owner")
              .querySelectorAll(
                `#attributed-channel-name ${ATTRIBUTED_STRING_CLASS_SELECTOR} a.yt-core-attributed-string__link`,
              ),
          );

        const localizedAnd = window.YoutubeAntiTranslate.getLocalizedAnd(
          document.documentElement.lang,
        );

        // Count text nodes to know if we need to include the main author before the and
        const textNodes = Array.from(
          multipleChannelNameContainer.childNodes,
        ).filter((node) => node.nodeType === Node.TEXT_NODE);

        // Check also the text node of the first span with no classes as some languages have that in the structure too
        // e.g.: <span class style>...</span>
        const firstSpan =
          multipleChannelNameContainer.querySelector("span[class='']");
        let firstSpanTextNodes;

        if (firstSpan) {
          firstSpanTextNodes = Array.from(firstSpan.childNodes).filter(
            (node) => node.nodeType === Node.TEXT_NODE,
          );
        }

        if (!textNodes && !firstSpanTextNodes) {
          return;
        }

        let includeMainAuthor = false;
        if (
          textNodes &&
          textNodes.length < 2 &&
          firstSpanTextNodes &&
          firstSpanTextNodes.length < 2
        ) {
          includeMainAuthor = true;
        }
        const untranslatedCollaboratorText = `${includeMainAuthor ? `${mainAuthor} ` : ""}${localizedAnd} ${collaboratorAuthorsOnly[0]}`;

        if (
          textNodes &&
          textNodes.length >= 2 &&
          multipleChannelNameContainer &&
          !multipleChannelNameContainer.textContent.includes(
            untranslatedCollaboratorText,
          )
        ) {
          replaceTextNodeContent(
            multipleChannelNameContainer,
            includeMainAuthor ? 0 : 1,
            untranslatedCollaboratorText,
          );
        } else if (
          firstSpanTextNodes &&
          firstSpanTextNodes.length >= 2 &&
          firstSpan &&
          !firstSpan.textContent.includes(untranslatedCollaboratorText)
        ) {
          replaceTextNodeContent(
            firstSpan,
            includeMainAuthor ? 0 : 1,
            untranslatedCollaboratorText,
          );
        }
      }
    }
  }
}

/**
 * Replaces the content of a specific text node within a container.
 * @param {*} container - The parent element containing text nodes.
 * @param {*} textNodeIndex - The index of the text node to replace. 0-based.
 * @param {*} newText - The new text content to set.
 */
function replaceTextNodeContent(container, textNodeIndex, newText) {
  const textNodes = Array.from(container.childNodes).filter(
    (node) => node.nodeType === Node.TEXT_NODE,
  );

  if (textNodes.length > textNodeIndex) {
    const targetTextNode = textNodes[textNodeIndex];
    if (targetTextNode.textContent !== newText) {
      targetTextNode.textContent = newText;
    }
  }
}

async function handleDescriptionMutation() {
  const settings = await window.YoutubeAntiTranslate.getSettings();

  if (
    !settings.untranslateDescription &&
    !settings.untranslateChapters &&
    !settings.untranslateChannelBranding
  ) {
    return;
  }

  const player = window.YoutubeAntiTranslate.getFirstVisible(
    document.querySelectorAll(window.YoutubeAntiTranslate.getPlayerSelector()),
    /*shouldBeInsideViewport=*/ false,
  );

  if (
    settings.untranslateDescription ||
    settings.untranslateChapters ||
    settings.untranslateChannelBranding
  ) {
    const descriptionElement = window.YoutubeAntiTranslate.getFirstVisible(
      document.querySelectorAll(DESCRIPTION_SELECTOR),
    );
    if (descriptionElement && player) {
      await restoreOriginalDescriptionAndAuthor();
    }
  }

  // On mobile the author is visible even when the description is not
  // so we need to check separately
  if (
    window.YoutubeAntiTranslate.isMobile() &&
    settings.untranslateChannelBranding
  ) {
    const authorElement = window.YoutubeAntiTranslate.getFirstVisible(
      document.querySelectorAll(AUTHOR_SELECTOR),
    );

    if (authorElement && player) {
      restoreOriginalAuthorOnly();
    }
  }
}

// Initialize the extension, waiting for window.YoutubeAntiTranslate to be available
(function waitForYoutubeAntiTranslate() {
  if (
    window.YoutubeAntiTranslate &&
    typeof window.YoutubeAntiTranslate.debounce === "function"
  ) {
    const target = document.body;
    const config = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    };
    const observer = new MutationObserver(
      window.YoutubeAntiTranslate.debounce(handleDescriptionMutation),
    );
    observer.observe(target, config);
  } else {
    setTimeout(waitForYoutubeAntiTranslate, 8);
  }
})();

// Add global click handler for timecode links
document.addEventListener("click", (event) => {
  const link = /** @type {Element} */ (event.target).closest(
    ".yt-timecode-link",
  );
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
  if (player && typeof player["seekTo"] === "function") {
    try {
      player["seekTo"](seconds, true);
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
            const element = /** @type {Element} */ (node);
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
    attributes: true,
    attributeFilter: ["style", "class"],
  });

  // Initial update
  updateHorizontalChapters();
}

// Extract video metadata window.ytPubsubPubsubInstance
function extractVideoDataField(fieldName) {
  try {
    const pubsub = window["ytPubsubPubsubInstance"];
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

// Get Title using oembed
async function getTitle(url) {
  const videoId = window.YoutubeAntiTranslate.extractVideoIdFromUrl(url);
  if (!videoId) {
    return null;
  }

  let response = await window.YoutubeAntiTranslate.cachedRequest(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`,
  );
  if (
    !response ||
    !response.response ||
    !response.response.ok ||
    !response.data?.title
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
    } else {
      return;
    }
  }

  return response.data.title;
}

/** Get Description from the VideoData
 * @return {Promise<{shortDescription:string|null, title: string|null, channelId: string|null}>} The original description or null if it cannot be retrieved.
 */
async function getDescriptionMobile() {
  return {
    shortDescription:
      extractVideoDataField("shortDescription") ||
      (await getTitle(document.location.href)),
    title: (await getTitle(document.location.href)) || null,
    channelId: extractVideoDataField("channelId") || null,
  };
}

// Get Author from the VideoData
function getAuthorMobile() {
  return extractVideoDataField("author");
}

// Export for testing (only in Node.js environment)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    parseChaptersFromDescription,
    findChapterByTime,
  };
}
