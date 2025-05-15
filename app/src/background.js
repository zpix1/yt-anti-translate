const MUTATION_UPDATE_STEP = 2;
const PLAYER_SELECTOR = window.location.pathname.startsWith("/shorts")
? "#shorts-player"
: "ytd-player .html5-video-player";
const LOG_PREFIX = "[YoutubeAntiTranslate]";
const CORE_ATTRIBUTED_STRING_SELECTOR = ".yt-core-attributed-string";
const cache = new Map();

/**
 * Given an Array of HTMLElements it returns visible HTMLElement or null
 * @param {Node|NodeList} elem 
 * @returns {Node | null}
 */
const YoutubeAntiTranslate_getFirstVisible = function (nodes) {
  if (!nodes) {
    return null;
  }
  else if (!(nodes instanceof NodeList)) {
    nodes = [nodes];
  } else {
    nodes = Array.from(nodes);
  }

  for (const node of nodes) {
    let style;
    let /** @type {Element} */ element 
    if (node.nodeType === Node.ELEMENT_NODE) {
      element = /** @type {Element} */ (node);
    }
    else {
      console.error(
        `${LOG_PREFIX} elem is not an Element or a Node`,
        window.location.href
      );
      return null;
    }

    style = getComputedStyle(element);

    if (
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    ) {
      return node;
    }
  }

  return null;
}

async function get(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404 || response.status === 401) {
        cache.set(url, null);
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    cache.set(url, data);
    return data;
  } catch (error) {
    console.error("Error fetching:", error);
    return null;
  }
}

function trimYoutube(title) {
  return title.replace(/ - YouTube$/, "");
}

function normalizeTitle(title) {
  return title.replace(/\s/g, "");
}

async function untranslateCurrentShortVideo() {
  if (YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(PLAYER_SELECTOR))) {
    if (!window.location.pathname.startsWith("/shorts/")) {
      return; // Should not happen if called correctly, but safety first
    }

    // Selector based on user example: <span class="yt-core-attributed-string ytReelMultiFormatLinkViewModelTitle yt-core-attributed-string--white-space-pre-wrap" role="text"><span class="" style="">TITLE</span></span>
    const shortsTitleSelector = "yt-shorts-video-title-view-model > h2 > span";
    const translatedTitleElement = YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(shortsTitleSelector));

    if (!translatedTitleElement) {
      // console.debug(`${LOG_PREFIX}  Shorts title element not found using selector:`, shortsTitleSelector);
      return;
    }

    // Check if already untranslated to avoid redundant work
    if (translatedTitleElement.hasAttribute("data-ytat-untranslated")) {
      return;
    }

    const videoId = window.location.pathname.split("/")[2];
    if (!videoId) {
      console.error(
        `${LOG_PREFIX} Could not extract Shorts video ID from URL:`,
        window.location.href
      );
      return;
    }

    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/shorts/${videoId}`;

    try {
      // console.debug(`${LOG_PREFIX} Fetching oEmbed for Short:`, videoId);
      const response = await get(oembedUrl);
      if (!response || !response.title) {
        // console.debug(`${LOG_PREFIX}  No oEmbed data for Short:`, videoId);
        // Mark as checked even if no data, to prevent retrying unless element changes
        translatedTitleElement.setAttribute("data-ytat-untranslated", "checked");
        return;
      }

      const realTitle = response.title;
      const currentTitle = translatedTitleElement.textContent?.trim();

      if (
        realTitle &&
        currentTitle &&
        normalizeTitle(realTitle) !== normalizeTitle(currentTitle)
      ) {
        console.log(
          `${LOG_PREFIX}  Untranslating Short title: "${currentTitle}" -> "${realTitle}"`
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
        `${LOG_PREFIX} Error fetching oEmbed for Short:`,
        videoId,
        error
      );
      // Don't mark as done on fetch error, allow retry
    }
  }
}

async function untranslateCurrentShortVideoLinks() {
  let fakeNodeID = "yt-anti-translate-fake-node-current-short-video-links";

  if (YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(PLAYER_SELECTOR))) {
    if (!window.location.pathname.startsWith("/shorts/")) {
      return; // Should not happen if called correctly, but safety first
    }
    
    let translatedShortsVideoLinksElement = YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(
      `.ytReelMultiFormatLinkViewModelEndpoint span${CORE_ATTRIBUTED_STRING_SELECTOR}>span:not(#${fakeNodeID})`
    ));

    if (!translatedShortsVideoLinksElement || !translatedShortsVideoLinksElement.textContent) {
      translatedShortsVideoLinksElement = YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(
      `.ytReelMultiFormatLinkViewModelEndpoint span${CORE_ATTRIBUTED_STRING_SELECTOR}>span:not(.cbCustomTitle):not(#${fakeNodeID})`
      ));
    }

    if (!translatedShortsVideoLinksElement || !translatedShortsVideoLinksElement.textContent) {
      return;
    }

    const response = await get(
      "https://www.youtube.com/oembed?url=" + translatedShortsVideoLinksElement.parentElement.parentElement.parentElement.href
    );
    if (!response) {
      return;
    }

    const realTitle = response.title;

    if (!realTitle || !translatedShortsVideoLinksElement) {
      return;
    }

    document.title = document.title.replace(
      translatedShortsVideoLinksElement.textContent,
      realTitle
    );

    const oldTitle = translatedShortsVideoLinksElement.textContent;

    if (realTitle === oldTitle) {
      return;
    }

    const fakeNode = document.getElementById(fakeNodeID);

    if (fakeNode?.textContent === realTitle) {
      return;
    }

    console.log(
      `${LOG_PREFIX} translated title to "${realTitle}" from "${oldTitle}"`
    );

    if (fakeNode) {
      fakeNode.textContent = realTitle;
      return;
    }

    let newFakeNode = document.createElement("span");
    newFakeNode.className = translatedShortsVideoLinksElement.className;
    newFakeNode.style.visibility = translatedShortsVideoLinksElement.style?.visibility ?? "";
    newFakeNode.style.display = translatedShortsVideoLinksElement.style?.display ?? "block";
    translatedShortsVideoLinksElement.style.visibility = "hidden";
    translatedShortsVideoLinksElement.style.display = "none";
    newFakeNode.id = fakeNodeID;
    newFakeNode.textContent = realTitle;
    translatedShortsVideoLinksElement.after(newFakeNode);
  }
}

