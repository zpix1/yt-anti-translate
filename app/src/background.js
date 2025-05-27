const MUTATION_UPDATE_STEP = 2;

const ALL_ARRAYS_VIDEOS_SELECTOR = `ytd-video-renderer,
ytd-rich-item-renderer,
ytd-compact-video-renderer,
ytd-grid-video-renderer,
ytd-playlist-video-renderer,
ytd-playlist-panel-video-renderer`;
const INTERSECTION_UPDATE_STEP_VIDEOS = 4;
let allIntersectVideoElements = null;
const intersectionObserverOtherVideos = new IntersectionObserver(untranslateOtherVideosOnIntersect, {
  root: null,  // viewport
  rootMargin: `${window.YoutubeAntiTranslate.VIEWPORT_EXTENSION_PERCENTAGE_FRACTION * 100}%`,
  threshold: 0 // Trigger when ANY part of the observed elements are inside the extended viewport
});

const ALL_ARRAYS_SHORTS_SELECTOR = `div.style-scope.ytd-rich-item-renderer,
ytm-shorts-lockup-view-model`;
const INTERSECTION_UPDATE_STEP_SHORTS = 2;
let allIntersectShortElements = null;
const intersectionObserverOtherShorts = new IntersectionObserver(untranslateOtherShortsOnIntersect, {
  root: null,  // viewport
  rootMargin: `${window.YoutubeAntiTranslate.VIEWPORT_EXTENSION_PERCENTAGE_FRACTION * 100}%`,
  threshold: 0 // Trigger when ANY part of the observed elements are inside the extended viewport
});

async function get(url) {
  if (window.YoutubeAntiTranslate.cache.has(url)) {
    return window.YoutubeAntiTranslate.cache.get(url);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404 || response.status === 401) {
        window.YoutubeAntiTranslate.cache.set(url, null);
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    window.YoutubeAntiTranslate.cache.set(url, data);
    return data;
  } catch (error) {
    console.error("Error fetching:", error);
    return null;
  }
}

function trimYoutube(title) {
  return title.replace(/ - YouTube$/, "");
}

async function untranslateCurrentShortVideo() {
  if (window.YoutubeAntiTranslate.getFirstVisible(document.querySelectorAll(window.YoutubeAntiTranslate.getPlayerSelector()))) {
    if (!window.location.pathname.startsWith("/shorts/")) {
      return; // Should not happen if called correctly, but safety first
    }

    // Selector based on user example: <span class="yt-core-attributed-string ytReelMultiFormatLinkViewModelTitle yt-core-attributed-string--white-space-pre-wrap" role="text"><span class="" style="">TITLE</span></span>
    const shortsTitleSelector = "yt-shorts-video-title-view-model > h2 > span";
    const translatedTitleElement = window.YoutubeAntiTranslate.getFirstVisible(document.querySelectorAll(shortsTitleSelector));

    if (!translatedTitleElement) {
      // console.debug(`${window.YoutubeAntiTranslate.LOG_PREFIX}  Shorts title element not found using selector:`, shortsTitleSelector);
      return;
    }

    // Check if already untranslated to avoid redundant work
    if (translatedTitleElement.hasAttribute("data-ytat-untranslated")) {
      return;
    }

    const videoId = window.location.pathname.split("/")[2];
    if (!videoId) {
      console.error(
        `${window.YoutubeAntiTranslate.LOG_PREFIX} Could not extract Shorts video ID from URL:`,
        window.location.href
      );
      return;
    }

    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/shorts/${videoId}`;

    try {
      // console.debug(`${window.YoutubeAntiTranslate.LOG_PREFIX} Fetching oEmbed for Short:`, videoId);
      const response = await get(oembedUrl);
      if (!response || !response.title) {
        // console.debug(`${window.YoutubeAntiTranslate.LOG_PREFIX}  No oEmbed data for Short:`, videoId);
        // Mark as checked even if no data, to prevent retrying unless element changes
        translatedTitleElement.setAttribute("data-ytat-untranslated", "checked");
        return;
      }

      const realTitle = response.title;
      const currentTitle = translatedTitleElement.textContent?.trim();

      if (
        realTitle &&
        currentTitle &&
        window.YoutubeAntiTranslate.normalizeSpaces(realTitle) !== window.YoutubeAntiTranslate.normalizeSpaces(currentTitle)
      ) {
        console.log(
          `${window.YoutubeAntiTranslate.LOG_PREFIX}  Untranslating Short title: "${currentTitle}" -> "${realTitle}"`
        );
        translatedTitleElement.textContent = realTitle;
        translatedTitleElement.setAttribute("data-ytat-untranslated", "true"); // Mark as done

        // Update page title too
        if (document.title.includes(currentTitle)) {
          document.title = document.title.replace(currentTitle, realTitle);
        } else {
          // Fallback if exact match fails (e.g. " Shorts" suffix)
          document.title = `${realTitle} #shorts`; // Adjust format as needed
        }
      } else {
        // Mark as done even if titles match or one is missing, to prevent re-checking
        translatedTitleElement.setAttribute("data-ytat-untranslated", "true");
      }
    } catch (error) {
      console.error(
        `${window.YoutubeAntiTranslate.LOG_PREFIX} Error fetching oEmbed for Short:`,
        videoId,
        error
      );
      // Don't mark as done on fetch error, allow retry
    }
  }
}

