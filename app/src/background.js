//For intersect we are not switching to debounce
//as the callback will handle multiple elements entering them sigularly
const INTERSECTION_UPDATE_STEP_VIDEOS = 2;
let allIntersectVideoElements = null;
let intersectionObserverOtherVideos;
(function waitForIntersectionObserverOtherVideos() {
  if (
    window.YoutubeAntiTranslate &&
    typeof window.YoutubeAntiTranslate
      .VIEWPORT_EXTENSION_PERCENTAGE_FRACTION !== "undefined"
  ) {
    intersectionObserverOtherVideos = new IntersectionObserver(
      untranslateOtherVideosOnIntersect,
      {
        root: null, // viewport
        rootMargin: `${window.YoutubeAntiTranslate.VIEWPORT_EXTENSION_PERCENTAGE_FRACTION * 100}%`,
        threshold: 0, // Trigger when ANY part of the observed elements are inside the extended viewport
      },
    );
  } else {
    setTimeout(waitForIntersectionObserverOtherVideos, 8);
  }
})();

//For intersect we are not switching to debounce
//as the callback will handle multiple elements entering them sigularly
const INTERSECTION_UPDATE_STEP_SHORTS = 2;
let allIntersectShortElements = null;
let intersectionObserverOtherShorts;
(function waitForIntersectionObserverOtherShorts() {
  if (
    window.YoutubeAntiTranslate &&
    typeof window.YoutubeAntiTranslate
      .VIEWPORT_EXTENSION_PERCENTAGE_FRACTION !== "undefined"
  ) {
    intersectionObserverOtherShorts = new IntersectionObserver(
      untranslateOtherShortsOnIntersect,
      {
        root: null, // viewport
        rootMargin: `${window.YoutubeAntiTranslate.VIEWPORT_EXTENSION_PERCENTAGE_FRACTION * 100}%`,
        threshold: 0, // Trigger when ANY part of the observed elements are inside the extended viewport
      },
    );
  } else {
    setTimeout(waitForIntersectionObserverOtherShorts, 8);
  }
})();

let cachedRequest = null;
(function waitForCachedRequest() {
  if (
    window.YoutubeAntiTranslate &&
    typeof window.YoutubeAntiTranslate.cachedRequest === "function"
  ) {
    cachedRequest = window.YoutubeAntiTranslate.cachedRequest.bind(
      window.YoutubeAntiTranslate,
    );
  } else {
    setTimeout(waitForCachedRequest, 8);
  }
})();

// Changes main short title on "/shorts/shortid" pages
async function untranslateCurrentShortVideo() {
  const fakeNodeID = "yt-anti-translate-fake-node-current-short-video";
  const originalNodeSelector = `yt-shorts-video-title-view-model > h2 > span:not(#${fakeNodeID})`;
  const originalNodePartialSelector = `span:not(#${fakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    originalNodePartialSelector,
    () => document.location.href,
    "span",
    true,
    true,
  );
}

// Changes short title on "/shorts/shortid" pages inside of the Description Panel
async function untranslateCurrentShortVideoDescriptionPanelHeader() {
  const fakeNodeID =
    "yt-anti-translate-fake-node-current-short-video-description-panel-heaeder";
  const originalNodeSelector = `#anchored-panel ytd-video-description-header-renderer > #title > yt-formatted-string:not(#${fakeNodeID})`;
  const originalNodePartialSelector = `span:not(#${fakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    originalNodePartialSelector,
    () => document.location.href,
    "span",
    false,
  );
}

function getShortUrlFromSource() {
  if (window.YoutubeAntiTranslate.isMobile()) {
    const sourceUrl = document.location.href;
    // example https://m.youtube.com/source/50G0kIty7Cg/shorts?bp=etc...
    // extract source video id from url
    const match = sourceUrl.match(/\/source\/([^\\]+)\/shorts/);
    if (match) {
      const sourceVideoId = match[1];
      return `https://m.youtube.com/shorts/${sourceVideoId}`;
    }
  }
  return document.location.href;
}

