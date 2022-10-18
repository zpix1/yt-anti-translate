// To run in page environment

chrome.storage.sync.get({
    disabled: false
}, function (items) {
    if (!items.disabled) {
        var s = document.createElement('script');
        s.defer = true;
        s.src = chrome.runtime.getURL('src/background.js');
        document.body.appendChild(s);
    }
});