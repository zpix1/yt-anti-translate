var mutationIdx = 0;
const MUTATION_UPDATE_STEP = 3;
const FIRST_CHILD_DESC_ID = 'ytantitranslate_desc_div';

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

function untranslateCurrentVideo() {
    let translatedTitleElement = document.querySelector(".title").children[0];
    let realTitle = null;

    if (document.querySelector(".ytp-title-link")) {
        realTitle = document.querySelector(".ytp-title-link").innerText;
    }

    if (!realTitle || !translatedTitleElement) {
        // Do nothing if video is not loaded yet
        return;
    }

    if (realTitle === translatedTitleElement.innerText) {
        // Do not revert already original videos
        return;
    }

    translatedTitleElement.innerText = realTitle;


    let translatedDescription = document.querySelector("#description > yt-formatted-string");
    let realDescription = null;

    // For description, try ytInitialPlayerResponse, if it is for this video
    if (ytInitialPlayerResponse.videoDetails && ytInitialPlayerResponse.videoDetails.title === realTitle) {
        realDescription = ytInitialPlayerResponse.videoDetails.shortDescription;
    } else {
        if (translatedDescription.firstChild.id === FIRST_CHILD_DESC_ID) {
            translatedDescription.removeChild(translatedDescription.firstChild);
        }
    }

    if (realDescription) {
        var div = document.createElement('div');
        div.innerHTML = makeLinksClickable(realDescription) + "\n\nTRANSLATED:\n";
        div.id = FIRST_CHILD_DESC_ID;
        console.log("KEKW", translatedDescription.children[0]);
        translatedDescription.insertBefore(div, translatedDescription.firstChild);
    }
}

function untranslateOtherVideos() {
    function untranslateArray(otherVideos) {
        for (let i = 0; i < otherVideos.length; i++) {
            let video = otherVideos[i];
            let videoId = video.querySelector('#thumbnail').href;
            if ((!video.untranslatedByExtension) || (video.untranslatedKey !== videoId)) { // do not request same video multiply times
                let href = video.querySelector('a');
                video.untranslatedByExtension = true;
                video.untranslatedKey = videoId;
                get('https://www.youtube.com/oembed?url=' + href.href, function (response) {
                    const title = JSON.parse(response.responseText).title;
                    video.querySelector('#video-title').innerText = title;
                });
            }
        }
    }
    let compactVideos = document.getElementsByTagName('ytd-compact-video-renderer');    // related videos
    let normalVideos = document.getElementsByTagName('ytd-video-renderer');             // channel page videos
    let gridVideos = document.getElementsByTagName('ytd-grid-video-renderer');          // grid page videos
    
    untranslateArray(compactVideos);
    untranslateArray(normalVideos);
    untranslateArray(gridVideos);
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
    // let target = document.body;
    // let config = { childList: true, subtree: true };
    // let observer = new MutationObserver(untranslate);
    // observer.observe(target, config);
    setInterval(untranslate, 100);
}

run();