//For intersect we are not switching to debounce
//as the callback will handle multiple elements entering them sigularly
const INTERSECTION_UPDATE_STEP_VIDEOS = 2;
let allIntersectVideoElements = null;
const intersectionObserverOtherVideos = new IntersectionObserver(
  untranslateOtherVideosOnIntersect,
  {
    root: null, // viewport
    rootMargin: `${window.YoutubeAntiTranslate.VIEWPORT_EXTENSION_PERCENTAGE_FRACTION * 100}%`,
    threshold: 0, // Trigger when ANY part of the observed elements are inside the extended viewport
  },
);

//For intersect we are not switching to debounce
//as the callback will handle multiple elements entering them sigularly
const INTERSECTION_UPDATE_STEP_SHORTS = 2;
let allIntersectShortElements = null;
const intersectionObserverOtherShorts = new IntersectionObserver(
  untranslateOtherShortsOnIntersect,
  {
    root: null, // viewport
    rootMargin: `${window.YoutubeAntiTranslate.VIEWPORT_EXTENSION_PERCENTAGE_FRACTION * 100}%`,
    threshold: 0, // Trigger when ANY part of the observed elements are inside the extended viewport
  },
);

const cachedRequest = window.YoutubeAntiTranslate.cachedRequest.bind(
  window.YoutubeAntiTranslate,
);

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

    if (videoAuthorSelector && authorFakeNodeID && authorCreateElementTag) {
      await createOrUpdateUntranslatedFakeNodeAuthor(
        response.data.author_name,
        videoAuthorSelector,
        authorFakeNodeID,
        authorCreateElementTag,
      );
    }

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
        window.YoutubeAntiTranslate.doesStringInclude(document.title, oldTitle)
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
      fakeNode.textContent = realTitle;
      fakeNode.setAttribute("video-id", videoId);
    }
  }
}

/**
 * Helper function used by `createOrUpdateUntranslatedFakeNode`
 * Create or Updates an untranslated fake node for the translated element with a video author
 * @param {string} realAuthor
 * @param {string} videoAuthorSelector
 * @param {string} authorFakeNodeID
 * @param {string} authorCreateElementTag
 * @returns
 */
