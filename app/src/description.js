// Constants
const LOG_PREFIX = "[YoutubeAntiTranslate]";
const DESCRIPTION_SELECTOR = "#description-inline-expander";
const ATTRIBUTED_STRING_SELECTOR = "yt-attributed-string";
const SNIPPET_TEXT_SELECTOR = "#attributed-snippet-text";
const PLAYER_ID = "movie_player";
const MUTATION_UPDATE_FREQUENCY = 2;

/**
 * Converts URLs in text to clickable links
 * @param {string} text - Text that may contain URLs
 * @returns {HTMLElement} - Span element with clickable links
 */
function convertUrlsToLinks(text) {
  const container = document.createElement("span");
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const textSegments = text.split(urlPattern);

  textSegments.forEach((segment) => {
    if (segment.match(/^https?:\/\//)) {
      const linkElement = createLinkElement(segment);
      container.appendChild(linkElement);
    } else if (segment) {
      container.appendChild(document.createTextNode(segment));
    }
  });

  return container;
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
  console.log(`${LOG_PREFIX} Retrieving original description`);

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
    console.log(`${LOG_PREFIX} No original description found`);
    return;
  }

  console.log(`${LOG_PREFIX} Original description retrieved successfully`);
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
  console.log(`${LOG_PREFIX} Updating description content`);

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
      console.log(`${LOG_PREFIX} Description element detected, processing`);
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
