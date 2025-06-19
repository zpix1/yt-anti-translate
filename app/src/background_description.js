// Constants
const DESCRIPTION_SELECTOR =
  "#description-inline-expander, ytd-expander#description, #description-inline-expander > .ytd-text-inline-expander";
const AUTHOR_SELECTOR = "#upload-info.ytd-video-owner-renderer";
const ATTRIBUTED_STRING_SELECTOR = "yt-attributed-string";
const FORMATTED_STRING_SELECTOR = "yt-formatted-string";
const SNIPPET_TEXT_SELECTOR = "#attributed-snippet-text";

/**
 * Retrieves the original description from YouTube player
 * @returns {string|null} - Original description or null if not found
 */
function fetchOriginalDescription() {
  const player = window.YoutubeAntiTranslate.getFirstVisible(
    document.querySelectorAll(window.YoutubeAntiTranslate.getPlayerSelector()),
  );
  if (!player) {
    window.YoutubeAntiTranslate.logWarning(`Player element not found`);
    return null;
  }

  try {
    const playerResponse = player.getPlayerResponse();
    const response = playerResponse?.videoDetails?.shortDescription || null;
    if (response) {
      return response;
    } else {
      const embededPlayerResponse = player.getEmbeddedPlayerResponse();
      return embededPlayerResponse?.videoDetails?.shortDescription || null;
    }
  } catch (error) {
    window.YoutubeAntiTranslate.logWarning(`Error: ${error.message || error}`);
    return null;
  }
}

/**
 * Retrieves the original author from YouTube player
 * @returns {string|null} - Original author or null if not found
 */
function fetchOriginalAuthor() {
  const player = window.YoutubeAntiTranslate.getFirstVisible(
    document.querySelectorAll(window.YoutubeAntiTranslate.getPlayerSelector()),
  );
  if (!player) {
    window.YoutubeAntiTranslate.logWarning(`Player element not found`);
    return null;
  }

  try {
    const playerResponse = player.getPlayerResponse();
    const response = playerResponse?.videoDetails?.author || null;
    if (response) {
      return response;
    } else {
      const embededPlayerResponse = player.getEmbeddedPlayerResponse();
      return embededPlayerResponse?.videoDetails?.author || null;
    }
  } catch (error) {
    window.YoutubeAntiTranslate.logWarning(`Error: ${error.message || error}`);
    return null;
  }
}

/**
 * Processes the description and restores it to its original form
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
  }

  if (originalAuthor) {
    // We should skip this operation if the video player was embeded as it does not have the author above the desciption
    const player = window.YoutubeAntiTranslate.getFirstVisible(
      document.querySelectorAll(
        window.YoutubeAntiTranslate.getPlayerSelector(),
      ),
    );
    if (player && player.id === "c4-player") {
      return;
    }

    const authorContainer = window.YoutubeAntiTranslate.getFirstVisible(
      document.querySelectorAll(AUTHOR_SELECTOR),
    );

    if (authorContainer) {
      updateAuthorContent(authorContainer, originalAuthor);
    } else {
      window.YoutubeAntiTranslate.logWarning(
        `Video Author container not found`,
      );
    }
  }
}

/**
 * Updates the description element with the original content
 * @param {HTMLElement} container - The description container element
 * @param {string} originalText - The original description text
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

  let formattedContent;
  const originalTextFirstLine = originalText.split("\n")[0];
  // Compare text first span>span against first line first to avoid waisting resources on formatting content
  if (
    mainTextContainer.hasChildNodes() &&
    mainTextContainer.firstChild.hasChildNodes() &&
    mainTextContainer.firstChild.firstChild.textContent ===
      originalTextFirstLine
    /* as we are always doing both the comparision on mainTextContainer is sufficient*/
  ) {
    // If identical create formatted content and compare with firstchild text content to determine if any change is needed
    formattedContent =
      window.YoutubeAntiTranslate.createFormattedContent(originalText);
    if (
      mainTextContainer.hasChildNodes() &&
      mainTextContainer.firstChild.textContent === formattedContent.textContent
      /* as we are always doing both the comparision on mainTextContainer is sufficient*/
    ) {
      // No changes are needed
      return;
    }
  } else {
    // First line was different so we can continue with untraslation
    // Create formatted content
    formattedContent =
      window.YoutubeAntiTranslate.createFormattedContent(originalText);
  }

  // It is safe to assume both untralations are needed as we are always doing both
  // so no point in wasting resorces on another text comparison

  // Update both containers if they exist
  if (mainTextContainer) {
    window.YoutubeAntiTranslate.replaceContainerContent(
      mainTextContainer,
      formattedContent.cloneNode(true),
    );
  }

  if (snippetTextContainer) {
    window.YoutubeAntiTranslate.replaceContainerContent(
      snippetTextContainer,
      formattedContent.cloneNode(true),
    );
  }
}

