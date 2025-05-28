// Constants
const CHANNELBRANDING_HEADER_SELECTOR = "#page-header-container #page-header .page-header-view-model-wiz__page-header-headline-info";
const CHANNELBRANDING_ABOUT_SELECTOR = "ytd-engagement-panel-section-list-renderer";
const CHANNELBRANDING_MUTATION_UPDATE_FREQUENCY = 1;

const ALL_ARRAYS_VIDEOS_SELECTOR = `ytd-video-renderer,
ytd-rich-item-renderer,
ytd-compact-video-renderer,
ytd-grid-video-renderer,
ytd-playlist-video-renderer,
ytd-playlist-panel-video-renderer`;
const ALL_ARRAYS_SHORTS_SELECTOR = `div.style-scope.ytd-rich-item-renderer,
ytm-shorts-lockup-view-model`;

async function detectChannelOriginalLanguage() {
  const fistVideoElement = window.YoutubeAntiTranslate.getFirstVisible(document.querySelectorAll(`${ALL_ARRAYS_SHORTS_SELECTOR},
    ${ALL_ARRAYS_VIDEOS_SELECTOR}`), false);
  if (!fistVideoElement) {
    return;
  }

  let fistVideoElementHref = null;

  // try finding href as a video
  let linkElement =
    fistVideoElement.querySelector("a#video-title-link") ||
    fistVideoElement.querySelector("a#thumbnail") ||
    fistVideoElement.querySelector("ytd-thumbnail a") ||
    fistVideoElement.querySelector(`a[href*="/watch?v="]`);

  if (linkElement) {
    fistVideoElementHref = linkElement.href; // Use the link's href for oEmbed and as the key
  }

  // try again as a short
  if (!linkElement) {
    linkElement = fistVideoElement.querySelector("a.shortsLockupViewModelHostEndpoint") ||
      fistVideoElement.querySelector(`a[href*="/shorts/"]`);

    const videoHref = linkElement.href;
    // Extract short video ID from URLs like /shorts/VIDEO_ID
    const videoIdMatch = videoHref.match(/shorts\/([a-zA-Z0-9_-]+)/);
    if (!videoIdMatch || !videoIdMatch[1]) {
      return;
    }
    const videoId = videoIdMatch[1];

    fistVideoElementHref = `https://www.youtube.com/shorts/${videoId}`
  }

  if (!fistVideoElementHref) {
    return;
  }

  const oembedUrl = `https://www.youtube.com/oembed?url=${fistVideoElementHref}`

  let embededTitle = null
  // Check cache
  if (window.YoutubeAntiTranslate.cache.has(oembedUrl)) {
    const embeded = window.YoutubeAntiTranslate.cache.get(oembedUrl);
    embededTitle = `${embeded.title} ${embeded.author_name}`
  }

  let res = await fetch(oembedUrl);

  if (!res.ok) {
    console.error(`Failed to fetch ${oembedUrl}:`, res.statusText);
    return;
  }

  const json = await res.json();

  embededTitle = `${json.title} ${json.author_name}`
  if (!embededTitle) {
    return;
  }

  // Store in cache
  window.YoutubeAntiTranslate.cache.set(oembedUrl, json);

  const i18nAPI = typeof browser !== 'undefined' && browser.i18n
    ? browser.i18n
    : chrome.i18n;

  let languageDetected;
  try {
    languageDetected = await i18nAPI.detectLanguage(embededTitle);
  } catch (err) {
    console.warn("detectLanguage() failed, using navigator.language");
    return navigator.language;
  }

  if (!languageDetected.isReliable) {
    console.warn(`${window.YoutubeAntiTranslate.LOG_PREFIX} the language detected may not be correct`);
  }
  return languageDetected.languages[0].language
}

/**
 * Retrieve the UCID of a channel using youtubei/v1/search
 * @param {string} query the YouTube channel handle (e.g. "@mrbeast" or "MrBeast")
 * @returns {string} channel UCID
 */
async function lookupChannelId(query) {
  // build the request body ──
  const body = {
    context: {
      client: {
        clientName: "WEB",
        clientVersion: "2.20250527.00.00"
      }
    },
    query,
    // "EgIQAg==" = filter=channels  (protobuf: {12: {1:2}})
    params: "EgIQAg=="
  };

  const requestIdentifier = `youtubei/v1/search_${JSON.stringify(body)}`

  // Check cache
  if (window.YoutubeAntiTranslate.cache.has(requestIdentifier)) {
    return window.YoutubeAntiTranslate.cache.get(requestIdentifier);
  }

  const search = "https://www.youtube.com/youtubei/v1/search?prettyPrint=false"
  const res = await fetch(search, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
  });

  if (!res.ok) {
    console.error(`Failed to fetch ${search}:`, res.statusText);
    return;
  }

  const json = await res.json();

  const channelUcid = json.contents?.twoColumnSearchResultsRenderer
    ?.primaryContents.sectionListRenderer
    ?.contents[0].itemSectionRenderer.contents[0]
    ?.channelRenderer?.channelId || null;

  if (!channelUcid) {
    return;
  }

  // Store in cache
  window.YoutubeAntiTranslate.cache.set(requestIdentifier, channelUcid);

  return channelUcid;
}

