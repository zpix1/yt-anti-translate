/*
 * Copyright (c) 2025 Ivan Baksheev
 * All rights reserved.
 *
 * Proprietary Source-Available License
 * ------------------------------------
 * Permission is granted, free of charge, to any person who receives
 * this file as part of the  extension YouTube Anti Translate
 * (the Software), to execute, copy, and modify this file solely for
 * the purpose of creating and maintaining forks of the Software,
 * provided that this copyright notice and license header are
 * preserved in all copies or substantial portions of the file.
 *
 * No other rights are granted. You may not sell, sublicense, or
 * distribute this file separately from the Software without prior
 * written permission from the copyright holder.
 *
 * This file is NOT covered by the MIT License that applies to other
 * parts of this project.
 *
 * For licensing inquiries, contact: dczpix@gmail.com
 */
// const ORIGINAL_TRANSLATIONS = [
//   "original", // English (en)
//   "оригинал", // Russian (ru_RU)
//   "オリジナル", // Japanese (ja_JP)
//   "原始", // Chinese Simplified (zh_CN)
//   "원본", // Korean (ko_KR)
//   "origineel", // Dutch (nl_NL)
//   "original", // Spanish (es_ES) / Portuguese (pt_BR)
//   "originale", // Italian (it_IT) / French (fr_FR)
//   "original", // German (de_DE)
//   "oryginał", // Polish (pl_PL)
//   "původní", // Czech (cs_CZ)
//   "αρχικό", // Greek (el_GR)
//   "orijinal", // Turkish (tr_TR)
//   "原創", // Traditional Chinese (zh_TW)
//   "gốc", // Vietnamese (vi_VN)
//   "asli", // Indonesian (id_ID)
//   "מקורי", // Hebrew (he_IL)
//   "أصلي", // Arabic (ar_EG)
//   "मूल", // Hindi (hi_IN)
//   "मूळ", // Marathi (mr_IN)
//   "ਪ੍ਰਮਾਣਿਕ", // Punjabi (pa_IN)
//   "అసలు", // Telugu (te_IN)
//   "மூலம்", // Tamil (ta_IN)
//   "মূল", // Bengali (bn_BD)
//   "അസലി", // Malayalam (ml_IN)
//   "ต้นฉบับ", // Thai (th_TH)
// ];

// function getSettings() {
//   const element = document.querySelector(
//     'script[type="module"][data-ytantitranslatesettings]',
//   );
//   return JSON.parse(element?.dataset?.ytantitranslatesettings ?? "{}");
// }

const videoResponseCache = new Map();

