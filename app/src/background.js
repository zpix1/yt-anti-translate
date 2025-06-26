let allIntersectVideoElements = null;
const intersectionObserverOtherVideos = new IntersectionObserver(
  untranslateOtherVideosOnIntersect,
  {
    root: null, // viewport
    rootMargin: `${window.YoutubeAntiTranslate.VIEWPORT_EXTENSION_PERCENTAGE_FRACTION * 100}%`,
    threshold: 0, // Trigger when ANY part of the observed elements are inside the extended viewport
  },
);

let allIntersectShortElements = null;
const intersectionObserverOtherShorts = new IntersectionObserver(
  untranslateOtherShortsOnIntersect,
  {
    root: null, // viewport
    rootMargin: `${window.YoutubeAntiTranslate.VIEWPORT_EXTENSION_PERCENTAGE_FRACTION * 100}%`,
    threshold: 0, // Trigger when ANY part of the observed elements are inside the extended viewport
  },
);

const pendingRequests = new Map();

async function get(url) {
  const storedResponse = window.YoutubeAntiTranslate.getSessionCache(url);
  if (storedResponse) {
    return storedResponse;
  }

  if (pendingRequests.has(url)) {
    return pendingRequests.get(url);
  }

  const requestPromise = (async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404 || response.status === 401) {
          window.YoutubeAntiTranslate.setSessionCache(url, null);
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      window.YoutubeAntiTranslate.setSessionCache(url, data);
      return data;
    } catch (error) {
      window.YoutubeAntiTranslate.logWarning("Error fetching:", error);
      // Cache null even on general fetch error to prevent immediate retries for the same failing URL
      window.YoutubeAntiTranslate.setSessionCache(url, null);
      return null;
    } finally {
      pendingRequests.delete(url);
    }
  })();

  pendingRequests.set(url, requestPromise);
  return requestPromise;
}

let /** @type {Boolean} */ untranslateCurrentShortVideo_running = false;
async function untranslateCurrentShortVideo() {
  if (
    untranslateCurrentShortVideo_running ||
    !window.location.pathname.startsWith("/shorts/") // Should not happen if called correctly, but safety first
  ) {
    return;
  }
  untranslateCurrentShortVideo_running = true;

  try {
    const { fakeNodeID, originalNodeSelector } =
      getUntranslateCurrentShortVideoParams();

    await createOrUpdateUntranslatedFakeNode(
      fakeNodeID,
      originalNodeSelector,
      () =>
        `https://www.youtube.com/shorts/${window.location.pathname.split("/")[2]}`,
      "span",
      true,
    );
    untranslateCurrentShortVideo_running = false;
  } catch {
    untranslateCurrentShortVideo_running = false;
  }
}

function getUntranslateCurrentShortVideoParams() {
  const fakeNodeID = "yt-anti-translate-fake-node-current-short-video-title";
  const originalNodeSelector = `yt-shorts-video-title-view-model > h2 > span:not(#${fakeNodeID})`;
  return { fakeNodeID, originalNodeSelector };
}

let /** @type {Boolean} */ untranslateCurrentShortVideoLinks_running = false;
async function untranslateCurrentShortVideoLinks() {
  if (
    untranslateCurrentShortVideoLinks_running ||
    !window.location.pathname.startsWith("/shorts/") // Should not happen if called correctly, but safety first
  ) {
    return;
  }
  untranslateCurrentShortVideoLinks_running = true;

  try {
    const { fakeNodeID, originalNodeSelector } =
      getUntranslateCurrentShortVideoLinksParams();

    await createOrUpdateUntranslatedFakeNode(
      fakeNodeID,
      originalNodeSelector,
      (el) => el?.parentElement?.parentElement?.parentElement?.href,
      "span",
      false,
    );
    untranslateCurrentShortVideoLinks_running = false;
  } catch {
    untranslateCurrentShortVideoLinks_running = false;
  }
}

function getUntranslateCurrentShortVideoLinksParams() {
  const fakeNodeID = "yt-anti-translate-fake-node-current-short-video-links";
  const originalNodeSelector = `.ytReelMultiFormatLinkViewModelEndpoint span${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}>span:not(#${fakeNodeID})`;
  return { fakeNodeID, originalNodeSelector };
}

let /** @type {Boolean} */ untranslateCurrentVideo_running = false;
async function untranslateCurrentVideo() {
  if (
    untranslateCurrentVideo_running ||
    !window.location.pathname.startsWith("/watch") // Should not happen if called correctly, but safety first
  ) {
    return;
  }
  untranslateCurrentVideo_running = true;

  try {
    const { fakeNodeID, originalNodeSelector } =
      getUntranslateCurrentVideoParams();

    await createOrUpdateUntranslatedFakeNode(
      fakeNodeID,
      originalNodeSelector,
      () => document.location.href,
      "div",
      true,
    );
    untranslateCurrentVideo_running = false;
  } catch {
    untranslateCurrentVideo_running = false;
  }
}

function getUntranslateCurrentVideoParams() {
  const fakeNodeID = "yt-anti-translate-fake-node-current-video";
  const originalNodeSelector = `#title > h1 > yt-formatted-string:not(#${fakeNodeID})`;
  return { fakeNodeID, originalNodeSelector };
}

