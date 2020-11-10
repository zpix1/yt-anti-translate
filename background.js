function makeHttpObject() {
    try {return new XMLHttpRequest();}
    catch (error) {}
    try {return new ActiveXObject("Msxml2.XMLHTTP");}
    catch (error) {}
    try {return new ActiveXObject("Microsoft.XMLHTTP");}
    catch (error) {}
  
    throw new Error("Could not create HTTP request object.");
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
    let realTitle = document.querySelector(".ytp-title-link").innerText;
    let translatedTitleElement = document.querySelector(".title").children[0];

    if (!realTitle || !translatedTitleElement) {
        // Do nothing if video is not loaded yet
        return;
    }
    if (realTitle === translatedTitleElement.innerText) {
        // Do not revert already original videos
        return;
    }
    // let realDescription = window["ytInitialPlayerResponse"].videoDetails.shortDescription;
    // let translatedDescriptionElement = document.querySelector(".content.style-scope.ytd-video-secondary-info-renderer");

    translatedTitleElement.innerText = realTitle;
    // translatedDescriptionElement.innerHTML = linkify(realDescription);
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
    let gridVideos = document.getElementsByTagName('ytd-grid-video-renderer');          // channel page videos
    
    untranslateArray(compactVideos);
    untranslateArray(normalVideos);
    untranslateArray(gridVideos);
}

function untranslate() {
    untranslateCurrentVideo();
    untranslateOtherVideos();
}

function run() {
    // Change current video title and description
    // Using MutationObserver couse we can't exactly know the moment when YT js will load video title
    let target = document.body;
    let config = { childList: true, subtree: true };
    let observer = new MutationObserver(untranslate);
    observer.observe(target, config);
    
}
run();