async function untranslateCurrentVideo() {
  let fakeNodeID = "yt-anti-translate-fake-node-current-video";

  if (YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(PLAYER_SELECTOR))) {
    let translatedTitleElement = YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(
      `#title > h1 > yt-formatted-string:not(#${fakeNodeID})`
    ));

    if (!translatedTitleElement || !translatedTitleElement.textContent) {
      translatedTitleElement = YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(
      `#title h1 > yt-formatted-string:not(.cbCustomTitle):not(#${fakeNodeID})`
      ));
    }

    if (!translatedTitleElement || !translatedTitleElement.textContent) {
      return;
    }

    const response = await get(
      "https://www.youtube.com/oembed?url=" + document.location.href
    );
    if (!response) {
      return;
    }

    const realTitle = response.title;

    if (!realTitle || !translatedTitleElement) {
      return;
    }

    document.title = document.title.replace(
      translatedTitleElement.textContent,
      realTitle
    );

    const oldTitle = translatedTitleElement.textContent;

    if (realTitle === oldTitle) {
      return;
    }

    const fakeNode = document.getElementById(fakeNodeID);

    if (fakeNode?.textContent === realTitle) {
      return;
    }

    console.log(
      `${LOG_PREFIX} translated title to "${realTitle}" from "${oldTitle}"`
    );

    if (fakeNode) {
      fakeNode.textContent = realTitle;
      return;
    }

    let newFakeNode = document.createElement("div");
    newFakeNode.className = translatedTitleElement.className;
    newFakeNode.style.visibility = translatedTitleElement.style?.visibility ?? "";
    newFakeNode.style.display = translatedTitleElement.style?.display ?? "block";
    translatedTitleElement.style.visibility = "hidden";
    translatedTitleElement.style.display = "none";
    newFakeNode.id = fakeNodeID;
    newFakeNode.textContent = realTitle;
    translatedTitleElement.after(newFakeNode);
  }
}

