// (() => {
//   /**
//    * Copyright (c) 2025 Ivan Baksheev
//    * All rights reserved.
//    *
//    * Proprietary Source-Available License
//    * ------------------------------------
//    * Permission is granted, free of charge, to any person who receives
//    * this file as part of the  extension YouTube Anti Translate
//    * (the Software), to execute, copy, and modify this file solely for
//    * the purpose of creating and maintaining forks of the Software,
//    * provided that this copyright notice and license header are
//    * preserved in all copies or substantial portions of the file.
//    *
//    * No other rights are granted. You may not sell, sublicense, or
//    * distribute this file separately from the Software without prior
//    * written permission from the copyright holder.
//    *
//    * This file is NOT covered by the MIT License that applies to other
//    * parts of this project.
//    *
//    * For licensing inquiries, contact: dczpix@gmail.com
//    */

//   // Store the original ytInitialPlayerResponse
//   let originalPlayerResponse = null;

//   // Set up property descriptor to intercept access
//   Object.defineProperty(window, "ytInitialPlayerResponse", {
//     configurable: false,
//     enumerable: true,
//     get() {
//       if (originalPlayerResponse && originalPlayerResponse.ytAntiTranslate) {
//         return originalPlayerResponse;
//       }

//       console.log(
//         "[YoutubeAntiTranslate] [DEBUG] ytInitialPlayerResponse getter called - overriding to empty formats",
//       );
//       if (originalPlayerResponse && originalPlayerResponse?.streamingData) {
//         originalPlayerResponse.streamingData.formats = null;
//         originalPlayerResponse.streamingData.serverAbrStreamingUrl = null;
//         originalPlayerResponse.streamingData.adaptiveFormats = null;
//       }
//       return originalPlayerResponse;
//     },
//     set(value) {
//       console.log(
//         "[YoutubeAntiTranslate] [DEBUG] ytInitialPlayerResponse being set - storing original",
//       );
//       originalPlayerResponse = value;
//     },
//   });
//   Object.freeze(window.ytInitialPlayerResponse);
// })();

// Load scripts that will run in page environment
chrome.storage.sync.get(
  {
    disabled: false,
    untranslateAudio: true,
    untranslateDescription: true,
    untranslateNotification: true,
  },
  async function (items) {
    if (
      !items.disabled &&
      items.untranslateAudio &&
      window.location.hostname === "m.youtube.com"
    ) {
      const mobileAudioScript = document.createElement("script");
      mobileAudioScript.type = "module";
      mobileAudioScript.src = chrome.runtime.getURL(
        "src/mobile-audio/background_mobile_audio.js",
      );
      document.head.prepend(mobileAudioScript);
    }
  },
);
