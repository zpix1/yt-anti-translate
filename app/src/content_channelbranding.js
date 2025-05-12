// Constants
const LOG_PREFIX = "[YoutubeAntiTranslate]";
const CHANNEL_HEADER_SELECTOR = "#page-header-container #page-header .page-header-view-model-wiz__page-header-headline-info";
const CHANNEL_ABOUT_SELECTOR = "#about-container";
const PLAYER_CHANNEL_NAME_SELECTOR = 'ytd-video-owner-renderer ytd-channel-name .ytd-channel-name a.yt-simple-endpoint'
const ATTRIBUTED_STRING_SELECTOR = ".yt-core-attributed-string";
const MUTATION_UPDATE_FREQUENCY = 2;

const cache = new Map();

/**
 * Converts URLs and timecodes in text to clickable links
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
    // group 2 and 3 are not needed here as headers descriptions do not have timecodes
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
 * Retrieved the Channel Id from the current Channel page
 * @returns channel id retrieved from the current page
 */
function getChannelId() {
  var canonicalLink = document.querySelector('head > link[rel="canonical"]');
  if (!canonicalLink || !canonicalLink.href) return null;

  var match = canonicalLink.href.match(/\/channel\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Retrieve the brandingSettings for the current channel
 * @param {string} youtubeDataApiKey - the Youtube Data API key as set from storage/sync
 * @returns title and descripton brandingSettings from googleapis or cache
 */
async function fetchChannelTitleAndDescription(youtubeDataApiKey) {
  const channelId = await getChannelId();
  if (!channelId) {
    console.error('Channel ID not found');
    return null;
  }

  // Check cache
  if (cache.has(channelId)) {
    return cache.get(channelId);
  }

  const apiKey = youtubeDataApiKey
  if (!apiKey) {
    console.error('Missing YOUTUBE_API_KEY is not set');
    // Ask User?
    return null;
  }

  const url = `https://www.googleapis.com/youtube/v3/channels?part=brandingSettings&id=${channelId}&key=${apiKey}`;
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
  cache.set(channelId, result);

  return result;
}

/**
 * Processes the branding header and restores it to its original form
 */
async function restoreOriginalBrandingHeader() { 
  await chrome.storage.sync.get(
    {
      youtubeDataApiKey: null
    }, 
    async (items) => {
      const originalBrandingData = await fetchChannelTitleAndDescription(items.youtubeDataApiKey);

      if (!originalBrandingData) {
        return;
      }
      if (!originalBrandingData.title && !originalBrandingData.description){
        return;
      }

      const brandingHeaderContainer = document.querySelector(CHANNEL_HEADER_SELECTOR);
      if (brandingHeaderContainer) {
        updateBrandingHeaderContent(brandingHeaderContainer, originalBrandingData);
      } else {
        console.log(`${LOG_PREFIX} Description container not found`);
      }
    }
  );
}

/**
 * Updates the branding header element with the original content
 * @param {HTMLElement} container - The branding header container element
 * @param {JSON} originalBrandingData - The original branding title and description
 */
function updateBrandingHeaderContent(container, originalBrandingData){
  // Find the title text containers
  const titleTextContainer = container.querySelector(`h1 ${ATTRIBUTED_STRING_SELECTOR}`);

  if (!titleTextContainer) {
    console.log(`${LOG_PREFIX} No title text containers found`);
    return;
  }
  if (originalBrandingData.title) {
    replaceTextOnly(titleTextContainer,originalBrandingData.title)
  }

  // Find the description text container
  const descriptionTextContainer = container.querySelector(`yt-description-preview-view-model .truncated-text-wiz__inline-button > ${ATTRIBUTED_STRING_SELECTOR}:nth-child(1)`);
  if(!descriptionTextContainer) {
    console.log(`${LOG_PREFIX} No description text containers found`);
    return;
  }

  if (originalBrandingData.description){
    // Create formatted content
    const formattedContent = createFormattedContent(originalBrandingData.description);
    replaceContainerContent(descriptionTextContainer, formattedContent)
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
async function restoreOriginalAbout() { }

/**
 * Processes the player channel name and restores it to its original form
 */
async function restoreOriginalPlayerChannelName() { }

/**
 * Handles channel branding header updates when mutations are detected
 */
let mutationBrandingHeaderCounter = 0;

async function handleBrandingHeaderMutation() {
  if (mutationBrandingHeaderCounter % MUTATION_UPDATE_FREQUENCY === 0) {
    const brandingHeaderElement = document.querySelector(CHANNEL_HEADER_SELECTOR);
    if (brandingHeaderElement) {
      await restoreOriginalBrandingHeader();
    }
  }
  mutationBrandingHeaderCounter++;
}

/**
 * Handles channel about updates when mutations are detected
 */
let mutationAboutCounter = 0;

async function handleAboutMutation() {
  if (mutationAboutCounter % MUTATION_UPDATE_FREQUENCY === 0) {
    const aboutElement = document.querySelector(CHANNEL_ABOUT_SELECTOR);
    if (aboutElement) {
      restoreOriginalAbout();
    }
  }
  mutationAboutCounter++;
}



/**
 * Handles channel about updates when mutations are detected
 */
let mutationPlayerChannelNameCounter = 0;

async function handlePlayerChannelNameMutation() {
  if (mutationPlayerChannelNameCounter % MUTATION_UPDATE_FREQUENCY === 0) {
    const PlayerChannelNameElement = document.querySelector(PLAYER_CHANNEL_NAME_SELECTOR);
    if (PlayerChannelNameElement) {
      restoreOriginalPlayerChannelName();
    }
  }
  mutationPlayerChannelNameCounter++;
}

// Initialize the mutation observer for branding
chrome.storage.sync.get(
  {
    untranslateChannelBranding: false
  }, 
  (items) => {
    if(items.untranslateChannelBranding){
      const targetNode = document.body;
      const observerConfig = { childList: true, subtree: true };
      const brandingHeaderObserver = new MutationObserver(handleBrandingHeaderMutation);
      brandingHeaderObserver.observe(targetNode, observerConfig);
      const aboutObserver = new MutationObserver(handleAboutMutation);
      aboutObserver.observe(targetNode, observerConfig);
      const playerChannelNameObserver = new MutationObserver(handlePlayerChannelNameMutation);
      playerChannelNameObserver.observe(targetNode, observerConfig);
    }
  }
);
