var mutationIdx = 0;
let titleReplace = [];
const MUTATION_UPDATE_STEP = 2;
const FIRST_CHILD_DESC_ID = "ytantitranslate_desc_div";
const cache = new Map();

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
  const translatedTitleElement = document.querySelector(
    "h1 > yt-formatted-string:not(.cbCustomTitle)"
  );

  // title link approach
  // if (document.querySelector(".ytp-title-link")) {
  //     realTitle = document.querySelector(".ytp-title-link").innerText;
  // } else
  // document title approach
  // title approach (does not work anymore)
  // if (document.title) {
  //     realTitle = trimYoutube(document.title);
  //     // remove notification counter
  //     realTitle = realTitle.replace(/^\(\d+\)/, '');
  // } else
  // if (document.querySelector('meta[name="title"]')) {
  //     realTitle = document.querySelector('meta[name="title"]').content;
  // }

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

      if (!document.title.includes(realTitle)) {
        document.title = document.title.replace(
          translatedTitleElement.textContent,
          realTitle
        );
      }

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

function untranslate() {
  if (mutationIdx % MUTATION_UPDATE_STEP == 0) {
    untranslateCurrentVideo();
    untranslateOtherVideos();
  }
  mutationIdx++;
}

function run() {
  // Change current video title and description
  // Using MutationObserver as we can't exactly know the moment when YT js will load video title
  let target = document.body;
  let config = { childList: true, subtree: true };
  let observer = new MutationObserver(untranslate);
  observer.observe(target, config);
}

run();
