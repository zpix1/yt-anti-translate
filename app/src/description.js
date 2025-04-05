// Constants
const LOG_PREFIX = "[YoutubeAntiTranslate]";
const DESCRIPTION_SELECTOR = "#description-inline-expander";
const ATTRIBUTED_STRING_SELECTOR = "yt-attributed-string";
const SNIPPET_TEXT_SELECTOR = "#attributed-snippet-text";
const PLAYER_ID = "movie_player";
const MUTATION_UPDATE_FREQUENCY = 2;

/**
 * Converts URLs and timecodes in text to clickable links
 * @param {string} text - Text that may contain URLs and timecodes
 * @returns {HTMLElement} - Span element with clickable links
 */
function convertUrlsToLinks(text) {
  const container = document.createElement("span");
  // Pattern for URLs
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  // Pattern for timecodes (matches formats like 00:00, 05:36, 1:23:45)
  const timecodePattern = /(?:^|\s)((?:\d{1,2}:)?\d{1,2}:\d{2})(?=\s|$)/g;

  // First, split by URLs and process
  let segments = text.split(urlPattern);
  let processedText = "";

  segments.forEach((segment) => {
    if (segment.match(/^https?:\/\//)) {
      // Handle URL
      const linkElement = createLinkElement(segment);
      container.appendChild(linkElement);
    } else if (segment) {
      // Process segment for timecodes
      processedText += segment;
    }
  });

  // Now process the non-URL text for timecodes
  if (processedText) {
    let lastIndex = 0;
    const timecodeMatches = [...processedText.matchAll(timecodePattern)];

    if (timecodeMatches.length > 0) {
      timecodeMatches.forEach((match) => {
        const [fullMatch, timecode] = match;
        const matchIndex = match.index;

        // Add text before the timecode
        if (matchIndex > lastIndex) {
          container.appendChild(
            document.createTextNode(
              processedText.substring(lastIndex, matchIndex)
            )
          );
        }

        // Add the whitespace before the timecode if it exists
        if (fullMatch.startsWith(" ")) {
          container.appendChild(document.createTextNode(" "));
        }

        // Add the timecode as a link
        const timecodeLink = createTimecodeLink(timecode);
        container.appendChild(timecodeLink);

        lastIndex = matchIndex + fullMatch.length;
      });

      // Add remaining text after the last timecode
      if (lastIndex < processedText.length) {
        container.appendChild(
          document.createTextNode(processedText.substring(lastIndex))
        );
      }
    } else {
      // No timecodes found, just add the text
      container.appendChild(document.createTextNode(processedText));
    }
  }

  return container;
}

/**
 * Creates a timecode link element with proper YouTube styling
 * @param {string} timecode - Timecode string (e.g., "05:36")
 * @returns {HTMLElement} - Span element containing the timecode link
 */
function createTimecodeLink(timecode) {
  // Convert timecode to seconds for the URL
  const seconds = convertTimecodeToSeconds(timecode);

  // Create the container span
  const span = document.createElement("span");
  span.className = "yt-core-attributed-string--link-inherit-color";
  span.dir = "auto";
  span.style.color = "rgb(62, 166, 255)";

  // Create the anchor element
  const link = document.createElement("a");
  link.className =
    "yt-core-attributed-string__link yt-core-attributed-string__link--call-to-action-color yt-timecode-link";
  link.tabIndex = "0";
  link.href = `/watch?v=${getCurrentVideoId()}&t=${seconds}s`;
  link.target = "";
  link.setAttribute("force-new-state", "true");
  link.setAttribute("data-seconds", seconds.toString());
  link.textContent = timecode;

  span.appendChild(link);
  return span;
}

/**
 * Converts a timecode string to seconds
 * @param {string} timecode - Timecode in format HH:MM:SS or MM:SS
 * @returns {number} - Total seconds
 */
function convertTimecodeToSeconds(timecode) {
  const parts = timecode.split(":").map(Number);

  if (parts.length === 2) {
    // Format: MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // Format: HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return 0;
}

/**
 * Gets the current video ID from the URL
 * @returns {string} - The YouTube video ID
 */
function getCurrentVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("v") || "";
}

/**
 * Creates a link element with proper YouTube styling
 * @param {string} url - URL to create a link for
 * @returns {HTMLElement} - Anchor element
 */
function createLinkElement(url) {
  const link = document.createElement("a");
  link.href = url;
  link.textContent = url;
  link.rel = "nofollow";
  link.target = "_blank";
  link.dir = "auto";
  link.className = "yt-simple-endpoint style-scope yt-formatted-string";
  return link;
}

/**
 * Retrieves the original description from YouTube player
 * @returns {string|null} - Original description or null if not found
 */
function fetchOriginalDescription() {
  const player = document.getElementById(PLAYER_ID);
  if (!player) {
    console.log(`${LOG_PREFIX} Player element not found`);
    return null;
  }

  try {
    const playerResponse = player.getPlayerResponse();
    return playerResponse?.videoDetails?.shortDescription || null;
  } catch (error) {
    console.log(`${LOG_PREFIX} Error: ${error.message || error}`);
    return null;
  }
}

/**
 * Processes the description and restores it to its original form
 */
function restoreOriginalDescription() {
  const originalDescription = fetchOriginalDescription();

  if (!originalDescription) {
    return;
  }

  const descriptionContainer = document.querySelector(DESCRIPTION_SELECTOR);

  if (descriptionContainer) {
    updateDescriptionContent(descriptionContainer, originalDescription);
  } else {
    console.log(`${LOG_PREFIX} Description container not found`);
  }
}

/**
 * Updates the description element with the original content
 * @param {HTMLElement} container - The description container element
 * @param {string} originalText - The original description text
 */
function updateDescriptionContent(container, originalText) {
  // Find the text containers
  const mainTextContainer = container.querySelector(ATTRIBUTED_STRING_SELECTOR);
  const snippetTextContainer = container.querySelector(SNIPPET_TEXT_SELECTOR);

  if (!mainTextContainer && !snippetTextContainer) {
    console.log(`${LOG_PREFIX} No description text containers found`);
    return;
  }

  // Create formatted content
  const formattedContent = createFormattedContent(originalText);

  // Update both containers if they exist
  if (mainTextContainer) {
    replaceContainerContent(
      mainTextContainer,
      formattedContent.cloneNode(true)
    );
  }

  if (snippetTextContainer) {
    replaceContainerContent(
      snippetTextContainer,
      formattedContent.cloneNode(true)
    );
  }
}

/**
 * Creates a formatted content element from the original text
 * @param {string} text - The original description text
 * @returns {HTMLElement} - Formatted span element
 */
function createFormattedContent(text) {
  const contentElement = document.createElement("span");
  contentElement.className =
    "yt-core-attributed-string yt-core-attributed-string--white-space-pre-wrap";
  contentElement.dir = "auto";

  const textLines = text.split("\n");
  textLines.forEach((line, index) => {
    const lineElement = convertUrlsToLinks(line);
    contentElement.appendChild(lineElement);

    // Add line breaks between lines, but not after the last line
    if (index < textLines.length - 1) {
      contentElement.appendChild(document.createElement("br"));
    }
  });

  return contentElement;
}

/**
 * Replaces the content of a container with new content
 * @param {HTMLElement} container - The container to update
 * @param {HTMLElement} newContent - The new content to insert
 */
function replaceContainerContent(container, newContent) {
  // Clear existing content
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  // Add new content
  container.appendChild(newContent);
}

/**
 * Handles description updates when mutations are detected
 */
let mutationCounter = 0;

async function handleDescriptionMutation() {
  if (mutationCounter % MUTATION_UPDATE_FREQUENCY === 0) {
    const descriptionElement = document.querySelector(DESCRIPTION_SELECTOR);
    if (descriptionElement) {
      restoreOriginalDescription();
    }
  }
  mutationCounter++;
}

// Initialize the mutation observer for description
const targetNode = document.body;
const observerConfig = { childList: true, subtree: true };
const descriptionObserver = new MutationObserver(handleDescriptionMutation);
descriptionObserver.observe(targetNode, observerConfig);

// Add global click handler for timecode links
document.addEventListener("click", (event) => {
  const link = event.target.closest(".yt-timecode-link");
  if (!link) return;

  event.preventDefault();
  const seconds = parseInt(link.getAttribute("data-seconds"), 10);
  if (isNaN(seconds)) return;

  // Use YouTube's API to seek to the timestamp
  const player = document.getElementById(PLAYER_ID);
  if (player && typeof player.seekTo === "function") {
    try {
      player.seekTo(seconds, true);
      console.log(`${LOG_PREFIX} Seeking to ${link.textContent} (${seconds}s)`);
    } catch (error) {
      console.error(`${LOG_PREFIX} Error seeking to timestamp:`, error);
    }
  } else {
    console.error(`${LOG_PREFIX} Player not found or seekTo not available`);
  }
});