/**
 * Updates the author element with the original content
 * @param {HTMLElement} container - The author container element
 * @param {string} originalText - The original author text
 */
function updateAuthorContent(container, originalText) {
  // Find the text containers
  const mainTextContainer = window.YoutubeAntiTranslate.getFirstVisible(
    container.querySelectorAll(FORMATTED_STRING_SELECTOR),
  );
  const snippetTextContainer = window.YoutubeAntiTranslate.getFirstVisible(
    container.querySelectorAll(`${FORMATTED_STRING_SELECTOR} a`),
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

// --- Mutation conditional processor ---
async function handleDescriptionMutation(
  /** @type {MutationRecord[]} */ mutationList,
) {
  for (const mutationRecord of mutationList) {
    if (mutationRecord.type !== "childList") {
      continue;
    }

    if (
      !mutationRecord.target ||
      !window.YoutubeAntiTranslate.castNodeToElementOrNull(
        mutationRecord.target,
      )
    ) {
      continue;
    }

    const /** @type {Element} */ element = mutationRecord.target;

    // Checks on mutation target
    if (element.matches(DESCRIPTION_SELECTOR)) {
      await window.YoutubeAntiTranslate.waitForPlayerReady();
      await restoreOriginalDescriptionAndAuthor();
      break;
    }

    // Checks on mutation closest target
    if (element.closest(DESCRIPTION_SELECTOR)) {
      await window.YoutubeAntiTranslate.waitForPlayerReady();
      await restoreOriginalDescriptionAndAuthor();
      break;
    }

    // On mutationRecord.target we never search inside as that is too broad

    for (const addedNode of mutationRecord.addedNodes) {
      if (!window.YoutubeAntiTranslate.castNodeToElementOrNull(addedNode)) {
        continue;
      }
      const /** @type {Element} */ addedElement = addedNode;

      // Checks on mutation added nodes
      if (addedElement.matches(DESCRIPTION_SELECTOR)) {
        await window.YoutubeAntiTranslate.waitForPlayerReady();
        await restoreOriginalDescriptionAndAuthor();
        break;
      }

      // Checks on mutation added nodes
      if (addedElement.closest(DESCRIPTION_SELECTOR)) {
        await window.YoutubeAntiTranslate.waitForPlayerReady();
        await restoreOriginalDescriptionAndAuthor();
        break;
      }

      // Search inside added nodes for matching elements
      if (
        window.YoutubeAntiTranslate.getFirstVisible(
          addedElement.querySelectorAll(DESCRIPTION_SELECTOR),
        )
      ) {
        await window.YoutubeAntiTranslate.waitForPlayerReady();
        await restoreOriginalDescriptionAndAuthor();
        break;
      }
    }
  }
}

// Initialize the mutation observer for description
const targetNode = document.body;
const observerConfig = { childList: true, subtree: true };
const descriptionObserver = new MutationObserver(handleDescriptionMutation);
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
    false, // Description might be long enough to take player outside of viewport. So in this case `shouldBeInsideViewport` is set to false
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
