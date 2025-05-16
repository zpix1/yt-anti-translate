// Reusablee **const** for scripts should be declared here to avoid redeclaration of alredy existing constants
// This **const** are accessible from all content script and also injected into the bage for use from injected scripts
const LOG_PREFIX = "[YoutubeAntiTranslate]";
const CORE_ATTRIBUTED_STRING_SELECTOR = ".yt-core-attributed-string";
const PLAYER_SELECTOR = window.location.pathname.startsWith("/shorts")
  ? "#shorts-player"
  : "ytd-player .html5-video-player";
const cache = new Map();

/**
 * Given an Array of HTMLElements it returns visible HTMLElement or null
 * @param {Node|NodeList} elem 
 * @returns {Node|null}
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

/**
 * Given an Array of HTMLElements it returns visible HTMLElement or null
 * @param {Node|NodeList} elem 
 * @returns {Array<Node>|null}
 */
const YoutubeAntiTranslate_getAllVisibleNodes = function (nodes) {
  if (!nodes) {
    return null;
  }
  else if (!(nodes instanceof NodeList)) {
    nodes = [nodes];
  } else {
    nodes = Array.from(nodes);
  }

  let /** @type {Array<Node>} */ visibleNodes = null;

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
      continue;
    }

    style = getComputedStyle(element);

    if (
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    ) {
      if (visibleNodes) {
        visibleNodes.push(node);
      }
      else {
        visibleNodes = [node];
      }
    }
  }

  return visibleNodes;
}