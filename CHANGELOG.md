# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.18.3]

### Fixed

- Fix bug #49

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