let /** @type {Boolean} */ untranslateCurrentVideoHeadLink_running = false;
async function untranslateCurrentVideoHeadLink() {
  if (
    untranslateCurrentVideoHeadLink_running ||
    !window.location.pathname.startsWith("/watch") // Should not happen if called correctly, but safety first
  ) {
    return;
  }
  untranslateCurrentVideoHeadLink_running = true;

  try {
    const { fakeNodeID, originalNodeSelector } =
      getUntranslateCurrentVideoHeadLinkParams();

    await createOrUpdateUntranslatedFakeNode(
      fakeNodeID,
      originalNodeSelector,
      (el) => {
        const videoLinkHead = el.href;
        if (!videoLinkHead || videoLinkHead.trim() === "") {
          return document.location.href;
        }
        return videoLinkHead;
      },
      "a",
      false,
    );
    untranslateCurrentVideoHeadLink_running = false;
  } catch {
    untranslateCurrentVideoHeadLink_running = false;
  }
}

function getUntranslateCurrentVideoHeadLinkParams() {
  const fakeNodeID = "yt-anti-translate-fake-node-video-head-link";
  const originalNodeSelector = `${window.YoutubeAntiTranslate.getPlayerSelector()} a.ytp-title-link:not(#${fakeNodeID})`;
  return { fakeNodeID, originalNodeSelector };
}

let /** @type {Boolean} */ untranslateCurrentVideoFullScreenEdu_running = false;
async function untranslateCurrentVideoFullScreenEdu() {
  if (
    untranslateCurrentVideoFullScreenEdu_running ||
    !window.location.pathname.startsWith("/watch") // Should not happen if called correctly, but safety first
  ) {
    return;
  }
  untranslateCurrentVideoFullScreenEdu_running = true;

  try {
    const { fakeNodeID, originalNodeSelector } =
      getUntranslateCurrentVideoFullScreenEduParams();

    // Skip if on a channel page
    if (document.location.pathname.startsWith("@")) {
      return;
    }

    await createOrUpdateUntranslatedFakeNode(
      fakeNodeID,
      originalNodeSelector,
      () => document.location.href,
      "div",
      false,
    );
    untranslateCurrentVideoFullScreenEdu_running = false;
  } catch {
    untranslateCurrentVideoFullScreenEdu_running = false;
  }
}

function getUntranslateCurrentVideoFullScreenEduParams() {
  const fakeNodeID = "yt-anti-translate-fake-node-fullscreen-edu";
  const originalNodeSelector = `${window.YoutubeAntiTranslate.getPlayerSelector()} div.ytp-fullerscreen-edu-text:not(#${fakeNodeID})`;
  return { fakeNodeID, originalNodeSelector };
}

let /** @type {Boolean} */ untranslateCurrentChannelEmbededVideoTitle_running = false;
async function untranslateCurrentChannelEmbededVideoTitle() {
  if (untranslateCurrentChannelEmbededVideoTitle_running) {
    return;
  }
  untranslateCurrentChannelEmbededVideoTitle_running = true;

  try {
    const { fakeNodeID, originalNodeSelector } =
      getUntranslateCurrentChannelEmbededVideoTitleParams();

    await createOrUpdateUntranslatedFakeNode(
      fakeNodeID,
      originalNodeSelector,
      (el) => el.href,
      "a",
      false,
    );
    untranslateCurrentChannelEmbededVideoTitle_running = false;
  } catch {
    untranslateCurrentChannelEmbededVideoTitle_running = false;
  }
}

function getUntranslateCurrentChannelEmbededVideoTitleParams() {
  const fakeNodeID = "yt-anti-translate-fake-node-channel-embeded-title";
  const originalNodeSelector = `div.ytd-channel-video-player-renderer #metadata-container.ytd-channel-video-player-renderer a:not(#${fakeNodeID})`;
  return { fakeNodeID, originalNodeSelector };
}

/**
 * Create or Updates and untranslated fake node for the translated element
 * @param {string} fakeNodeID
 * @param {string} originalNodeSelector
 * @param {Function} getUrl
 * @param {string} createElementTag
 * @param {boolean} shouldSetDocumentTitle
 * @returns
 */
