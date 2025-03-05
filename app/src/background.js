const MUTATION_UPDATE_STEP = 2;
const cache = new Map();

const ORIGINAL_TRANSLATIONS = [
  "original", // English
  "оригинал", // Russian
  "オリジナル", // Japanese
  "原始", // Chinese
  "원본", // Korean
  "origineel", // Dutch
  "original", // Spanish/Portuguese
  "originale", // Italian/French
  "original", // German
  "oryginał", // Polish
  "původní", // Czech
  "αρχικό", // Greek
  "orijinal", // Turkish
  "原創", // Traditional Chinese
  "gốc", // Vietnamese
  "asli", // Indonesian
  "מקורי", // Hebrew
  "أصلي", // Arabic
];

function makeLinksClickable(html) {
  return html.replace(
    /(https?:\/\/[^\s]+)/g,
    "<a rel='nofollow' target='_blank' dir='auto' class='yt-simple-endpoint style-scope yt-formatted-string' href='$1'>$1</a>"
  );
}

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

function setTitleNode(text, afterNode) {
  if (document.getElementById("yt-anti-translate-fake-node")) {
    const node = document.getElementById("yt-anti-translate-fake-node");
    node.textContent = text;
    return;
  }

  const node = document.createElement("span");
  node.className = "style-scope ytd-video-primary-info-renderer";
  node.id = "yt-anti-translate-fake-node";
  node.textContent = text;
  afterNode.after(node);
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

  if (realTitle === translatedTitleElement.textContent) {
    return;
  }

  translatedTitleElement.style.visibility = "hidden";
  translatedTitleElement.style.display = "none";

  console.log(`[YoutubeAntiTranslate] translated title to "${realTitle}"`);

  setTitleNode(realTitle, translatedTitleElement);
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

function getOriginalTrack(tracks) {
  if (!tracks || !Array.isArray(tracks)) {
    return null;
  }

  let languageFieldName = null;
  for (const track of tracks) {
    if (!track || typeof track !== "object") continue;

    for (const [fieldName, field] of Object.entries(track)) {
      if (field && typeof field === "object" && field.name) {
        languageFieldName = fieldName;
        break;
      }
    }
    if (languageFieldName) break;
  }

  if (!languageFieldName) {
    return;
  }

  for (const track of tracks) {
    if (!track || !track[languageFieldName] || !track[languageFieldName].name)
      continue;

    const trackName = track[languageFieldName].name.toLowerCase();
    for (const originalWord of ORIGINAL_TRANSLATIONS) {
      if (trackName.includes(originalWord.toLowerCase())) {
        return track;
      }
    }
  }
}

function untranslateAudioTrack() {
  const player = document.querySelector("#movie_player");
  if (!player || !player.getAvailableAudioTracks || player.audioUntranslated) {
    return;
  }

  const tracks = player.getAvailableAudioTracks();

  const originalTrack = getOriginalTrack(tracks);

  if (originalTrack) {
    player.setAudioTrack(originalTrack);
    player.audioUntranslated = true;
  }
}

let mutationIdx = 0;

async function untranslate() {
  if (mutationIdx % MUTATION_UPDATE_STEP == 0) {
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