async function untranslateCurrentShortVideoLinks() {
  const fakeNodeID = "yt-anti-translate-fake-node-current-short-video-links";
  const originalNodeSelector = `.ytReelMultiFormatLinkViewModelEndpoint span${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}>span:not(#${fakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    el => el?.parentElement?.parentElement?.parentElement?.href,
    "span",
    false,
  );
}

async function untranslateCurrentVideo() {
  const fakeNodeID = "yt-anti-translate-fake-node-current-video";
  const originalNodeSelector = `#title > h1 > yt-formatted-string:not(#${fakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    () => document.location.href,
    "div",
    true
  );
}

async function untranslateCurrentVideoHeadLink() {
  const fakeNodeID = "yt-anti-translate-fake-node-video-head-link";
  const originalNodeSelector = `${window.YoutubeAntiTranslate.getPlayerSelector()} a.ytp-title-link:not(#${fakeNodeID})`;

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
    false
  );
}

async function untranslateCurrentVideoFullScreenEdu() {
  const fakeNodeID = "yt-anti-translate-fake-node-fullscreen-edu";
  const originalNodeSelector = `${window.YoutubeAntiTranslate.getPlayerSelector()} div.ytp-fullerscreen-edu-text:not(#${fakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    () => document.location.href,
    "div",
    false
  );
}

async function untranslateCurrentChannelEmbededVideoTitle() {
  const fakeNodeID = "yt-anti-translate-fake-node-channel-embeded-title";
  const originalNodeSelector = `div.ytd-channel-video-player-renderer #metadata-container.ytd-channel-video-player-renderer a:not(#${fakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    el => el.href,
    "a",
    false
  );
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
async function createOrUpdateUntranslatedFakeNode(fakeNodeID, originalNodeSelector, getUrl, createElementTag, shouldSetDocumentTitle = false) {
  if (window.YoutubeAntiTranslate.getFirstVisible(document.querySelectorAll(window.YoutubeAntiTranslate.getPlayerSelector()))) {
    let translatedElement = window.YoutubeAntiTranslate.getFirstVisible(document.querySelectorAll(
      originalNodeSelector
    ));

    if (!translatedElement || !translatedElement.textContent) {
      translatedElement = window.YoutubeAntiTranslate.getFirstVisible(document.querySelectorAll(
        `${originalNodeSelector}:not(.cbCustomTitle)`
      ));
    }

    const fakeNode = document.querySelector(`#${fakeNodeID}`);

    if ((!fakeNode || !fakeNode.textContent) && (!translatedElement || !translatedElement.textContent)) {
      return;
    }

    const getUrlForElement = getUrl(translatedElement ?? fakeNode);
    const response = await get("https://www.youtube.com/oembed?url=" + getUrlForElement);
    if (!response) {
      return;
    }

    const realTitle = response.title;

    if (!realTitle || (!translatedElement && !fakeNode)) {
      return;
    }

    const oldTitle = translatedElement?.textContent ?? fakeNode?.textContent;

    if (shouldSetDocumentTitle) {
      // This is sometimes skipped on first update as youtube translate the document title late; so we use a cached oldTitle
      const cachedOldTitle = window.YoutubeAntiTranslate.cache.get(`${fakeNodeID}_${getUrlForElement}`) ?? oldTitle

      // document tile is sometimes not a perfect match to the oldTile due to spacing, so normalize all
      const normalizedDocumentTitle = window.YoutubeAntiTranslate.normalizeSpaces(document.title);
      const normalizedOldTitle = window.YoutubeAntiTranslate.normalizeSpaces(cachedOldTitle);
      const normalizeRealTitle = window.YoutubeAntiTranslate.normalizeSpaces(realTitle);
      const realDocumentTitle = normalizedDocumentTitle.replace(normalizedOldTitle, normalizeRealTitle);
      if (normalizedDocumentTitle !== realDocumentTitle) {
        document.title = realDocumentTitle;
      }
    }

    if (realTitle === oldTitle || fakeNode?.textContent === realTitle) {
      return;
    }
    else {
      // cache old title for future reference
      window.YoutubeAntiTranslate.cache.set(`${fakeNodeID}_${getUrlForElement}`, oldTitle)
    }

    console.log(
      `${window.YoutubeAntiTranslate.LOG_PREFIX} translated title to "${realTitle}" from "${oldTitle}"`
    );

    if (!fakeNode && translatedElement) {
      // Not sure why, but even tho we checked already 'fakeNode', 'existingFakeNode' still return a value of initialization
      const existingFakeNode = translatedElement.parentElement.querySelector(`#${fakeNodeID}`);
      let newFakeNode = document.createElement(createElementTag);
      if (translatedElement.href) {
        newFakeNode.href = translatedElement.href;
      }
      newFakeNode.className = translatedElement.className;
      newFakeNode.id = fakeNodeID;
      newFakeNode.textContent = realTitle;
      if (!existingFakeNode) {
        newFakeNode.style.visibility = translatedElement.style?.visibility ?? "visible";
        newFakeNode.style.display = translatedElement.style?.display ?? "block";
        translatedElement.after(newFakeNode);
      }
      else {
        newFakeNode.style.visibility = existingFakeNode.style?.visibility ?? "visible";
        newFakeNode.style.display = existingFakeNode.style?.display ?? "block";
        existingFakeNode.replaceWith(newFakeNode);
      }
      translatedElement.style.visibility = "hidden";
      translatedElement.style.display = "none";
    }
    else if (fakeNode) {
      fakeNode.textContent = realTitle;
    }
  }
}

