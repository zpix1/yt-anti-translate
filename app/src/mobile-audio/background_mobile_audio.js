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

const ORIGINAL_TRANSLATIONS = [
  "original", // English (en)
  "оригинал", // Russian (ru_RU)
  "オリジナル", // Japanese (ja_JP)
  "原始", // Chinese Simplified (zh_CN)
  "원본", // Korean (ko_KR)
  "origineel", // Dutch (nl_NL)
  "original", // Spanish (es_ES) / Portuguese (pt_BR)
  "originale", // Italian (it_IT) / French (fr_FR)
  "original", // German (de_DE)
  "oryginał", // Polish (pl_PL)
  "původní", // Czech (cs_CZ)
  "αρχικό", // Greek (el_GR)
  "orijinal", // Turkish (tr_TR)
  "原創", // Traditional Chinese (zh_TW)
  "gốc", // Vietnamese (vi_VN)
  "asli", // Indonesian (id_ID)
  "מקורי", // Hebrew (he_IL)
  "أصلي", // Arabic (ar_EG)
  "मूल", // Hindi (hi_IN)
  "मूळ", // Marathi (mr_IN)
  "ਪ੍ਰਮਾਣਿਕ", // Punjabi (pa_IN)
  "అసలు", // Telugu (te_IN)
  "மூலம்", // Tamil (ta_IN)
  "মূল", // Bengali (bn_BD)
  "അസലി", // Malayalam (ml_IN)
  "ต้นฉบับ", // Thai (th_TH)
];

/**
 * Exact copy of the function from global.js
 */
async function getSettings() {
  // First try to read from the DOM
  const element = document.querySelector(
    'script[type="module"][data-ytantitranslatesettings]',
  );
  if (element?.["dataset"]?.ytantitranslatesettings) {
    try {
      return JSON.parse(element["dataset"].ytantitranslatesettings);
    } catch {
      // fallback to chrome storage if JSON is invalid
    }
  }

  // Fallback: read from Chrome storage
  if (chrome?.storage?.sync?.get) {
    return await chrome.storage.sync.get({
      disabled: false,
      untranslateTitle: true,
      whiteListUntranslateTitle: [],
      untranslateAudio: true,
      untranslateAudioOnlyAI: false,
      whiteListUntranslateAudio: [],
      untranslateDescription: true,
      whiteListUntranslateDescription: [],
      untranslateChapters: true,
      whiteListUntranslateChapters: [],
      untranslateChannelBranding: true,
      whiteListUntranslateChannelBranding: [],
      untranslateNotification: true,
      untranslateThumbnail: true,
      whiteListUntranslateThumbnail: [],
    });
  }

  // Absolute fallback: return empty object
  return {};
}

// Helper: parse track id and extract useful information
function getTrackInfo(track) {
  const defaultInfo = {
    isOriginal: false,
    language: null,
    isDubbed: false,
    isAI: false,
  };

  if (!track || !track.id || typeof track.id !== "string") {
    return defaultInfo;
  }

  const parts = track.id.split(";");
  if (parts.length < 2) {
    return defaultInfo;
  }

  try {
    const decoded = atob(parts[1]);

    const isOriginal = decoded.includes("original");
    const isAI = decoded.includes("dubbed-auto");
    const isDubbed = decoded.includes("dubbed") || isAI;

    const langMatch = decoded.match(/lang..([-a-zA-Z]+)/);
    const language = langMatch ? langMatch[1].toLowerCase() : null;

    return { isOriginal, language, isDubbed, isAI };
  } catch {
    // If decoding fails, return defaults
    return defaultInfo;
  }
}

// Helper: detect original track using either name translations or base64 id decoding
function isOriginalTrack(track, languageFieldName) {
  if (!track) {
    return false;
  }

  // Check by readable name first (uses UI language)
  if (
    languageFieldName &&
    track[languageFieldName] &&
    track[languageFieldName].name
  ) {
    const trackName = track[languageFieldName].name.toLowerCase();
    for (const originalWord of ORIGINAL_TRANSLATIONS) {
      if (trackName.includes(originalWord.toLowerCase())) {
        return true;
      }
    }
  }

  // Fallback: check by decoding the id
  return getTrackInfo(track).isOriginal;
}

function getLanguageFieldName(tracks) {
  let languageFieldName = null;
  for (const track of tracks) {
    if (!track || typeof track !== "object") {
      continue;
    }

    for (const [fieldName, field] of Object.entries(track)) {
      if (field && typeof field === "object" && field.name) {
        languageFieldName = fieldName;
        break;
      }
    }
    if (languageFieldName) {
      break;
    }
  }
  return languageFieldName;
}

async function untranslateAudioTrack(tracks) {
  const languageFieldName = getLanguageFieldName(tracks);
  if (!languageFieldName) {
    return;
  }

  // Find the current default track
  let currentDefaultTrack = null;
  for (const track of tracks) {
    if (track[languageFieldName].isDefault) {
      currentDefaultTrack = track;
      break;
    }
  }

  // If the current default track is already original, do nothing
  if (
    currentDefaultTrack &&
    isOriginalTrack(currentDefaultTrack, languageFieldName)
  ) {
    return;
  }

  if (
    (await getSettings())?.untranslateAudioOnlyAI &&
    !getTrackInfo(currentDefaultTrack).isAI
  ) {
    // Current track is not AI-dubbed; leave it as is.
    return;
  }

  // Change the default track to the original one
  for (const currentTrack of tracks) {
    if (isOriginalTrack(currentTrack, languageFieldName)) {
      currentTrack[languageFieldName].isDefault = true;
    } else {
      currentTrack[languageFieldName].isDefault = false;
    }
  }
  return tracks;
}

