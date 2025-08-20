// Support both desktop and mobile YouTube layouts
const CHANNELBRANDING_HEADER_SELECTOR =
  "#page-header-container #page-header .page-header-view-model-wiz__page-header-headline-info, .page-header-view-model-wiz__page-header-headline-info";
const CHANNELBRANDING_ABOUT_SELECTOR =
  "ytd-engagement-panel-section-list-renderer, ytm-engagement-panel-section-list-renderer";
const CHANNEL_LOCATION_REGEXES = [
  /:\/\/(?:www\.|m\.)?youtube\.com\/channel\//,
  /:\/\/(?:www\.|m\.)?youtube\.com\/c\//,
  /:\/\/(?:www\.|m\.)?youtube\.com\/@/,
  /:\/\/(?:www\.|m\.)?youtube\.com\/user\//,
];

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
    var match = window.location.pathname.match(/\/channel\/([^/?]+)/);
    return match ? `${match[1]}` : null;
  }

  let handle = null;
  if (window.location.pathname.startsWith("/c/")) {
    const match = window.location.pathname.match(/\/c\/([^/?]+)/);
    handle = match ? `${match[1]}` : null;
  } else if (window.location.pathname.startsWith("/@")) {
    const match = window.location.pathname.match(/\/(@[^/?]+)/);
    handle = match ? `${match[1]}` : null;
  } else if (window.location.pathname.startsWith("/user/")) {
    const match = window.location.pathname.match(/\/user\/([^/?]+)/);
    handle = match ? `${match[1]}` : null;
  }
  // location.pathname is URL encoded, so we need to decode it
  return await lookupChannelId(decodeURIComponent(handle));
}

/**
 * Fetch the About/branding section of a YouTube channel.
 * @param {string} ucid   Optional Channel ID (starts with "UC…"). Defaults to UCID of the current channel
 * @param {string} locale Optional BCP-47 tag, e.g. "it-IT" or "fr". Defaults to the user's browser language.
 * @returns {object}      The title and description branding.
 */
async function getChannelBrandingWithYoutubeI(ucid = null) {
  if (!ucid) {
    ucid = await getChannelUCID();
  }
  if (!ucid) {
    window.YoutubeAntiTranslate.logInfo(`could not find channel UCID`);
    return;
  }

  // 1. get continuation to get country in english
  // const locale = await getChannelLocale(ucid, "en-US");

  // const [hl, gl] = locale.split(/[-_]/); // "en-US" → ["en", "US"]

  // build the request body
  const body = {
    context: {
      client: {
        clientName: window.YoutubeAntiTranslate.isMobile() ? "MWEB" : "WEB",
        clientVersion: "2.20250527.00.00",
        hl: "lo", // Using "Lao" as default that is an unsupported (but valid) language of youtube
        // That always get the original language as a result
      },
    },
    browseId: ucid,
  };

  const requestIdentifier = `youtubei/v1/browse_${JSON.stringify(body)}`;

  // Check cache
  const storedResponse =
    window.YoutubeAntiTranslate.getSessionCache(requestIdentifier);
  if (storedResponse) {
    return storedResponse;
  }

  const browse = `https://${window.YoutubeAntiTranslate.isMobile() ? "m" : "www"}.youtube.com/youtubei/v1/browse?prettyPrint=false`;
  const response = await window.YoutubeAntiTranslate.cachedRequest(
    browse,
    JSON.stringify(body),
    await window.YoutubeAntiTranslate.getYoutubeIHeadersWithCredentials(),
    // As it might take too much space
    true,
  );

  if (!response?.data) {
    window.YoutubeAntiTranslate.logWarning(
      `Failed to fetch ${browse} or parse response`,
    );
    return;
  }

  const hdr = response.data.header?.pageHeaderRenderer;
  const metadata = response.data.metadata?.channelMetadataRenderer;

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
  // window.YoutubeAntiTranslate.setSessionCache(ucid, locale);

  return result;
}

/**
 * Retrieved the Channel identifier filter for the current Channel page using location
 * @returns channel filter
 */
