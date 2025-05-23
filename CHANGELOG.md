# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.18.1.3] - 2025-05-21

### Fixed

- Fix bug with page/tag title not being untranslated

## [1.18.1.2] - 2025-05-20

### Fixed

- Fix untranslation of video player head link
- Fix duplication of untranslated fake node

### Changed

- Improve code using windowDOM to avoid repetition

### Added

- Test extension in both firefox and chromium

## [1.18.1.1] - 2025-05-16

### Fixed

- Fix bug with title untranslate introduced with an error when doing "Avoid triggering functionalities if not needed in the current page"
- Fix layout bug when changing the Author above description
- Fix player.setAudioTrack(originalTrack) not being awaited and checked for the boolean response, causing player. audioUntranslated to be set true prematurely

## [1.18.1] - 2025-05-15

### Fixed

- Fixed channel branding about not untranslation when opened via "more links" then "..more" (or opposite order) - a new popup is created the second time so the duplicate element was not handled
- Fixed flex position of branding header "..more" link not updating
- Fixed untranslation of embedded video title and description - like in highlighted video of a channel
- Fixed untranslation of short video link to video

### Changed

- Optimise start-up logic for better performance
- Avoid triggering functionalities if not needed in the current page

## [1.18.0] - 2025-05-13

### New Feature

- YouTube Channel Branding Header and About untranslation

### Fixed

- Fixed video title untranslation when in full screen
- Fixed channel name untranslation above video player description

## [1.17.0.1] - 2025-05-08

### Support

- Ported to Firefox as Manifest V3 [YouTube Anti Translate - mv3](https://addons.mozilla.org/firefox/addon/youtube-anti-translate-mv3/)

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
