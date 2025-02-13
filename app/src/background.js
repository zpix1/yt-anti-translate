var mutationIdx = 0;
let titleReplace = [];
const MUTATION_UPDATE_STEP = 2;
const FIRST_CHILD_DESC_ID = "ytantitranslate_desc_div";
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

function makeHttpObject() {
  try {
    return new XMLHttpRequest();
  } catch (error) {}
  try {
    return new ActiveXObject("Msxml2.XMLHTTP");
  } catch (error) {}
  try {
    return new ActiveXObject("Microsoft.XMLHTTP");
  } catch (error) {}

  throw new Error("Could not create HTTP request object.");
}

function makeLinksClickable(html) {
  return html.replace(
    /(https?:\/\/[^\s]+)/g,
    "<a rel='nofollow' target='_blank' dir='auto' class='yt-simple-endpoint style-scope yt-formatted-string' href='$1'>$1</a>"
  );
}

function get(url, callback) {
  if (cache.has(url)) {
    callback(cache.get(url));
    return;
  }
  var request = makeHttpObject();
  request.open("GET", url, true);
  request.send(null);
  request.onreadystatechange = function () {
    if (request.readyState == 4) {
      cache.set(url, request);
      callback(request);
    }
  };
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

function untranslateCurrentVideo() {
  let translatedTitleElement = document.querySelector(
    "#title > h1 > yt-formatted-string"
  );

  if (!translatedTitleElement || !translatedTitleElement.textContent) {
    translatedTitleElement = document.querySelector(
      "h1 > yt-formatted-string:not(.cbCustomTitle)"
    );
  }

  // that means we cannot find youtube title, so there is nothing we can do
  if (!translatedTitleElement || !translatedTitleElement.textContent) {
    return;
  }

  get(
    "https://www.youtube.com/oembed?url=" + document.location.href,
    function (response) {
      if (response.status !== 200) {
        return;
      }

      const realTitle = JSON.parse(response.responseText).title;

      if (!realTitle || !translatedTitleElement) {
        // Do nothing if video is not loaded yet
        return;
      }

      document.title = document.title.replace(
        translatedTitleElement.textContent,
        realTitle
      );

      if (realTitle === translatedTitleElement.textContent) {
        // Do not revert already original videos
        return;
      }

      // untranslate video by creating its copy
      translatedTitleElement.style.visibility = "hidden";
      translatedTitleElement.style.display = "none";

      console.log(`[YoutubeAntiTranslate] translated title to "${realTitle}"`);

      setTitleNode(realTitle, translatedTitleElement);

      // translatedTitleElement.textContent = realTitle;
      // translatedTitleElement.removeAttribute('is-empty');
      // translatedTitleElement.untranslatedByExtension = true;
    }
  );

  // disabled bugged description untranslation
  // const translatedDescriptions = [document.querySelector("#description .ytd-video-secondary-info-renderer"), document.getElementById('description-inline-expander')];

  // let realDescription = null;

  // // For description, try ytInitialPlayerResponse object Youtube creates whenever you open video page, if it is for this video
  // if (!window.ytInitialPlayerResponse) {
  //     return;
  // }

  // if (window.ytInitialPlayerResponse.videoDetails && window.ytInitialPlayerResponse.videoDetails.title === realTitle) {
  //     realDescription = window.ytInitialPlayerResponse.videoDetails.shortDescription;
  // } else {
  //     for (const translatedDescription of translatedDescriptions) {
  //         if (translatedDescription.firstChild.id === FIRST_CHILD_DESC_ID) {
  //             translatedDescription.removeChild(translatedDescription.firstChild);
  //         }
  //     }
  // }

  // console.log(realDescription, translatedDescriptions);

  // if (realDescription) {
  //     // for (const translatedDescription of translatedDescriptions) {
  //     //     const div = document.createElement('div');
  //     //     div.innerHTML = makeLinksClickable(realDescription) + "\n\n<b>TRANSLATED (added by <a class='yt-simple-endpoint style-scope yt-formatted-string' href='https://chrome.google.com/webstore/detail/youtube-anti-translate/ndpmhjnlfkgfalaieeneneenijondgag?hl=ru'>Youtube Anti Translate</a>):</b>\n";
  //     //     div.id = FIRST_CHILD_DESC_ID;
  //     //     translatedDescription.insertBefore(div, translatedDescription.firstChild);
  //     // }
  // }
}

function untranslateOtherVideos() {
  function untranslateArray(otherVideos) {
    for (let i = 0; i < otherVideos.length; i++) {
      let video = otherVideos[i];

      // video was deleted
      if (!video) {
        return;
      }

      let videoThumbnail = video.querySelector("a#thumbnail");

      // false positive result detected
      if (!videoThumbnail) {
        continue;
      }

      let videoId = videoThumbnail.href;

      if (!video.untranslatedByExtension || video.untranslatedKey !== videoId) {
        // do not request same video multiply times
        let href = video.querySelector("a");
        video.untranslatedByExtension = true;
        video.untranslatedKey = videoId;
        get(
          "https://www.youtube.com/oembed?url=" + href.href,
          function (response) {
            if (response.status !== 200) {
              return;
            }

            const title = JSON.parse(response.responseText).title;
            const titleElement = video.querySelector(
              "#video-title:not(.cbCustomTitle)"
            );
            if (title !== titleElement.innerText) {
              console.log(
                `[YoutubeAntiTranslate] translated from "${titleElement.innerText}" to "${title}"`
              );
              if (titleElement) {
                video.querySelector(
                  "#video-title:not(.cbCustomTitle)"
                ).innerText = title;
                video.querySelector("#video-title:not(.cbCustomTitle)").title =
                  title;
                if (
                  video.querySelector("a#video-title-link:not(.cbCustomTitle)")
                ) {
                  // home page
                  video.querySelector(
                    "a#video-title-link:not(.cbCustomTitle)"
                  ).title = title;
                }
              }
            }
          }
        );
      }
    }
  }

  untranslateArray(document.querySelectorAll("ytd-video-renderer"));
  untranslateArray(document.querySelectorAll("ytd-rich-item-renderer"));
  untranslateArray(document.querySelectorAll("ytd-compact-video-renderer"));
  untranslateArray(document.querySelectorAll("ytd-grid-video-renderer"));
  untranslateArray(document.querySelectorAll("ytd-playlist-video-renderer"));
  untranslateArray(
    document.querySelectorAll("ytd-playlist-panel-video-renderer")
  );

  // let compactVideos = document.getElementsByTagName('ytd-compact-video-renderer');    // related videos
  // let normalVideos = document.getElementsByTagName('ytd-video-renderer');             // channel page videos
  // let gridVideos = document.getElementsByTagName('ytd-grid-video-renderer');          // grid page videos

  // untranslateArray(compactVideos);
  // untranslateArray(normalVideos);
  // untranslateArray(gridVideos);
}

function getOriginalTrack(tracks) {
  if (!tracks || !Array.isArray(tracks)) {
    return null;
  }

  // First find which field contains the name property
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

  // Now find track with "original" in any language
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
  // Check if audio translation is enabled in settings
  if (
    !window.ytAntiTranslateConfig ||
    !window.ytAntiTranslateConfig.untranslateAudio
  ) {
    return;
  }

  const player = document.querySelector("#movie_player");
  if (!player || !player.getAvailableAudioTracks || player.audioUntranslated) {
    return;
  }

  const tracks = player.getAvailableAudioTracks();

  const originalTrack = getOriginalTrack(tracks);

  console.log(
    `[YoutubeAntiTranslate untranslateAudioTrack] tracks`,
    tracks,
    "original track",
    originalTrack
  );

  if (originalTrack) {
    player.setAudioTrack(originalTrack);
    player.audioUntranslated = true;
  }
}

function untranslate() {
  if (mutationIdx % MUTATION_UPDATE_STEP == 0) {
    untranslateCurrentVideo();
    untranslateOtherVideos();
    untranslateAudioTrack();
  }
  mutationIdx++;
}

function run() {
  // Change current video title and description
  // Using MutationObserver as we can't exactly know the moment when YT js will load video title
  const target = document.body;
  const config = { childList: true, subtree: true };
  const observer = new MutationObserver(untranslate);
  observer.observe(target, config);
}

run();