async function untranslateCurrentVideoHeadLink() {  
  let fakeNodeID = "yt-anti-translate-fake-node-video-head-link";

  if (YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(PLAYER_SELECTOR))) {
    let translatedTitleVideoHeadLink = YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(
      `${PLAYER_SELECTOR} a.ytp-title-fullerscreen-link, ${PLAYER_SELECTOR} a.ytp-title-link:not(#${fakeNodeID})`
    ));

    if (!translatedTitleVideoHeadLink || !translatedTitleVideoHeadLink.textContent) {
      translatedTitleVideoHeadLink = YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(
        `${PLAYER_SELECTOR} a.ytp-title-fullerscreen-link:not(.cbCustomTitle), ${PLAYER_SELECTOR} a.ytp-title-link:not(.cbCustomTitle):not(#${fakeNodeID})`
      ));
    }

    if (!translatedTitleVideoHeadLink || !translatedTitleVideoHeadLink.textContent) {
      return;
    }

    const response = await get(
      "https://www.youtube.com/oembed?url=" + translatedTitleVideoHeadLink.href
    );
    if (!response) {
      return;
    }

    const realTitle = response.title;

    if (!realTitle || !translatedTitleVideoHeadLink) {
      return;
    }

    const oldTitle = translatedTitleVideoHeadLink.textContent;

    if (realTitle === oldTitle) {
      return;
    }

    const fakeNode = document.getElementById(fakeNodeID);

    if (fakeNode?.textContent === realTitle) {
      return;
    }

    console.log(
      `${LOG_PREFIX} translated title to "${realTitle}" from "${oldTitle}"`
    );

    if (fakeNode) {
      fakeNode.textContent = realTitle;
      return;
    }

    let newFakeNode = document.createElement("a");
    newFakeNode.href = translatedTitleVideoHeadLink.href;
    newFakeNode.className = translatedTitleVideoHeadLink.className;
    newFakeNode.style.visibility = translatedTitleVideoHeadLink.style?.visibility ?? "";
    newFakeNode.style.display = translatedTitleVideoHeadLink.style?.display ?? "block";
    translatedTitleVideoHeadLink.style.visibility = "hidden";
    translatedTitleVideoHeadLink.style.display = "none";
    newFakeNode.id = fakeNodeID;
    newFakeNode.textContent = realTitle;
    translatedTitleVideoHeadLink.after(newFakeNode);
  }
}

async function untranslateCurrentVideoFullScreenEdu() {  
  let fakeNodeID = "yt-anti-translate-fake-node-fullscreen-edu";

  if (YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(PLAYER_SELECTOR))) {
    let translatedTitleFullcreenElement = YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(
      `${PLAYER_SELECTOR} div.ytp-fullerscreen-edu-text:not(#${fakeNodeID})`
    ));

    if (!translatedTitleFullcreenElement || !translatedTitleFullcreenElement.textContent) {
      translatedTitleFullcreenElement = YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(
        `${PLAYER_SELECTOR} div.ytp-fullerscreen-edu-text:not(.cbCustomTitle):not(#${fakeNodeID})`
      ));
    }

    if (!translatedTitleFullcreenElement || !translatedTitleFullcreenElement.textContent) {
      return;
    }

    const response = await get(
      "https://www.youtube.com/oembed?url=" + document.location.href
    );
    if (!response) {
      return;
    }

    const realTitle = response.title;

    if (!realTitle || !translatedTitleFullcreenElement) {
      return;
    }

    const oldTitle = translatedTitleFullcreenElement.textContent;

    if (realTitle === oldTitle) {
      return;
    }

    const fakeNode = document.getElementById(fakeNodeID);

    if (fakeNode?.textContent === realTitle) {
      return;
    }

    console.log(
      `${LOG_PREFIX} translated title to "${realTitle}" from "${oldTitle}"`
    );

    if (fakeNode) {
      fakeNode.textContent = realTitle;
      return;
    }

    let newFakeNode = document.createElement("div");
    newFakeNode.className = translatedTitleFullcreenElement.className;
    newFakeNode.style.visibility = translatedTitleFullcreenElement.style?.visibility ?? "";
    newFakeNode.style.display = translatedTitleFullcreenElement.style?.display ?? "block";
    translatedTitleFullcreenElement.style.visibility = "hidden";
    translatedTitleFullcreenElement.style.display = "none";
    newFakeNode.id = fakeNodeID;
    newFakeNode.textContent = realTitle;
    translatedTitleFullcreenElement.after(newFakeNode);
  }
}

