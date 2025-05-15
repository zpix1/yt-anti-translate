// Constants
const CHANNELBRANDING_HEADER_SELECTOR = "#page-header-container #page-header .page-header-view-model-wiz__page-header-headline-info";
const CHANNELBRANDING_ABOUT_SELECTOR = "ytd-engagement-panel-section-list-renderer";
const CHANNELBRANDING_MUTATION_UPDATE_FREQUENCY = 1;

/**
 * Converts URLs -a̶n̶d̶ t̶i̶m̶e̶c̶o̶d̶e̶s̶  in text to clickable links
 * @param {string} text - Text that may contain URLs and timecodes
 * @returns {HTMLElement} - Span element with clickable links
 */
function convertUrlsToLinks(text) {
  const container = document.createElement("span");
  // Group 1: URL (https?:\/\/[^\s]+)
  // Group 2: Full timecode - not applicable here
  // Group 3: The actual timecode - not applicable here
  const combinedPattern =
    /(https?:\/\/[^\s]+)|((?:^|\s)((?:\d{1,2}:)?\d{1,2}:\d{2}))(?=\s|$)/g;

  let lastIndex = 0;
  let match;

  while ((match = combinedPattern.exec(text)) !== null) {
    const urlMatch = match[1];

    // Add text segment before the match
    if (match.index > lastIndex) {
      container.appendChild(
        document.createTextNode(text.substring(lastIndex, match.index))
      );
    }

    if (urlMatch) {
      // It's a URL
      const linkElement = createLinkElement(urlMatch);
      container.appendChild(linkElement);
      lastIndex = combinedPattern.lastIndex; // Use regex lastIndex for URLs
    }
    // This is a stripped down version of the function by the same signature in "background_description.js"
    // group 2 and 3 are not needed here as branding about descriptions do not have timecodes
  }

  // Add remaining text after the last match
  if (lastIndex < text.length) {
    container.appendChild(document.createTextNode(text.substring(lastIndex)));
  }

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
 * Retrieved the Channel identifier filter for the current Channel page using location
 * @returns channel filter
 */
function getChannelFilter() {
  if (window.location.pathname.startsWith("/channel/")) {
    var match = window.location.pathname.match(/\/channel\/([\w-]+)/);
    return match ? `id=${match[1]}` : null;
  }
  if (window.location.pathname.startsWith("/c/")) {
    var match = window.location.pathname.match(/\/c\/([\w-]+)/);
    return match ? `forHandle=${match[1]}` : null;
  }
  else if (window.location.pathname.startsWith("/@")) {
    var match = window.location.pathname.match(/\/(@[\w-]+)/);
    return match ? `forHandle=${match[1]}` : null;
  }
  else if (window.location.pathname.startsWith("/user/")) {
    var match = window.location.pathname.match(/\/user\/(@[\w-]+)/);
    return match ? `forUsername=${match[1]}` : null;
  }
}

/**
 * Retrieve the brandingSettings for the current channel
 * @param {string} youtubeDataApiKey - the Youtube Data API key as set from storage/sync
 * @returns title and descripton brandingSettings from googleapis or cache
 */
async function fetchChannelTitleAndDescription(youtubeDataApiKey) {
  const channelFilter = await getChannelFilter();
  if (!channelFilter) {
    console.error('Channel ID not found');
    return null;
  }

  // Check cache
  if (cache.has(channelFilter)) {
    return cache.get(channelFilter);
  }

  const apiKey = youtubeDataApiKey
  if (!apiKey) {
    console.error('Missing YOUTUBE_API_KEY is not set');
    // Ask User?
    return null;
  }

  const url = `https://www.googleapis.com/youtube/v3/channels?part=brandingSettings&${channelFilter}&key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    console.error('Failed to fetch from YouTube API:', response.statusText);
    return null;
  }

  const data = await response.json();
  const branding = data.items?.[0]?.brandingSettings?.channel;

  if (!branding) {
    console.error('Branding settings not found');
    return null;
  }

  const result = {
    title: branding.title,
    description: branding.description
  };

  // Store in cache
  cache.set(channelFilter, result);

  return result;
}

/**
 * Processes the branding header and restores it to its original form
 */
async function restoreOriginalBrandingHeader() {
  if (YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(CHANNELBRANDING_HEADER_SELECTOR))) {
    await chrome.storage.sync.get(
      {
        youtubeDataApiKey: null
      },
      async (items) => {
        const originalBrandingData = await fetchChannelTitleAndDescription(items.youtubeDataApiKey);

        if (!originalBrandingData) {
        }
        else if (!originalBrandingData.title && !originalBrandingData.description) {
        }
        else {
          const brandingHeaderContainer = YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(CHANNELBRANDING_HEADER_SELECTOR));
          if (brandingHeaderContainer) {
            updateBrandingHeaderTitleContent(brandingHeaderContainer, originalBrandingData);
            updateBrandingHeaderDescriptionContent(brandingHeaderContainer, originalBrandingData);
          } else {
            console.log(`${LOG_PREFIX} Channel Branding Header container not found`);
          }
        }
      }
    );
  }
}

/**
 * Updates the branding header element with the original content
 * @param {HTMLElement} container - The branding header container element
 * @param {JSON} originalBrandingData - The original branding title and description
 */
function updateBrandingHeaderTitleContent(container, originalBrandingData) {
  if (originalBrandingData.title) {
    // Find the title text containers
    const titleTextContainer = container.querySelector(`h1 ${CORE_ATTRIBUTED_STRING_SELECTOR}`);

    if (!titleTextContainer) {
      console.log(`${LOG_PREFIX} No branding header title text containers found`);
    }
    else if (titleTextContainer.innerText !== originalBrandingData.title) {
      replaceTextOnly(titleTextContainer, originalBrandingData.title)
    }
  }
}

/**
 * Updates the branding header element with the original content
 * @param {HTMLElement} container - The branding header container element
 * @param {JSON} originalBrandingData - The original branding title and description
 */
function updateBrandingHeaderDescriptionContent(container, originalBrandingData) {
  if (originalBrandingData.description) {
    // Find the description text container
    const descriptionTextContainer = container.querySelector(`yt-description-preview-view-model .truncated-text-wiz__truncated-text-content > ${CORE_ATTRIBUTED_STRING_SELECTOR}:nth-child(1)`);
    if (!descriptionTextContainer) {
      console.log(`${LOG_PREFIX} No branding header description text containers found`);
    }
    else {
      const truncatedDescription = originalBrandingData.description.split("\n")[0];
      if (descriptionTextContainer.innerText !== truncatedDescription) {
        descriptionTextContainer.parentElement.style.display = "none"
        replaceTextOnly(descriptionTextContainer, truncatedDescription)
        // Force reflow
        setTimeout(() => { descriptionTextContainer.parentElement.style.display = "block" }, 10);
      }
    }
  }
}

/**
 * Replace the first text note of the element
 * Any other node is retained as is
 * @param {HTMLElement} element - The element to update
 * @param {string} replaceText - The new text to insert
 */
function replaceTextOnly(element, replaceText) {
  // Loop through child nodes to find the first text node
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent = replaceText;
      break; // stop after updating the first text node
    }
  }
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
 * Processes the about and restores it to its original form
 */
async function restoreOriginalBrandingAbout() {
  if (YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(CHANNELBRANDING_ABOUT_SELECTOR))) {
    await chrome.storage.sync.get(
      {
        youtubeDataApiKey: null
      },
      async (items) => {
        const originalBrandingData = await fetchChannelTitleAndDescription(items.youtubeDataApiKey);

        if (!originalBrandingData) {
        }
        else if (!originalBrandingData.title && !originalBrandingData.description) {
        }
        else {
          const aboutContainer = document.querySelectorAll(CHANNELBRANDING_ABOUT_SELECTOR);
          if (aboutContainer || titleTextContainer.length > 0) {
            aboutContainer.forEach(element => {
              updateBrandingAboutDescriptionContent(element, originalBrandingData);
              updateBrandingAboutTitleContent(element, originalBrandingData);
            });
          } else {
            console.log(`${LOG_PREFIX} Channel About container not found`);
          }
        }
      }
    );
  }
}

/**
 * Updates the About element with the original content
 * @param {HTMLElement} container - The about container element
 * @param {JSON} originalBrandingData - The original branding title and description
 */
function updateBrandingAboutTitleContent(container, originalBrandingData) {
  if (originalBrandingData.title) {
    // Find the title text containers
    const titleTextContainer = container.querySelector(`#title-text`);

    if (!titleTextContainer || titleTextContainer.length === 0) {
      console.log(`${LOG_PREFIX} No branding about title text containers found`);
    }
    else {
      if (titleTextContainer.innerText !== originalBrandingData.title) {
        replaceTextOnly(titleTextContainer, originalBrandingData.title)
      }
    }
  }
}