async function untranslateOtherVideos(intersectElements = null) {
  async function untranslateOtherVideosArray(otherVideos) {
    if (!otherVideos) {
      return;
    }
    otherVideos = Array.from(otherVideos);
    for (let i = 0; i < otherVideos.length; i++) {
      let video = otherVideos[i];

      if (!video) {
        // Original logic used return here, seems incorrect for a loop. Changed to continue.
        continue;
      }

      // Find link and title elements typical for standard videos
      let linkElement =
        video.querySelector("a#video-title-link") ||
        video.querySelector("a#thumbnail");
      let titleElement = video.querySelector(
        "#video-title:not(.cbCustomTitle)"
      );

      if (!linkElement || !titleElement) {
        // Try another common pattern before giving up
        if (!linkElement) linkElement = video.querySelector("ytd-thumbnail a");
        if (!titleElement)
          titleElement = video.querySelector("yt-formatted-string#video-title");
        if (!linkElement || !titleElement) {
          // console.debug(`${window.YoutubeAntiTranslate.LOG_PREFIX} Skipping video item, missing link or title:`, video);
          continue; // Skip if essential elements aren't found
        }
      }

      let videoHref = linkElement.href; // Use the link's href for oEmbed and as the key

      try {
        // console.debug(`${window.YoutubeAntiTranslate.LOG_PREFIX} Fetching oEmbed for video:`, videoHref);
        const response = await get(
          "https://www.youtube.com/oembed?url=" + encodeURIComponent(videoHref)
        );
        if (!response || !response.title) {
          // console.debug(`${window.YoutubeAntiTranslate.LOG_PREFIX} No oEmbed data for video:`, videoHref);
          continue; // Skip if no oEmbed data
        }

        const originalTitle = response.title;
        // Use innerText for comparison/logging as per original logic for these elements
        const currentTitle = titleElement.innerText?.trim();

        if (
          originalTitle &&
          currentTitle &&
          window.YoutubeAntiTranslate.normalizeSpaces(originalTitle) !== window.YoutubeAntiTranslate.normalizeSpaces(currentTitle)
        ) {
          console.log(
            `${window.YoutubeAntiTranslate.LOG_PREFIX} Untranslating Video: "${currentTitle}" -> "${originalTitle}"`
          );
          // Update both innerText and title attribute
          titleElement.innerText = originalTitle;
          titleElement.title = originalTitle;
          // Update link title attribute if it's the specific title link
          if (linkElement.matches("a#video-title-link:not(.cbCustomTitle)")) {
            linkElement.title = originalTitle;
          }
        } else {
          // console.debug(`${window.YoutubeAntiTranslate.LOG_PREFIX} Video title unchanged or element missing:`, { href: videoHref, originalTitle, currentTitle });
        }
      } catch (error) {
        console.error(
          `${window.YoutubeAntiTranslate.LOG_PREFIX} Error processing video:`,
          videoHref,
          error
        );
      }
    }
  }

  if (intersectElements) {
    // If this was called from the intersect obesrver only check the newly intersecting items
    await untranslateOtherVideosArray(intersectElements);
    return;
  }
  // Selectors for all video containers
  await untranslateOtherVideosArray(
    window.YoutubeAntiTranslate.getAllVisibleNodes(document.querySelectorAll(ALL_ARRAYS_VIDEOS_SELECTOR))
  );
}

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
      const linkElement = shortElement.querySelector(
        "a.shortsLockupViewModelHostEndpoint"
      );
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
        `${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}.yt-core-attributed-string--white-space-pre-wrap`
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
            "a.shortsLockupViewModelHostEndpoint.shortsLockupViewModelHostOutsideMetadataEndpoint"
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
        console.error(
          `${window.YoutubeAntiTranslate.LOG_PREFIX} Error fetching oEmbed for other Short:`,
          videoId,
          error
        );
        // Do not mark on fetch error, allow retry on the next mutation check
      }
    }
  }

  if (intersectElements) {
    // If this was called from the intersect obesrver only check the newly intersecting items
    await untranslateOtherShortsArray(intersectElements);
    return;
  }
  // Run for all shorts items
  await untranslateOtherShortsArray(
    window.YoutubeAntiTranslate.getAllVisibleNodes(document.querySelectorAll(ALL_ARRAYS_SHORTS_SELECTOR))
  );
}