// Changes short title on "/shorts/shortid" pages inside of the Short Engagement Panel
async function untranslateCurrentShortVideoEngagementPanel() {
  const fakeNodeID =
    "yt-anti-translate-fake-node-current-short-video-engagement-panel";
  const originalNodeSelector = `#anchored-panel #header yt-dynamic-text-view-model > h1 > span:not(#${fakeNodeID}), ytm-browse yt-dynamic-text-view-model > h1 > span:not(#${fakeNodeID})`;
  const originalNodePartialSelector = `span:not(#${fakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    originalNodePartialSelector,
    getShortUrlFromSource,
    "span",
    false,
    window.YoutubeAntiTranslate.isMobile(),
  );
}

// Changes featured video link title on "/shorts/shortid" pages
async function untranslateCurrentShortVideoLinks() {
  const fakeNodeID = "yt-anti-translate-fake-node-current-short-video-links";
  const originalNodeSelector = `.ytReelMultiFormatLinkViewModelEndpoint span${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}>span:not(#${fakeNodeID})`;
  const originalNodePartialSelector = `span:not(#${fakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    originalNodePartialSelector,
    (el) => el?.parentElement?.parentElement?.parentElement?.href,
    "span",
    false,
  );
}

// Changes main video title on "/watch?v=videoid" pages
async function untranslateCurrentVideo() {
  if (!window.location.pathname.startsWith("/watch")) {
    return;
  }

  const fakeNodeID = "yt-anti-translate-fake-node-current-video";
  const originalNodeSelector = `#title > h1 > yt-formatted-string:not(#${fakeNodeID}), .slim-video-information-title .yt-core-attributed-string:not(#${fakeNodeID})`;
  const originalNodePartialSelector = `yt-formatted-string:not(#${fakeNodeID}), .yt-core-attributed-string:not(#${fakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    originalNodePartialSelector,
    () => document.location.href,
    "div",
    false,
    true,
  );
}

// For channel ("/@MrBeast") pages or embedded videos, video's title **in** the video player
// See "docs/Figure 2.png"
async function untranslateCurrentVideoHeadLink() {
  const fakeNodeID = "yt-anti-translate-fake-node-video-head-link";
  const originalNodeSelector = `${window.YoutubeAntiTranslate.getPlayerSelector()} a.ytp-title-link:not(#${fakeNodeID})`;
  const originalNodePartialSelector = `a.ytp-title-link:not(#${fakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    originalNodePartialSelector,
    (el) => {
      const videoLinkHead = el.href;
      if (!videoLinkHead || videoLinkHead.trim() === "") {
        return document.location.href;
      }
      return videoLinkHead;
    },
    "a",
    false,
    document.location.href.includes("youtube-nocookie.com") ||
      document.location.href.includes("youtube.com/embed/"),
  );
}

async function untranslateCurrentVideoFullScreenEdu() {
  if (!window.location.pathname.startsWith("/watch")) {
    return;
  }

  const fakeNodeID = "yt-anti-translate-fake-node-fullscreen-edu";
  const originalNodeSelector = `${window.YoutubeAntiTranslate.getPlayerSelector()} div.ytp-fullerscreen-edu-text:not(#${fakeNodeID})`;
  const originalNodePartialSelector = `div.ytp-fullerscreen-edu-text:not(#${fakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    originalNodePartialSelector,
    () => document.location.href,
    "div",
    false,
  );
}
async function untranslateCurrentEmbeddedVideoMobileFullScreen() {
  const fakeNodeID =
    "yt-anti-translate-fake-node-embedded-mobilefullscreen-title";
  const originalNodeSelector = `#player-controls a.ytmVideoInfoVideoTitle > span.yt-core-attributed-string:not(#${fakeNodeID})`;
  const originalNodePartialSelector = `span.yt-core-attributed-string:not(#${fakeNodeID})`;

  const authorFakeNodeID = `${fakeNodeID}-author`;
  const videoAuthorSelector = `#player-controls a.ytmVideoInfoChannelTitle > span.yt-core-attributed-string:not(#${authorFakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    originalNodePartialSelector,
    () =>
      document.querySelector(`#player-controls a.ytmVideoInfoVideoTitle`)?.href,
    "div",
    false,
    true,
    videoAuthorSelector,
    authorFakeNodeID,
    "span",
  );
}

// For channel ("/@MrBeast") pages, for the pinned video's title **under** the video player
// See "docs/Figure 1.png"
async function untranslateCurrentChannelEmbeddedVideoTitle() {
  const fakeNodeID = "yt-anti-translate-fake-node-channel-embedded-title";
  const originalNodeSelector = `div.ytd-channel-video-player-renderer #metadata-container.ytd-channel-video-player-renderer a:not(#${fakeNodeID})`;
  const originalNodePartialSelector = `a:not(#${fakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    originalNodePartialSelector,
    (el) => el.href,
    "a",
    false,
  );
}

// Added: Untranslate main video title for the mobile (m.youtube.com) layout
async function untranslateCurrentMobileVideoDescriptionHeader() {
  if (!window.YoutubeAntiTranslate.isMobile()) {
    return;
  }
  const fakeNodeID = "yt-anti-translate-fake-node-mobile-video-description";
  const originalNodeSelector = `ytm-video-description-header-renderer .title > span.yt-core-attributed-string:not(#${fakeNodeID})`;
  const originalNodePartialSelector = `span.yt-core-attributed-string:not(#${fakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    originalNodePartialSelector,
    () => document.location.href,
    "span",
    true,
  );
}

// Untranslate channel featured video title for the mobile (m.youtube.com) layout
async function untranslateCurrentMobileFeaturedVideoChannel() {
  if (!window.YoutubeAntiTranslate.isMobile()) {
    return;
  }
  const fakeNodeID =
    "yt-anti-translate-fake-node-mobile-featured-video-channel";
  const originalNodeSelector = `ytm-channel-featured-video-renderer > a > h3 > span.yt-core-attributed-string:not(#${fakeNodeID})`;
  const originalNodePartialSelector = `span.yt-core-attributed-string:not(#${fakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    originalNodePartialSelector,
    (el) => el.closest("a").href,
    "span",
    false,
    true,
  );
}

// Untranslate mini player video channel title for Desktop layout only
async function untranslateCurrentMiniPlayerVideo() {
  if (window.YoutubeAntiTranslate.isMobile()) {
    return;
  }
  if (
    !window.YoutubeAntiTranslate.getFirstVisible(
      document.querySelectorAll(
        `ytd-miniplayer ${window.YoutubeAntiTranslate.getPlayerSelector()}`,
      ),
    )
  ) {
    return;
  }

  const fakeNodeID = "yt-anti-translate-fake-node-mini-player-video-channel";
  const originalNodeSelector = `ytd-miniplayer-info-bar .ytdMiniplayerInfoBarTitle ${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}:not(#${fakeNodeID})`;
  const originalNodePartialSelector = `${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}:not(#${fakeNodeID})`;

  const authorFakeNodeID = `${fakeNodeID}-author`;
  const videoAuthorSelector = `ytd-miniplayer-info-bar .ytdMiniplayerInfoBarSubtitle ${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}:not(#${authorFakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    originalNodePartialSelector,
    () => {
      const miniPlayer = window.YoutubeAntiTranslate.getFirstVisible(
        document.querySelectorAll(
          `ytd-miniplayer ${window.YoutubeAntiTranslate.getPlayerSelector()}`,
        ),
      );
      const playerResponse =
        window.YoutubeAntiTranslate.getPlayerResponseSafely(miniPlayer);
      if (
        playerResponse &&
        playerResponse.videoDetails &&
        playerResponse.videoDetails.videoId
      ) {
        return `${document.location.origin}/watch?v=${playerResponse.videoDetails.videoId}`;
      }
      return null;
    },
    "span",
    true,
    false,
    videoAuthorSelector,
    authorFakeNodeID,
    "span",
  );
}

/**
 * Create or Updates an untranslated fake node for the translated element with a video title
 * @param {string} fakeNodeID
 * @param {string} originalNodeSelector
 * @param {string} originalNodePartialSelector
 * @param {Function} getUrl
 * @param {string} createElementTag
 * @param {boolean} requirePlayer
 * @param {boolean} shouldSetDocumentTitle
 * @param {string} videoAuthorSelector
 * @param {string} authorFakeNodeID
 * @param {string} authorCreateElementTag
 * @returns
 */
async function createOrUpdateUntranslatedFakeNode(
  fakeNodeID,
  originalNodeSelector,
  originalNodePartialSelector,
  getUrl,
  createElementTag,
  requirePlayer = true,
  shouldSetDocumentTitle = false,
  videoAuthorSelector = null,
  authorFakeNodeID = null,
  authorCreateElementTag = null,
) {
  if (
    !requirePlayer ||
    window.YoutubeAntiTranslate.getFirstVisible(
      document.querySelectorAll(
        window.YoutubeAntiTranslate.getPlayerSelector(),
      ),
    )
  ) {
    const settings = await window.YoutubeAntiTranslate.getSettings();

    let translatedElement = window.YoutubeAntiTranslate.getFirstVisible(
      document.querySelectorAll(originalNodeSelector),
    );

    if (!translatedElement || !translatedElement.textContent) {
      translatedElement = window.YoutubeAntiTranslate.getFirstVisible(
        document.querySelectorAll(
          `${originalNodeSelector}:not(.cbCustomTitle)`,
        ),
      );
    }

    const fakeNode = document.querySelector(`#${fakeNodeID}`);

    if (
      (!fakeNode || !fakeNode.textContent) &&
      (!translatedElement || !translatedElement.textContent)
    ) {
      return;
    }

    const getUrlForElement =
      window.YoutubeAntiTranslate.stripNonEssentialParams(
        getUrl(translatedElement ?? fakeNode),
      );

    // Ignore advertisement video
    if (window.YoutubeAntiTranslate.isAdvertisementHref(getUrlForElement)) {
      return;
    }

    const videoId = window.YoutubeAntiTranslate.extractVideoIdFromUrl(
      getUrlForElement.startsWith("http")
        ? getUrlForElement
        : window.location.origin + getUrlForElement,
    );

    if (!videoId) {
      // If the link is not a video/short do not proceed further
      return;
    }
    let response = await cachedRequest(
      "https://www.youtube.com/oembed?url=" + getUrlForElement,
    );
    if (
      !response ||
      !response.response ||
      !response.response.ok ||
      !response.data?.title
    ) {
      if (response?.response?.status === 401) {
        // 401 likely means the video is restricted try again with youtubeI
        response =
          await window.YoutubeAntiTranslate.getVideoTitleFromYoutubeI(videoId);
        if (!response?.response?.ok || !response.data?.title) {
          window.YoutubeAntiTranslate.logWarning(
            `YoutubeI title request failed for video ${videoId}`,
          );
          return;
        }
      } else {
        return;
      }
    }

    const realTitle = response.data.title;

    if (!realTitle || (!translatedElement && !fakeNode)) {
      return;
    }

    if (
      settings.untranslateChannelBranding &&
      videoAuthorSelector &&
      authorFakeNodeID &&
      authorCreateElementTag
    ) {
      await createOrUpdateUntranslatedFakeNodeAuthor(
        response.data.author_url,
        response.data.author_name,
        videoAuthorSelector,
        authorFakeNodeID,
        authorCreateElementTag,
      );
    }

    if (
      await window.YoutubeAntiTranslate.isWhitelistedChannel(
        "whiteListUntranslateTitle",
        null,
        response.data.author_url,
      )
    ) {
      window.YoutubeAntiTranslate.logInfo(
        "Channel is whitelisted, skipping video titles untranslation",
      );
      return;
    }

    if (settings.untranslateTitle) {
      let oldTitle = translatedElement?.textContent;

      if (!oldTitle && fakeNode) {
        // If we don't have the translated element, try to find the hidden translated element from the fakeNode parent
        const hiddenTranslatedElement = fakeNode.parentElement?.querySelector(
          originalNodePartialSelector,
        );
        // Get the translated title only if it's not empty
        oldTitle =
          hiddenTranslatedElement?.textContent?.trim() === ""
            ? null
            : hiddenTranslatedElement?.textContent;
      }

      if (shouldSetDocumentTitle) {
        if (
          window.YoutubeAntiTranslate.doesStringInclude(
            document.title,
            oldTitle,
          )
        ) {
          document.title = window.YoutubeAntiTranslate.stringReplaceWithOptions(
            document.title,
            oldTitle,
            realTitle,
          );
        }
      }

      if (
        window.YoutubeAntiTranslate.isStringEqual(
          fakeNode?.textContent,
          realTitle,
        )
      ) {
        return;
      }

      if (window.YoutubeAntiTranslate.isStringEqual(realTitle, oldTitle)) {
        return;
      }

      window.YoutubeAntiTranslate.logInfo(
        `translated title to "${realTitle}" from "${oldTitle}"`,
      );

      if (!fakeNode && translatedElement) {
        // Not sure why, but even tho we checked already 'fakeNode', 'existingFakeNode' still return a value of initialization
        const existingFakeNode = translatedElement.parentElement.querySelector(
          `#${fakeNodeID}`,
        );
        const newFakeNode = document.createElement(createElementTag);
        if (translatedElement.href) {
          newFakeNode.href = translatedElement.href;
        }
        newFakeNode.className = translatedElement.className;
        newFakeNode.target = translatedElement.target;
        newFakeNode.tabIndex = translatedElement.tabIndex;
        newFakeNode["data-sessionlink"] = translatedElement["data-sessionlink"];
        newFakeNode.id = fakeNodeID;
        newFakeNode.textContent = realTitle;
        newFakeNode.setAttribute("video-id", videoId);
        if (!existingFakeNode) {
          newFakeNode.style.visibility =
            translatedElement.style?.visibility ?? "visible";
          newFakeNode.style.display =
            translatedElement.style?.display ?? "block";
          translatedElement.after(newFakeNode);
        } else {
          newFakeNode.style.visibility =
            existingFakeNode.style?.visibility ?? "visible";
          newFakeNode.style.display =
            existingFakeNode.style?.display ?? "block";
          existingFakeNode.replaceWith(newFakeNode);
        }
        translatedElement.style.visibility = "hidden";
        translatedElement.style.display = "none";
      } else if (fakeNode) {
        fakeNode.textContent = realTitle;
        fakeNode.setAttribute("video-id", videoId);
      }
    }
  }
}

/**
 * Helper function used by `createOrUpdateUntranslatedFakeNode`
 * Create or Updates an untranslated fake node for the translated element with a video author
 * @param {string} realAuthorUrl
 * @param {string} realAuthor
 * @param {string} videoAuthorSelector
 * @param {string} authorFakeNodeID
 * @param {string} authorCreateElementTag
 * @returns
 */
async function createOrUpdateUntranslatedFakeNodeAuthor(
  realAuthorUrl,
  realAuthor,
  videoAuthorSelector,
  authorFakeNodeID,
  authorCreateElementTag,
) {
  const translatedElement = window.YoutubeAntiTranslate.getFirstVisible(
    document.querySelectorAll(videoAuthorSelector),
  );

  const fakeNode = document.querySelector(`#${authorFakeNodeID}`);

  if (
    (!fakeNode || !fakeNode.textContent) &&
    (!translatedElement || !translatedElement.textContent)
  ) {
    return;
  }

  if (!realAuthor || (!translatedElement && !fakeNode)) {
    return;
  }

  if (
    await window.YoutubeAntiTranslate.isWhitelistedChannel(
      "whiteListUntranslateChannelBranding",
      null,
      realAuthorUrl,
    )
  ) {
    window.YoutubeAntiTranslate.logInfo(
      "Channel is whitelisted, skipping channel branding untranslation",
    );
    return;
  }

  const oldAuthor = translatedElement?.textContent || fakeNode?.textContent;

  if (
    window.YoutubeAntiTranslate.isStringEqual(fakeNode?.textContent, realAuthor)
  ) {
    return;
  }

  window.YoutubeAntiTranslate.logInfo(
    `translated author to "${realAuthor}" from "${oldAuthor}"`,
  );

  if (!fakeNode && translatedElement) {
    // Not sure why, but even tho we checked already 'fakeNode', 'existingFakeNode' still return a value of initialization
    const existingFakeNode = translatedElement.parentElement.querySelector(
      `#${authorFakeNodeID}`,
    );
    const newFakeNode = document.createElement(authorCreateElementTag);
    if (translatedElement.href) {
      newFakeNode.href = translatedElement.href;
    }
    newFakeNode.className = translatedElement.className;
    newFakeNode.target = translatedElement.target;
    newFakeNode.tabIndex = translatedElement.tabIndex;
    newFakeNode["data-sessionlink"] = translatedElement["data-sessionlink"];
    newFakeNode.id = authorFakeNodeID;
    newFakeNode.textContent = realAuthor;
    if (!existingFakeNode) {
      newFakeNode.style.visibility =
        translatedElement.style?.visibility ?? "visible";
      newFakeNode.style.display = translatedElement.style?.display ?? "block";
      translatedElement.after(newFakeNode);
    } else {
      newFakeNode.style.visibility =
        existingFakeNode.style?.visibility ?? "visible";
      newFakeNode.style.display = existingFakeNode.style?.display ?? "block";
      existingFakeNode.replaceWith(newFakeNode);
    }
    translatedElement.style.visibility = "hidden";
    translatedElement.style.display = "none";
  } else if (fakeNode) {
    fakeNode.textContent = realAuthor;
  }
}

async function untranslateOtherVideos(intersectElements = null) {
  async function untranslateOtherVideosArray(otherVideos) {
    if (!otherVideos) {
      return;
    }
    const videosArray = Array.from(otherVideos);

    const settings = await window.YoutubeAntiTranslate.getSettings();

    await Promise.all(
      videosArray.map(async (video) => {
        if (!video) {
          // Skip null video element
          return;
        }

        // Check if current widget is a playlist, not a video
        const isPlaylist =
          video.querySelector('a[href*="/playlist?"]') ||
          window.YoutubeAntiTranslate.getFirstVisible(
            video.querySelectorAll(
              "yt-collection-thumbnail-view-model, .media-item-thumbnail-container.stacked",
            ),
          );

        if (isPlaylist && !settings.untranslateThumbnail) {
          return;
        }

        const hrefFilter = '[href*="/watch?v="]';
        // Find link and title elements typical for standard videos
        let linkElement =
          video.querySelector(`a#video-title-link${hrefFilter}`) ||
          video.querySelector(`a#thumbnail${hrefFilter}`) ||
          video.querySelector(
            `a.media-item-thumbnail-container${hrefFilter}`,
          ) ||
          video.querySelector(`div.media-item-metadata > a${hrefFilter}`) ||
          video.querySelector(
            `ytd-playlist-panel-video-renderer a${hrefFilter}`,
          ) ||
          video.querySelector(`ytm-video-card-renderer a${hrefFilter}`) ||
          video.querySelector(
            `a.yt-lockup-metadata-view-model__title${hrefFilter}`,
          ) ||
          (video.matches(`a.ytp-videowall-still${hrefFilter}`)
            ? video
            : null) ||
          (video.matches(`a.ytp-ce-covering-overlay${hrefFilter}`)
            ? video
            : null) ||
          (video.matches(`a.ytp-suggestion-link${hrefFilter}`) ? video : null);

        if (!linkElement) {
          // Try another common pattern before giving up
          if (!linkElement) {
            linkElement =
              video.querySelector(`ytd-thumbnail a${hrefFilter}`) ||
              video.querySelector(`a${hrefFilter}`);
            if (!linkElement) {
              // extract video id from thumbnail as last resort
              const thumbnail = video.querySelector('img[src*="i.ytimg.com"]');
              if (thumbnail) {
                const videoId =
                  window.YoutubeAntiTranslate.extractVideoIdFromUrl(
                    thumbnail.src,
                  );
                if (videoId) {
                  linkElement = document.createElement("a");
                  linkElement.href = `/watch?v=${videoId}`;
                }
              }
            }
          }
          if (!linkElement) {
            return; // Skip if essential element isn't found
          }
        }

        // Ignore advertisement video
        if (window.YoutubeAntiTranslate.isAdvertisementHref(linkElement.href)) {
          return;
        }

        // Use the link's href for oEmbed and as the key
        // These afaik always conform to "/watch?v=id", and don't have any extra parameters, but just to be safe
        const videoHref = window.YoutubeAntiTranslate.stripNonEssentialParams(
          linkElement.href,
        );

        const videoId = window.YoutubeAntiTranslate.extractVideoIdFromUrl(
          videoHref.startsWith("http")
            ? videoHref
            : window.location.origin + videoHref,
        );

        // If already processed, (or marked as unprocessable for all) skip
        if (
          (video.hasAttribute("data-ytat-untranslated-video-title") &&
            video.getAttribute("data-ytat-untranslated-video-title") ===
              `${videoId}_${window.YoutubeAntiTranslate.MAX_ATTEMPTS}` &&
            video.hasAttribute("data-ytat-untranslated-video-thumbnail") &&
            video.getAttribute("data-ytat-untranslated-video-thumbnail") ===
              `${videoId}_${window.YoutubeAntiTranslate.MAX_ATTEMPTS}` &&
            video.hasAttribute("data-ytat-untranslated-video-desc") &&
            video.getAttribute("data-ytat-untranslated-video-desc") ===
              `${videoId}_${window.YoutubeAntiTranslate.MAX_ATTEMPTS}` &&
            video.hasAttribute(
              "data-ytat-untranslated-video-channel-branding",
            ) &&
            video.getAttribute(
              "data-ytat-untranslated-video-channel-branding",
            ) === `${videoId}_${window.YoutubeAntiTranslate.MAX_ATTEMPTS}`) ||
          (video.hasAttribute("data-ytat-untranslated-video-failed-attempts") &&
            video.getAttribute(
              "data-ytat-untranslated-video-failed-attempts",
            ) === `${videoId}__${window.YoutubeAntiTranslate.MAX_ATTEMPTS}`)
        ) {
          return;
        }

        // Get title container element
        let titleElement =
          video.querySelector("#video-title:not(.cbCustomTitle)") ||
          video.querySelector(
            ".compact-media-item-headline .yt-core-attributed-string",
          ) ||
          video.querySelector(
            ".YtmCompactMediaItemHeadline .yt-core-attributed-string",
          ) ||
          video.querySelector(
            "ytd-playlist-panel-video-renderer #video-title",
          ) ||
          video.querySelector(
            "ytm-video-card-renderer .video-card-title .yt-core-attributed-string",
          ) ||
          video.querySelector(
            ".media-item-headline .yt-core-attributed-string",
          ) ||
          video.querySelector(
            "div.media-item-metadata > a > h3.media-item-headline",
          ) ||
          video.querySelector(
            ".yt-lockup-metadata-view-model__heading-reset .yt-core-attributed-string",
          ) ||
          video.querySelector("span.ytp-videowall-still-info-title") ||
          video.querySelector("div.ytp-ce-video-title") ||
          video.querySelector("div.ytp-suggestion-title");
        if (!titleElement) {
          titleElement =
            video.querySelector("yt-formatted-string#video-title") ||
            video.querySelector(
              ".yt-lockup-metadata-view-model-wiz__title>.yt-core-attributed-string",
            ) ||
            video.querySelector(
              ".compact-media-item-headline .yt-core-attributed-string",
            ) ||
            video.querySelector(
              ".YtmCompactMediaItemHeadline .yt-core-attributed-string",
            );

          if (!titleElement) {
            // Mark if title element is missing to avoid repeated failed attempts
            const getCount = video.getAttribute(
              "data-ytat-untranslated-video-title",
            );
            const getCountNumber = getCount
              ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] || 0
              : 0;
            video.setAttribute(
              "data-ytat-untranslated-video-title",
              `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
            );
          }
        }

        // Get thumbnail container elements
        const thumbnailElements = video.querySelectorAll(
          'img[src*="i.ytimg.com"]:not(.ytd-moving-thumbnail-renderer):not([src*="ytimg.com/an_webp/"])',
        );
        if (!thumbnailElements || thumbnailElements.length === 0) {
          // Mark if thumbnail elements are missing to avoid repeated failed attempts
          const getCount = video.getAttribute(
            "data-ytat-untranslated-video-thumbnail",
          );
          const getCountNumber = getCount
            ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] || 0
            : 0;
          video.setAttribute(
            "data-ytat-untranslated-video-thumbnail",
            `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
          );
        }

        // Get description snippet container elements
        const snippetElements = video.querySelectorAll(
          ".metadata-snippet-text, .metadata-snippet-text-navigation",
        );
        if (!snippetElements || snippetElements.length === 0) {
          // Mark if description snippet elements are missing to avoid repeated failed attempts
          const getCount = video.getAttribute(
            "data-ytat-untranslated-video-desc",
          );
          const getCountNumber = getCount
            ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] || 0
            : 0;
          video.setAttribute(
            "data-ytat-untranslated-video-desc",
            `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
          );
        }

        // Get authors container elements for collaborators videos
        const authorsElement =
          video.querySelector(
            `#channel-info yt-formatted-string > a.yt-simple-endpoint`,
          ) ||
          video.querySelector(
            `yt-content-metadata-view-model ${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR} a`,
          ) ||
          video.querySelector(`.ytd-channel-name a.yt-simple-endpoint`) ||
          video.querySelector(`.ytd-playlist-panel-video-renderer #byline`) ||
          video.querySelector(
            `div.media-item-metadata .YtmBadgeAndBylineRendererHost span${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}`,
          ) ||
          video.querySelector(
            `.YtmCompactMediaItemByline span${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}`,
          );

        if (!authorsElement) {
          // Mark if authors elements are missing to avoid repeated failed attempts
          const getCount = video.getAttribute(
            "data-ytat-untranslated-video-channel-branding",
          );
          const getCountNumber = getCount
            ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] || 0
            : 0;
          video.setAttribute(
            "data-ytat-untranslated-video-channel-branding",
            `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
          );
        }

        // If none of the supported elements are found, skip
        if (
          !titleElement &&
          (!thumbnailElements || thumbnailElements.length === 0) &&
          (!snippetElements || snippetElements.length === 0) &&
          !authorsElement
        ) {
          return;
        }

        try {
          // console.debug(`Fetching oEmbed for video:`, videoHref);
          let response = await cachedRequest(
            "https://www.youtube.com/oembed?url=" + videoHref,
          );
          if (
            !response ||
            !response.response ||
            !response.response.ok ||
            !response.data?.title
          ) {
            if (response?.response?.status === 401) {
              // 401 likely means the video is restricted try again with youtubeI

              response =
                await window.YoutubeAntiTranslate.getVideoTitleFromYoutubeI(
                  videoId,
                );
              if (!response?.response?.ok || !response.data?.title) {
                window.YoutubeAntiTranslate.logWarning(
                  `YoutubeI title request failed for video ${videoId}`,
                );
                // Mark as failed attempt on no data
                const getCount = video.getAttribute(
                  "data-ytat-untranslated-video-failed-attempts",
                );
                const getCountNumber = getCount
                  ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] ||
                    0
                  : 0;
                video.setAttribute(
                  "data-ytat-untranslated-video-failed-attempts",
                  `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
                );
                return;
              }
            } else {
              // console.debug(`No oEmbed data for video:`, videoHref);
              // Mark as failed attempt if no oEmbed data
              const getCount = video.getAttribute(
                "data-ytat-untranslated-video-failed-attempts",
              );
              const getCountNumber = getCount
                ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] || 0
                : 0;
              video.setAttribute(
                "data-ytat-untranslated-video-failed-attempts",
                `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
              );
              return; // Skip if no oEmbed data
            }
          }

          const originalTitle = response.data.title;
          // Use innerText for comparison/logging as per original logic for these elements
          const currentTitle =
            titleElement.innerText?.trim() || titleElement.textContent?.trim();

          /* -------- Handle video title untranslation -------- */
          if (
            !isPlaylist &&
            settings.untranslateTitle &&
            originalTitle &&
            currentTitle &&
            !window.YoutubeAntiTranslate.isStringEqual(
              originalTitle,
              currentTitle,
            )
          ) {
            if (
              await window.YoutubeAntiTranslate.isWhitelistedChannel(
                "whiteListUntranslateTitle",
                null,
                response.data.author_url,
              )
            ) {
              window.YoutubeAntiTranslate.logInfo(
                "Channel is whitelisted, skipping video titles untranslation for:",
                videoId,
                response.data.author_url,
                "whiteListUntranslateTitle",
              );
              // Mark as done if whitelisted
              video.setAttribute(
                "data-ytat-untranslated-video-title",
                `${videoId}__${window.YoutubeAntiTranslate.MAX_ATTEMPTS}`,
              );
            } else {
              window.YoutubeAntiTranslate.logInfo(
                `Untranslating Video: "${currentTitle}" -> "${originalTitle}"`,
              );
              // Update both innerText and title attribute
              titleElement.innerText = originalTitle;
              titleElement.title = originalTitle;
              // Update link title attribute if it's the specific title link
              if (
                linkElement.matches("a#video-title-link:not(.cbCustomTitle)")
              ) {
                linkElement.title = originalTitle;
              }

              // Mark as untranslated
              video.setAttribute(
                "data-ytat-untranslated-video-title",
                `${videoId}__${window.YoutubeAntiTranslate.MAX_ATTEMPTS}`,
              );
            }
          } else {
            // console.debug(`Video title unchanged or element missing:`, { href: videoHref, originalTitle, currentTitle });
            // Mark as attempted if no changes are needed
            const getCount = video.getAttribute(
              "data-ytat-untranslated-video-title",
            );
            const getCountNumber = getCount
              ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] || 0
              : 0;
            video.setAttribute(
              "data-ytat-untranslated-video-title",
              `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
            );
          }

          /* -------- Handle video thumbnail untranslation -------- */
          const originalThumbnail = response.data.thumbnail_url;
          if (
            settings.untranslateThumbnail &&
            originalThumbnail &&
            thumbnailElements &&
            thumbnailElements.length > 0
          ) {
            if (
              await window.YoutubeAntiTranslate.isWhitelistedChannel(
                "whiteListUntranslateThumbnail",
                null,
                response.data.author_url,
              )
            ) {
              window.YoutubeAntiTranslate.logInfo(
                "Channel is whitelisted, skipping video thumbnail untranslation for:",
                videoId,
                response.data.author_url,
                "whiteListUntranslateThumbnail",
              );
              // Mark as done if whitelisted
              video.setAttribute(
                "data-ytat-untranslated-video-thumbnail",
                `${videoId}__${window.YoutubeAntiTranslate.MAX_ATTEMPTS}`,
              );
            } else {
              for (const thumbnailElement of thumbnailElements) {
                if (thumbnailElement.closest("#mouseover-overlay")) {
                  continue;
                }

                if (!thumbnailElement || !thumbnailElement.src) {
                  continue;
                }

                if (
                  thumbnailElement.src.includes("https://i.ytimg.com/vi/") || // path of not-localized thumbnails
                  thumbnailElement.src.includes("?youtube-anti-translate")
                ) {
                  continue;
                }
                // Only update if the thumbnail is different
                if (!thumbnailElement.src.includes(originalThumbnail)) {
                  const { width, height } =
                    await window.YoutubeAntiTranslate.getImageSize(
                      thumbnailElement.src,
                    );
                  thumbnailElement.src =
                    originalThumbnail + `?youtube-anti-translate=${Date.now()}`;
                  // Add crop ratio to image
                  if (width && height) {
                    const cropRatio = width / height;
                    if (cropRatio) {
                      // match crop ratio of current thumbnail
                      thumbnailElement.style.aspectRatio = cropRatio;
                      thumbnailElement.style.objectFit = "cover";
                    }
                  }

                  // Mark as untranslated
                  video.setAttribute(
                    "data-ytat-untranslated-video-thumbnail",
                    `${videoId}__${window.YoutubeAntiTranslate.MAX_ATTEMPTS}`,
                  );
                }
              }
            }
          } else {
            // Mark as attempted if no changes are needed
            const getCount = video.getAttribute(
              "data-ytat-untranslated-video-thumbnail",
            );
            const getCountNumber = getCount
              ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] || 0
              : 0;
            video.setAttribute(
              "data-ytat-untranslated-video-thumbnail",
              `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
            );
          }

          /* -------- Handle description snippet untranslation (search results, video lists) -------- */
          if (
            !isPlaylist &&
            settings.untranslateDescription &&
            snippetElements &&
            snippetElements.length > 0
          ) {
            if (
              await window.YoutubeAntiTranslate.isWhitelistedChannel(
                "whiteListUntranslateDescription",
                null,
                response.data.author_url,
              )
            ) {
              window.YoutubeAntiTranslate.logInfo(
                "Channel is whitelisted, skipping video description untranslation for:",
                videoId,
                response.data.author_url,
                "whiteListUntranslateDescription",
              );
              // Mark as done if whitelisted
              video.setAttribute(
                "data-ytat-untranslated-video-desc",
                `${videoId}__${window.YoutubeAntiTranslate.MAX_ATTEMPTS}`,
              );
            } else {
              const idMatch = videoHref.match(/[?&]v=([a-zA-Z0-9_-]+)/);
              if (idMatch && idMatch[1]) {
                const videoId = idMatch[1];
                const originalDescription =
                  await getOriginalVideoDescription(videoId);

                if (originalDescription) {
                  const truncated = trimDescriptionByWords(originalDescription);

                  snippetElements.forEach((el) => {
                    const currentText = el.textContent?.trim();
                    if (
                      truncated &&
                      currentText &&
                      !window.YoutubeAntiTranslate.isStringEqual(
                        currentText,
                        truncated,
                      )
                    ) {
                      el.textContent = truncated;
                      if (el.hasAttribute("is-empty")) {
                        el.removeAttribute("is-empty");
                      }

                      // Mark as untranslated
                      video.setAttribute(
                        "data-ytat-untranslated-video-desc",
                        `${videoId}__${window.YoutubeAntiTranslate.MAX_ATTEMPTS}`,
                      );
                    }
                  });
                }
              }
            }
          } else {
            // Mark as attempted if no changes are needed
            const getCount = video.getAttribute(
              "data-ytat-untranslated-video-desc",
            );
            const getCountNumber = getCount
              ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] || 0
              : 0;
            video.setAttribute(
              "data-ytat-untranslated-video-desc",
              `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
            );
          }

          /* -------- Handle collaborator untranslation -------- */
          const mainAuthor = response.data.author_name;
          if (
            !isPlaylist &&
            settings.untranslateChannelBranding &&
            authorsElement &&
            mainAuthor
          ) {
            const authors = [];
            const avatarStacks = video.querySelectorAll(
              "yt-avatar-stack-view-model yt-avatar-shape img",
            );
            if (avatarStacks && avatarStacks.length > 0) {
              for (const avatarImage of avatarStacks) {
                const imgSrc = avatarImage.src;
                if (!imgSrc || imgSrc.trim() === "") {
                  continue;
                }

                const originalCollaborators =
                  await window.YoutubeAntiTranslate.getOriginalCollaboratorsItemsWithYoutubeI(
                    originalTitle,
                  );

                const originalItem = originalCollaborators?.find(
                  (item) => item.avatarImage === avatarImage.src,
                );
                if (!originalItem) {
                  continue;
                }

                authors.push(originalItem.name);
              }
            } else {
              // Fallback using video id filtered list
              // Needed on mobile where avatar stacks are not used
              const originalCollaborators =
                await window.YoutubeAntiTranslate.getOriginalCollaboratorsItemsWithYoutubeI(
                  originalTitle,
                );
              const originalItems = originalCollaborators?.filter(
                (item) => item.videoId === videoId,
              );
              if (originalItems && originalItems.length > 0) {
                for (const originalItem of originalItems) {
                  authors.push(originalItem.name);
                }
              }
            }

            if (authors.length > 0) {
              // Remove main author from collaborators list
              const collaboratorAuthorsOnly = authors.filter(
                (name) => name !== mainAuthor,
              );

              if (
                collaboratorAuthorsOnly &&
                collaboratorAuthorsOnly.length === 1
              ) {
                if (
                  await window.YoutubeAntiTranslate.isWhitelistedChannel(
                    "whiteListUntranslateChannelBranding",
                    null,
                    null,
                    null,
                    collaboratorAuthorsOnly[0],
                  )
                ) {
                  window.YoutubeAntiTranslate.logInfo(
                    "Channel is whitelisted, skipping channel branding untranslation for:",
                    videoId,
                    collaboratorAuthorsOnly[0],
                    "whiteListUntranslateChannelBranding",
                  );
                  // Mark as done if whitelisted
                  video.setAttribute(
                    "data-ytat-untranslated-video-channel-branding",
                    `${videoId}__${window.YoutubeAntiTranslate.MAX_ATTEMPTS}`,
                  );
                } else {
                  const authorsTooltipElement = video.querySelector(
                    `#channel-info .ytd-channel-name #tooltip`,
                  );
                  const localizedAnd =
                    window.YoutubeAntiTranslate.getLocalizedAnd(
                      document.documentElement.lang,
                    );
                  const untranslatedAuthorText = `${mainAuthor} ${localizedAnd} ${collaboratorAuthorsOnly[0]}`;
                  if (
                    authorsElement &&
                    !authorsElement.textContent.includes(untranslatedAuthorText)
                  ) {
                    authorsElement.textContent = untranslatedAuthorText;
                    // Update tooltip if exists
                    if (authorsTooltipElement) {
                      authorsTooltipElement.textContent =
                        untranslatedAuthorText;
                    }
                    // Mark as untranslated
                    video.setAttribute(
                      "data-ytat-untranslated-video-channel-branding",
                      `${videoId}__${window.YoutubeAntiTranslate.MAX_ATTEMPTS}`,
                    );
                  }
                }
              }
            }
          } else {
            // Mark as attempted if no changes are needed
            const getCount = video.getAttribute(
              "data-ytat-untranslated-video-channel-branding",
            );
            const getCountNumber = getCount
              ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] || 0
              : 0;
            video.setAttribute(
              "data-ytat-untranslated-video-channel-branding",
              `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
            );
          }
        } catch (error) {
          window.YoutubeAntiTranslate.logInfo(
            `Error processing video:`,
            videoHref,
            error,
          );
          // Mark as failed attempt on error
          const getCount = video.getAttribute(
            "data-ytat-untranslated-video-failed-attempts",
          );
          const getCountNumber = getCount
            ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] || 0
            : 0;
          video.setAttribute(
            "data-ytat-untranslated-video-failed-attempts",
            `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
          );
        }
        // End of processing for this video
      }),
    );
  }

  if (intersectElements) {
    // If this was called from the intersect obesrver only check the newly intersecting items
    await untranslateOtherVideosArray(intersectElements);
    return;
  }
  // Selectors for all video containers
  await untranslateOtherVideosArray(
    window.YoutubeAntiTranslate.getAllVisibleNodes(
      document.querySelectorAll(
        window.YoutubeAntiTranslate.ALL_ARRAYS_VIDEOS_SELECTOR,
      ),
    ),
  );
}