// Intercept Sc.prototype.getAvailableAudioTracks using reflection
(function interceptScGetAvailableAudioTracks() {
  // Find the Sc constructor in the global scope
  for (const key in window) {
    try {
      const candidate = window[key];
      if (
        candidate &&
        typeof candidate === "function" &&
        candidate["prototype"] &&
        typeof candidate["prototype"].getAvailableAudioTracks === "function"
      ) {
        const original = candidate["prototype"].getAvailableAudioTracks;
        if (!original.__isWrapped) {
          candidate["prototype"].getAvailableAudioTracks = function () {
            console.log(
              "[Reflection Intercept] getAvailableAudioTracks called on",
              this,
            );
            console.trace();
            const tracks = original.apply(this, arguments);
            // Optionally call your untranslation logic here
            // untranslateAudioTrack(tracks);
            return tracks;
          };
          candidate["prototype"]["getAvailableAudioTracks"]["__isWrapped"] =
            true;
        }
        break; // Stop after first match
      }
    } catch (e) {}
  }
})();
(function interceptGetAvailableAudioTracks() {
  var player = document.querySelector("#movie_player");
  if (!player) {
    console.warn("Player not found");
    setTimeout(interceptGetAvailableAudioTracks, 1);
    return;
  }

  // Intercept getAvailableAudioTracks() calls from the player object directly
  var getAvailableAudioTracks = player["getAvailableAudioTracks"];
  if (
    player["getAvailableAudioTracks"] &&
    typeof getAvailableAudioTracks === "function" &&
    !getAvailableAudioTracks.__isWrapped
  ) {
    getAvailableAudioTracks.__isWrapped = true;
    player["getAvailableAudioTracks"] = function () {
      console.log("[getAvailableAudioTracks called]");
      console.trace();
      const tracks = getAvailableAudioTracks.apply(player, arguments);

      untranslateAudioTrack(tracks);

      return tracks;
    };
  } else {
    if (getAvailableAudioTracks && getAvailableAudioTracks.__isWrapped) {
      console.warn("getAvailableAudioTracks is already wrapped");
    } else {
      console.warn("getAvailableAudioTracks is not a function");
      setTimeout(interceptGetAvailableAudioTracks, 1);
      return;
    }
  }

  // Also intercept Sc.prototype.getAvailableAudioTracks using reflection
  for (const key in player) {
    try {
      const candidate = player[key];
      if (
        candidate &&
        typeof candidate === "function" &&
        candidate.prototype &&
        typeof candidate.prototype.getAvailableAudioTracks === "function"
      ) {
        const original = candidate.prototype.getAvailableAudioTracks;
        if (!original.__isWrapped) {
          candidate.prototype.getAvailableAudioTracks = function () {
            console.log(
              "[Reflection Intercept] getAvailableAudioTracks called on",
              this,
            );
            console.trace();
            const tracks = original.apply(this, arguments);

            untranslateAudioTrack(tracks);

            return tracks;
          };
          candidate["prototype"]["getAvailableAudioTracks"]["__isWrapped"] =
            true;
        }
        break; // Stop after first match
      }
    } catch {
      // Retry interception later if any error occurs
      setTimeout(interceptGetAvailableAudioTracks, 1);
      return;
    }
  }
})();

(function interceptScAudioTracks() {
  for (const key in window) {
    try {
      const candidate = window[key];
      if (
        candidate &&
        typeof candidate === "function" &&
        candidate.prototype &&
        Object.prototype.hasOwnProperty.call(candidate.prototype, "audioTracks")
      ) {
        // Save original property descriptor if exists
        const desc = Object.getOwnPropertyDescriptor(
          candidate.prototype,
          "audioTracks",
        );
        let _audioTracks = desc && desc.value ? desc.value : undefined;

        Object.defineProperty(candidate.prototype, "audioTracks", {
          configurable: true,
          enumerable: true,
          get: function () {
            console.log("[Intercept] audioTracks GET on", this);
            // Optionally, modify or filter _audioTracks here
            return _audioTracks;
          },
          set: function (val) {
            console.log("[Intercept] audioTracks SET on", this, val);
            // Optionally, modify val before storing
            _audioTracks = val;
          },
        });
        break;
      }
    } catch (e) {}
  }
})();

/**
 * Find player and as soon as found, intercept getAvailableAudioTracks() calls
 */
// (function interceptGetAvailableAudioTracks() {
//   var player = document.querySelector("#movie_player");
//   if (!player) {
//     console.warn("Player not found");
//     setTimeout(interceptGetAvailableAudioTracks, 1);
//     return;
//   }

//   // Intercept getAvailableAudioTracks() calls
//   var getAvailableAudioTracks = player["getAvailableAudioTracks"];
//   if (
//     player["getAvailableAudioTracks"] &&
//     typeof getAvailableAudioTracks === "function" &&
//     !getAvailableAudioTracks.__isWrapped
//   ) {
//     getAvailableAudioTracks.__isWrapped = true;
//     player["getAvailableAudioTracks"] = function () {
//       console.log("[getAvailableAudioTracks called]");
//       console.trace();
//       const tracks = getAvailableAudioTracks.apply(player, arguments);

//       untranslateAudioTrack(tracks);

//       return tracks;
//     };
//   } else {
//     if (getAvailableAudioTracks && getAvailableAudioTracks.__isWrapped) {
//       console.warn("getAvailableAudioTracks is already wrapped");
//     } else {
//       console.warn("getAvailableAudioTracks is not a function");
//       setTimeout(interceptGetAvailableAudioTracks, 1);
//       return;
//     }
//   }
// })();
