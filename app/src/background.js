// (function () {
var mutationIdx = 0;
const MUTATION_UPDATE_STEP = 3;
const FIRST_CHILD_DESC_ID = 'ytantitranslate_desc_div';

// Using MutationObserver as we can't exactly know the moment when YT js will load video title
const observer = new MutationObserver(untranslate);

const CURRENT_VIDEO_TITLE_TAG = 'ytantitranslatecurrentvideotitle';
const CURRENT_VIDEO_DESC_TAG = 'ytantitranslatecurrentvideodesc';
const OTHER_VIDEO_TITLE_TAG = 'ytantitranslateothervideotitle';

function makeHttpObject() {
    try {return new XMLHttpRequest();}
    catch (error) {}
    try {return new ActiveXObject("Msxml2.XMLHTTP");}
    catch (error) {}
    try {return new ActiveXObject("Microsoft.XMLHTTP");}
    catch (error) {}
  
    throw new Error("Could not create HTTP request object.");
}

function makeLinksClickable(html) {
    return html.replace(/(https?:\/\/[^\s]+)/g, "<a rel='nofollow' target='_blank' dir='auto' class='yt-simple-endpoint style-scope yt-formatted-string' href='$1'>$1</a>");
}

function get(url, callback) {
    var request = makeHttpObject();
    request.open("GET", url, true);
    request.send(null);
    request.onreadystatechange = function() {
    if (request.readyState == 4)
        callback(request);
    };
}

function trimYoutube(title) {
    return title.replace(/ - YouTube$/, '');
}

function untranslateCurrentVideo() {
    let translatedTitleElement = document.querySelector("#container > h1 > yt-formatted-string");
    let realTitle = null;

    if (document.title) {
        realTitle = trimYoutube(document.title);
    } else if (document.querySelector('meta[name="title"]')) {
        realTitle = document.querySelector('meta[name="title"]').content;
    }

    if (!realTitle || !translatedTitleElement) {
        // Do nothing if video is not loaded yet
        return;
    }

    if (realTitle === translatedTitleElement.innerText) {
        // Do not revert already original videos
        return;
    }

    translatedTitleElement.dataset[CURRENT_VIDEO_TITLE_TAG] = translatedTitleElement.textContent;
    translatedTitleElement.textContent = realTitle;

    let translatedDescription = document.querySelector("#description > yt-formatted-string");
    let realDescription = null;

    // For description, try ytInitialPlayerResponse object Youtube creates whenever you open video page, if it is for this video
    if (!window.ytInitialPlayerResponse) {
        return;
    }

    if (window.ytInitialPlayerResponse.videoDetails && window.ytInitialPlayerResponse.videoDetails.title === realTitle) {
        realDescription = window.ytInitialPlayerResponse.videoDetails.shortDescription;
    } else {
        if (translatedDescription.firstChild.id === FIRST_CHILD_DESC_ID) {
            translatedDescription.removeChild(translatedDescription.firstChild);
        }
    }

    if (realDescription) {
        const div = document.createElement('div');
        div.innerHTML = makeLinksClickable(realDescription) + "\n\n<b>TRANSLATED (added by <a class='yt-simple-endpoint style-scope yt-formatted-string' href='https://chrome.google.com/webstore/detail/youtube-anti-translate/ndpmhjnlfkgfalaieeneneenijondgag?hl=ru'>Youtube Anti Translate</a>):</b>\n";
        div.id = FIRST_CHILD_DESC_ID;
        translatedDescription.insertBefore(div, translatedDescription.firstChild);
    }
}

function untranslateOtherVideos() {
    function untranslateArray(otherVideos) {
        for (let i = 0; i < otherVideos.length; i++) {
            let video = otherVideos[i];

            // video was deleted
            if (!video) {
                return;
            }

            let videoThumbnail = video.querySelector('#thumbnail');

            // false positive result detected
            if (!videoThumbnail) {
                continue;
            }

            let videoId = videoThumbnail.href;

            if ((!video.untranslatedByExtension) || (video.untranslatedKey !== videoId)) { // do not request same video multiply times
                let href = video.querySelector('a');
                video.untranslatedByExtension = true;
                video.untranslatedKey = videoId;
                get('https://www.youtube.com/oembed?url=' + href.href, function (response) {
                    const title = JSON.parse(response.responseText).title;
                    const titleElement = video.querySelector('#video-title');
                    if (title != titleElement.innerText) {
                        if (titleElement) {
                            titleElement.dataset[OTHER_VIDEO_TITLE_TAG] = titleElement.innerText;
                            titleElement.innerText = title;
                        }
                    }
                });
            }
        }
    }

    untranslateArray(document.querySelectorAll('ytd-video-renderer'));
    untranslateArray(document.querySelectorAll('ytd-rich-item-renderer'));
    untranslateArray(document.querySelectorAll('ytd-compact-video-renderer'));
    untranslateArray(document.querySelectorAll('ytd-grid-video-renderer'));
}

function untranslate() {
    if (mutationIdx % MUTATION_UPDATE_STEP == 0) {
        untranslateCurrentVideo();
        untranslateOtherVideos();
    }
    mutationIdx++;
}

function undoUnTranslation() {
    const videoTitle = document.querySelector('[data-' + CURRENT_VIDEO_TITLE_TAG + ']');
    if (videoTitle) {
        videoTitle.textContent = videoTitle.dataset[CURRENT_VIDEO_TITLE_TAG];
        delete videoTitle.dataset[CURRENT_VIDEO_TITLE_TAG];
    }

    const videoDesc = document.querySelector('#' + FIRST_CHILD_DESC_ID);
    if (videoDesc) {
        videoDesc.remove();
    }

    const otherVideoTitle = document.querySelectorAll('[data-' + OTHER_VIDEO_TITLE_TAG + ']');
    Array.prototype.slice.call(otherVideoTitle).forEach(function(item) {
        item.innerText = item.dataset[OTHER_VIDEO_TITLE_TAG];
        delete item.dataset[OTHER_VIDEO_TITLE_TAG];
    });
}


function enableUnTranslation() {
    let target = document.body;
    let config = { childList: true, subtree: true };
    observer.observe(target, config);
}

function disableUnTranslation() {
    observer.disconnect();
    undoUnTranslation();
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log(request.sender);
        if (!sender.tab) {
            console.log('got message');
        }
        console.log('a message');
        // if (request.greeting === "hello")
        // sendResponse({farewell: "goodbye"});
    }
);
// })();