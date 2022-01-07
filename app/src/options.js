function saveOptions() {
    chrome.storage.sync.get({
        disabled: false
    }, function (items) {
        let disabled = !items.disabled;
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: disabled ? 'disable' : 'enable'});
        });
        console.log('sent bred');
        chrome.storage.sync.set({
            disabled: disabled,
        }, function () {
            document.getElementById('disable-button').innerText = disabled ? 'Enable' : 'Disable';
            document.getElementById('status').innerText = disabled ? 'Disabled' : 'Enabled';
            document.getElementById('status').className = 'status ' + (disabled ? 'disabled' : 'enabled');
            document.getElementById('disable-button').className = disabled ? 'disabled' : 'enabled';
        });
    });
}

function loadOptions() {
    chrome.storage.sync.get({
        disabled: false
    }, function (items) {
        document.getElementById('disable-button').innerText = items.disabled ? 'Enable' : 'Disable';
        document.getElementById('status').innerText = items.disabled ? 'Disabled' : 'Enabled';
        document.getElementById('status').className = 'status ' + (items.disabled ? 'disabled' : 'enabled');
        document.getElementById('disable-button').className = items.disabled ? 'disabled' : 'enabled';
    });
}

document.addEventListener('DOMContentLoaded', loadOptions);
document.getElementById('disable-button').addEventListener('click', saveOptions);