async function createOrUpdateUntranslatedFakeNode(
  fakeNodeID,
  originalNodeSelector,
  getUrl,
  createElementTag,
  shouldSetDocumentTitle = false,
) {
  let translatedElement = window.YoutubeAntiTranslate.getFirstVisible(
    document.querySelectorAll(originalNodeSelector),
  );

  if (!translatedElement || !translatedElement.textContent) {
    translatedElement = window.YoutubeAntiTranslate.getFirstVisible(
      document.querySelectorAll(`${originalNodeSelector}:not(.cbCustomTitle)`),
    );
  }

  const fakeNode = document.querySelector(`#${fakeNodeID}`);

  if (
    (!fakeNode || !fakeNode.textContent) &&
    (!translatedElement || !translatedElement.textContent)
  ) {
    return;
  }

  const getUrlForElement = getUrl(translatedElement ?? fakeNode);
  const response = await get(
    "https://www.youtube.com/oembed?url=" + getUrlForElement,
  );
  if (!response) {
    return;
  }

  const realTitle = response.title;

  if (!realTitle || (!translatedElement && !fakeNode)) {
    return;
  }

  const oldTitle = translatedElement?.textContent ?? fakeNode?.textContent;

  if (realTitle === oldTitle || fakeNode?.textContent === realTitle) {
    return;
  } else {
    // cache old title for future reference
    window.YoutubeAntiTranslate.setSessionCache(
      `${fakeNodeID}_${getUrlForElement}`,
      oldTitle,
    );

    if (shouldSetDocumentTitle) {
      await restoreOriginalPageTitle();
    }
  }

  window.YoutubeAntiTranslate.logInfo(
    `translated title to "${realTitle}" from "${oldTitle}"`,
  );

  if (!fakeNode && translatedElement) {
    // Not sure why, but even tho we checked already 'fakeNode', 'existingFakeNode' still return a value on initialization
    const existingFakeNode = translatedElement.parentElement.querySelector(
      `#${fakeNodeID}`,
    );
    const newFakeNode = document.createElement(createElementTag);
    if (translatedElement.href) {
      newFakeNode.href = translatedElement.href;
    }
    newFakeNode.className = translatedElement.className;
    newFakeNode.id = fakeNodeID;
    newFakeNode.textContent = realTitle;
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
  }
  //}
}