function getChannelFilter() {
  if (window.location.pathname.startsWith("/channel/")) {
    var match = window.location.pathname.match(/\/channel\/([^/?]+)/);
    return match ? `id=${match[1]}` : null;
  }
  if (window.location.pathname.startsWith("/c/")) {
    const match = window.location.pathname.match(/\/c\/([^/?]+)/);
    return match ? `forHandle=${match[1]}` : null;
  } else if (window.location.pathname.startsWith("/@")) {
    const match = window.location.pathname.match(/\/(@[^/?]+)/);
    return match ? `forHandle=${match[1]}` : null;
  } else if (window.location.pathname.startsWith("/user/")) {
    const match = window.location.pathname.match(/\/user\/([^/?]+)/);
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

    let descriptionTextContainer = container.querySelector(
      `yt-description-preview-view-model .truncated-text-wiz__truncated-text-content > ${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}:nth-child(1)`,
    );

    // When width is lower than 528px the text container is outside the main container
    if (!descriptionTextContainer) {
      descriptionTextContainer = window.YoutubeAntiTranslate.getFirstVisible(
        document.querySelector(
          `yt-description-preview-view-model .truncated-text-wiz__truncated-text-content > ${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}:nth-child(1)`,
        ),
      );
    }

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
  if (!originalBrandingData.title) {
    return;
  }

  // Desktop selector
  let titleTextContainer = container.querySelector(`#title-text`);

  // Mobile selector – channel name shown in the engagement-panel heading
  if (!titleTextContainer) {
    titleTextContainer = container.querySelector(
      `.engagement-panel-section-list-header-title span${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}`,
    );
  }

  if (!titleTextContainer) {
    window.YoutubeAntiTranslate.logInfo(
      `No branding about title text containers found`,
    );
    return;
  }

  if (titleTextContainer.innerText !== originalBrandingData.title) {
    window.YoutubeAntiTranslate.replaceTextOnly(
      titleTextContainer,
      originalBrandingData.title,
    );
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
  if (!originalBrandingData.description) {
    return;
  }

  // Desktop selector
  let descriptionTextContainer = container.querySelector(
    `#description-container > ${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}:nth-child(1)`,
  );

  // Mobile selector – description is inside .user-text
  if (!descriptionTextContainer) {
    descriptionTextContainer = container.querySelector(
      `.user-text > ${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}`,
    );
  }

  if (!descriptionTextContainer) {
    window.YoutubeAntiTranslate.logInfo(
      `No branding about description text containers found`,
    );
    return;
  }

  let formattedContent;
  const originalTextFirstLine =
    originalBrandingData.truncatedDescription ||
    originalBrandingData.description.split("\n")[0];

  // Compare text first span>span against first line first to avoid wasting resources on formatting content
  if (
    descriptionTextContainer.hasChildNodes() &&
    descriptionTextContainer.firstChild &&
    (
      descriptionTextContainer.firstChild.firstChild ||
      descriptionTextContainer.firstChild
    ).textContent?.trim() === originalTextFirstLine?.trim()
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
      window.YoutubeAntiTranslate.replaceContainerContent(
        descriptionTextContainer,
        formattedContent.cloneNode(true),
      );
    }
  } else {
    // First line was different so we can continue with untranslation
    formattedContent = window.YoutubeAntiTranslate.createFormattedContent(
      originalBrandingData.description,
    );
    window.YoutubeAntiTranslate.replaceContainerContent(
      descriptionTextContainer,
      formattedContent.cloneNode(true),
    );
  }
}

async function untranslateBranding() {
  const url = document.location.href;
  const isChannelPage = CHANNEL_LOCATION_REGEXES.some((regex) =>
    regex.test(url),
  );

  if (isChannelPage) {
    const brandingHeaderPromise = restoreOriginalBrandingHeader();
    const brandingAboutPromise = restoreOriginalBrandingAbout();
    const collaboratorsPromise = restoreCollaboratorsDialog();
    await Promise.all([
      brandingHeaderPromise,
      brandingAboutPromise,
      collaboratorsPromise,
    ]);
  } else {
    await Promise.all([
      restoreOriginalBrandingSearchResults(),
      restoreCollaboratorsDialog(),
    ]);
  }
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
      const brandingObserver = new MutationObserver(
        window.YoutubeAntiTranslate.debounce(untranslateBranding),
      );
      brandingObserver.observe(targetNode, observerConfig);
    }
  },
);

function updateSearchResultDescriptionContent(container, originalBrandingData) {
  if (!originalBrandingData?.description) {
    return;
  }

  const descriptionTextContainer = container.querySelector(`#description`);
  if (!descriptionTextContainer) {
    window.YoutubeAntiTranslate.logDebug(
      `No search result description container found`,
    );
    return;
  }

  const truncatedDescription = originalBrandingData.description;

  if (
    descriptionTextContainer.textContent?.trim() !==
    truncatedDescription?.trim()
  ) {
    descriptionTextContainer.textContent = truncatedDescription;
  }
}

