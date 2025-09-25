// Support both desktop and mobile YouTube layouts
const CHANNELBRANDING_HEADER_SELECTOR =
  "#page-header-container #page-header .page-header-view-model-wiz__page-header-headline-info, .page-header-view-model-wiz__page-header-headline-info, .page-header-view-model__page-header-headline-info, .yt-page-header-view-model__page-header-headline-info, #page-header";
const CHANNELBRANDING_ABOUT_SELECTOR =
  "ytd-engagement-panel-section-list-renderer, ytm-engagement-panel-section-list-renderer";
const CHANNEL_LOCATION_REGEXES = [
  /:\/\/(?:www\.|m\.)?youtube\.com\/channel\//,
  /:\/\/(?:www\.|m\.)?youtube\.com\/c\//,
  /:\/\/(?:www\.|m\.)?youtube\.com\/@/,
  /:\/\/(?:www\.|m\.)?youtube\.com\/user\//,
];

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
          originalBrandingData =
            await window.YoutubeAntiTranslate.getChannelBrandingWithYoutubeI();
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
    const selector = `yt-description-preview-view-model .yt-truncated-text__truncated-text-content > ${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}:nth-child(1), yt-description-preview-view-model .truncated-text-wiz__truncated-text-content > ${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}:nth-child(1)`;

    let descriptionTextContainer = container.querySelector(selector);

    // When width is lower than 528px the text container is outside the main container
    if (!descriptionTextContainer) {
      descriptionTextContainer = window.YoutubeAntiTranslate.getFirstVisible(
        document.querySelectorAll(selector),
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
          originalBrandingData =
            await window.YoutubeAntiTranslate.getChannelBrandingWithYoutubeI();
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
    if (
      await window.YoutubeAntiTranslate.isWhitelistedChannel(
        "whiteListUntranslateChannelBranding",
        null,
        document.location.href,
      )
    ) {
      window.YoutubeAntiTranslate.logInfo(
        "Channel is whitelisted, skipping branding untranslation",
      );
      return;
    }
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
    h4.compact-media-item-headline > .yt-core-attributed-string,
    h4.YtmCompactMediaItemHeadline > .yt-core-attributed-string`,
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
      renderer.querySelector("a.YtmCompactMediaItemImage") ||
      renderer.querySelector("a.compact-media-item-metadata-content") ||
      renderer.querySelector("a.YtmCompactMediaItemMetadataContent") ||
      renderer.querySelector("a[href*='/channel/']") ||
      renderer.querySelector("a[href*='/c/']") ||
      renderer.querySelector("a[href*='/@']") ||
      renderer.querySelector("a[href*='/user/']");
    if (!linkElement) {
      return;
    }
    const href = linkElement.href;
    const ucid = await window.YoutubeAntiTranslate.getChannelUCIDFromHref(href);
    if (!ucid) {
      return;
    }

    const originalBrandingData =
      await window.YoutubeAntiTranslate.getChannelBrandingWithYoutubeI(ucid);
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
    "yt-list-item-view-model .yt-list-item-view-model__text-wrapper",
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
        ".yt-list-item-view-model__text-wrapper a.yt-core-attributed-string__link",
      ) || item.querySelector("a.yt-core-attributed-string__link");
    if (!linkEl) {
      // Fallback to searching for the channel name filtered by search query and avatar image
      if (document.location.href.includes("search_query=")) {
        const search_query = new URLSearchParams(document.location.search).get(
          "search_query",
        );
        const originalItems =
          await window.YoutubeAntiTranslate.getOriginalCollaboratorsItemsWithYoutubeI(
            search_query,
          );

        const nameEl = item.parentElement.querySelector("yt-avatar-shape img");
        const imgSrc = nameEl?.src || null;
        if (!imgSrc) {
          return;
        }

        const originalItem = originalItems?.find(
          (item) => item.avatarImage === imgSrc,
        );

        const channelNameEl = item.querySelector(
          ".yt-list-item-view-model__title-wrapper .yt-core-attributed-string > span > span",
        );
        if (!originalItem?.name || !channelNameEl) {
          return;
        }

        // Replace only the first text node inside the link to preserve icons/badges
        if (
          !window.YoutubeAntiTranslate.isStringEqual(
            channelNameEl.textContent?.trim(),
            originalItem.name,
          )
        ) {
          if (
            await window.YoutubeAntiTranslate.isWhitelistedChannel(
              "whiteListUntranslateChannelBranding",
              null,
              null,
              null,
              originalItem.name,
            )
          ) {
            return;
          }
          window.YoutubeAntiTranslate.replaceTextOnly(
            channelNameEl,
            originalItem.name,
          );
        }
        return;
      }
      return;
    }

    const href = linkEl.getAttribute("href");

    if (
      await window.YoutubeAntiTranslate.isWhitelistedChannel(
        "whiteListUntranslateChannelBranding",
        null,
        href,
      )
    ) {
      window.YoutubeAntiTranslate.logInfo(
        "Channel is whitelisted, skipping branding untranslation",
      );
      return;
    }

    const ucid = await window.YoutubeAntiTranslate.getChannelUCIDFromHref(href);
    if (!ucid) {
      return;
    }

    const branding =
      await window.YoutubeAntiTranslate.getChannelBrandingWithYoutubeI(ucid);
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