async function untranslateOtherShortsVideos(intersectElements = null) {
  async function untranslateOtherShortsArray(shortsItems) {
    if (!shortsItems) {
      return;
    }
    const shortsArray = Array.from(shortsItems);

    const settings = await window.YoutubeAntiTranslate.getSettings();

    await Promise.all(
      shortsArray.map(async (shortElement) => {
        if (!shortElement) {
          return;
        }

        // Check if current widget is a playlist, not a video
        const isPlaylist =
          shortElement.querySelector('a[href*="/playlist?"]') ||
          window.YoutubeAntiTranslate.getFirstVisible(
            shortElement.querySelectorAll(
              "yt-collection-thumbnail-view-model, .media-item-thumbnail-container.stacked",
            ),
          );

        if (isPlaylist && !settings.untranslateThumbnail) {
          return;
        }

        // Find link element to get URL
        let linkElement =
          shortElement.querySelector(
            'a.shortsLockupViewModelHostEndpoint[href*="/shorts/"]',
          ) ||
          shortElement.querySelector(`a[href*="/shorts/"]`) ||
          shortElement.querySelector(`a[href*="/watch?v="]`); // This is for compatibility with [No YouTube Shorts](https://addons.mozilla.org/en-US/firefox/addon/no-youtube-shorts/)
        if (!linkElement || !linkElement.href) {
          if (!linkElement) {
            // extract video id from thumbnail as last resort
            const thumbnail = shortElement.querySelector(
              'img[src*="i.ytimg.com"]',
            );
            if (thumbnail) {
              const videoId = window.YoutubeAntiTranslate.extractVideoIdFromUrl(
                thumbnail.src,
              );
              if (videoId) {
                linkElement = document.createElement("a");
                linkElement.href = `/shorts/${videoId}`;
              }
            }
          }

          if (!linkElement || !linkElement.href) {
            return;
          }
        }

        // Ignore advertisement video
        if (window.YoutubeAntiTranslate.isAdvertisementHref(linkElement.href)) {
          return;
        }

        const videoHref = linkElement.href;
        // Extract video ID from URLs like /shorts/VIDEO_ID
        const videoIdMatch =
          videoHref.match(/shorts\/([a-zA-Z0-9_-]+)/) ||
          videoHref.match(/[?&]v=([a-zA-Z0-9_-]+)/); // This is for compatibility with [No YouTube Shorts](https://addons.mozilla.org/en-US/firefox/addon/no-youtube-shorts/)
        if (!videoIdMatch || !videoIdMatch[1]) {
          return;
        }
        const videoId = videoIdMatch[1];

        // If already processed, (or marked as unprocessable for all) skip
        if (
          (shortElement.hasAttribute("data-ytat-untranslated-other-title") &&
            shortElement.getAttribute("data-ytat-untranslated-other-title") ===
              `${videoId}_${window.YoutubeAntiTranslate.MAX_ATTEMPTS}` &&
            shortElement.hasAttribute(
              "data-ytat-untranslated-other-thumbnail",
            ) &&
            shortElement.getAttribute(
              "data-ytat-untranslated-other-thumbnail",
            ) === `${videoId}_${window.YoutubeAntiTranslate.MAX_ATTEMPTS}`) ||
          (shortElement.hasAttribute(
            "data-ytat-untranslated-other-failed-attempts",
          ) &&
            shortElement.getAttribute(
              "data-ytat-untranslated-other-failed-attempts",
            ) === `${videoId}__${window.YoutubeAntiTranslate.MAX_ATTEMPTS}`)
        ) {
          return;
        }

        // Find title element (Common patterns: #video-title inside the renderer)
        const titleElement = shortElement.querySelector(
          `${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}.yt-core-attributed-string--white-space-pre-wrap`,
        );
        if (!titleElement) {
          // Mark if title element is missing to avoid repeated failed attempts
          const getCount = shortElement.getAttribute(
            "data-ytat-untranslated-other-title",
          );
          const getCountNumber = getCount
            ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] || 0
            : 0;
          shortElement.setAttribute(
            "data-ytat-untranslated-other-title",
            `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
          );
        }

        // Find the thumbnail image elements (there can be multiple)
        const thumbnailElements = shortElement.querySelectorAll(
          'img[src*="i.ytimg.com"]',
        );
        if (!thumbnailElements || thumbnailElements.length === 0) {
          // Mark if thumbnail elements are missing to avoid repeated failed attempts
          const getCount = shortElement.getAttribute(
            "data-ytat-untranslated-other-thumbnail",
          );
          const getCountNumber = getCount
            ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] || 0
            : 0;
          shortElement.setAttribute(
            "data-ytat-untranslated-other-thumbnail",
            `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
          );
        }

        // If none of the supported elements are found, skip
        if (
          !titleElement &&
          (!thumbnailElements || thumbnailElements.length === 0)
        ) {
          return;
        }

        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`;
        // although this is a short, oembeded is more reliable with standard video URLs
        // e.g. using shorts url the thumbnail is different from the video thumbnail normally used in original locale

        try {
          let response = await cachedRequest(oembedUrl);
          if (
            !response ||
            !response.response ||
            !response.response.ok ||
            !response.data?.title
          ) {
            if (response?.response?.status === 401) {
              // 401 likely means the video is restricted try again with youtubeI
              response =
                await window.YoutubeAntiTranslate.getVideoTitleFromYoutubeI(
                  videoId,
                );
              if (!response?.response?.ok || !response.data?.title) {
                window.YoutubeAntiTranslate.logWarning(
                  `YoutubeI title request failed for video ${videoId}`,
                );
                // Mark as failed attempt on no data
                const getCount = shortElement.getAttribute(
                  "data-ytat-untranslated-other-failed-attempts",
                );
                const getCountNumber = getCount
                  ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] ||
                    0
                  : 0;
                shortElement.setAttribute(
                  "data-ytat-untranslated-other-failed-attempts",
                  `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
                );
                return;
              }
            } else {
              // Mark as failed attempt if no oEmbed data is found
              const getCount = shortElement.getAttribute(
                "data-ytat-untranslated-other-failed-attempts",
              );
              const getCountNumber = getCount
                ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] || 0
                : 0;
              shortElement.setAttribute(
                "data-ytat-untranslated-other-failed-attempts",
                `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
              );
              return;
            }
          }

          if (settings.untranslateTitle || settings.untranslateThumbnail) {
            /* -------- Handle video title untranslation -------- */
            const realTitle = response.data.title;
            const currentTitle = titleElement.textContent?.trim(); // Use textContent for typical title spans
            if (
              !isPlaylist &&
              settings.untranslateTitle &&
              realTitle &&
              currentTitle &&
              !window.YoutubeAntiTranslate.isStringEqual(
                realTitle,
                currentTitle,
              )
            ) {
              if (
                await window.YoutubeAntiTranslate.isWhitelistedChannel(
                  "whiteListUntranslateTitle",
                  null,
                  response.data.author_url,
                )
              ) {
                window.YoutubeAntiTranslate.logInfo(
                  "Channel is whitelisted, skipping shorts titles untranslation on:",
                  videoId,
                  response.data.author_url,
                  "whiteListUntranslateTitle",
                );
                // Avoid checking again if whitelisted
                shortElement.setAttribute(
                  "data-ytat-untranslated-other-title",
                  `${videoId}__${window.YoutubeAntiTranslate.MAX_ATTEMPTS}`,
                );
              } else {
                titleElement.textContent = realTitle;
                // Update title attribute if it exists (for tooltips)
                if (titleElement.hasAttribute("title")) {
                  titleElement.title = realTitle;
                }
                const titleA = shortElement.querySelector(
                  "a.shortsLockupViewModelHostEndpoint.shortsLockupViewModelHostOutsideMetadataEndpoint",
                );
                if (titleA) {
                  titleA.title = realTitle;
                }
                shortElement.setAttribute(
                  "data-ytat-untranslated-other-title",
                  `${videoId}__${window.YoutubeAntiTranslate.MAX_ATTEMPTS}`,
                ); // Mark as successfully untranslated
              }
            } else {
              // Mark attempt to avoid checking again if no changes are needed
              const getCount = shortElement.getAttribute(
                "data-ytat-untranslated-other-title",
              );
              const getCountNumber = getCount
                ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] || 0
                : 0;
              shortElement.setAttribute(
                "data-ytat-untranslated-other-title",
                `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
              );
            }

            /* -------- Handle video thumbnail untranslation -------- */
            let originalThumbnail = response.data.thumbnail_url;
            if (
              settings.untranslateThumbnail &&
              originalThumbnail &&
              thumbnailElements &&
              thumbnailElements.length > 0
            ) {
              if (
                await window.YoutubeAntiTranslate.isWhitelistedChannel(
                  "whiteListUntranslateThumbnail",
                  null,
                  response.data.author_url,
                )
              ) {
                window.YoutubeAntiTranslate.logInfo(
                  "Channel is whitelisted, skipping short thumbnail untranslation on:",
                  videoId,
                  response.data.author_url,
                  "whiteListUntranslateThumbnail",
                );
                // Avoid checking again if whitelisted
                shortElement.setAttribute(
                  "data-ytat-untranslated-other-thumbnail",
                  `${videoId}__${window.YoutubeAntiTranslate.MAX_ATTEMPTS}`,
                );
              } else {
                for (const thumbnailElement of thumbnailElements) {
                  if (!thumbnailElement || !thumbnailElement.src) {
                    continue;
                  }

                  if (
                    thumbnailElement.src.includes("https://i.ytimg.com/vi/") || // path of not-localized thumbnails
                    thumbnailElement.src.includes("?youtube-anti-translate")
                  ) {
                    continue;
                  }

                  if (linkElement.includes("/shorts/")) {
                    for (const maxResName of ["maxresdefault", "oardefault"]) {
                      if (!originalThumbnail.includes(maxResName)) {
                        originalThumbnail = originalThumbnail.replace(
                          /\/([^/_]+)\.(jpg|jpeg|png|gif|webp|avif)/,
                          `/${maxResName}.$2`,
                        );
                      }

                      if (
                        await window.YoutubeAntiTranslate.isFoundImageSrc(
                          originalThumbnail,
                        )
                      ) {
                        break;
                      } else {
                        originalThumbnail = response.data.thumbnail_url; // fallback to whatever is in oEmbed if maxres doesn't exist
                      }
                    }
                  }

                  // Only update if the thumbnail is different
                  if (!thumbnailElement.src.includes(originalThumbnail)) {
                    const { width, height } =
                      await window.YoutubeAntiTranslate.getImageSize(
                        thumbnailElement.src,
                      );
                    thumbnailElement.src =
                      originalThumbnail +
                      `?youtube-anti-translate=${Date.now()}`;
                    // Add crop ratio to image
                    if (width && height) {
                      const cropRatio = width / height;
                      if (cropRatio) {
                        // match crop ratio of current thumbnail
                        thumbnailElement.style.aspectRatio = cropRatio;
                        thumbnailElement.style.objectFit = "cover";

                        // get new image size to determine orientation
                        const { width, height } =
                          await window.YoutubeAntiTranslate.getImageSize(
                            originalThumbnail,
                          );
                        if (width > height) {
                          thumbnailElement.style.width = "118%";
                          thumbnailElement.style.height = "118%";
                          // Center the thumbnail both horizontally and vertically
                          thumbnailElement.style.position = "absolute";
                          thumbnailElement.style.top = "50%";
                          thumbnailElement.style.left = "50%";
                          thumbnailElement.style.transform =
                            "translate(-50%, -50%)";
                        }
                      }
                    }

                    // Mark as successfully untranslated
                    shortElement.setAttribute(
                      "data-ytat-untranslated-other-title",
                      `${videoId}__${window.YoutubeAntiTranslate.MAX_ATTEMPTS}`,
                    );
                  }
                }
              }
            } else {
              // Mark attempt to avoid checking again if no changes are needed
              const getCount = shortElement.getAttribute(
                "data-ytat-untranslated-other-thumbnail",
              );
              const getCountNumber = getCount
                ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] || 0
                : 0;
              shortElement.setAttribute(
                "data-ytat-untranslated-other-thumbnail",
                `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
              );
            }
          }
        } catch (error) {
          window.YoutubeAntiTranslate.logInfo(
            `Error fetching oEmbed for other Short:`,
            videoId,
            error,
          );
          // Mark as failed attempt on error
          const getCount = shortElement.getAttribute(
            "data-ytat-untranslated-other-failed-attempts",
          );
          const getCountNumber = getCount
            ? getCount.match(new RegExp(`^${videoId}__([0-9]+)$`))?.[1] || 0
            : 0;
          shortElement.setAttribute(
            "data-ytat-untranslated-other-failed-attempts",
            `${videoId}__${getCountNumber >= window.YoutubeAntiTranslate.MAX_ATTEMPTS ? window.YoutubeAntiTranslate.MAX_ATTEMPTS : getCountNumber + 1}`,
          );
        }
        // End of processing for this short
      }),
    );
  }

  if (intersectElements) {
    // If this was called from the intersect obesrver only check the newly intersecting items
    await untranslateOtherShortsArray(intersectElements);
    return;
  }
  // Run for all shorts items
  await untranslateOtherShortsArray(
    window.YoutubeAntiTranslate.getAllVisibleNodes(
      document.querySelectorAll(
        window.YoutubeAntiTranslate.ALL_ARRAYS_SHORTS_SELECTOR,
      ),
    ),
  );
}

async function untranslateCurrentPlayerBackgroundThumbnail() {
  const player = window.YoutubeAntiTranslate.getFirstVisible(
    document.querySelectorAll(window.YoutubeAntiTranslate.getPlayerSelector()),
  );
  if (!player) {
    return;
  }
  // <div class="ytp-cued-thumbnail-overlay-image" style="background-image: url(&quot;https://i.ytimg.com/vi/iLU0CE2c2HQ/maxresdefault.jpg&quot;);"></div>
  const thumbnailBackground = document.querySelector(
    ".ytp-cued-thumbnail-overlay-image[style*='i.ytimg.com'][style*='background-image'][style*='maxresdefault']",
  );
  if (thumbnailBackground) {
    const currentStyle = thumbnailBackground.style.backgroundImage;
    // extract image src from style.backgroundImage(url("IMAGE_URL"))
    const currentImageSrc = currentStyle.match(
      /url\(["']?([^"']+)["']?\)/,
    )?.[1];

    if (
      currentImageSrc.includes("https://i.ytimg.com/vi/") || // path of not-localized thumbnails
      currentImageSrc.includes("?youtube-anti-translate")
    ) {
      return;
    }

    const currentVideo = document.location.href;
    const videoId =
      window.YoutubeAntiTranslate.extractVideoIdFromUrl(currentVideo);
    if (!videoId) {
      return;
    }

    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`;

    try {
      let response = await cachedRequest(oembedUrl);
      if (
        !response ||
        !response.response ||
        !response.response.ok ||
        !response.data?.thumbnail_url
      ) {
        if (response?.response?.status === 401) {
          // 401 likely means the video is restricted try again with youtubeI
          response =
            await window.YoutubeAntiTranslate.getVideoTitleFromYoutubeI(
              videoId,
            );
          if (!response?.response?.ok || !response.data?.title) {
            window.YoutubeAntiTranslate.logWarning(
              `YoutubeI title request failed for video ${videoId}`,
            );
            return;
          }
        }
      }

      if (
        await window.YoutubeAntiTranslate.isWhitelistedChannel(
          "whiteListUntranslateThumbnail",
          null,
          response.data.author_url,
        )
      ) {
        window.YoutubeAntiTranslate.logInfo(
          "Channel is whitelisted, skipping video thumbnail untranslation",
        );
        return;
      }

      let originalThumbnail =
        response.data.maxresdefault_url || response.data.thumbnail_url;
      if (originalThumbnail) {
        if (!originalThumbnail.includes("maxresdefault")) {
          originalThumbnail = originalThumbnail.replace(
            /\/([^/]+)\.(jpg|jpeg|png|gif|webp|avif)/,
            "/maxresdefault.jpg",
          );
        }

        if (
          !(await window.YoutubeAntiTranslate.isFoundImageSrc(
            originalThumbnail,
          ))
        ) {
          originalThumbnail =
            response.data.maxresdefault_url || response.data.thumbnail_url; // fallback to whatever is in oEmbed if maxres doesn't exist
        }

        if (!currentStyle || !currentStyle.includes(originalThumbnail)) {
          const { width, height } =
            await window.YoutubeAntiTranslate.getImageSize(currentImageSrc);
          thumbnailBackground.style.backgroundImage = `url("${originalThumbnail}?youtube-anti-translate=${Date.now()}")`;
          // Add crop ratio to image
          if (width && height) {
            const cropRatio = width / height;
            if (cropRatio) {
              // match crop ratio of current thumbnail
              thumbnailBackground.style.aspectRatio = cropRatio;
              thumbnailBackground.style.objectFit = "cover";
            }
          }
        }
      }
    } catch (error) {
      window.YoutubeAntiTranslate.logInfo(
        `Error fetching oEmbed for current player thumbnail:`,
        videoId,
        error,
      );
      return;
    }
  }
}

