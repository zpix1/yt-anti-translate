const MUTATION_UPDATE_STEP = 2;

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

async function untranslateCurrentShortVideo() {
  if (
    window.YoutubeAntiTranslate.getFirstVisible(
      document.querySelectorAll(
        window.YoutubeAntiTranslate.getPlayerSelector(),
      ),
    )
  ) {
    if (!window.location.pathname.startsWith("/shorts/")) {
      return; // Should not happen if called correctly, but safety first
    }

    // Selector based on user example: <span class="yt-core-attributed-string ytReelMultiFormatLinkViewModelTitle yt-core-attributed-string--white-space-pre-wrap" role="text"><span class="" style="">TITLE</span></span>
    const shortsTitleSelector = "yt-shorts-video-title-view-model > h2 > span";
    const translatedTitleElement = window.YoutubeAntiTranslate.getFirstVisible(
      document.querySelectorAll(shortsTitleSelector),
    );

    if (!translatedTitleElement) {
      // console.debug(` Shorts title element not found using selector:`, shortsTitleSelector);
      return;
    }

    // Check if already untranslated to avoid redundant work
    if (translatedTitleElement.hasAttribute("data-ytat-untranslated")) {
      return;
    }

    const videoId = window.location.pathname.split("/")[2];
    if (!videoId) {
      window.YoutubeAntiTranslate.logWarning(
        `Could not extract Shorts video ID from URL:`,
        window.location.href,
      );
      return;
    }

    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/shorts/${videoId}`;

    try {
      // console.debug(`Fetching oEmbed for Short:`, videoId);
      const response = await get(oembedUrl);
      if (!response || !response.title) {
        // console.debug(` No oEmbed data for Short:`, videoId);
        // Mark as checked even if no data, to prevent retrying unless element changes
        translatedTitleElement.setAttribute(
          "data-ytat-untranslated",
          "checked",
        );
        return;
      }

      const realTitle = response.title;
      const currentTitle = translatedTitleElement.textContent?.trim();

      if (
        realTitle &&
        currentTitle &&
        !window.YoutubeAntiTranslate.isStringEqual(realTitle, currentTitle)
      ) {
        window.YoutubeAntiTranslate.logInfo(
          `Untranslating Short title: "${currentTitle}" -> "${realTitle}"`,
        );
        translatedTitleElement.textContent = realTitle;
        translatedTitleElement.setAttribute("data-ytat-untranslated", "true"); // Mark as done

        // Update page title too
        if (document.title.includes(currentTitle)) {
          document.title = window.YoutubeAntiTranslate.stringReplaceWithOptions(
            document.title,
            currentTitle,
            realTitle,
          );
        } else {
          // Fallback if exact match fails (e.g. " Shorts" suffix)
          document.title = `${realTitle} #shorts`; // Adjust format as needed
        }
      } else {
        // Mark as done even if titles match or one is missing, to prevent re-checking
        translatedTitleElement.setAttribute("data-ytat-untranslated", "true");
      }
    } catch (error) {
      window.YoutubeAntiTranslate.logWarning(
        `Error fetching oEmbed for Short:`,
        videoId,
        error,
      );
      // Don't mark as done on fetch error, allow retry
    }
  }
}

//Changes main short title on "/shorts/shortid" pages
async function untranslateCurrentShortVideoLinks() {
  const fakeNodeID = "yt-anti-translate-fake-node-current-short-video-links";
  const originalNodeSelector = `.ytReelMultiFormatLinkViewModelEndpoint span${window.YoutubeAntiTranslate.CORE_ATTRIBUTED_STRING_SELECTOR}>span:not(#${fakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    (el) => el?.parentElement?.parentElement?.parentElement?.href,
    "span",
    false,
  );
}

//Changes main video title on "/watch?v=videoid" pages
async function untranslateCurrentVideo() {
  const fakeNodeID = "yt-anti-translate-fake-node-current-video";
  const originalNodeSelector = `#title > h1 > yt-formatted-string:not(#${fakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    () => document.location.href,
    "div",
    true,
  );
}

//For channel ("/@MrBeast") pages, for the pinned video's title **in** the video player
//See "docs/Figure 2.png"
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
    false,
  );
}

async function untranslateCurrentVideoFullScreenEdu() {
  const fakeNodeID = "yt-anti-translate-fake-node-fullscreen-edu";
  const originalNodeSelector = `${window.YoutubeAntiTranslate.getPlayerSelector()} div.ytp-fullerscreen-edu-text:not(#${fakeNodeID})`;

  // Skip if on a channel page
  if (document.location.pathname.startsWith("/@")) {
    return;
  }

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    () => document.location.href,
    "div",
    false,
  );
}