async function untranslateCurrentChannelEmbededVideoTitle() { 
  let fakeNodeID = "yt-anti-translate-fake-node-channel-embeded-title";

  if (YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(PLAYER_SELECTOR))) {
    let translatedTitleEbbededChannelVideo = YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(
      `div.ytd-channel-video-player-renderer #metadata-container.ytd-channel-video-player-renderer a:not(#${fakeNodeID})`
    ));

    if (!translatedTitleEbbededChannelVideo || !translatedTitleEbbededChannelVideo.textContent) {
      translatedTitleEbbededChannelVideo = YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(
        `div.ytd-channel-video-player-renderer #metadata-container.ytd-channel-video-player-renderer a:not(.cbCustomTitle):not(#${fakeNodeID})`
      ));
    }

    if (!translatedTitleEbbededChannelVideo || !translatedTitleEbbededChannelVideo.textContent) {
      return;
    }

    const response = await get(
      "https://www.youtube.com/oembed?url=" + translatedTitleEbbededChannelVideo.href
    );
    if (!response) {
      return;
    }

    const realTitle = response.title;

    if (!realTitle || !translatedTitleEbbededChannelVideo) {
      return;
    }

    const oldTitle = translatedTitleEbbededChannelVideo.textContent;

    if (realTitle === oldTitle) {
      return;
    }

    const fakeNode = document.getElementById(fakeNodeID);

    if (fakeNode?.textContent === realTitle) {
      return;
    }

    console.log(
      `${LOG_PREFIX} translated title to "${realTitle}" from "${oldTitle}"`
    );

    if (fakeNode) {
      fakeNode.textContent = realTitle;
      return;
    }

    let newFakeNode = document.createElement("a");
    newFakeNode.href = translatedTitleEbbededChannelVideo.href;
    newFakeNode.className = translatedTitleEbbededChannelVideo.className;
    newFakeNode.style.visibility = translatedTitleEbbededChannelVideo.style?.visibility ?? "";
    newFakeNode.style.display = translatedTitleEbbededChannelVideo.style?.display ?? "block";
    translatedTitleEbbededChannelVideo.style.visibility = "hidden";
    translatedTitleEbbededChannelVideo.style.display = "none";
    newFakeNode.id = fakeNodeID;
    newFakeNode.textContent = realTitle;
    translatedTitleEbbededChannelVideo.after(newFakeNode);
  }
}

async function untranslateOtherVideos() {
  async function untranslateArray(otherVideos) {
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
          // console.debug(`${LOG_PREFIX} Skipping video item, missing link or title:`, video);
          continue; // Skip if essential elements aren't found
        }
      }

      let videoHref = linkElement.href; // Use the link's href for oEmbed and as the key

      try {
        // console.debug(`${LOG_PREFIX} Fetching oEmbed for video:`, videoHref);
        const response = await get(
          "https://www.youtube.com/oembed?url=" + encodeURIComponent(videoHref)
        );
        if (!response || !response.title) {
          // console.debug(`${LOG_PREFIX} No oEmbed data for video:`, videoHref);
          continue; // Skip if no oEmbed data
        }

        const originalTitle = response.title;
        // Use innerText for comparison/logging as per original logic for these elements
        const currentTitle = titleElement.innerText?.trim();

        if (
          originalTitle &&
          currentTitle &&
          normalizeTitle(originalTitle) !== normalizeTitle(currentTitle)
        ) {
          console.log(
            `${LOG_PREFIX} Untranslating Video: "${currentTitle}" -> "${originalTitle}"`,
            normalizeTitle(originalTitle),
            normalizeTitle(currentTitle)
          );
          // Update both innerText and title attribute
          titleElement.innerText = originalTitle;
          titleElement.title = originalTitle;
          // Update link title attribute if it's the specific title link
          if (linkElement.matches("a#video-title-link:not(.cbCustomTitle)")) {
            linkElement.title = originalTitle;
          }
        } else {
          // console.debug(`${LOG_PREFIX} Video title unchanged or element missing:`, { href: videoHref, originalTitle, currentTitle });
        }
      } catch (error) {
        console.error(
          `${LOG_PREFIX} Error processing video:`,
          videoHref,
          error
        );
      }
    }
  }

  // Selectors for standard video containers
  void untranslateArray(document.querySelectorAll("ytd-video-renderer"));
  void untranslateArray(document.querySelectorAll("ytd-rich-item-renderer"));
  void untranslateArray(
    document.querySelectorAll("ytd-compact-video-renderer")
  );
  void untranslateArray(document.querySelectorAll("ytd-grid-video-renderer"));
  void untranslateArray(
    document.querySelectorAll("ytd-playlist-video-renderer")
  );
  void untranslateArray(
    document.querySelectorAll("ytd-playlist-panel-video-renderer")
  );
}

async function untranslateOtherShortsVideos() {
  async function untranslateArray(shortsItems) {
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
        `${CORE_ATTRIBUTED_STRING_SELECTOR}.yt-core-attributed-string--white-space-pre-wrap`
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
          `${LOG_PREFIX} Error fetching oEmbed for other Short:`,
          videoId,
          error
        );
        // Do not mark on fetch error, allow retry on the next mutation check
      }
    }
  }

  // Run for standard shorts items
  void untranslateArray(
    document.querySelectorAll("div.style-scope.ytd-rich-item-renderer")
  );

  // Run for ytm-shorts-lockup-view-model elements
  void untranslateArray(
    document.querySelectorAll("ytm-shorts-lockup-view-model")
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
  }
  mutationIdx++;
}

// Initialize the extension
const target = document.body;
const config = { childList: true, subtree: true };
const observer = new MutationObserver(untranslate);
observer.observe(target, config);
