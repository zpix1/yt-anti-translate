# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.20.1] - 2025-10-xx

### Fixed

- [#144](https://github.com/zpix1/yt-anti-translate/issues/144) YouTube links in descriptions are translated
- [#145](https://github.com/zpix1/yt-anti-translate/issues/145) "Manage whitelists" cannot be opened on mobile browser

## [1.20.0] - 2025-10-13

### New Feature

- Add YouTube Mini Player untranslation
- [#114](https://github.com/zpix1/yt-anti-translate/issues/114) Thumbnails Untranslate
- [#135](https://github.com/zpix1/yt-anti-translate/issues/135) Untranslate Collaborator authors on everywhere
- [#119](https://github.com/zpix1/yt-anti-translate/issues/119) Untranslate Embeded videos outside of YouTube (e.g. On filmot.com) - iFrame support
- [#57](https://github.com/zpix1/yt-anti-translate/issues/57) Add support for youtube-nocookie.com
- [#138](https://github.com/zpix1/yt-anti-translate/issues/138) Add option to toggle Titles Untranslation
- [#55](https://github.com/zpix1/yt-anti-translate/issues/55) Whitelist channels to allow translations/dubbing - Advanced Settings

### Fixed

- [#137](https://github.com/zpix1/yt-anti-translate/issues/137) Videos description in searches sometimes shows older videos description
- Add missing selector to handle branding of feutured channels and sidebar channels
- Fix video description not translating of fundraising videos if viewport is below 1000x500
- Added missing selector to handle description of dismissable featured channel video

## [1.19.13.1] - 2025-10-09

### Fixed

- Fix [#60](https://github.com/zpix1/yt-anti-translate/issues/60#issuecomment-3316129585) Titles of playlists changed to the title of the first video on them. (only on `/feed/you` and `/feed/playlists`)

## [1.19.13] - 2025-09-20

### New Feature

- [#66](https://github.com/zpix1/yt-anti-translate/issues/66) Untranslate End Screen Mosaic inside the Player

### Fixed

- Fix video author translation on videos with multiple authors
- Fix author search result untranslation
- Fix `isVisible` function when any of the parents is invisible
- Fix [#116](https://github.com/zpix1/yt-anti-translate/issues/116) Unnecessary error 404 network calls to YT oembed API
- Fix [#124](https://github.com/zpix1/yt-anti-translate/issues/124) Incompatible with 'No YouTube Shorts'
- Fix [#115](https://github.com/zpix1/yt-anti-translate/issues/115) Title duplication when videos with similar titles watched one immediatly after another
- Fix [#128](https://github.com/zpix1/yt-anti-translate/issues/128) Shorts Untranslation is unreliable
- Fix [#132](https://github.com/zpix1/yt-anti-translate/issues/132)
- Handle short player description
- Handle fallback to title inside of description

## [1.19.12] - 2025-08-29

### Fixed

- [#122](https://github.com/zpix1/yt-anti-translate/issues/122) YouTube classes change

## [1.19.11] - 2025-08-20

### Fixed

- [#117](https://github.com/zpix1/yt-anti-translate/issues/117) Untranslate channel branding unicode issue

## [1.19.10] - 2025-08-08

### New Feature

- [#105](https://github.com/zpix1/yt-anti-translate/issues/105) Untranslate channel names on Collaborators pop-up

### Fixed

- Fix [#106](https://github.com/zpix1/yt-anti-translate/issues/106) document title doesn't get untranslated when tab is backgrounded
- Fix [#109](https://github.com/zpix1/yt-anti-translate/issues/109) issues with videos in playlists
- Fix [#108](https://github.com/zpix1/yt-anti-translate/issues/108) issues with title untranslating without player available

## [1.19.9] - 2025-08-03

### Fixed

- Fix [#101](https://github.com/zpix1/yt-anti-translate/issues/101) Video titles untranslation is slow and sequential

## [1.19.8] - 2025-08-01

### Fixed

- Fix [#97](https://github.com/zpix1/yt-anti-translate/issues/97) video titles are not translated when oembed replies 401 on restricted video

## [1.19.7] - 2025-07-31

### Fixed

- Fix [#91](https://github.com/zpix1/yt-anti-translate/issues/91) Chapter untranslation not always working

## [1.19.6] - 2025-07-29

### Fixed

- Fix [#84](https://github.com/zpix1/yt-anti-translate/issues/84) Channel titles in search are not always correctly untranslated
- Fix [#85](https://github.com/zpix1/yt-anti-translate/issues/85) Video Titles inside of a Playlist are not untranslated on mobile
- Fix [#86](https://github.com/zpix1/yt-anti-translate/issues/86) Channel Featured video title not untranslated on Mobile
- Fix [#88](https://github.com/zpix1/yt-anti-translate/issues/88) Channel name above description not untranslated on Mobile
- Fix issue where mobile description could be "untranslated" as the currently playing advert

## [1.19.5] - 2025-07-26

### New Feature

- Mobile audio untranslation

## [1.19.4] - 2025-07-25

### Fixed

- Fix [#78](https://github.com/zpix1/yt-anti-translate/issues/78) Handles with dots or unicode are incorrectly untranslated
- Fix [#80](https://github.com/zpix1/yt-anti-translate/issues/80) Chapter descriptions are gone when you mouse over the search bar

## [1.19.3] - 2025-07-23

### Fixed

- Fix notification untranslation not working due to a typo, and add handle for ':'

## [1.19.2] - 2025-07-22

### New Feature

- Chapters untranslation
- Option to only untranslate AI-dubbed audio
- Initial m.youtube.com support
- Notification untranslation

### Fixed

- Fix [#73](https://github.com/zpix1/yt-anti-translate/issues/73) Video Chapters repeating
- Fix [#68](https://github.com/zpix1/yt-anti-translate/issues/68) Anti-translation does not work on embedded URLs
- Fix [#67](https://github.com/zpix1/yt-anti-translate/issues/67) Titles in playlists are not untranslated
- Fix [#40](https://github.com/zpix1/yt-anti-translate/issues/40) Performance issues
- Fix [#63](https://github.com/zpix1/yt-anti-translate/issues/63) Album names wrongly replaced in the Releases section of music channels

## [1.18.4] - 2025-07-04

### Fixed

- Fix [#60](https://github.com/zpix1/yt-anti-translate/issues/60) Titles of playlists changed to the title of the first video on them

## [1.18.3] - 2025-07-03

### Fixed

- Fix compatibility with "Clickbait Remover for YouTube" for their "How to format titles" feature ([#41](https://github.com/zpix1/yt-anti-translate/issues/41))
- Fix main video title not being translated when navigating to YouTube from Google search results ([#45](https://github.com/zpix1/yt-anti-translate/issues/45))
- Fix 404 on advertisement videos ([#48](https://github.com/zpix1/yt-anti-translate/issues/48))
- Fix some issues in viewport/intersect logic
- Fix channel branding header description not untranslating when window was smaller than 528px width
- Fix videos in watch suggestions not untranslated by adding a new selector "yt-lockup-view-model" and way to handle it
- Fix bug #49 - reload current page only if is youtube.com

## [1.18.2] - 2025-05-27

### New Feature

- Ported to Firefox as Manifest V3 [YouTube Anti Translate - mv3](https://addons.mozilla.org/firefox/addon/youtube-anti-translate-mv3/)
- YouTube Channel Branding Header and About untranslation
- Untranslation of Channel Highlited video

### Fixed

- Fix bug with audio (dubbing) not always untranslating (due to the persistence of player.unstranslatedAudio and player.setAudioTrack(originalTrack) not checked for boolean response)
- Fix bug with page/tab title not being untranslated
- Fix untranslation of video player head link
- Fix duplication of untranslated fake node
- Fix untranslation of link to last video on a short
- Fix [Titles stay from previous videos #22](https://github.com/zpix1/yt-anti-translate/issues/22)
- Fix issue when multiple HTTP requests are sent for single video title untranslation

### Changed

- Avoid triggering functionalities if not needed in the current page
- Do not process elements outside the viewport or not visible to avoid slowing the page
- Use IntersectionObserver to dynamically work on the elements entering the viewport
- Improve code using windowDOM to avoid repetition

### Added

- Check host_permissions and request user to approve access if lacking
- Automatic testing of the extension in both Firefox and Chromium for ease of mantainance and quick response to broken features.

## [1.17.0] - 2025-04-05

### New Feature

- YouTube Shorts audio and titles untranslation

## [1.16.4] - 2025-04-03

### Fixed

- Infinite loop crashing a tab #33

## [1.16.3] - 2025-03-24

### Fixed

- Fixed audio checkbox default value

## [1.16.2] - 2025-03-15

### Fixed

- [#34](https://github.com/zpix1/yt-anti-translate/issues/34) Fixed time tags in video descriptions being unclickable

## [1.16.1] - 2025-03-08

### Changed

- Added video description anti-translation

## [1.16.0] - 2025-03-05

### Changed

- Converted extension to Manifest V3

## [1.5.15] - 2025-02-14

### New Feature

- Untranslate Audio Tracks! (optional)

## [1.5.14] - 2024-06-29

### Fixed

- [#26](https://github.com/zpix1/yt-anti-translate/issues/26)