async function untranslateCurrentPlaylistHeaderThumbnail() {
  if (document.location.pathname !== "/playlist") {
    return;
  }

  const playlistHeadersImages = window.YoutubeAntiTranslate.getAllVisibleNodes(
    document.querySelectorAll(
      "yt-page-header-renderer img[src*='i.ytimg.com']",
    ),
  );

  if (!playlistHeadersImages || playlistHeadersImages.length === 0) {
    return;
  }

  for (const playlistHeadersImage of playlistHeadersImages) {
    const imageSrc = playlistHeadersImage.src;
    if (!imageSrc || imageSrc.trim() === "") {
      continue;
    }

    if (
      imageSrc.includes("https://i.ytimg.com/vi/") || // path of not-localized thumbnails
      imageSrc.includes("?youtube-anti-translate")
    ) {
      continue;
    }

    // Extract video ID from URL
    const videoId = window.YoutubeAntiTranslate.extractVideoIdFromUrl(imageSrc);

    if (!videoId) {
      return;
    }

    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`;
    try {
      let response = await cachedRequest(oembedUrl);
      if (
        !response ||
        !response.response ||
        !response.response.ok ||
        !response.data?.thumbnail_url
      ) {
        if (response?.response?.status === 401) {
          // 401 likely means the video is restricted try again with youtubeI
          response =
            await window.YoutubeAntiTranslate.getVideoTitleFromYoutubeI(
              videoId,
            );
          if (!response?.response?.ok || !response.data?.title) {
            window.YoutubeAntiTranslate.logWarning(
              `YoutubeI title request failed for video ${videoId}`,
            );
            return;
          }
        }
      }

      if (
        await window.YoutubeAntiTranslate.isWhitelistedChannel(
          "whiteListUntranslateThumbnail",
          null,
          response.data.author_url,
        )
      ) {
        window.YoutubeAntiTranslate.logInfo(
          "Channel is whitelisted, skipping video thumbnail untranslation",
        );
        continue;
      }

      if (
        response.data.thumbnail_url &&
        !imageSrc.includes(response.data.thumbnail_url)
      ) {
        const { width, height } =
          await window.YoutubeAntiTranslate.getImageSize(imageSrc);

        playlistHeadersImage.src =
          response.data.thumbnail_url + `?youtube-anti-translate=${Date.now()}`;

        // Add crop ratio to image
        if (width && height) {
          const cropRatio = width / height;
          if (cropRatio) {
            // match crop ratio of current thumbnail
            playlistHeadersImage.style.aspectRatio = cropRatio;
            playlistHeadersImage.style.objectFit = "cover";
          }
        }
      }
    } catch (error) {
      window.YoutubeAntiTranslate.logInfo(
        `Error fetching oEmbed for current playlist header thumbnail:`,
        videoId,
        error,
      );
      return;
    }
  }
}

async function untranslate() {
  const settings = await window.YoutubeAntiTranslate.getSettings();

  const currentVideoPromise = settings.untranslateTitle
    ? untranslateCurrentVideo()
    : Promise.resolve();
  const currentVideoFullScreenLinkPromise = settings.untranslateTitle
    ? untranslateCurrentVideoHeadLink()
    : Promise.resolve();
  const currentVideoFullScreenEduPromise = settings.untranslateTitle
    ? untranslateCurrentVideoFullScreenEdu()
    : Promise.resolve();
  const channelEmbeddedVideoPromise = settings.untranslateTitle
    ? untranslateCurrentChannelEmbeddedVideoTitle()
    : Promise.resolve();
  const otherVideosPromise =
    settings.untranslateTitle ||
    settings.untranslateDescription ||
    settings.untranslateChannelBranding ||
    settings.untranslateThumbnail
      ? untranslateOtherVideos()
      : Promise.resolve();
  const currentShortPromise = settings.untranslateTitle
    ? untranslateCurrentShortVideo()
    : Promise.resolve();
  const currentShortEngagementPanelPromise = settings.untranslateTitle
    ? untranslateCurrentShortVideoEngagementPanel()
    : Promise.resolve();
  const currentShortDescriptionPanelPromise = settings.untranslateTitle
    ? untranslateCurrentShortVideoDescriptionPanelHeader()
    : Promise.resolve();
  const currentShortVideoLinksPromise = settings.untranslateTitle
    ? untranslateCurrentShortVideoLinks()
    : Promise.resolve();
  const otherShortsPromise =
    settings.untranslateTitle || settings.untranslateThumbnail
      ? untranslateOtherShortsVideos()
      : Promise.resolve();
  const currentMobileVideoDescriptionPromise = settings.untranslateTitle
    ? untranslateCurrentMobileVideoDescriptionHeader()
    : Promise.resolve();
  const currentMobileFeaturedVideoChannel = settings.untranslateTitle
    ? untranslateCurrentMobileFeaturedVideoChannel()
    : Promise.resolve();
  const currentEmbeddedVideoMobileFullScreenPromise =
    settings.untranslateTitle || settings.untranslateChannelBranding
      ? untranslateCurrentEmbeddedVideoMobileFullScreen()
      : Promise.resolve();
  const currentPlayerThumbnailPromise = settings.untranslateThumbnail
    ? untranslateCurrentPlayerBackgroundThumbnail()
    : Promise.resolve();
  const currentPlaylistThumbnailPromise = settings.untranslateThumbnail
    ? untranslateCurrentPlaylistHeaderThumbnail()
    : Promise.resolve();
  const currentMiniPlayerPromise = settings.untranslateTitle
    ? untranslateCurrentMiniPlayerVideo()
    : Promise.resolve();

  // Wait for all promises to resolve concurrently
  await Promise.all([
    currentVideoPromise,
    currentVideoFullScreenLinkPromise,
    currentVideoFullScreenEduPromise,
    channelEmbeddedVideoPromise,
    otherVideosPromise,
    currentShortPromise,
    currentShortEngagementPanelPromise,
    currentShortDescriptionPanelPromise,
    currentShortVideoLinksPromise,
    otherShortsPromise,
    currentMobileVideoDescriptionPromise,
    currentMobileFeaturedVideoChannel,
    currentEmbeddedVideoMobileFullScreenPromise,
    currentPlayerThumbnailPromise,
    currentPlaylistThumbnailPromise,
    currentMiniPlayerPromise,
  ]);

  // update intersect observers
  if (
    settings.untranslateTitle ||
    settings.untranslateDescription ||
    settings.untranslateChannelBranding ||
    settings.untranslateThumbnail
  ) {
    updateObserverOtherVideosOnIntersect();
  }
  if (settings.untranslateTitle || settings.untranslateThumbnail) {
    updateObserverOtherShortsOnIntersect();
  }
}

// Initialize the extension, waiting for window.YoutubeAntiTranslate to be available
(function waitForYoutubeAntiTranslate() {
  if (
    window.YoutubeAntiTranslate &&
    typeof window.YoutubeAntiTranslate.debounce === "function"
  ) {
    const target = document.body;
    const config = { childList: true, subtree: true };
    const observer = new MutationObserver(
      window.YoutubeAntiTranslate.debounce(untranslate),
    );
    observer.observe(target, config);
  } else {
    setTimeout(waitForYoutubeAntiTranslate, 8);
  }
})();

// --- Observe all Other Videos outside viewport for intersect ---
let mutationIdxVideos = 0;
async function untranslateOtherVideosOnIntersect(entries) {
  if (mutationIdxVideos % INTERSECTION_UPDATE_STEP_VIDEOS === 0) {
    if (!entries) {
      return;
    }

    const /** @type {Node[]} */ intersectElements = [];
    for (const entry of entries) {
      if (entry.isIntersecting) {
        intersectElements.push(entry.target);
      }
    }

    await untranslateOtherVideos(intersectElements);

    // update intersect observer
    updateObserverOtherVideosOnIntersect();
  }
  mutationIdxVideos++;
}

(function waitForUpdateObserverOtherVideosOnIntersect() {
  if (window.YoutubeAntiTranslate) {
    updateObserverOtherVideosOnIntersect();
  } else {
    setTimeout(waitForUpdateObserverOtherVideosOnIntersect, 8);
  }
})();
function updateObserverOtherVideosOnIntersect() {
  for (const el of allIntersectVideoElements ?? []) {
    intersectionObserverOtherVideos.unobserve(el);
  }
  allIntersectVideoElements =
    window.YoutubeAntiTranslate.getAllVisibleNodesOutsideViewport(
      document.querySelectorAll(
        window.YoutubeAntiTranslate.ALL_ARRAYS_VIDEOS_SELECTOR,
      ),
      true,
    );
  for (const el of allIntersectVideoElements ?? []) {
    intersectionObserverOtherVideos.observe(el);
  }
}

// --- Observe all Other Shorts outside viewport for intersect ---
let mutationIdxShorts = 0;
async function untranslateOtherShortsOnIntersect(entries) {
  if (mutationIdxShorts % INTERSECTION_UPDATE_STEP_SHORTS === 0) {
    if (!entries) {
      return;
    }

    const /** @type {Node[]} */ intersectElements = [];
    for (const entry of entries) {
      if (entry.isIntersecting) {
        intersectElements.push(entry.target);
      }
    }

    await untranslateOtherShortsVideos(intersectElements);

    // update intersect observer
    updateObserverOtherShortsOnIntersect();
  }
  mutationIdxShorts++;
}

(function waitForUpdateObserverOtherShortsOnIntersect() {
  if (window.YoutubeAntiTranslate) {
    updateObserverOtherShortsOnIntersect();
  } else {
    setTimeout(waitForUpdateObserverOtherShortsOnIntersect, 8);
  }
})();
function updateObserverOtherShortsOnIntersect() {
  for (const el of allIntersectShortElements ?? []) {
    intersectionObserverOtherShorts.unobserve(el);
  }
  allIntersectShortElements =
    window.YoutubeAntiTranslate.getAllVisibleNodesOutsideViewport(
      document.querySelectorAll(
        window.YoutubeAntiTranslate.ALL_ARRAYS_SHORTS_SELECTOR,
      ),
      true,
    );
  for (const el of allIntersectShortElements ?? []) {
    intersectionObserverOtherShorts.observe(el);
  }
}

async function getOriginalVideoDescription(videoId) {
  const body = {
    context: {
      client: {
        clientName: window.YoutubeAntiTranslate.isMobile() ? "MWEB" : "WEB",
        clientVersion: "2.20250527.00.00",
      },
    },
    videoId,
  };

  const response = await cachedRequest(
    `https://${window.YoutubeAntiTranslate.isMobile() ? "m" : "www"}.youtube.com/youtubei/v1/player?prettyPrint=false`,
    JSON.stringify(body),
    await window.YoutubeAntiTranslate.getYoutubeIHeadersWithCredentials(),
    false,
    "videoDetails.shortDescription",
  );
  const description =
    response?.cachedWithDotNotation ||
    response?.data?.videoDetails?.shortDescription ||
    null;

  return description;
}

/**
 * Trims description text by words with a maximum length of 128 characters
 * @param {string} description - The description text to trim
 * @returns {string} The trimmed description with &nbsp... if truncated
 */
function trimDescriptionByWords(description) {
  if (!description) {
    return "";
  }

  // Use the first line and normalize spaces
  let text = description || "";
  text = text.replace(/\s+/g, " ").trim();

  const MAX_LEN = 128;

  if (text.length <= MAX_LEN) {
    return text;
  }

  // Split into words and build truncated string
  const words = text.split(" ");
  let truncated = "";
  const suffix = "\xa0...";

  for (const word of words) {
    const testString = truncated + (truncated ? " " : "") + word;
    // Check if adding this word would exceed the limit (accounting for suffix)
    truncated = testString;
    if (testString.length + suffix.length > MAX_LEN) {
      break;
    }
  }

  // If we truncated, add the suffix
  if (truncated.length < text.length) {
    truncated += suffix;
  }

  return truncated;
}