async function createOrUpdateUntranslatedFakeNodeAuthor(
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

    await Promise.all(
      videosArray.map(async (video) => {
        if (!video) {
          // Skip null video element
          return;
        }

        // Check if current widget is a playlist, not a video
        if (
          video.querySelector('a[href*="/playlist?"]') ||
          window.YoutubeAntiTranslate.getFirstVisible(
            video.querySelector(
              "yt-collection-thumbnail-view-model, .media-item-thumbnail-container.stacked",
            ),
          )
        ) {
          return;
        }

        // Find link and title elements typical for standard videos
        let linkElement =
          video.querySelector("a#video-title-link") ||
          video.querySelector("a#thumbnail") ||
          video.querySelector("a.media-item-thumbnail-container") ||
          video.querySelector("div.media-item-metadata > a") ||
          video.querySelector("ytd-playlist-panel-video-renderer a") ||
          video.querySelector("ytm-video-card-renderer a") ||
          video.querySelector("a.yt-lockup-metadata-view-model__title") ||
          (video.matches("a.ytp-videowall-still") ? video : null) ||
          (video.matches("a.ytp-ce-covering-overlay") ? video : null) ||
          (video.matches("a.ytp-suggestion-link") ? video : null);
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

        if (!linkElement || !titleElement) {
          // Try another common pattern before giving up
          if (!linkElement) {
            linkElement =
              video.querySelector("ytd-thumbnail a") ||
              video.querySelector(`a[href*="/watch?v="]`);
          }
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
          }
          if (!linkElement || !titleElement) {
            // console.debug(`Skipping video item, missing link or title:`, video);
            return; // Skip if essential elements aren't found
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
                return;
              }
            } else {
              // console.debug(`No oEmbed data for video:`, videoHref);
              return; // Skip if no oEmbed data
            }
          }

          const originalTitle = response.data.title;
          // Use innerText for comparison/logging as per original logic for these elements
          const currentTitle =
            titleElement.innerText?.trim() || titleElement.textContent?.trim();

          if (
            originalTitle &&
            currentTitle &&
            !window.YoutubeAntiTranslate.isStringEqual(
              originalTitle,
              currentTitle,
            )
          ) {
            window.YoutubeAntiTranslate.logInfo(
              `Untranslating Video: "${currentTitle}" -> "${originalTitle}"`,
            );
            // Update both innerText and title attribute
            titleElement.innerText = originalTitle;
            titleElement.title = originalTitle;
            // Update link title attribute if it's the specific title link
            if (linkElement.matches("a#video-title-link:not(.cbCustomTitle)")) {
              linkElement.title = originalTitle;
            }
          } else {
            // console.debug(`Video title unchanged or element missing:`, { href: videoHref, originalTitle, currentTitle });
          }

          /* -------- Handle description snippet and collaborator untranslation (search results, video lists) -------- */
          if (video.hasAttribute("data-ytat-untranslated-desc") !== videoId) {
            // Locate description snippet containers
            const snippetElements = video.querySelectorAll(
              ".metadata-snippet-text, .metadata-snippet-text-navigation",
            );

            if (snippetElements && snippetElements.length > 0) {
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
                    }
                  });
                }
              }
            }

            // Locate avatar stacks for collaborators videos
            const avatarStacks = video.querySelectorAll(
              "#channel-info #avatar yt-avatar-stack-view-model yt-avatar-shape img",
            );

            const authors = [];

            if (avatarStacks) {
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

              if (authors.length > 0) {
                const mainAuthor = response.data.author_name;
                // Remove main author from collaborators list
                const collaboratorAuthorsOnly = authors.filter(
                  (name) => name !== mainAuthor,
                );

                if (
                  collaboratorAuthorsOnly &&
                  collaboratorAuthorsOnly.length === 1
                ) {
                  const authorsElement = video.querySelector(
                    `#channel-info yt-formatted-string > a.yt-simple-endpoint`,
                  );
                  if (authorsElement) {
                    const currentAuthorsText = authorsElement.textContent;
                    const currentAuthorsTextWithoutMain = currentAuthorsText
                      .replace(mainAuthor, "")
                      .trim();
                    // Slice in 2 parts with space get the "and" part
                    const currentAuthorAnd = currentAuthorsTextWithoutMain
                      .slice(0, currentAuthorsTextWithoutMain.indexOf(" "))
                      .trim();

                    authorsElement.textContent = `${mainAuthor} ${currentAuthorAnd} ${collaboratorAuthorsOnly[0]}`;
                  }
                }
              }
            }

            // Mark as processed to avoid repeated attempts
            video.setAttribute("data-ytat-untranslated-desc", videoId);
          }
        } catch (error) {
          window.YoutubeAntiTranslate.logInfo(
            `Error processing video:`,
            videoHref,
            error,
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

    await Promise.all(
      shortsArray.map(async (shortElement) => {
        if (!shortElement) {
          return;
        }

        // Check if current widget is a playlist, not a video
        if (
          shortElement.querySelector('a[href*="/playlist?"]') ||
          window.YoutubeAntiTranslate.getFirstVisible(
            shortElement.querySelector(
              "yt-collection-thumbnail-view-model, .media-item-thumbnail-container.stacked",
            ),
          )
        ) {
          return;
        }

        // Find link element to get URL
        const linkElement =
          shortElement.querySelector("a.shortsLockupViewModelHostEndpoint") ||
          shortElement.querySelector(`a[href*="/shorts/"]`) ||
          shortElement.querySelector(`a[href*="/watch?v="]`); // This is for compatibility with [No YouTube Shorts](https://addons.mozilla.org/en-US/firefox/addon/no-youtube-shorts/)
        if (!linkElement || !linkElement.href) {
          // Mark to avoid re-checking non-standard items, might not have a standard link
          shortElement.setAttribute("data-ytat-untranslated-other", "checked");
          return;
        }

        const videoHref = linkElement.href;
        // Extract video ID from URLs like /shorts/VIDEO_ID
        const videoIdMatch =
          videoHref.match(/shorts\/([a-zA-Z0-9_-]+)/) ||
          videoHref.match(/[?&]v=([a-zA-Z0-9_-]+)/); // This is for compatibility with [No YouTube Shorts](https://addons.mozilla.org/en-US/firefox/addon/no-youtube-shorts/)
        if (!videoIdMatch || !videoIdMatch[1]) {
          // Mark if ID can't be extracted (e.g., different URL structure)
          shortElement.setAttribute("data-ytat-untranslated-other", "checked");
          return;
        }
        const videoId = videoIdMatch[1];

        // Find title element (Common patterns: #video-title inside the renderer)
        const titleElement = shortElement.querySelector(
          `${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}.yt-core-attributed-string--white-space-pre-wrap`,
        );
        if (!titleElement) {
          // Mark if title element is missing
          shortElement.setAttribute("data-ytat-untranslated-other", "checked");
          return;
        }

        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/shorts/${videoId}`;

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
                shortElement.setAttribute(
                  "data-ytat-untranslated-other",
                  "checked",
                );
                return;
              }
            } else {
              // Mark as checked even if no oEmbed data is found
              shortElement.setAttribute(
                "data-ytat-untranslated-other",
                "checked",
              );
              return;
            }
          }

          const realTitle = response.data.title;
          const currentTitle = titleElement.textContent?.trim(); // Use textContent for typical title spans

          if (
            realTitle &&
            currentTitle &&
            !window.YoutubeAntiTranslate.isStringEqual(realTitle, currentTitle)
          ) {
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
            shortElement.setAttribute("data-ytat-untranslated-other", "true"); // Mark as successfully untranslated
          } else {
            // Mark as done even if titles match or one is missing, prevents re-checking
            shortElement.setAttribute("data-ytat-untranslated-other", "true");
          }
        } catch (error) {
          window.YoutubeAntiTranslate.logInfo(
            `Error fetching oEmbed for other Short:`,
            videoId,
            error,
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

async function untranslate() {
  const currentVideoPromise = untranslateCurrentVideo();
  const currentVideoFullScreenLinkPromise = untranslateCurrentVideoHeadLink();
  const currentVideoFullScreenEduPromise =
    untranslateCurrentVideoFullScreenEdu();
  const channelEmbeddedVideoPromise =
    untranslateCurrentChannelEmbeddedVideoTitle();
  const otherVideosPromise = untranslateOtherVideos();
  const currentShortPromise = untranslateCurrentShortVideo();
  const currentShortEngagementPanelPromise =
    untranslateCurrentShortVideoEngagementPanel();
  const currentShortDescriptionPanelPromise =
    untranslateCurrentShortVideoDescriptionPanelHeader();
  const currentShortVideoLinksPromise = untranslateCurrentShortVideoLinks();
  const otherShortsPromise = untranslateOtherShortsVideos(); // Call the new function
  const currentMobileVideoDescriptionPromise =
    untranslateCurrentMobileVideoDescriptionHeader();
  const currentMobileFeaturedVideoChannel =
    untranslateCurrentMobileFeaturedVideoChannel();
  const currentEmbeddedVideoMobileFullScreenPromise =
    untranslateCurrentEmbeddedVideoMobileFullScreen();

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
  ]);

  // update intersect observers
  updateObserverOtherVideosOnIntersect();
  updateObserverOtherShortsOnIntersect();
}

// Initialize the extension
const target = document.body;
const config = { childList: true, subtree: true };
const observer = new MutationObserver(
  window.YoutubeAntiTranslate.debounce(untranslate),
);
observer.observe(target, config);

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

updateObserverOtherVideosOnIntersect();
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

updateObserverOtherShortsOnIntersect();
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
