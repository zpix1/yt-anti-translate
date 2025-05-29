// Constants
const CHANNELBRANDING_HEADER_SELECTOR = "#page-header-container #page-header .page-header-view-model-wiz__page-header-headline-info";
const CHANNELBRANDING_ABOUT_SELECTOR = "ytd-engagement-panel-section-list-renderer";
const CHANNELBRANDING_MUTATION_UPDATE_FREQUENCY = 1;

/**
 * Use channel videos or shorts original titles to determine the original locale with i18n.detectLanguage()
 * @returns {string|null} detected locale ISO string or null
 */
async function detectChannelOriginalLanguage() {
  const videoElements = window.YoutubeAntiTranslate.getAllVisibleNodes(
    document.querySelectorAll(`${window.YoutubeAntiTranslate.ALL_ARRAYS_SHORTS_SELECTOR},
      ${window.YoutubeAntiTranslate.ALL_ARRAYS_VIDEOS_SELECTOR}`),
    true,
    20
  );

  if (!videoElements || videoElements.length === 0) {
    return;
  }

  let combinedTitle = "";

  for (const el of videoElements) {
    let linkElement =
      el.querySelector("a#video-title-link") ||
      el.querySelector("a#thumbnail") ||
      el.querySelector("ytd-thumbnail a") ||
      el.querySelector(`a[href*="/watch?v="]`) ||
      el.querySelector("a.shortsLockupViewModelHostEndpoint") ||
      el.querySelector(`a[href*="/shorts/"]`);

    if (!linkElement) continue;

    let href = linkElement.href;
    if (!href) continue;

    // Handle shorts specifically
    if (href.includes("/shorts/")) {
      const match = href.match(/shorts\/([a-zA-Z0-9_-]+)/);
      if (!match || !match[1]) continue;
      href = `https://www.youtube.com/shorts/${match[1]}`;
    }

    const oembedUrl = `https://www.youtube.com/oembed?url=${href}`;

    let titleFromEmbed;

    // Check cache first
    const storedResponse = window.YoutubeAntiTranslate.getSessionCache(oembedUrl);
    if (storedResponse) {
      titleFromEmbed = `${storedResponse.title} ${storedResponse.author_name}`;
    }
    else {
      try {
        const res = await fetch(oembedUrl);
        if (!res.ok) {
          console.warn(`Failed to fetch ${oembedUrl}:`, res.statusText);
          continue;
        }

        const json = await res.json();
        titleFromEmbed = `${json.title} ${json.author_name}`;
        window.YoutubeAntiTranslate.setSessionCache(oembedUrl, json);
      } catch (e) {
        console.error("Fetch failed:", e);
        continue;
      }
    }

    if (titleFromEmbed) {
      combinedTitle += `${titleFromEmbed}. `;
    }
  }

  if (!combinedTitle.trim()) {
    return;
  }

  try {
    const detection = await window.YoutubeAntiTranslate.getBrowserOrChrome().i18n.detectLanguage(combinedTitle);
    if (
      !detection.languages
      || detection.languages.length === 0
    ) {
      return null;
    }
    return detection.languages[0].language;
  }
  catch (err) {
    return null;
  }
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
  const storedResponse = window.YoutubeAntiTranslate.getSessionCache(requestIdentifier);
  if (storedResponse) {
    return storedResponse;
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
  window.YoutubeAntiTranslate.setSessionCache(requestIdentifier, channelUcid);

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
async function getChannelBrandingWithYoutubeI(ucid = null, locale = null) {
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
  const storedResponse = window.YoutubeAntiTranslate.getSessionCache(requestIdentifier);
  if (storedResponse) {
    return storedResponse;
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
    truncatedDescription: hdr?.content?.pageHeaderViewModel?.description?.descriptionPreviewViewModel?.description?.content,
    description: metadata?.description // full description
  };

  if (!metadata || !hdr) {
    return;
  }

  // Store in cache
  window.YoutubeAntiTranslate.setSessionCache(requestIdentifier, result);

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
async function getChannelBrandingWithYoutubeDataAPI(youtubeDataApiKey) {
  const channelFilter = await getChannelFilter();
  if (!channelFilter) {
    console.error('Channel ID not found');
    return null;
  }

  const url = `https://www.googleapis.com/youtube/v3/channels?part=brandingSettings&${channelFilter}`;

  // Check cache
  const storedResponse = window.YoutubeAntiTranslate.getSessionCache(url);
  if (storedResponse) {
    return storedResponse;
  }

  const apiKey = youtubeDataApiKey
  if (!apiKey || apiKey.trim() === "") {
    console.error('Missing YOUTUBE_API_KEY is not set');
    return null;
  }

  const response = await fetch(`${url}&key=${apiKey}`);

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
  window.YoutubeAntiTranslate.setSessionCache(url, result);

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
        let originalBrandingData;
        if (items.youtubeDataApiKey && items.youtubeDataApiKey.trim !== "") {
          originalBrandingData = await getChannelBrandingWithYoutubeDataAPI(items.youtubeDataApiKey)
        }
        if (!originalBrandingData) {
          // Fallback to YouTubeI+i18n if YoutubeDataAPI Key was not set OR if it failed 
          originalBrandingData = await getChannelBrandingWithYoutubeI();
        }

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
    else if (!document.title.includes(originalBrandingData.title)) {
      // This is sometimes skipped on first update as youtube translate the document title late; so we use a cached oldTitle
      const cachedOldTitle = window.YoutubeAntiTranslate.getSessionCache(`pageTitle_${document.location.href}`) ?? titleTextContainer.textContent

      // document tile is sometimes not a perfect match to the oldTile due to spacing, so normalize all
      const normalizedDocumentTitle = window.YoutubeAntiTranslate.normalizeSpaces(document.title);
      const normalizedOldTitle = window.YoutubeAntiTranslate.normalizeSpaces(cachedOldTitle);
      const normalizeRealTitle = window.YoutubeAntiTranslate.normalizeSpaces(originalBrandingData.title);
      const realDocumentTitle = normalizedDocumentTitle.replace(normalizedOldTitle, normalizeRealTitle);
      if (normalizedDocumentTitle !== realDocumentTitle) {
        document.title = realDocumentTitle;
      }
    }
    else if (titleTextContainer.textContent !== originalBrandingData.title) {
      // cache old title for future reference
      window.YoutubeAntiTranslate.setSessionCache(`pageTitle_${document.location.href}`, titleTextContainer.textContent)

      window.YoutubeAntiTranslate.replaceTextOnly(titleTextContainer, originalBrandingData.title)
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
      const truncatedDescription = originalBrandingData.truncatedDescription || originalBrandingData.description.split("\n")[0];
      if (descriptionTextContainer.innerText?.trim() !== truncatedDescription?.trim()) {
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
        let originalBrandingData;
        if (items.youtubeDataApiKey && items.youtubeDataApiKey.trim !== "") {
          originalBrandingData = await getChannelBrandingWithYoutubeDataAPI(items.youtubeDataApiKey)
        }
        if (!originalBrandingData) {
          // Fallback to YouTubeI+i18n if YoutubeDataAPI Key was not set OR if it failed 
          originalBrandingData = await getChannelBrandingWithYoutubeI();
        }

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
      const originalTextFirstLine = originalBrandingData.truncatedDescription || originalBrandingData.description.split("\n")[0];
      // Compare text first span>span against first line first to avaoid waisting resources on formatting content
      if (
        descriptionTextContainer.hasChildNodes()
        && descriptionTextContainer.firstChild.hasChildNodes()
        && descriptionTextContainer.firstChild.firstChild.textContent?.trim() === originalTextFirstLine?.trim()
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
    untranslateChannelBranding: true
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