//For channel ("/@MrBeast") pages, for the pinned video's title **under** the video player
//See "docs/Figure 1.png"
async function untranslateCurrentChannelEmbeddedVideoTitle() {
  const fakeNodeID = "yt-anti-translate-fake-node-channel-embedded-title";
  const originalNodeSelector = `div.ytd-channel-video-player-renderer #metadata-container.ytd-channel-video-player-renderer a:not(#${fakeNodeID})`;

  await createOrUpdateUntranslatedFakeNode(
    fakeNodeID,
    originalNodeSelector,
    (el) => el.href,
    "a",
    false,
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
async function createOrUpdateUntranslatedFakeNode(
  fakeNodeID,
  originalNodeSelector,
  getUrl,
  createElementTag,
  shouldSetDocumentTitle = false,
) {
  if (
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

    if (shouldSetDocumentTitle) {
      // This is sometimes skipped on first update as youtube translate the document title late; so we use a cached oldTitle
      const cachedOldTitle =
        window.YoutubeAntiTranslate.getSessionCache(
          `${fakeNodeID}_${getUrlForElement}`,
        ) ?? oldTitle;

      if (
        !window.YoutubeAntiTranslate.isStringEqual(realTitle, cachedOldTitle)
      ) {
        document.title = window.YoutubeAntiTranslate.stringReplaceWithOptions(
          document.title,
          cachedOldTitle,
          realTitle,
        );
      }
    }

    if (
      window.YoutubeAntiTranslate.isStringEqual(realTitle, oldTitle) ||
      window.YoutubeAntiTranslate.isStringEqual(
        fakeNode?.textContent,
        realTitle,
      )
    ) {
      return;
    } else {
      // cache old title for future reference
      window.YoutubeAntiTranslate.setSessionCache(
        `${fakeNodeID}_${getUrlForElement}`,
        oldTitle,
      );
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
  }
}

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
            // Ignore playlist links with list= parameter
            video.querySelector(`a[href*="/watch?v="]`);
        }
        if (!titleElement) {
          titleElement =
            video.querySelector("yt-formatted-string#video-title") ||
            video.querySelector(
              ".yt-lockup-metadata-view-model-wiz__title>.yt-core-attributed-string",
            );
        }
        if (!linkElement || !titleElement) {
          // console.debug(`Skipping video item, missing link or title:`, video);
          continue; // Skip if essential elements aren't found
        }
      }

      // Ignore advertisement video
      if (window.YoutubeAntiTranslate.isAdvertisementHref(linkElement.href)) {
        continue;
      }

      // Ignore playlist links with list= parameter
      if (linkElement.href.includes("list=")) {
        continue;
      }

      // Use the link's href for oEmbed and as the key
      // These afaik always conform to "/watch?v=id", and don't have any extra parameters, but just to be safe
      const videoHref = window.YoutubeAntiTranslate.stripNonEssentialParams(
        linkElement.href,
      );

      try {
        // console.debug(`Fetching oEmbed for video:`, videoHref);
        const response = await get(
          "https://www.youtube.com/oembed?url=" + videoHref,
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
      } catch (error) {
        window.YoutubeAntiTranslate.logInfo(
          `Error processing video:`,
          videoHref,
          error,
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
    window.YoutubeAntiTranslate.getAllVisibleNodes(
      document.querySelectorAll(
        window.YoutubeAntiTranslate.ALL_ARRAYS_SHORTS_SELECTOR,
      ),
    ),
  );
}

let mutationIdx = 0;

async function untranslate() {
  if (mutationIdx % MUTATION_UPDATE_STEP === 0) {
    const currentVideoPromise = untranslateCurrentVideo();
    const currentVideoFullScreenLinkPromise = untranslateCurrentVideoHeadLink();
    const currentVideoFullScreenEduPromise =
      untranslateCurrentVideoFullScreenEdu();
    const channelEmbeddedVideoPromise =
      untranslateCurrentChannelEmbeddedVideoTitle();
    const otherVideosPromise = untranslateOtherVideos();
    const currentShortPromise = untranslateCurrentShortVideo();
    const currentShortVideoLinksPromise = untranslateCurrentShortVideoLinks();
    const otherShortsPromise = untranslateOtherShortsVideos(); // Call the new function

    // Wait for all promises to resolve concurrently
    await Promise.all([
      currentVideoPromise,
      currentVideoFullScreenLinkPromise,
      currentVideoFullScreenEduPromise,
      channelEmbeddedVideoPromise,
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