async function getOriginalVideoResponse(videoId) {
  const cacheKey = `video_response_mobile_${videoId}`;
  if (videoResponseCache.has(cacheKey)) {
    return videoResponseCache.get(cacheKey); // Return cached description if available
  }

  const body = {
    context: {
      client: {
        clientName: "MWEB",
        clientVersion: "2.20250730.01.00",
        hl: "lo", // Using "Lao" as default that is an unsupported (but valid) language of youtube
        // That always get the original language as a result
      },
    },
    videoId,
  };

  const response = await fetch(
    "https://m.youtube.com/youtubei/v1/player?prettyPrint=false&yt-anti-translate=true",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const json = await response.json();
  if (json) {
    videoResponseCache.set(cacheKey, json); // Cache the player response for future use
  }
  return json;
}

// // Helper: parse track id and extract useful information
// function getTrackInfo(track) {
//   const defaultInfo = {
//     isOriginal: false,
//     language: null,
//     isDubbed: false,
//     isAI: false,
//   };

//   if (!track || !track.id || typeof track.id !== "string") {
//     return defaultInfo;
//   }

//   const parts = track.id.split(";");
//   if (parts.length < 2) {
//     return defaultInfo;
//   }

//   try {
//     const decoded = atob(parts[1]);

//     const isOriginal = decoded.includes("original");
//     const isAI = decoded.includes("dubbed-auto");
//     const isDubbed = decoded.includes("dubbed") || isAI;

//     const langMatch = decoded.match(/lang..([-a-zA-Z]+)/);
//     const language = langMatch ? langMatch[1].toLowerCase() : null;

//     return { isOriginal, language, isDubbed, isAI };
//   } catch {
//     // If decoding fails, return defaults
//     return defaultInfo;
//   }
// }

// // Helper: detect original track using either name translations or base64 id decoding
// function isOriginalTrack(track, languageFieldName) {
//   if (!track) {
//     return false;
//   }

//   // Check by readable name first (uses UI language)
//   if (
//     languageFieldName &&
//     track[languageFieldName] &&
//     track[languageFieldName].name
//   ) {
//     const trackName = track[languageFieldName].name.toLowerCase();
//     for (const originalWord of ORIGINAL_TRANSLATIONS) {
//       if (trackName.includes(originalWord.toLowerCase())) {
//         return true;
//       }
//     }
//   }

//   // Fallback: check by decoding the id
//   return getTrackInfo(track).isOriginal;
// }

async function getOriginalAdaptiveFormats(adaptiveFormats, videoId) {
  if (!adaptiveFormats || !Array.isArray(adaptiveFormats)) {
    return [{}];
  }

  const untranslatedResponse = await getOriginalVideoResponse(videoId);

  if (
    !untranslatedResponse ||
    !untranslatedResponse.streamingData ||
    !untranslatedResponse.streamingData.adaptiveFormats
  ) {
    return adaptiveFormats;
  }

  const videoTracks = adaptiveFormats.filter((format) => {
    if (!format.audioTrack || typeof format.audioTrack !== "object") {
      return true; // Keep formats without audioTrack
    }
    return false;
  });

  const untranslatedAudioTracks =
    untranslatedResponse.streamingData.adaptiveFormats.filter((format) => {
      if (!format.audioTrack || typeof format.audioTrack !== "object") {
        return false; // Skip formats without audioTrack so that merge later does not repeat them
      }
      return true; // Keep formats with audioTrack
    });

  return [...videoTracks, ...untranslatedAudioTracks];
}

// function getOriginalAdaptiveFormats(adaptiveFormats) {
//   if (!adaptiveFormats || !Array.isArray(adaptiveFormats)) {
//     return [{}];
//   }

//   const originalTracks = adaptiveFormats.filter((format) => {
//     if (!format.audioTrack || typeof format.audioTrack !== "object") {
//       return true; // Keep formats without audioTrack
//     }

//     // Check if the format.audioTrack is original
//     return isOriginalTrack(format.audioTrack, "displayName");
//   });

//   const properDubbedTracks = adaptiveFormats.filter((format) => {
//     if (!format.audioTrack || typeof format.audioTrack !== "object") {
//       return false; // Skip formats without audioTrack so that merge later does not repeat them
//     }

//     // Check if the format.audioTrack is dubbed or AI
//     const trackInfo = getTrackInfo(format.audioTrack);
//     return !trackInfo.isAI && !trackInfo.isOriginal;
//   });

//   if (originalTracks.length === 0 && properDubbedTracks.length === 0) {
//     return [{}];
//   }

//   if (properDubbedTracks.length > 0) {
//     if (getSettings()?.untranslateAudioOnlyAI) {
//       // merge both arrays and return
//       return [...originalTracks, ...properDubbedTracks];
//     } else {
//       // return only original tracks
//       return originalTracks;
//     }
//   }
// }

(() => {
  // Simple logging function
  function log(message) {
    console.log(`[YoutubeAntiTranslate] ${message}`);
  }

  // Store the original ytInitialPlayerResponse
  let originalPlayerResponse = null;
  let isIntercepted = false;

  function getModifiedPlayerResponse(original) {
    if (!original) {
      return original;
    }

    try {
      // Create a deep copy to avoid modifying the original
      const modified = JSON.parse(JSON.stringify(original));

      // Replace streamingData.adaptiveFormats with custom data
      if (modified.streamingData && modified.streamingData.adaptiveFormats) {
        log(
          "Modifying streamingData.adaptiveFormats in ytInitialPlayerResponse",
        );
        getOriginalAdaptiveFormats(
          modified.streamingData.adaptiveFormats,
          modified.videoDetails.videoId,
        ).then((formats) => {
          modified.streamingData.adaptiveFormats = formats;
        });
      }

      return modified;
    } catch (error) {
      log(`Error modifying player response: ${error.message}`);
      return original;
    }
  }

  // Intercept window['ytInitialPlayerResponse']
  function setupPlayerResponseInterception() {
    if (isIntercepted) {
      return;
    }

    // Check if ytInitialPlayerResponse already exists
    if (window.ytInitialPlayerResponse) {
      originalPlayerResponse = window.ytInitialPlayerResponse;
      log("Found existing ytInitialPlayerResponse, storing original");
    }

    // Set up property descriptor to intercept access
    Object.defineProperty(window, "ytInitialPlayerResponse", {
      configurable: true,
      enumerable: true,
      get() {
        log("ytInitialPlayerResponse accessed - returning modified version");
        return getModifiedPlayerResponse(originalPlayerResponse);
      },
      set(value) {
        log("ytInitialPlayerResponse being set - storing original");
        originalPlayerResponse = value;
      },
    });

    isIntercepted = true;
    log("ytInitialPlayerResponse interception setup complete");
  }

  function createRewriter(origFetch) {
    return async function (input, init = {}) {
      const url = typeof input === "string" ? input : input.url;

      // Only process requests to the specific YouTube mobile player API
      if (
        !url ||
        !url.includes("m.youtube.com/youtubei/v1/player") ||
        url.includes("yt-anti-translate=true")
      ) {
        return origFetch(input, init);
      }

      log(`Processing YouTube mobile player API request: ${url}`);
      const response = await origFetch(input, init);

      // Only process JSON responses that might contain streamingData
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return response;
      }

      try {
        // Clone the response to read the body
        const responseClone = response.clone();
        const jsonData = await responseClone.json();

        // Check if this response contains streamingData.adaptiveFormats
        if (jsonData.streamingData && jsonData.streamingData.adaptiveFormats) {
          log(
            `Found streamingData.adaptiveFormats, replacing with custom data`,
          );

          // Replace adaptiveFormats with the original formats
          jsonData.streamingData.adaptiveFormats =
            await getOriginalAdaptiveFormats(
              jsonData.streamingData.adaptiveFormats,
              jsonData.videoDetails.videoId,
            );

          // Create a new response with modified JSON
          const modifiedResponse = new Response(JSON.stringify(jsonData), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });

          return modifiedResponse;
        }
      } catch (error) {
        log(`Error processing JSON response: ${error.message}`);
      }

      return response;
    };
  }

  /* -----------------------------  4  INSTALL  ----------------------------- */
  (function install() {
    // Set up ytInitialPlayerResponse interception first
    try {
      setupPlayerResponseInterception();
    } catch (error) {
      log(`Error setting up player response interception: ${error.message}`);
    }

    /* 4-a. wrap whatever fetch exists right now (likely the native one) */
    log("installing wrapper around current window.fetch");
    window.fetch = createRewriter(window.fetch.bind(window));

    /* 4-b. if YouTube later replaces fetch with ytNetworkFetch, re-wrap it */
    Object.defineProperty(window, "ytNetworkFetch", {
      configurable: true,
      set(fn) {
        log("ytNetworkFetch assigned → wrapping it too");
        window.fetch = createRewriter(fn);
      },
      get() {
        return window.fetch;
      },
    });

    /* 4-c. if ytNetworkFetch was already present before our script ran,
            wrap it immediately (covers the 'parsed-but-not-executed' case) */
    if (window.ytNetworkFetch) {
      log("ytNetworkFetch pre-existing → wrapping immediately");
      window.fetch = createRewriter(window.ytNetworkFetch);
    }
  })();
})();