let /** @type {Boolean} */ untranslateOtherVideos_running = false;
async function untranslateOtherVideos(intersectElements = null) {
  async function untranslateOtherVideosArray(otherVideos) {
    if (!otherVideos) {
      return;
    }
    otherVideos = Array.from(otherVideos);
    for (let i = 0; i < otherVideos.length; i++) {
      const video = otherVideos[i];

      if (!video) {
        // Original logic used return here, seems incorrect for a loop. Changed to continue.
        continue;
      }

      // Find link and title elements typical for standard videos
      let linkElement =
        video.querySelector("a#video-title-link") ||
        video.querySelector("a#thumbnail");
      let titleElement = video.querySelector(
        "#video-title:not(.cbCustomTitle)",
      );

      if (!linkElement || !titleElement) {
        // Try another common pattern before giving up
        if (!linkElement) {
          linkElement =
            video.querySelector("ytd-thumbnail a") ||
            video.querySelector(`a[href*="/watch?v="]`);
        }
        if (!titleElement) {
          titleElement = video.querySelector("yt-formatted-string#video-title");
        }
        if (!linkElement || !titleElement) {
          // console.debug(`Skipping video item, missing link or title:`, video);
          continue; // Skip if essential elements aren't found
        }
      }

      const videoHref = linkElement.href; // Use the link's href for oEmbed and as the key

      try {
        // console.debug(`Fetching oEmbed for video:`, videoHref);
        const response = await get(
          "https://www.youtube.com/oembed?url=" + encodeURIComponent(videoHref),
        );
        if (!response || !response.title) {
          // console.debug(`No oEmbed data for video:`, videoHref);
          continue; // Skip if no oEmbed data
        }

        const originalTitle = response.title;
        // Use innerText for comparison/logging as per original logic for these elements
        const currentTitle = titleElement.innerText?.trim();

        if (
          originalTitle &&
          currentTitle &&
          window.YoutubeAntiTranslate.normalizeSpaces(originalTitle) !==
            window.YoutubeAntiTranslate.normalizeSpaces(currentTitle)
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
      } catch (error) {
        window.YoutubeAntiTranslate.logInfo(
          `Error processing video:`,
          videoHref,
          error,
        );
      }
    }
  }

  // For Intersect concurrency is allowed as the intersectElements will be different each time
  if (intersectElements) {
    // If this was called from the intersect obesrver only check the newly intersecting items
    await untranslateOtherVideosArray(intersectElements);
    updateObserverOtherVideosOnIntersect();
    return;
  }

  if (untranslateOtherVideos_running) {
    return;
  }
  untranslateOtherVideos_running = true;

  try {
    // Selectors for all video containers
    await untranslateOtherVideosArray(
      window.YoutubeAntiTranslate.getAllVisibleNodes(
        document.querySelectorAll(
          window.YoutubeAntiTranslate.ALL_ARRAYS_VIDEOS_SELECTOR,
        ),
      ),
    );
    updateObserverOtherVideosOnIntersect();
    untranslateOtherVideos_running = false;
  } catch {
    untranslateOtherVideos_running = false;
  }
}

let /** @type {Boolean} */ untranslateOtherShortsVideos_running = false;
async function untranslateOtherShortsVideos(intersectElements = null) {
  async function untranslateOtherShortsArray(shortsItems) {
    if (!shortsItems) {
      return;
    }
    shortsItems = Array.from(shortsItems);
    for (let i = 0; i < shortsItems.length; i++) {
      const shortElement = shortsItems[i];

      if (!shortElement) {
        continue;
      }

      // Find link element to get URL
      const linkElement =
        shortElement.querySelector("a.shortsLockupViewModelHostEndpoint") ||
        shortElement.querySelector(`a[href*="/shorts/"]`);
      if (!linkElement || !linkElement.href) {
        // Mark to avoid re-checking non-standard items, might not have a standard link
        shortElement.setAttribute("data-ytat-untranslated-other", "checked");
        continue;
      }

      const videoHref = linkElement.href;
      // Extract video ID from URLs like /shorts/VIDEO_ID
      const videoIdMatch = videoHref.match(/shorts\/([a-zA-Z0-9_-]+)/);
      if (!videoIdMatch || !videoIdMatch[1]) {
        // Mark if ID can't be extracted (e.g., different URL structure)
        shortElement.setAttribute("data-ytat-untranslated-other", "checked");
        continue;
      }
      const videoId = videoIdMatch[1];

      // Find title element (Common patterns: #video-title inside the renderer)
      const titleElement = shortElement.querySelector(
        `${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}.yt-core-attributed-string--white-space-pre-wrap`,
      );
      if (!titleElement) {
        // Mark if title element is missing
        shortElement.setAttribute("data-ytat-untranslated-other", "checked");
        continue;
      }

      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/shorts/${videoId}`;

      try {
        const response = await get(oembedUrl);
        if (!response || !response.title) {
          // Mark as checked even if no oEmbed data is found
          shortElement.setAttribute("data-ytat-untranslated-other", "checked");
          continue;
        }

        const realTitle = response.title;
        const currentTitle = titleElement.textContent?.trim(); // Use textContent for typical title spans

        if (realTitle && currentTitle && realTitle !== currentTitle) {
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
        // Do not mark on fetch error, allow retry on the next mutation check
      }
    }
  }

  // For Intersect concurrency is allowed as the intersectElements will be different each time
  if (intersectElements) {
    // If this was called from the intersect obesrver only check the newly intersecting items
    await untranslateOtherShortsArray(intersectElements);
    updateObserverOtherShortsOnIntersect();
    return;
  }

  if (untranslateOtherShortsVideos_running) {
    return;
  }
  untranslateOtherShortsVideos_running = true;

  try {
    // Run for all shorts items
    await untranslateOtherShortsArray(
      window.YoutubeAntiTranslate.getAllVisibleNodes(
        document.querySelectorAll(
          window.YoutubeAntiTranslate.ALL_ARRAYS_SHORTS_SELECTOR,
        ),
      ),
    );
    updateObserverOtherShortsOnIntersect();
    untranslateOtherShortsVideos_running = false;
  } catch {
    untranslateOtherShortsVideos_running = false;
  }
}

// --- Mutation conditional processor ---
let untranslateInvocationCount = 0;
async function untranslate(/** @type {MutationRecord[]} */ mutationList) {
  const startTime = performance.now();
  untranslateInvocationCount++;

  let waitForPlayerExistPromise = null;

  let currentVideoPromise = null;
  let currentShortPromise = null;
  let currentVideoHeadLinkPromise = null;
  let currentVideoFullScreenEduPromise = null;
  let channelEmbededVideoPromise = null;
  let currentShortVideoLinksPromise = null;
  let otherVideosPromise = null;
  let otherShortsPromise = null;

  for (const mutationRecord of mutationList) {
    if (mutationRecord.type !== "childList") {
      continue;
    }

    if (
      !mutationRecord.target ||
      !window.YoutubeAntiTranslate.castNodeToElementOrNull(
        mutationRecord.target,
      )
    ) {
      continue;
    }

    const /** @type {Element} */ element = mutationRecord.target;
    if (!mutationRecord.target.matches("body")) {
      // Checks on mutation added nodes

      if (!window.YoutubeAntiTranslate.isVisible(element)) {
        continue;
      }

      // // Checks on mutation target
      // if (
      //   element.matches(getUntranslateCurrentVideoParams().originalNodeSelector)
      // ) {
      //   waitForPlayerExistPromise ??=
      //     window.YoutubeAntiTranslate.waitForPlayerExist();
      //   currentVideoPromise = untranslateCurrentVideo();
      // } else if (
      //   element.matches(
      //     getUntranslateCurrentShortVideoParams().originalNodeSelector,
      //   )
      // ) {
      //   waitForPlayerExistPromise ??=
      //     window.YoutubeAntiTranslate.waitForPlayerExist();
      //   currentShortPromise = untranslateCurrentShortVideo();
      // } else if (
      //   element.matches(
      //     getUntranslateCurrentVideoHeadLinkParams().originalNodeSelector,
      //   )
      // ) {
      //   waitForPlayerExistPromise ??=
      //     window.YoutubeAntiTranslate.waitForPlayerExist();
      //   currentVideoHeadLinkPromise = untranslateCurrentVideoHeadLink();
      // } else if (
      //   element.matches(
      //     getUntranslateCurrentVideoFullScreenEduParams().originalNodeSelector,
      //   )
      // ) {
      //   waitForPlayerExistPromise ??=
      //     window.YoutubeAntiTranslate.waitForPlayerExist();
      //   currentVideoFullScreenEduPromise =
      //     untranslateCurrentVideoFullScreenEdu();
      // } else if (
      //   element.matches(
      //     getUntranslateCurrentChannelEmbededVideoTitleParams()
      //       .originalNodeSelector,
      //   )
      // ) {
      //   waitForPlayerExistPromise ??=
      //     window.YoutubeAntiTranslate.waitForPlayerExist();
      //   channelEmbededVideoPromise =
      //     untranslateCurrentChannelEmbededVideoTitle();
      // } else if (
      //   element.matches(
      //     getUntranslateCurrentShortVideoLinksParams().originalNodeSelector,
      //   )
      // ) {
      //   waitForPlayerExistPromise ??=
      //     window.YoutubeAntiTranslate.waitForPlayerExist();
      //   currentShortVideoLinksPromise = untranslateCurrentShortVideoLinks();
      // } else if (
      //   element.matches(window.YoutubeAntiTranslate.ALL_ARRAYS_VIDEOS_SELECTOR)
      // ) {
      //   otherVideosPromise = untranslateOtherVideos();
      // }
      // // other videos and other shorts can overlap so this is intentionally not an `else if`
      // if (
      //   element.matches(window.YoutubeAntiTranslate.ALL_ARRAYS_SHORTS_SELECTOR)
      // ) {
      //   otherShortsPromise = untranslateOtherShortsVideos();
      // }

      // if (
      //   currentVideoPromise &&
      //   currentShortPromise &&
      //   currentVideoHeadLinkPromise &&
      //   currentVideoFullScreenEduPromise &&
      //   channelEmbededVideoPromise &&
      //   currentShortVideoLinksPromise &&
      //   otherVideosPromise &&
      //   otherShortsPromise
      // ) {
      //   break;
      // }

      // Checks on mutation closest target
      // `closest` conditions can overlap so we do not use `else if`
      if (
        !currentVideoPromise &&
        element.closest(getUntranslateCurrentVideoParams().originalNodeSelector)
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        currentVideoPromise = untranslateCurrentVideo();
      }
      if (
        !currentShortPromise &&
        element.closest(
          getUntranslateCurrentShortVideoParams().originalNodeSelector,
        )
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        currentShortPromise = untranslateCurrentShortVideo();
      }
      if (
        !currentVideoHeadLinkPromise &&
        element.closest(
          getUntranslateCurrentVideoHeadLinkParams().originalNodeSelector,
        )
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        currentVideoHeadLinkPromise = untranslateCurrentVideoHeadLink();
      }
      if (
        !currentVideoFullScreenEduPromise &&
        element.closest(
          getUntranslateCurrentVideoFullScreenEduParams().originalNodeSelector,
        )
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        currentVideoFullScreenEduPromise =
          untranslateCurrentVideoFullScreenEdu();
      }
      if (
        !channelEmbededVideoPromise &&
        element.closest(
          getUntranslateCurrentChannelEmbededVideoTitleParams()
            .originalNodeSelector,
        )
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        channelEmbededVideoPromise =
          untranslateCurrentChannelEmbededVideoTitle();
      }
      if (
        !currentShortVideoLinksPromise &&
        element.closest(
          getUntranslateCurrentShortVideoLinksParams().originalNodeSelector,
        )
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        currentShortVideoLinksPromise = untranslateCurrentShortVideoLinks();
      }
      if (
        !otherVideosPromise &&
        element.closest(window.YoutubeAntiTranslate.ALL_ARRAYS_VIDEOS_SELECTOR)
      ) {
        otherVideosPromise = untranslateOtherVideos();
      }
      if (
        !otherShortsPromise &&
        element.closest(window.YoutubeAntiTranslate.ALL_ARRAYS_SHORTS_SELECTOR)
      ) {
        otherShortsPromise = untranslateOtherShortsVideos();
      }

      if (
        currentVideoPromise &&
        currentShortPromise &&
        currentVideoHeadLinkPromise &&
        currentVideoFullScreenEduPromise &&
        channelEmbededVideoPromise &&
        currentShortVideoLinksPromise &&
        otherVideosPromise &&
        otherShortsPromise
      ) {
        break;
      }

      // On mutationRecord.target we never search inside as that is too broad
    }

    for (const addedNode of mutationRecord.addedNodes) {
      if (!window.YoutubeAntiTranslate.castNodeToElementOrNull(addedNode)) {
        continue;
      }
      const /** @type {Element} */ addedElement = addedNode;

      if (!window.YoutubeAntiTranslate.isVisible(addedElement)) {
        continue;
      }

      // if (
      //   !currentVideoPromise &&
      //   addedElement.matches(
      //     getUntranslateCurrentVideoParams().originalNodeSelector,
      //   )
      // ) {
      //   waitForPlayerExistPromise ??=
      //     window.YoutubeAntiTranslate.waitForPlayerExist();
      //   currentVideoPromise = untranslateCurrentVideo();
      // } else if (
      //   !currentShortPromise &&
      //   addedElement.matches(
      //     getUntranslateCurrentShortVideoParams().originalNodeSelector,
      //   )
      // ) {
      //   waitForPlayerExistPromise ??=
      //     window.YoutubeAntiTranslate.waitForPlayerExist();
      //   currentShortPromise = untranslateCurrentShortVideo();
      // } else if (
      //   !currentVideoHeadLinkPromise &&
      //   addedElement.matches(
      //     getUntranslateCurrentVideoHeadLinkParams().originalNodeSelector,
      //   )
      // ) {
      //   waitForPlayerExistPromise ??=
      //     window.YoutubeAntiTranslate.waitForPlayerExist();
      //   currentVideoHeadLinkPromise = untranslateCurrentVideoHeadLink();
      // } else if (
      //   !currentVideoFullScreenEduPromise &&
      //   addedElement.matches(
      //     getUntranslateCurrentVideoFullScreenEduParams().originalNodeSelector,
      //   )
      // ) {
      //   waitForPlayerExistPromise ??=
      //     window.YoutubeAntiTranslate.waitForPlayerExist();
      //   currentVideoFullScreenEduPromise =
      //     untranslateCurrentVideoFullScreenEdu();
      // } else if (
      //   !channelEmbededVideoPromise &&
      //   addedElement.matches(
      //     getUntranslateCurrentChannelEmbededVideoTitleParams()
      //       .originalNodeSelector,
      //   )
      // ) {
      //   waitForPlayerExistPromise ??=
      //     window.YoutubeAntiTranslate.waitForPlayerExist();
      //   channelEmbededVideoPromise =
      //     untranslateCurrentChannelEmbededVideoTitle();
      // } else if (
      //   !currentShortVideoLinksPromise &&
      //   addedElement.matches(
      //     getUntranslateCurrentShortVideoLinksParams().originalNodeSelector,
      //   )
      // ) {
      //   waitForPlayerExistPromise ??=
      //     window.YoutubeAntiTranslate.waitForPlayerExist();
      //   currentShortVideoLinksPromise = untranslateCurrentShortVideoLinks();
      // } else if (
      //   !otherVideosPromise &&
      //   addedElement.matches(
      //     window.YoutubeAntiTranslate.ALL_ARRAYS_VIDEOS_SELECTOR,
      //   )
      // ) {
      //   otherVideosPromise = untranslateOtherVideos();
      // }
      // // other videos and other shorts can overlap so this is intentionally not an `else if`
      // if (
      //   !otherShortsPromise &&
      //   addedElement.matches(
      //     window.YoutubeAntiTranslate.ALL_ARRAYS_SHORTS_SELECTOR,
      //   )
      // ) {
      //   otherShortsPromise = untranslateOtherShortsVideos();
      //   continue;
      // }

      // if (
      //   currentVideoPromise &&
      //   currentShortPromise &&
      //   currentVideoHeadLinkPromise &&
      //   currentVideoFullScreenEduPromise &&
      //   channelEmbededVideoPromise &&
      //   currentShortVideoLinksPromise &&
      //   otherVideosPromise &&
      //   otherShortsPromise
      // ) {
      //   break;
      // }

      // Checks on mutation closest added nodes
      // `closest` conditions can overlap so we do not use `else if`
      if (
        !currentVideoPromise &&
        addedElement.closest(
          getUntranslateCurrentVideoParams().originalNodeSelector,
        )
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        currentVideoPromise = untranslateCurrentVideo();
      }
      if (
        !currentShortPromise &&
        addedElement.closest(
          getUntranslateCurrentShortVideoParams().originalNodeSelector,
        )
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        currentShortPromise = untranslateCurrentShortVideo();
      }
      if (
        !currentVideoHeadLinkPromise &&
        addedElement.closest(
          getUntranslateCurrentVideoHeadLinkParams().originalNodeSelector,
        )
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        currentVideoHeadLinkPromise = untranslateCurrentVideoHeadLink();
      }
      if (
        !currentVideoFullScreenEduPromise &&
        addedElement.closest(
          getUntranslateCurrentVideoFullScreenEduParams().originalNodeSelector,
        )
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        currentVideoFullScreenEduPromise =
          untranslateCurrentVideoFullScreenEdu();
      }
      if (
        !channelEmbededVideoPromise &&
        addedElement.closest(
          getUntranslateCurrentChannelEmbededVideoTitleParams()
            .originalNodeSelector,
        )
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        channelEmbededVideoPromise =
          untranslateCurrentChannelEmbededVideoTitle();
      }
      if (
        !currentShortVideoLinksPromise &&
        addedElement.closest(
          getUntranslateCurrentShortVideoLinksParams().originalNodeSelector,
        )
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        currentShortVideoLinksPromise = untranslateCurrentShortVideoLinks();
      }
      if (
        !otherVideosPromise &&
        addedElement.closest(
          window.YoutubeAntiTranslate.ALL_ARRAYS_VIDEOS_SELECTOR,
        )
      ) {
        otherVideosPromise = untranslateOtherVideos();
      }
      if (
        !otherShortsPromise &&
        addedElement.closest(
          window.YoutubeAntiTranslate.ALL_ARRAYS_SHORTS_SELECTOR,
        )
      ) {
        otherShortsPromise = untranslateOtherShortsVideos();
      }

      if (
        currentVideoPromise &&
        currentShortPromise &&
        currentVideoHeadLinkPromise &&
        currentVideoFullScreenEduPromise &&
        channelEmbededVideoPromise &&
        currentShortVideoLinksPromise &&
        otherVideosPromise &&
        otherShortsPromise
      ) {
        break;
      }

      // Search inside added nodes for matching elements
      // Search inside conditions can overlap so we do not use `else if`
      if (
        !currentVideoPromise &&
        window.YoutubeAntiTranslate.getFirstVisible(
          addedElement.querySelectorAll(
            getUntranslateCurrentVideoParams().originalNodeSelector,
          ),
        )
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        currentVideoPromise = untranslateCurrentVideo();
      }
      if (
        !currentShortPromise &&
        window.YoutubeAntiTranslate.getFirstVisible(
          addedElement.querySelectorAll(
            getUntranslateCurrentShortVideoParams().originalNodeSelector,
          ),
        )
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        currentShortPromise = untranslateCurrentShortVideo();
      }
      if (
        !currentVideoHeadLinkPromise &&
        window.YoutubeAntiTranslate.getFirstVisible(
          addedElement.querySelectorAll(
            getUntranslateCurrentVideoHeadLinkParams().originalNodeSelector,
          ),
        )
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        currentVideoHeadLinkPromise = untranslateCurrentVideoHeadLink();
      }
      if (
        !currentVideoFullScreenEduPromise &&
        window.YoutubeAntiTranslate.getFirstVisible(
          addedElement.querySelectorAll(
            getUntranslateCurrentVideoFullScreenEduParams()
              .originalNodeSelector,
          ),
        )
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        currentVideoFullScreenEduPromise =
          untranslateCurrentVideoFullScreenEdu();
      }
      if (
        !channelEmbededVideoPromise &&
        window.YoutubeAntiTranslate.getFirstVisible(
          addedElement.querySelectorAll(
            getUntranslateCurrentChannelEmbededVideoTitleParams()
              .originalNodeSelector,
          ),
        )
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        channelEmbededVideoPromise =
          untranslateCurrentChannelEmbededVideoTitle();
      }
      if (
        !currentShortVideoLinksPromise &&
        window.YoutubeAntiTranslate.getFirstVisible(
          addedElement.querySelectorAll(
            getUntranslateCurrentShortVideoLinksParams().originalNodeSelector,
          ),
        )
      ) {
        waitForPlayerExistPromise ??=
          window.YoutubeAntiTranslate.waitForPlayerExist();
        currentShortVideoLinksPromise = untranslateCurrentShortVideoLinks();
      }
      if (
        !otherVideosPromise &&
        window.YoutubeAntiTranslate.getFirstVisible(
          addedElement.querySelectorAll(
            window.YoutubeAntiTranslate.ALL_ARRAYS_VIDEOS_SELECTOR,
          ),
        )
      ) {
        otherVideosPromise = untranslateOtherVideos();
      }
      if (
        !otherShortsPromise &&
        window.YoutubeAntiTranslate.getFirstVisible(
          addedElement.querySelectorAll(
            window.YoutubeAntiTranslate.ALL_ARRAYS_SHORTS_SELECTOR,
          ),
        )
      ) {
        otherShortsPromise = untranslateOtherShortsVideos();
      }
    }

    if (
      currentVideoPromise &&
      currentShortPromise &&
      currentVideoHeadLinkPromise &&
      currentVideoFullScreenEduPromise &&
      channelEmbededVideoPromise &&
      currentShortVideoLinksPromise &&
      otherVideosPromise &&
      otherShortsPromise
    ) {
      break;
    }

    // if (mutationRecord.target.matches("body")) {
    //   continue;
    // }

    // // Not ideal but for current video title and current short title/link we need to search inside as on first load sometimes race conditions prevent the other matches
    // if (
    //   !currentVideoPromise &&
    //   window.location.pathname.startsWith("/watch") &&
    //   window.YoutubeAntiTranslate.getFirstVisible(
    //     mutationRecord.target.querySelectorAll(
    //       getUntranslateCurrentVideoParams().originalNodeSelector,
    //     ),
    //   )
    // ) {
    //   waitForPlayerExistPromise ??=
    //     window.YoutubeAntiTranslate.waitForPlayerExist();
    //   currentVideoPromise = untranslateCurrentVideo();
    // }
    // if (
    //   !currentShortPromise &&
    //   window.location.pathname.startsWith("/shorts/") &&
    //   window.YoutubeAntiTranslate.getFirstVisible(
    //     mutationRecord.target.querySelectorAll(
    //       getUntranslateCurrentShortVideoParams().originalNodeSelector,
    //     ),
    //   )
    // ) {
    //   waitForPlayerExistPromise ??=
    //     window.YoutubeAntiTranslate.waitForPlayerExist();
    //   currentShortPromise = untranslateCurrentShortVideo();
    // }
    // if (
    //   !currentShortVideoLinksPromise &&
    //   window.location.pathname.startsWith("/shorts/") &&
    //   window.YoutubeAntiTranslate.getFirstVisible(
    //     mutationRecord.target.querySelectorAll(
    //       getUntranslateCurrentShortVideoLinksParams().originalNodeSelector,
    //     ),
    //   )
    // ) {
    //   waitForPlayerExistPromise ??=
    //     window.YoutubeAntiTranslate.waitForPlayerExist();
    //   currentShortVideoLinksPromise = untranslateCurrentShortVideoLinks();
    // }

    // if (
    //   currentVideoPromise &&
    //   currentShortPromise &&
    //   currentVideoHeadLinkPromise &&
    //   currentVideoFullScreenEduPromise &&
    //   channelEmbededVideoPromise &&
    //   currentShortVideoLinksPromise &&
    //   otherVideosPromise &&
    //   otherShortsPromise
    // ) {
    //   break;
    // }
  }

  if (
    !currentVideoPromise &&
    !currentShortPromise &&
    !currentVideoHeadLinkPromise &&
    !currentVideoFullScreenEduPromise &&
    !channelEmbededVideoPromise &&
    !currentShortVideoLinksPromise &&
    !otherVideosPromise &&
    !otherShortsPromise
  ) {
    return;
  }

  // When waitForPlayerExistPromise is set await it before all other Promises
  if (waitForPlayerExistPromise) {
    await waitForPlayerExistPromise;
  }

  // Wait for all promises to resolve concurrently
  await Promise.all([
    currentVideoPromise ?? new Promise(() => {}),
    currentShortPromise ?? new Promise(() => {}),
    currentVideoHeadLinkPromise ?? new Promise(() => {}),
    currentVideoFullScreenEduPromise ?? new Promise(() => {}),
    channelEmbededVideoPromise ?? new Promise(() => {}),
    currentShortVideoLinksPromise ?? new Promise(() => {}),
    otherVideosPromise ?? new Promise(() => {}),
    otherShortsPromise ?? new Promise(() => {}),
  ]);

  const endTime = performance.now();
  const durationMicroseconds = endTime - startTime;

  console.warn(
    `untranslate() called ${untranslateInvocationCount} times`,
    `${durationMicroseconds} ms`,
  );
}

/**
 * Processes the page title
 */
async function restoreOriginalPageTitle() {
  let cachedOldTitle = null;
  let realTitle = null;

  if (window.location.pathname.startsWith("/watch")) {
    cachedOldTitle = window.YoutubeAntiTranslate.getSessionCache(
      `${getUntranslateCurrentVideoParams().fakeNodeID}_${document.location.href}`,
    );

    if (!cachedOldTitle) {
      return;
    }

    const response = await get(
      "https://www.youtube.com/oembed?url=" + document.location.href,
    );
    if (!response && !response.title) {
      return;
    }

    realTitle = response.title;
  }

  if (window.location.pathname.startsWith("/shorts/")) {
    const videoId = window.location.pathname.split("/")[2];

    cachedOldTitle = window.YoutubeAntiTranslate.getSessionCache(
      `${getUntranslateCurrentShortVideoParams().fakeNodeID}_https://www.youtube.com/shorts/${videoId}`,
    );

    if (!cachedOldTitle) {
      return;
    }

    const response = await get(
      "https://www.youtube.com/oembed?url=https://www.youtube.com/shorts/" +
        videoId,
    );
    if (!response && !response.title) {
      return;
    }

    realTitle = response.title;
  }

  if (!cachedOldTitle || !realTitle) {
    return;
  }

  // document tile is sometimes not a perfect match to the oldTile due to spacing, so normalize all
  const normalizedDocumentTitle = window.YoutubeAntiTranslate.normalizeSpaces(
    document.title,
  );
  const normalizedOldTitle =
    window.YoutubeAntiTranslate.normalizeSpaces(cachedOldTitle);
  const normalizeRealTitle =
    window.YoutubeAntiTranslate.normalizeSpaces(realTitle);
  const realDocumentTitle = normalizedDocumentTitle.replace(
    normalizedOldTitle,
    normalizeRealTitle,
  );
  if (normalizedDocumentTitle !== realDocumentTitle) {
    document.title = realDocumentTitle;
  }
}

// Initialize the extension
const target = document.body;
const config = { childList: true, subtree: true };
const observer = new MutationObserver(untranslate);
observer.observe(target, config);

// Title only observer
window.YoutubeAntiTranslate.waitForTitleElement().then((titleElement) => {
  const titleObserver = new MutationObserver(restoreOriginalPageTitle);
  const titleObserverConfig = {
    subtree: true,
    characterData: true,
    childList: true,
  };
  titleObserver.observe(titleElement, titleObserverConfig);
});

// --- Observe all Other Videos outside viewport for intersect ---
async function untranslateOtherVideosOnIntersect(entries, observer) {
  if (!entries) {
    return;
  }

  const /** @type {Node[]} */ intersectElements = [];
  for (const entry of entries) {
    if (entry.isIntersecting) {
      intersectElements.push(entry.target);
      observer.unobserve(entry.target);
    }
  }

  await untranslateOtherVideos(intersectElements);

  // update intersect observer
  updateObserverOtherVideosOnIntersect();
}

function updateObserverOtherVideosOnIntersect() {
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
async function untranslateOtherShortsOnIntersect(entries, observer) {
  if (!entries) {
    return;
  }

  const /** @type {Node[]} */ intersectElements = [];
  for (const entry of entries) {
    if (entry.isIntersecting) {
      intersectElements.push(entry.target);
      observer.unobserve(entry.target);
    }
  }

  await untranslateOtherShortsVideos(intersectElements);

  // update intersect observer
  updateObserverOtherShortsOnIntersect();
}

function updateObserverOtherShortsOnIntersect() {
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