function updateSearchResultChannelAuthor(container, originalBrandingData) {
  if (!originalBrandingData?.title) {
    return;
  }

  const authorTextContainer = container.querySelector(
    `#channel-title yt-formatted-string,
    h4.compact-media-item-headline > .yt-core-attributed-string`,
  );
  if (!authorTextContainer) {
    window.YoutubeAntiTranslate.logDebug(
      `No search result channel author container found`,
    );
    return;
  }

  if (authorTextContainer.textContent !== originalBrandingData.title) {
    authorTextContainer.textContent = originalBrandingData.title;
  }
}

async function getChannelUCIDFromHref(href) {
  if (!href) {
    return null;
  }
  // Direct UCID reference
  const channelMatch = href.match(/\/channel\/([^/?&#]+)/);
  if (channelMatch && channelMatch[1]) {
    return channelMatch[1];
  }

  // Handle paths such as /@handle or /c/Custom or /user/Username
  const handleMatch = href.match(/\/(?:@|c\/|user\/)([^/?&#]+)/);
  if (handleMatch && handleMatch[1]) {
    let handle = handleMatch[1];
    // restore missing @ for handle form
    if (!handle.startsWith("@")) {
      handle = href.includes("/@") ? `@${handle}` : handle;
    }
    return await lookupChannelId(handle);
  }
  return null;
}

/**
 * Restores original channel branding for channel renderers visible in search results.
 */
async function restoreOriginalBrandingSearchResults() {
  const channelRenderers = window.YoutubeAntiTranslate.getAllVisibleNodes(
    document.querySelectorAll(
      "ytd-channel-renderer, ytm-compact-channel-renderer",
    ),
    true,
    20,
  );

  if (!channelRenderers || channelRenderers.length === 0) {
    return;
  }

  const tasks = channelRenderers.map(async (renderer) => {
    const linkElement =
      renderer.querySelector("a.channel-link") ||
      renderer.querySelector("a#main-link") ||
      renderer.querySelector("a.compact-media-item-image") ||
      renderer.querySelector("a.compact-media-item-metadata-content");
    if (!linkElement) {
      return;
    }
    const href = linkElement.href;
    const ucid = await getChannelUCIDFromHref(href);
    if (!ucid) {
      return;
    }

    const originalBrandingData = await getChannelBrandingWithYoutubeI(ucid);
    if (!originalBrandingData) {
      return;
    }

    updateSearchResultDescriptionContent(renderer, originalBrandingData);
    updateSearchResultChannelAuthor(renderer, originalBrandingData);
  });

  await Promise.allSettled(tasks);
}

/**
 * Restores original channel names in the collaborators popup dialog.
 */
async function restoreCollaboratorsDialog() {
  // Find any open dialog that lists channels
  const dialog = window.YoutubeAntiTranslate.getFirstVisible(
    document.querySelectorAll("yt-dialog-view-model"),
  );
  if (!dialog) {
    return;
  }

  const listItems = dialog.querySelectorAll(
    "yt-list-item-view-model.yt-list-item-view-model-wiz",
  );
  if (!listItems || listItems.length === 0) {
    return;
  }

  const tasks = Array.from(listItems).map(async (item) => {
    if (item.getAttribute("data-ytat-collab-untranslated") === "true") {
      return;
    }

    // Anchor that contains the channel name (bold title area)
    const linkEl =
      item.querySelector(
        ".yt-list-item-view-model-wiz__title-wrapper a.yt-core-attributed-string__link",
      ) || item.querySelector("a.yt-core-attributed-string__link");
    if (!linkEl) {
      return;
    }

    const href = linkEl.getAttribute("href");
    const ucid = await getChannelUCIDFromHref(href);
    if (!ucid) {
      return;
    }

    const branding = await getChannelBrandingWithYoutubeI(ucid);
    if (!branding || !branding.title) {
      return;
    }

    // Replace only the first text node inside the link to preserve icons/badges
    if (
      !window.YoutubeAntiTranslate.isStringEqual(
        linkEl.textContent?.trim(),
        branding.title,
      )
    ) {
      window.YoutubeAntiTranslate.replaceTextOnly(linkEl, branding.title);
    }

    item.setAttribute("data-ytat-collab-untranslated", "true");
  });

  await Promise.allSettled(tasks);
}
