const MUTATION_UPDATE_STEP = 2;
const cache = new Map();

async function get(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
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

async function untranslateCurrentVideo() {
  let translatedTitleElement = document.querySelector(
    "#title > h1 > yt-formatted-string"
  );

  if (!translatedTitleElement || !translatedTitleElement.textContent) {
    translatedTitleElement = document.querySelector(
      "h1 > yt-formatted-string:not(.cbCustomTitle)"
    );
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

  translatedTitleElement.style.visibility = "hidden";
  translatedTitleElement.style.display = "none";

  const fakeNode = document.getElementById("yt-anti-translate-fake-node");

  if (fakeNode?.textContent === realTitle) {
    return;
  }

  console.log(
    `[YoutubeAntiTranslate] translated title to "${realTitle}" from "${oldTitle}"`
  );

  if (fakeNode) {
    fakeNode.textContent = realTitle;
    return;
  }

  const newFakeNode = document.createElement("span");
  newFakeNode.className = "style-scope ytd-video-primary-info-renderer";
  newFakeNode.id = "yt-anti-translate-fake-node";
  newFakeNode.textContent = realTitle;
  translatedTitleElement.after(newFakeNode);
}

async function untranslateOtherVideos() {
  async function untranslateArray(otherVideos) {
    for (let i = 0; i < otherVideos.length; i++) {
      let video = otherVideos[i];

      if (!video) {
        return;
      }

      let videoThumbnail = video.querySelector("a#thumbnail");

      if (!videoThumbnail) {
        continue;
      }

      let videoId = videoThumbnail.href;

      if (!video.untranslatedByExtension || video.untranslatedKey !== videoId) {
        let href = video.querySelector("a");
        video.untranslatedByExtension = true;
        video.untranslatedKey = videoId;

        const response = await get(
          "https://www.youtube.com/oembed?url=" + href.href
        );
        if (!response) {
          continue;
        }

        const title = response.title;
        const titleElement = video.querySelector(
          "#video-title:not(.cbCustomTitle)"
        );
        if (title !== titleElement.innerText) {
          console.log(
            `[YoutubeAntiTranslate] translated from "${titleElement.innerText}" to "${title}"`
          );
          if (titleElement) {
            video.querySelector("#video-title:not(.cbCustomTitle)").innerText =
              title;
            video.querySelector("#video-title:not(.cbCustomTitle)").title =
              title;
            if (video.querySelector("a#video-title-link:not(.cbCustomTitle)")) {
              video.querySelector(
                "a#video-title-link:not(.cbCustomTitle)"
              ).title = title;
            }
          }
        }
      }
    }
  }

  await untranslateArray(document.querySelectorAll("ytd-video-renderer"));
  await untranslateArray(document.querySelectorAll("ytd-rich-item-renderer"));
  await untranslateArray(
    document.querySelectorAll("ytd-compact-video-renderer")
  );
  await untranslateArray(document.querySelectorAll("ytd-grid-video-renderer"));
  await untranslateArray(
    document.querySelectorAll("ytd-playlist-video-renderer")
  );
  await untranslateArray(
    document.querySelectorAll("ytd-playlist-panel-video-renderer")
  );
}

let mutationIdx = 0;

async function untranslate() {
  if (mutationIdx % MUTATION_UPDATE_STEP === 0) {
    await untranslateCurrentVideo();
    await untranslateOtherVideos();
  }
  mutationIdx++;
}

// Initialize the extension
const target = document.body;
const config = { childList: true, subtree: true };
const observer = new MutationObserver(untranslate);
observer.observe(target, config);
