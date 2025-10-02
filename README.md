# YouTube Anti Translate

[![Chrome Web Store Rating](https://img.shields.io/chrome-web-store/rating/ndpmhjnlfkgfalaieeneneenijondgag?style=for-the-badge&logo=googlechrome&label=Get%20for%20Chrome%20%7C%7C%20Rating%3A&labelColor=lightblue&color=blue)](https://chromewebstore.google.com/detail/youtube-anti-translate/ndpmhjnlfkgfalaieeneneenijondgag)
[![Mozilla Add-on Rating](https://img.shields.io/amo/rating/youtube-anti-translate-mv3?style=for-the-badge&logo=firefox&logoSize=auto&label=Get%20for%20Firefox%20%7C%7C%20Rating%3A&color=orange)](https://addons.mozilla.org/firefox/addon/youtube-anti-translate-mv3/)
[![Edge Add-on Rating](https://img.shields.io/badge/%20-%2300BDA3?style=for-the-badge&logo=quarto&logoColor=white&logoSize=auto&label=Get%20For%20Edge&labelColor=%2332526e)](https://microsoftedge.microsoft.com/addons/detail/youtube-anti-translate/ifckldggiagmhblhahedklifdhpkcpje)

## Overview

Source code of [YouTube Anti Translate](https://chrome.google.com/webstore/detail/yt-anti-translate/ndpmhjnlfkgfalaieeneneenijondgag) Chromium Extension created by [zpix1](https://github.com/zpix1),
And [YouTube Anti Translate - mv3](https://addons.mozilla.org/firefox/addon/youtube-anti-translate-mv3/) Firefox Extension mantained by [namakeingo](https://github.com/namakeingo).

All the people involved were annoyed by YouTube changing video titles to poorly user-translated versions. While it might be useful if you do not know the language, it quickly becomes annoying once you do.
As there is no option provided by YouTube to disable it, we made this extension to retrieve original titles and change them back.
As YouTube later got even more annoying with translated descriptions, audio (dubbing) and channel branding, the extension was expanded to untranslate that too.

It is much easier to use than its analogues (such as [YoutubeAutotranslateCanceler](https://github.com/pcouy/YoutubeAutotranslateCanceler)), because it does not require any YouTube API keys (for core features) or additional userscript extensions.

## Features

- Restores original video titles on YouTube (Title Anti-Translation)
- Restores original video descriptions on YouTube (can be toggled in settings "Untranslate description")
- Restores original video chapters
- Disables automatic audio (dubbing) translation (can be toggled in settings "Untranslate audio track")
- Restores original channel branding header and about on YouTube (can be toggled in settings "Untranslate channel branding")
- Restores original channels' names almost everywhere
- Untranslates YouTube Shorts audio and titles
- Works on m.youtube.com too (some mobile features are still unsupported and/or experimental)
- Works automatically without any configuration

### Enhanced Features Reliability Option

In the extension settings, you can optionally provide a YouTube Data API Key. Although this is optional, it is reccomended.

When that is populated, some features work more reliably.
[Read more on how to obtain](https://github.com/zpix1/yt-anti-translate/blob/main/YOUTUBE_DATA_API_KEY.md)

## How to use

If using Chrome/Edge or other Chromium browsers, install it from [Chrome Web Store](https://chrome.google.com/webstore/detail/yt-anti-translate/ndpmhjnlfkgfalaieeneneenijondgag).
If using a Firefox browser, install it from [Firefox Extensions Store](https://addons.mozilla.org/firefox/addon/youtube-anti-translate-mv3/).

There's also a [Firefox Manifest v3 version](https://addons.mozilla.org/firefox/addon/youtube-anti-translate/) (maintained by [artisticfox8](https://github.com/artisticfox8/)) since 2021. Currently it is mostly the same as the Chrome version, but it used to include a number of Firefox specific fixes in the past.

### Development Setup

1. Clone this repository
2. Navigate to the cloned folder and run the following command in a terminal window
   `npm ci`
3. Open with the IDE editor of choice
4. You can verify functionality by running Playwright Test (make sure you install Playwright extensions for your IDE if needed)
   - Before running the tests, you will need to install playwright browsers and dependencies
     `npx playwright install --with-deps`
   - Please create or update tests if adding new capabilities

#### Testing in Browser

- Chrome

  1. Open Chrome and navigate to `chrome://extensions/`
  2. Enable "Developer mode"
  3. Click "Load unpacked" and select the `app` directory from this repository

- Firefox

  1. Create a `.zip` of `app` directory (Note that `manifest.json` must be at the root of the archive)
  2. Open Firefox and navigate to `about:addons`
  3. Click the gear icon, click on "Install Add-on from File", select the zip file you created in step 1

## Contributing

Contributions are welcome! Here's how you can help:

1. **Report bugs**: If you find any issues, please open an issue in this repository
2. **Suggest features**: Have an idea to improve the extension? Let me know by opening an issue
3. **Submit code**: Feel free to fork the repository and submit pull requests
4. **Join our Discord server**: You can also join our [Discord server](https://discord.gg/B2aaaEdmEw) to discuss development and contribute.

## Support

If this extension really helped you, consider supporting the original creator [at their donation page](https://zpix1.github.io/donate/).

You can also show your support by:

- Starring this repository on GitHub
- Submitting a positive review for the extension on the [Chrome Web Store](https://chrome.google.com/webstore/detail/yt-anti-translate/ndpmhjnlfkgfalaieeneneenijondgag)
- Submitting a positive review for the extension on the [Firefox Extension Store](https://addons.mozilla.org/firefox/addon/youtube-anti-translate-mv3/)

### Contributors

- [namakeingo](https://github.com/namakeingo) - Firefox MV3 Developer
  - [Donate to namakeingo](https://github.com/sponsors/namakeingo)
  - Star the fork [namakeingo/yt-anti-translate-firefox](https://github.com/namakeingo/yt-anti-translate-firefox)
- [artisticfox8](https://github.com/artisticfox8/yt-anti-translate) - Firefox MV3 Developer
  - Star the fork [artisticfox8/yt-anti-translate](https://github.com/artisticfox8/yt-anti-translate)
- [ajayyy](https://github.com/ayayyy) - DeArrow compatibility [#18](https://github.com/zpix1/yt-anti-translate/pull/18) & [#19](https://github.com/zpix1/yt-anti-translate/pull/19)
- [YuriiMaiboroda](https://github.com/YuriiMaiboroda) - Fix translating for playlist panel [#14](https://github.com/zpix1/yt-anti-translate/pull/14)
- [BlackLanzer](https://github.com/BlackLanzer) - Translate title attribute [#24](https://github.com/zpix1/yt-anti-translate/pull/24)
- [NRngnl](https://github.com/NRngnl) - Replace 'chrome.extension.getURL' with 'chrome.runtime.getURL' [#12](https://github.com/zpix1/yt-anti-translate/pull/12)
