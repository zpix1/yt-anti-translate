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

let mutationIdx = 0;
const MUTATION_UPDATE_STEP = 5;

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

function getOriginalTrack(tracks) {
  if (!tracks || !Array.isArray(tracks)) {
    return null;
  }

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

  if (!languageFieldName) {
    return;
  }

  for (const track of tracks) {
    if (isOriginalTrack(track, languageFieldName)) {
      window.YoutubeAntiTranslate.logInfo(
        `setting original audio track with id ${track.id}`,
      );
      return track;
    }
  }
  window.YoutubeAntiTranslate.logError(`
    The language you set YouTube to is not yet supported by YoutubeAntiTranslate. 
    Please reach out to its authors on GitHub. Listing all audio tracks: ${tracks}
  `);
}

async function untranslateAudioTrack() {
  const player = window.YoutubeAntiTranslate.getFirstVisible(
    document.querySelectorAll(window.YoutubeAntiTranslate.getPlayerSelector()),
  );

  if (!player) {
    return;
  }
  const playerResponse = await player.getPlayerResponse();
  const tracks = await player.getAvailableAudioTracks();
  const currentTrack = await player.getAudioTrack();

  if (!playerResponse || !tracks || !currentTrack) {
    return;
  }

  // Respect user preference: only untranslate AI-generated dubbed audio when the option is enabled
  if (
    window.YoutubeAntiTranslate?.getSettings()?.untranslateAudioOnlyAI &&
    !getTrackInfo(currentTrack).isAI
  ) {
    // Current track is not AI-dubbed; leave it as is.
    return;
  }

  const currentVideoId = playerResponse.videoDetails.videoId;
  if (
    !currentVideoId ||
    player.lastUntranslated === `${currentVideoId}+${currentTrack}`
  ) {
    return;
  }

  const originalTrack = getOriginalTrack(tracks);

  // Respect user's manual audio language choice
  if (originalTrack) {
    // skip set if we already have the right track
    if (`${originalTrack}` === `${currentTrack}`) {
      if (player.lastUntranslated !== `${currentVideoId}+${currentTrack}`) {
        // video id changed so still update the value
        player.lastUntranslated = `${currentVideoId}+${originalTrack}`;
      }
      return;
    }
    const isAudioTrackSet = await player.setAudioTrack(originalTrack);
    if (isAudioTrackSet) {
      player.lastUntranslated = `${currentVideoId}+${originalTrack}`;
    }
  }
}

async function untranslate() {
  if (mutationIdx % MUTATION_UPDATE_STEP === 0) {
    await untranslateAudioTrack();
  }
  mutationIdx++;
}

// Initialize the extension
const target = document.body;
const config = { childList: true, subtree: true };
const observer = new MutationObserver(untranslate);
observer.observe(target, config);