/**
 * Retrieved the Channel UCID (UC...) for the current Channel page using window.location and lookupChannelId() search
 * @returns {string} channel UCID
 */
async function getChannelUCID() {
  if (window.location.pathname.startsWith("/channel/")) {
    var match = window.location.pathname.match(/\/channel\/([\w-]+)/);
    return match ? `${match[1]}` : null;
  }

  var handle = null;
  if (window.location.pathname.startsWith("/c/")) {
    var match = window.location.pathname.match(/\/c\/([\w-]+)/);
    handle = match ? `${match[1]}` : null;
  }
  else if (window.location.pathname.startsWith("/@")) {
    var match = window.location.pathname.match(/\/(@[\w-]+)/);
    handle = match ? `${match[1]}` : null;
  }
  else if (window.location.pathname.startsWith("/user/")) {
    var match = window.location.pathname.match(/\/user\/(@[\w-]+)/);
    handle = match ? `${match[1]}` : null;
  }
  return await lookupChannelId(handle);
}

/**
 * Fetch the About/branding section of a YouTube channel.
 * @param {string} ucid   Otional Channel ID (starts with “UC…”). Defaults to UCID of the current channel
 * @param {string} locale Optional BCP-47 tag, e.g. "it-IT" or "fr". Defaults to the user’s browser language.
 * @returns {object}      The title and description branding.
 */
async function getChannelBranding(ucid = null, locale = null) {
  if (!ucid) {
    ucid = await getChannelUCID();
  }
  if (!ucid) {
    console.error(`${window.YoutubeAntiTranslate.LOG_PREFIX} could not find channel UCID`);
    return;
  }

  if (!locale) {
    locale = await detectChannelOriginalLanguage();
  }
  if (!locale) {
    console.error(`${window.YoutubeAntiTranslate.LOG_PREFIX} could not find channel original locale`);
    return;
  }

  // split the locale into hl (= language) and gl (= region)
  //    • “it-IT” → ["it","IT"]
  //    • “fr”    → ["fr"]
  const [hl, region] = locale.split(/[-_]/);// tolerate "pt-BR" or "pt_BR"
  const gl = region

  // build the request body
  const body = {
    context: {
      client: {
        hl, // language
        gl, // region
        clientName: "WEB",
        clientVersion: "2.20250527.00.00"
      }
    },
    browseId: ucid,
    // “about” tab protobuf — old first, then fall back to the newer encoding
    params: "EgVhYm91dA==" // {2:string:"about"} :contentReference[oaicite:0]{index=0}
  };

  const requestIdentifier = `youtubei/v1/browse_${JSON.stringify(body)}`

  // Check cache
  if (window.YoutubeAntiTranslate.cache.has(requestIdentifier)) {
    return window.YoutubeAntiTranslate.cache.get(requestIdentifier);
  }

  const browse = "https://www.youtube.com/youtubei/v1/browse?prettyPrint=false";
  let res = await fetch(browse, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  // YT sometimes rejects the legacy protobuf with 400; try the newer one.
  if (res.status === 400) {
    body.params = "EgVhYm91dPIGBAoCEgA="; // wrapped “about” protobuf (2023-present) :contentReference[oaicite:1]{index=1}
    res = await fetch(browse, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }

  if (!res.ok) {
    console.error(`Failed to fetch ${browse}:`, res.statusText);
    return;
  }

  const json = await res.json();

  const hdr = json.header?.pageHeaderRenderer;
  const metadata = json.metadata?.channelMetadataRenderer;

  const result = {
    title: metadata?.title, // channel name
    truncatedDerscription: hdr?.content?.pageHeaderViewModel?.description?.descriptionPreviewViewModel?.description?.content,
    description: metadata?.description // full description
  };

  console.log(window.YoutubeAntiTranslate.LOG_PREFIX, result);

  if (!metadata || !hdr) {
    return;
  }

  // Store in cache
  window.YoutubeAntiTranslate.cache.set(requestIdentifier, result);

  return result;
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

    // EXAMPLE ─ get branding in i18n detected language for current channel
    // await getChannelBranding(null, null);

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
  async (items) => {
    if (items.untranslateChannelBranding) {
      const targetNode = document.body;
      const observerConfig = { childList: true, subtree: true };
      const brandingObserver = new MutationObserver(untranslateBranding);
      brandingObserver.observe(targetNode, observerConfig);
    }
  }
);