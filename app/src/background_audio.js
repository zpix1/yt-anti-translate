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
    if (!track || !track[languageFieldName] || !track[languageFieldName].name) {
      continue;
    }

    const trackName = track[languageFieldName].name.toLowerCase();
    for (const originalWord of ORIGINAL_TRANSLATIONS) {
      if (trackName.includes(originalWord.toLowerCase())) {
        window.YoutubeAntiTranslate.logInfo(
          `setting original audio track as ${trackName} with id ${track.id}`,
        );
        return track;
      }
    }
  }
}

let /** @type {Boolean} */ untranslateAudioTrack_running = false;
async function untranslateAudioTrack() {
  if (untranslateAudioTrack_running) {
    return;
  }
  untranslateAudioTrack_running = true;

  try {
    const player = window.YoutubeAntiTranslate.getFirstVisible(
      document.querySelectorAll(
        window.YoutubeAntiTranslate.getPlayerSelector(),
      ),
    );

    if (!player) {
      untranslateAudioTrack_running = false;
      return;
    }
    const playerResponse = await player.getPlayerResponse();
    const tracks = await player.getAvailableAudioTracks();
    const currentTrack = await player.getAudioTrack();

    if (!playerResponse || !tracks || !currentTrack) {
      untranslateAudioTrack_running = false;
      return;
    }
    const currentVideoId = playerResponse.videoDetails.videoId;
    if (
      !currentVideoId ||
      player.lastUntranslated === `${currentVideoId}+${currentTrack}`
    ) {
      untranslateAudioTrack_running = false;
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
        untranslateAudioTrack_running = false;
        return;
      }
      const isAudioTrackSet = await player.setAudioTrack(originalTrack);
      if (isAudioTrackSet) {
        player.lastUntranslated = `${currentVideoId}+${originalTrack}`;
      }
    }
    untranslateAudioTrack_running = false;
  } catch {
    untranslateAudioTrack_running = false;
  }
}

// --- Mutation conditional processor ---
async function untranslate(/** @type {MutationRecord[]} */ mutationList) {
  for (const mutationRecord of mutationList) {
    if (mutationRecord.type !== "childList") {
      continue;
    }

    for (const addedNode of mutationRecord.addedNodes) {
      if (!window.YoutubeAntiTranslate.castNodeToElementOrNull(addedNode)) {
        continue;
      }
      const /** @type {Element} */ addedElement = addedNode;

      if (!window.YoutubeAntiTranslate.isVisible(addedElement)) {
        continue;
      }

      // Checks on mutation added nodes
      if (
        addedElement.matches(window.YoutubeAntiTranslate.getPlayerSelector())
      ) {
        await window.YoutubeAntiTranslate.waitForPlayerReady();
        await untranslateAudioTrack();
        break;
      }

      // Checks on mutation closest added nodes
      if (
        addedElement.closest(window.YoutubeAntiTranslate.getPlayerSelector())
      ) {
        await window.YoutubeAntiTranslate.waitForPlayerReady();
        await untranslateAudioTrack();
        break;
      }

      // Search inside added nodes for matching elements
      if (
        window.YoutubeAntiTranslate.getFirstVisible(
          addedElement.querySelectorAll(
            window.YoutubeAntiTranslate.getPlayerSelector(),
          ),
        )
      ) {
        await window.YoutubeAntiTranslate.waitForPlayerReady();
        await untranslateAudioTrack();
        break;
      }
    }

    // if (
    //   !mutationRecord.target ||
    //   !window.YoutubeAntiTranslate.castNodeToElementOrNull(
    //     mutationRecord.target,
    //   )
    // ) {
    //   continue;
    // }

    // const /** @type {Element} */ element = mutationRecord.target;

    // if (!window.YoutubeAntiTranslate.isVisible(element)) {
    //   continue;
    // }

    // // Checks on mutation target
    // if (element.matches(window.YoutubeAntiTranslate.getPlayerSelector())) {
    //   await window.YoutubeAntiTranslate.waitForPlayerReady();
    //   await untranslateAudioTrack();
    //   break;
    // }

    // // Checks on mutation closest target
    // if (element.closest(window.YoutubeAntiTranslate.getPlayerSelector())) {
    //   await window.YoutubeAntiTranslate.waitForPlayerReady();
    //   await untranslateAudioTrack();
    //   break;
    // }

    // On mutationRecord.target we never search inside as that is too broad
  }
}

// Initialize the extension
const target = document.body;
const config = { childList: true, subtree: true };
const observer = new MutationObserver(untranslate);
observer.observe(target, config);
