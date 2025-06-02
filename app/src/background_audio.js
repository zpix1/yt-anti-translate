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

function getOriginalTrack(tracks) {
  if (!tracks || !Array.isArray(tracks)) {
    return null;
  }

  let languageFieldName = null;
  for (const track of tracks) {
    if (!track || typeof track !== "object") continue;

    for (const [fieldName, field] of Object.entries(track)) {
      if (field && typeof field === "object" && field.name) {
        languageFieldName = fieldName;
        break;
      }
    }
    if (languageFieldName) break;
  }

  if (!languageFieldName) {
    return;
  }

  let longestTrackNameTrack = null;
  let longestTrackNameCharLength = 0;
  for (const track of tracks) {
    if (!track || !track[languageFieldName] || !track[languageFieldName].name)
      continue;

    const trackName = track[languageFieldName].name.toLowerCase();
    if (trackName.length > longestTrackNameCharLength) {
      longestTrackNameCharLength = trackName.length
      longestTrackNameTrack = track;
    }

    for (const originalWord of ORIGINAL_TRANSLATIONS) {
      if (trackName.includes(originalWord.toLowerCase())) {
        console.log(`${window.YoutubeAntiTranslate.LOG_PREFIX}: setting original audio track as ${trackName} with id ${track.id}`)
        return track;
      }
    }
  }

  if (longestTrackNameTrack) {
    // Pick the longest track name as backup if ORIGINAL_TRANSLATIONS failed
    console.log(`${window.YoutubeAntiTranslate.LOG_PREFIX}: setting longest-name audio track as ${longestTrackNameTrack[languageFieldName].name}${trackName} with id ${track.id}`)
    return longestTrackNameTrack
  }
}

async function untranslateAudioTrack() {
  const player = window.YoutubeAntiTranslate.getFirstVisible(document.querySelectorAll(window.YoutubeAntiTranslate.getPlayerSelector()));

  if (!player) {
    return;
  }
  const playerResponse = await player.getPlayerResponse();
  const tracks = await player.getAvailableAudioTracks();
  const currentTrack = await player.getAudioTrack();

  if (
    !playerResponse
    || !tracks
    || !currentTrack
  ) {
    return;
  }
  const currentVideoId = playerResponse.videoDetails.videoId;
  if (
    !currentVideoId
    || player.lastUntranslated === `${currentVideoId}+${currentTrack}`
  ) {
    return;
  }

  const originalTrack = getOriginalTrack(tracks);

  if (originalTrack) {
    // skip set if we alerady have the right track
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
  if (mutationIdx % MUTATION_UPDATE_STEP == 0) {
    await untranslateAudioTrack();
  }
  mutationIdx++;
}

// Initialize the extension
const target = document.body;
const config = { childList: true, subtree: true };
const observer = new MutationObserver(untranslate);
observer.observe(target, config);