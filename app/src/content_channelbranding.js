const CHANNELBRANDING_HEADER_SELECTOR =
  "#page-header-container #page-header .page-header-view-model-wiz__page-header-headline-info";
const CHANNELBRANDING_ABOUT_SELECTOR =
  "ytd-engagement-panel-section-list-renderer";
const CHANNELBRANDING_MUTATION_UPDATE_FREQUENCY = 1;
const CHANNEL_LOCATION_REGEXES = [
  /:\/\/(?:www\.)?youtube\.com\/channel\//,
  /:\/\/(?:www\.)?youtube\.com\/c\//,
  /:\/\/(?:www\.)?youtube\.com\/@/,
  /:\/\/(?:www\.)?youtube\.com\/user\//,
];

/**
 * Use channel videos or shorts original titles to determine the original locale with i18n.detectLanguage()
 * @returns {string|null} detected locale ISO string or null
 */
async function detectChannelOriginalLanguage() {
  const videoElements = window.YoutubeAntiTranslate.getAllVisibleNodes(
    document.querySelectorAll(`${window.YoutubeAntiTranslate.ALL_ARRAYS_SHORTS_SELECTOR},
      ${window.YoutubeAntiTranslate.ALL_ARRAYS_VIDEOS_SELECTOR}`),
    true,
    20,
  );

  if (!videoElements || videoElements.length === 0) {
    return;
  }

  let combinedTitle = "";

  for (const el of videoElements) {
    const linkElement =
      el.querySelector("a#video-title-link") ||
      el.querySelector("a#thumbnail") ||
      el.querySelector("ytd-thumbnail a") ||
      el.querySelector(`a[href*="/watch?v="]`) ||
      el.querySelector("a.shortsLockupViewModelHostEndpoint") ||
      el.querySelector(`a[href*="/shorts/"]`);

    if (!linkElement) {
      continue;
    }

    let href = linkElement.href;
    if (!href) {
      continue;
    }

    // Handle shorts specifically
    if (href.includes("/shorts/")) {
      const match = href.match(/shorts\/([a-zA-Z0-9_-]+)/);
      if (!match || !match[1]) {
        continue;
      }
      href = `https://www.youtube.com/shorts/${match[1]}`;
    }

    href = window.YoutubeAntiTranslate.stripNonEssentialParams(href);
    const oembedUrl = `https://www.youtube.com/oembed?url=${href}`;

    let titleFromEmbed;

    // Check cache first
    const storedResponse =
      window.YoutubeAntiTranslate.getSessionCache(oembedUrl);
    if (storedResponse) {
      titleFromEmbed = `${storedResponse.title} ${storedResponse.author_name}`;
    } else {
      try {
        const res = await fetch(oembedUrl);
        if (!res.ok) {
          window.YoutubeAntiTranslate.logInfo(
            `Failed to fetch ${oembedUrl}:`,
            res.statusText,
          );
          continue;
        }

        const json = await res.json();
        titleFromEmbed = `${json.title} ${json.author_name}`;
        window.YoutubeAntiTranslate.setSessionCache(oembedUrl, json);
      } catch (e) {
        window.YoutubeAntiTranslate.logInfo("Fetch failed:", e);
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

  const detection =
    await window.YoutubeAntiTranslate.detectSupportedLanguage(combinedTitle);

  if (!detection) {
    return null;
  }
  return detection[0];
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
        clientVersion: "2.20250527.00.00",
      },
    },
    query,
    // "EgIQAg==" = filter=channels  (protobuf: {12: {1:2}})
    params: "EgIQAg==",
  };

  const requestIdentifier = `youtubei/v1/search_${JSON.stringify(body)}`;

  // Check cache
  const storedResponse =
    window.YoutubeAntiTranslate.getSessionCache(requestIdentifier);
  if (storedResponse) {
    return storedResponse;
  }

  const search = "https://www.youtube.com/youtubei/v1/search?prettyPrint=false";
  const res = await fetch(search, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    window.YoutubeAntiTranslate.logInfo(
      `Failed to fetch ${search}:`,
      res.statusText,
    );
    return;
  }

  const json = await res.json();

  const channelUcid =
    json.contents?.twoColumnSearchResultsRenderer?.primaryContents
      .sectionListRenderer?.contents[0].itemSectionRenderer.contents[0]
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

  let handle = null;
  if (window.location.pathname.startsWith("/c/")) {
    const match = window.location.pathname.match(/\/c\/([\w-]+)/);
    handle = match ? `${match[1]}` : null;
  } else if (window.location.pathname.startsWith("/@")) {
    const match = window.location.pathname.match(/\/(@[\w-]+)/);
    handle = match ? `${match[1]}` : null;
  } else if (window.location.pathname.startsWith("/user/")) {
    const match = window.location.pathname.match(/\/user\/(@[\w-]+)/);
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
    window.YoutubeAntiTranslate.logInfo(`could not find channel UCID`);
    return;
  }

  if (!locale) {
    // Check if we have a previusly successful locale
    locale = window.YoutubeAntiTranslate.getSessionCache(ucid);
  }
  if (!locale) {
    // detect original language based on oembedded data for videos or shorts on the current channel page
    locale = await detectChannelOriginalLanguage();
  }
  if (!locale) {
    window.YoutubeAntiTranslate.logInfo(
      `could not find channel original locale`,
    );
    return;
  }

  // split the locale into hl (= language) and gl (= region)
  //    • “it-IT” → ["it","IT"]
  //    • “fr”    → ["fr"]
  const [hl, region] = locale.split(/[-_]/); // tolerate "pt-BR" or "pt_BR"
  const gl = region;

  // build the request body
  const body = {
    context: {
      client: {
        hl, // language
        gl, // region
        clientName: "WEB",
        clientVersion: "2.20250527.00.00",
      },
    },
    browseId: ucid,
    // “about” tab protobuf — old first, then fall back to the newer encoding
    params: "EgVhYm91dA==", // {2:string:"about"} :contentReference[oaicite:0]{index=0}
  };

  const requestIdentifier = `youtubei/v1/browse_${JSON.stringify(body)}`;

  // Check cache
  const storedResponse =
    window.YoutubeAntiTranslate.getSessionCache(requestIdentifier);
  if (storedResponse) {
    return storedResponse;
  }

  const browse = "https://www.youtube.com/youtubei/v1/browse?prettyPrint=false";
  let res = await fetch(browse, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  // YT sometimes rejects the legacy protobuf with 400; try the newer one.
  if (res.status === 400) {
    body.params = "EgVhYm91dPIGBAoCEgA="; // wrapped “about” protobuf (2023-present) :contentReference[oaicite:1]{index=1}
    res = await fetch(browse, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  if (!res.ok) {
    window.YoutubeAntiTranslate.logInfo(
      `Failed to fetch ${browse}:`,
      res.statusText,
    );
    return;
  }

  const json = await res.json();

  const hdr = json.header?.pageHeaderRenderer;
  const metadata = json.metadata?.channelMetadataRenderer;

  const result = {
    title: metadata?.title, // channel name
    truncatedDescription:
      hdr?.content?.pageHeaderViewModel?.description
        ?.descriptionPreviewViewModel?.description?.content,
    description: metadata?.description, // full description
  };

  if (!metadata || !hdr) {
    return;
  }

  // Store in cache
  window.YoutubeAntiTranslate.setSessionCache(requestIdentifier, result);

  // Store also the successful detected locale that worked
  window.YoutubeAntiTranslate.setSessionCache(ucid, locale);

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
    const match = window.location.pathname.match(/\/c\/([\w-]+)/);
    return match ? `forHandle=${match[1]}` : null;
  } else if (window.location.pathname.startsWith("/@")) {
    const match = window.location.pathname.match(/\/(@[\w-]+)/);
    return match ? `forHandle=${match[1]}` : null;
  } else if (window.location.pathname.startsWith("/user/")) {
    const match = window.location.pathname.match(/\/user\/(@[\w-]+)/);
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
    window.YoutubeAntiTranslate.logInfo("Channel ID not found");
    return null;
  }

  const url = `https://www.googleapis.com/youtube/v3/channels?part=brandingSettings&${channelFilter}`;

  // Check cache
  const storedResponse = window.YoutubeAntiTranslate.getSessionCache(url);
  if (storedResponse) {
    return storedResponse;
  }

  const apiKey = youtubeDataApiKey;
  if (!apiKey || apiKey.trim() === "") {
    window.YoutubeAntiTranslate.logInfo("Missing YOUTUBE_API_KEY is not set");
    return null;
  }

  const response = await fetch(`${url}&key=${apiKey}`);

  if (!response.ok) {
    window.YoutubeAntiTranslate.logWarning(
      "Failed to fetch from YouTube API:",
      response.statusText,
    );
    return null;
  }

  const data = await response.json();
  const branding = data.items?.[0]?.brandingSettings?.channel;

  if (!branding) {
    window.YoutubeAntiTranslate.logInfo("Branding settings not found");
    return null;
  }

  const result = {
    title: branding.title,
    description: branding.description,
  };

  // Store in cache
  window.YoutubeAntiTranslate.setSessionCache(url, result);

  return result;
}

/**
 * Processes the branding header and restores it to its original form
 */
async function restoreOriginalBrandingHeader() {
  if (
    window.YoutubeAntiTranslate.getFirstVisible(
      document.querySelectorAll(CHANNELBRANDING_HEADER_SELECTOR),
    )
  ) {
    await chrome.storage.sync.get(
      {
        youtubeDataApiKey: null,
      },
      async (items) => {
        let originalBrandingData;
        if (items.youtubeDataApiKey && items.youtubeDataApiKey.trim !== "") {
          originalBrandingData = await getChannelBrandingWithYoutubeDataAPI(
            items.youtubeDataApiKey,
          );
        }
        if (!originalBrandingData) {
          // Fallback to YouTubeI+i18n if YoutubeDataAPI Key was not set OR if it failed
          originalBrandingData = await getChannelBrandingWithYoutubeI();
        }

        if (!originalBrandingData) {
          window.YoutubeAntiTranslate.logWarning(
            "No original branding data found",
          );
        } else if (
          !originalBrandingData.title &&
          !originalBrandingData.description
        ) {
          window.YoutubeAntiTranslate.logWarning(
            "No original branding data found for title and description",
          );
        } else {
          const brandingHeaderContainer =
            window.YoutubeAntiTranslate.getFirstVisible(
              document.querySelectorAll(CHANNELBRANDING_HEADER_SELECTOR),
            );
          if (brandingHeaderContainer) {
            updateBrandingHeaderTitleContent(
              brandingHeaderContainer,
              originalBrandingData,
            );
            updateBrandingHeaderDescriptionContent(
              brandingHeaderContainer,
              originalBrandingData,
            );
          } else {
            window.YoutubeAntiTranslate.logWarning(
              "Channel Branding Header container not found",
            );
          }
        }
      },
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
    const titleTextContainer = container.querySelector(
      `h1 ${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}`,
    );

    if (!titleTextContainer) {
      window.YoutubeAntiTranslate.logInfo(
        `No branding header title text containers found`,
      );
    } else {
      const cachedOldTitle = window.YoutubeAntiTranslate.getSessionCache(
        `pageTitle_${document.location.href}`,
      );

      if (cachedOldTitle && document.title.includes(cachedOldTitle)) {
        // This is sometimes skipped on first update as youtube translate the document title late; so we use a cached oldTitle

        // document tile is sometimes not a perfect match to the oldTile due to spacing, so normalize all
        const normalizedDocumentTitle =
          window.YoutubeAntiTranslate.normalizeSpaces(document.title);
        const normalizedOldTitle =
          window.YoutubeAntiTranslate.normalizeSpaces(cachedOldTitle);
        const normalizeRealTitle = window.YoutubeAntiTranslate.normalizeSpaces(
          originalBrandingData.title,
        );
        const realDocumentTitle = normalizedDocumentTitle.replace(
          normalizedOldTitle,
          normalizeRealTitle,
        );
        if (normalizedDocumentTitle !== realDocumentTitle) {
          document.title = realDocumentTitle;
        }
      }
      if (titleTextContainer.textContent !== originalBrandingData.title) {
        // cache old title for future reference
        window.YoutubeAntiTranslate.setSessionCache(
          `pageTitle_${document.location.href}`,
          titleTextContainer.textContent,
        );

        window.YoutubeAntiTranslate.replaceTextOnly(
          titleTextContainer,
          originalBrandingData.title,
        );
      }
    }
  }
}

/**
 * Updates the branding header element with the original content
 * @param {HTMLElement} container - The branding header container element
 * @param {JSON} originalBrandingData - The original branding title and description
 */
function updateBrandingHeaderDescriptionContent(
  container,
  originalBrandingData,
) {
  if (originalBrandingData.description) {
    // Find the description text container
    const descriptionTextContainer = container.querySelector(
      `yt-description-preview-view-model .truncated-text-wiz__truncated-text-content > ${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}:nth-child(1)`,
    );
    if (!descriptionTextContainer) {
      window.YoutubeAntiTranslate.logInfo(
        `No branding header description text containers found`,
      );
    } else {
      const truncatedDescription =
        originalBrandingData.truncatedDescription ||
        originalBrandingData.description.split("\n")[0];
      if (
        descriptionTextContainer.innerText?.trim() !==
        truncatedDescription?.trim()
      ) {
        const storeStyleDisplay =
          descriptionTextContainer.parentElement.style.display;
        descriptionTextContainer.parentElement.style.display = "none";
        window.YoutubeAntiTranslate.replaceTextOnly(
          descriptionTextContainer,
          truncatedDescription,
        );
        // Force reflow
        setTimeout(() => {
          descriptionTextContainer.parentElement.style.display =
            storeStyleDisplay;
        }, 50);
      }
    }
  }
}

/**
 * Processes the about and restores it to its original form
 */
async function restoreOriginalBrandingAbout() {
  if (
    window.YoutubeAntiTranslate.getFirstVisible(
      document.querySelectorAll(CHANNELBRANDING_ABOUT_SELECTOR),
    )
  ) {
    await chrome.storage.sync.get(
      {
        youtubeDataApiKey: null,
      },
      async (items) => {
        let originalBrandingData;
        if (items.youtubeDataApiKey && items.youtubeDataApiKey.trim !== "") {
          originalBrandingData = await getChannelBrandingWithYoutubeDataAPI(
            items.youtubeDataApiKey,
          );
        }
        if (!originalBrandingData) {
          // Fallback to YouTubeI+i18n if YoutubeDataAPI Key was not set OR if it failed
          originalBrandingData = await getChannelBrandingWithYoutubeI();
        }

        if (!originalBrandingData) {
          window.YoutubeAntiTranslate.logWarning(
            "No original branding data found",
          );
        } else if (
          !originalBrandingData.title &&
          !originalBrandingData.description
        ) {
          window.YoutubeAntiTranslate.logWarning(
            "No original branding data found for title and description",
          );
        } else {
          const aboutContainer = window.YoutubeAntiTranslate.getAllVisibleNodes(
            document.querySelectorAll(CHANNELBRANDING_ABOUT_SELECTOR),
          );
          if (aboutContainer || aboutContainer.length > 0) {
            aboutContainer.forEach((element) => {
              updateBrandingAboutDescriptionContent(
                element,
                originalBrandingData,
              );
              updateBrandingAboutTitleContent(element, originalBrandingData);
            });
          } else {
            window.YoutubeAntiTranslate.logInfo(
              `Channel About container not found`,
            );
          }
        }
      },
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
      window.YoutubeAntiTranslate.logInfo(
        `No branding about title text containers found`,
      );
    } else {
      if (titleTextContainer.innerText !== originalBrandingData.title) {
        window.YoutubeAntiTranslate.replaceTextOnly(
          titleTextContainer,
          originalBrandingData.title,
        );
      }
    }
  }
}

/**
 * Updates the About element with the original content
 * @param {HTMLElement} container - The about container element
 * @param {JSON} originalBrandingData - The original branding title and description
 */
function updateBrandingAboutDescriptionContent(
  container,
  originalBrandingData,
) {
  if (originalBrandingData.description) {
    // Find the description text container
    const descriptionTextContainer = container.querySelector(
      `#description-container > ${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}:nth-child(1)`,
    );

    if (!descriptionTextContainer) {
      window.YoutubeAntiTranslate.logInfo(
        `No branding about description text containers found`,
      );
    } else {
      let formattedContent;
      const originalTextFirstLine =
        originalBrandingData.truncatedDescription ||
        originalBrandingData.description.split("\n")[0];
      // Compare text first span>span against first line first to avaoid waisting resources on formatting content
      if (
        descriptionTextContainer.hasChildNodes() &&
        descriptionTextContainer.firstChild.hasChildNodes() &&
        descriptionTextContainer.firstChild.firstChild.textContent?.trim() ===
          originalTextFirstLine?.trim()
      ) {
        // If identical create formatted content and compare with firstchild text content to determine if any change is needed
        formattedContent = window.YoutubeAntiTranslate.createFormattedContent(
          originalBrandingData.description,
        );
        if (
          descriptionTextContainer.hasChildNodes() &&
          descriptionTextContainer.firstChild.textContent !==
            formattedContent.textContent
        ) {
          // No changes are needed
          window.YoutubeAntiTranslate.replaceContainerContent(
            descriptionTextContainer,
            formattedContent.cloneNode(true),
          );
        }
      } else {
        // First line was different so we can continue with untraslation
        // Create formatted content
        formattedContent = window.YoutubeAntiTranslate.createFormattedContent(
          originalBrandingData.description,
        );
        window.YoutubeAntiTranslate.replaceContainerContent(
          descriptionTextContainer,
          formattedContent.cloneNode(true),
        );
      }
    }
  }
}

let mutationBrandingIdx = 0;
async function untranslateBranding() {
  if (mutationBrandingIdx % CHANNELBRANDING_MUTATION_UPDATE_FREQUENCY === 0) {
    const url = document.location.href;
    const isChannelPage = CHANNEL_LOCATION_REGEXES.some((regex) =>
      regex.test(url),
    );

    if (isChannelPage) {
      const brandingHeaderPromise = restoreOriginalBrandingHeader();
      const brandingAboutPromise = restoreOriginalBrandingAbout();

      // Wait for all promises to resolve concurrently
      await Promise.all([brandingHeaderPromise, brandingAboutPromise]);
    }
  }
  mutationBrandingIdx++;
}

// Initialize the mutation observer for branding
chrome.storage.sync.get(
  {
    disabled: false,
    untranslateChannelBranding: true,
  },
  async (items) => {
    if (!items.disabled && items.untranslateChannelBranding) {
      const targetNode = document.body;
      const observerConfig = { childList: true, subtree: true };
      const brandingObserver = new MutationObserver(untranslateBranding);
      brandingObserver.observe(targetNode, observerConfig);
    }
  },
);