let mutationIdx = 0;

async function untranslate() {
  if (mutationIdx % MUTATION_UPDATE_STEP === 0) {
    const currentVideoPromise = untranslateCurrentVideo();
    const currentVideoFullScreenLinkPromise = untranslateCurrentVideoHeadLink();
    const currentVideoFullScreenEduPromise = untranslateCurrentVideoFullScreenEdu();
    const channelEmbededVideoPromise = untranslateCurrentChannelEmbededVideoTitle();
    const otherVideosPromise = untranslateOtherVideos();
    const currentShortPromise = untranslateCurrentShortVideo();
    const currentShortVideoLinksPromise = untranslateCurrentShortVideoLinks();
    const otherShortsPromise = untranslateOtherShortsVideos(); // Call the new function

    // Wait for all promises to resolve concurrently
    await Promise.all([
      currentVideoPromise,
      currentVideoFullScreenLinkPromise,
      currentVideoFullScreenEduPromise,
      channelEmbededVideoPromise,
      otherVideosPromise,
      currentShortPromise,
      currentShortVideoLinksPromise,
      otherShortsPromise,
    ]);

    // update intersect observers
    updateObserverOtherVideosOnIntersect();
    updateObserverOtherShortsOnIntersect();
  }
  mutationIdx++;
}

// Initialize the extension
const target = document.body;
const config = { childList: true, subtree: true };
const observer = new MutationObserver(untranslate);
observer.observe(target, config);

// --- Observe all Other Videos outside viewport for intersect ---
let mutationIdxVideos = 0;
async function untranslateOtherVideosOnIntersect(entries) {
  if (mutationIdxVideos % INTERSECTION_UPDATE_STEP_VIDEOS === 0) {
    if (!entries) {
      return;
    }

    let /** @type {Node[]} */ intersectElements = [];
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
    intersectionObserverOtherVideos.unobserve(el)
  }
  allIntersectVideoElements = window.YoutubeAntiTranslate.getAllVisibleNodesOutsideViewport(document.querySelectorAll(ALL_ARRAYS_VIDEOS_SELECTOR), true);
  for (const el of allIntersectVideoElements ?? []) {
    intersectionObserverOtherVideos.observe(el)
  }
}

// --- Observe all Other Shorts outside viewport for intersect ---
let mutationIdxShorts = 0;
async function untranslateOtherShortsOnIntersect(entries) {
  if (mutationIdxShorts % INTERSECTION_UPDATE_STEP_SHORTS === 0) {
    if (!entries) {
      return;
    }

    let /** @type {Node[]} */ intersectElements = [];
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
    intersectionObserverOtherShorts.unobserve(el)
  }
  allIntersectShortElements = window.YoutubeAntiTranslate.getAllVisibleNodesOutsideViewport(document.querySelectorAll(ALL_ARRAYS_SHORTS_SELECTOR), true);
  for (const el of allIntersectShortElements ?? []) {
    intersectionObserverOtherShorts.observe(el)
  }
}