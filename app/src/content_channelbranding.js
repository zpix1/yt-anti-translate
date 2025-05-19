// Constants
const CHANNELBRANDING_HEADER_SELECTOR = "#page-header-container #page-header .page-header-view-model-wiz__page-header-headline-info";
const CHANNELBRANDING_ABOUT_SELECTOR = "ytd-engagement-panel-section-list-renderer";
const CHANNELBRANDING_MUTATION_UPDATE_FREQUENCY = 1;

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
  if (window.YoutubeAntiTranslate.cache.has(channelFilter)) {
    return window.YoutubeAntiTranslate.cache.get(channelFilter);
  }

  const apiKey = youtubeDataApiKey
  if (!apiKey) {
    console.error('Missing YOUTUBE_API_KEY is not set');
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
  window.YoutubeAntiTranslate.cache.set(channelFilter, result);

  return result;
}

/**
 * Processes the branding header and restores it to its original form
 */
async function restoreOriginalBrandingHeader() {
  if (window.YoutubeAntiTranslate.getFirstVisible(document.querySelectorAll(CHANNELBRANDING_HEADER_SELECTOR))) {
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
          const brandingHeaderContainer = window.YoutubeAntiTranslate.getFirstVisible(document.querySelectorAll(CHANNELBRANDING_HEADER_SELECTOR));
          if (brandingHeaderContainer) {
            updateBrandingHeaderTitleContent(brandingHeaderContainer, originalBrandingData);
            updateBrandingHeaderDescriptionContent(brandingHeaderContainer, originalBrandingData);
          } else {
            console.log(`${window.YoutubeAntiTranslate.LOG_PREFIX} Channel Branding Header container not found`);
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
    const titleTextContainer = container.querySelector(`h1 ${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}`);

    if (!titleTextContainer) {
      console.log(`${window.YoutubeAntiTranslate.LOG_PREFIX} No branding header title text containers found`);
    }
    else if (titleTextContainer.innerText !== originalBrandingData.title) {
      window.YoutubeAntiTranslate.replaceTextOnly(titleTextContainer, originalBrandingData.title)

      document.title = document.title.replace(
        titleTextContainer.innerText,
        originalBrandingData.title
      );
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
    const descriptionTextContainer = container.querySelector(`yt-description-preview-view-model .truncated-text-wiz__truncated-text-content > ${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}:nth-child(1)`);
    if (!descriptionTextContainer) {
      console.log(`${window.YoutubeAntiTranslate.LOG_PREFIX} No branding header description text containers found`);
    }
    else {
      const truncatedDescription = originalBrandingData.description.split("\n")[0];
      if (descriptionTextContainer.innerText !== truncatedDescription) {
        const storeStyleDisplay = descriptionTextContainer.parentElement.style.display
        descriptionTextContainer.parentElement.style.display = "none"
        window.YoutubeAntiTranslate.replaceTextOnly(descriptionTextContainer, truncatedDescription)
        // Force reflow
        setTimeout(() => { descriptionTextContainer.parentElement.style.display = storeStyleDisplay }, 50);
      }
    }
  }
}

/**
 * Processes the about and restores it to its original form
 */
async function restoreOriginalBrandingAbout() {
  if (window.YoutubeAntiTranslate.getFirstVisible(document.querySelectorAll(CHANNELBRANDING_ABOUT_SELECTOR))) {
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
          const aboutContainer = window.YoutubeAntiTranslate.getAllVisibleNodes(document.querySelectorAll(CHANNELBRANDING_ABOUT_SELECTOR));
          if (aboutContainer || titleTextContainer.length > 0) {
            aboutContainer.forEach(element => {
              updateBrandingAboutDescriptionContent(element, originalBrandingData);
              updateBrandingAboutTitleContent(element, originalBrandingData);
            });
          } else {
            console.log(`${window.YoutubeAntiTranslate.LOG_PREFIX} Channel About container not found`);
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

    if (!titleTextContainer) {
      console.log(`${window.YoutubeAntiTranslate.LOG_PREFIX} No branding about title text containers found`);
    }
    else {
      if (titleTextContainer.innerText !== originalBrandingData.title) {
        window.YoutubeAntiTranslate.replaceTextOnly(titleTextContainer, originalBrandingData.title)
      }
    }
  }
}

/**
 * Updates the About element with the original content
 * @param {HTMLElement} container - The about container element
 * @param {JSON} originalBrandingData - The original branding title and description
 */
function updateBrandingAboutDescriptionContent(container, originalBrandingData) {
  if (originalBrandingData.description) {
    // Find the description text container
    const descriptionTextContainer = container.querySelector(`#description-container > ${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}:nth-child(1)`);

    if (!descriptionTextContainer) {
      console.log(`${window.YoutubeAntiTranslate.LOG_PREFIX} No branding about description text containers found`);
    }
    else {
      let formattedContent;
      const originalTextFirstLine = originalBrandingData.description.split("\n")[0];
      // Compare text first span>span against first line first to avaoid waisting resources on formatting content
      if (
        descriptionTextContainer.hasChildNodes()
        && descriptionTextContainer.firstChild.hasChildNodes()
        && descriptionTextContainer.firstChild.firstChild.textContent === originalTextFirstLine
      ) {
        // If identical create formatted content and compare with firstchild text content to determine if any change is needed
        formattedContent = window.YoutubeAntiTranslate.createFormattedContent(originalBrandingData.description);
        if (
          descriptionTextContainer.hasChildNodes()
          && descriptionTextContainer.firstChild.textContent !== formattedContent.textContent
        ) {
          // No changes are needed
          window.YoutubeAntiTranslate.replaceContainerContent(descriptionTextContainer, formattedContent.cloneNode(true))
        }
      }
      else {
        // First line was different so we can continue with untraslation
        // Create formatted content
        formattedContent = window.YoutubeAntiTranslate.createFormattedContent(originalBrandingData.description);
        window.YoutubeAntiTranslate.replaceContainerContent(descriptionTextContainer, formattedContent.cloneNode(true))
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