/**
 * Updates the About element with the original content
 * @param {JSON} originalBrandingData - The original branding title and description
 */
function updateBrandingAboutDescriptionContent(container, originalBrandingData) {
  if (originalBrandingData.description) {
    // Find the description text container
    const descriptionTextContainer = container.querySelector(`#description-container > ${CORE_ATTRIBUTED_STRING_SELECTOR}:nth-child(1)`);
    if (!descriptionTextContainer || descriptionTextContainer.length === 0) {
      console.log(`${LOG_PREFIX} No branding about description text containers found`);
    }
    else {
      const truncatedDescription = originalBrandingData.description.split("\n")[0];

      if (!descriptionTextContainer.innerText.includes(truncatedDescription)) {
        // Create formatted content
        const formattedContent = createFormattedContent(originalBrandingData.description);
        replaceContainerContent(descriptionTextContainer, formattedContent.cloneNode(true))
      }
    }
  }
}

let mutationBrandingIdx = 0;
async function untranslateBranding() {
  if (mutationBrandingIdx % CHANNELBRANDING_MUTATION_UPDATE_FREQUENCY === 0) {
    const brandingHeaderPromise = restoreOriginalBrandingHeader();
    const brandingAboutPromise = restoreOriginalBrandingAbout();

    // Wait for all promises to resolve concurrently
    await Promise.all([
      brandingHeaderPromise,
      brandingAboutPromise,
    ]);
  }
  mutationBrandingIdx++;
}

// Initialize the mutation observer for branding
chrome.storage.sync.get(
  {
    untranslateChannelBranding: false
  },
  (items) => {
    if (items.untranslateChannelBranding) {
      const targetNode = document.body;
      const observerConfig = { childList: true, subtree: true };
      const brandingObserver = new MutationObserver(untranslateBranding);
      brandingObserver.observe(targetNode, observerConfig);
    }
  }
);
