const LOG_PREFIX = "[YoutubeAntiTranslate]";
const ORIGINAL_TRANSLATIONS = [
  "original", // English
  "оригинал", // Russian
  "オリジナル", // Japanese
  "原始", // Chinese
  "원본", // Korean
  "origineel", // Dutch
  "original", // Spanish/Portuguese
  "originale", // Italian/French
  "original", // German
  "oryginał", // Polish
  "původní", // Czech
  "αρχικό", // Greek
  "orijinal", // Turkish
  "原創", // Traditional Chinese
  "gốc", // Vietnamese
  "asli", // Indonesian
  "מקורי", // Hebrew
  "أصلي", // Arabic
];

/**
 * Given an Array of HTMLElements it returns visible HTMLElement or null
 * @param {Node|NodeList} elem 
 * @returns {Node | null}
 */
const YoutubeAntiTranslate_getFirstVisible = function (nodes) {
  if (!nodes) {
    return null;
  }
  else if (!(nodes instanceof NodeList)) {
    nodes = [nodes];
  } else {
    nodes = Array.from(nodes);
  }

  for (const node of nodes) {
    let style;
    let /** @type {Element} */ element
    if (node.nodeType === Node.ELEMENT_NODE) {
      element = /** @type {Element} */ (node);
    }
    else {
      console.error(
        `${LOG_PREFIX} elem is not an Element or a Node`,
        window.location.href
      );
      return null;
    }

    style = getComputedStyle(element);

    if (
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    ) {
      return node;
    }
  }

  return null;
}

const PLAYER_SELECTOR = window.location.pathname.startsWith("/shorts")
  ? "#shorts-player"
  : "ytd-player .html5-video-player";
let mutationIdx = 0;
const MUTATION_UPDATE_STEP = 2;

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

  for (const track of tracks) {
    if (!track || !track[languageFieldName] || !track[languageFieldName].name)
      continue;

    const trackName = track[languageFieldName].name.toLowerCase();
    for (const originalWord of ORIGINAL_TRANSLATIONS) {
      if (trackName.includes(originalWord.toLowerCase())) {
        return track;
      }
    }
  }
}

async function untranslateAudioTrack() {
  const player = YoutubeAntiTranslate_getFirstVisible(document.querySelectorAll(PLAYER_SELECTOR));
  if (!player || !player.getAvailableAudioTracks() || player.audioUntranslated) {
    return;
  }

  const tracks = player.getAvailableAudioTracks();

  const originalTrack = getOriginalTrack(tracks);

  if (originalTrack) {
    let temp = await player.setAudioTrack(originalTrack);
    if (temp) {
      player.audioUntranslated = true;
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
