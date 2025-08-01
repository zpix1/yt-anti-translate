const pendingRequests = new Map();

class SessionLRUCache {
  /**
   * @param {object} [opts]
   * @param {number} [opts.maxBytes=5*1024*1024]  Storage budget
   * @param {string} [opts.ns='slru:']             Key prefix / namespace
   */
  constructor({
    maxBytes = 5 * 1024 * 1024,
    ns = "[YoutubeAntiTranslate]cache:",
  } = {}) {
    this.maxBytes = maxBytes;
    this.ns = ns;
  }

  /* ---------- Public API ---------- */

  /** Store or update an item */
  set(key, value) {
    const entryKey = this.ns + key;
    const entry = { v: value, t: Date.now() }; // v = value, t = last‑touch
    sessionStorage.setItem(entryKey, JSON.stringify(entry));
    this._evictIfNeeded();
  }

  /** Retrieve an item (or undefined) and refresh its LRU timestamp */
  get(key) {
    const entryKey = this.ns + key;
    const raw = sessionStorage.getItem(entryKey);
    if (!raw) {
      return undefined;
    }

    try {
      const entry = JSON.parse(raw);
      entry.t = Date.now(); // touch
      sessionStorage.setItem(entryKey, JSON.stringify(entry));
      return entry.v;
    } catch {
      // corrupted entry – remove it
      sessionStorage.removeItem(entryKey);
      return undefined;
    }
  }

  /** Remove one item */
  delete(key) {
    sessionStorage.removeItem(this.ns + key);
  }

  /** Empty the whole cache (namespace only) */
  clear() {
    this._eachEntry(({ k }) => sessionStorage.removeItem(k));
  }

  /** Approximate bytes used by this cache */
  bytes() {
    let total = 0;
    this._eachEntry(({ k, v }) => {
      total += (k.length + v.length) * 2;
    });
    return total;
  }

  /** How many entries in the cache */
  size() {
    let n = 0;
    this._eachEntry(() => {
      n += 1;
    });
    return n;
  }

  /* ---------- Internal helpers ---------- */

  /** Iterate over *only* our namespaced entries */
  _eachEntry(cb) {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(this.ns)) {
        cb({ k, v: sessionStorage.getItem(k) });
      }
    }
  }

  /** Remove LRU items until under budget */
  _evictIfNeeded() {
    let usage = this.bytes();
    if (usage <= this.maxBytes) {
      return;
    }

    // Collect [{k, bytes, lastTouched}]
    const items = [];
    this._eachEntry(({ k, v }) => {
      const { t } = JSON.parse(v || "{}");
      const bytes = (k.length + v.length) * 2;
      items.push({ k, bytes, t: t ?? 0 });
    });

    // Oldest first
    items.sort((a, b) => a.t - b.t);

    for (const item of items) {
      sessionStorage.removeItem(item.k);
      usage -= item.bytes;
      if (usage <= this.maxBytes) {
        break;
      }
    }
  }
}

const lruCache = new SessionLRUCache();

window.YoutubeAntiTranslate = {
  VIEWPORT_EXTENSION_PERCENTAGE_FRACTION: 0.5,
  VIEWPORT_OUTSIDE_LIMIT_FRACTION: 0.5,
  LOG_PREFIX: "[YoutubeAntiTranslate]",
  LOG_LEVELS: {
    NONE: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4,
  },
  currentLogLevel: 2, // Default to WARN

  /**
   * Sets the current log level.
   * @param {string} levelName - The name of the log level (e.g., "INFO", "DEBUG").
   */
  setLogLevel: function (levelName) {
    const newLevel = this.LOG_LEVELS[levelName.toUpperCase()];
    if (typeof newLevel === "number") {
      this.currentLogLevel = newLevel;
      this.logDebug(
        `Log level set to ${levelName.toUpperCase()} (${newLevel})`,
      );
    } else {
      this.logWarning(`Invalid log level: ${levelName}`);
    }
  },

  CORE_ATTRIBUTED_STRING_SELECTOR: ".yt-core-attributed-string",
  ALL_ARRAYS_VIDEOS_SELECTOR: `ytd-video-renderer,
ytd-rich-item-renderer,
ytd-compact-video-renderer,
ytd-grid-video-renderer,
ytd-playlist-video-renderer,
ytd-playlist-panel-video-renderer,
yt-lockup-view-model,
ytm-compact-video-renderer,
ytm-rich-item-renderer,
ytm-video-with-context-renderer,
ytm-video-card-renderer,
ytm-media-item,
ytm-playlist-video-renderer`,
  ALL_ARRAYS_SHORTS_SELECTOR: `div.style-scope.ytd-rich-item-renderer,
ytm-shorts-lockup-view-model`,

  logWarning: function (...args) {
    if (this.currentLogLevel >= this.LOG_LEVELS.WARN) {
      console.log(`${this.LOG_PREFIX} [WARN ]`, ...args);
    }
  },

  logInfo: function (...args) {
    if (this.currentLogLevel >= this.LOG_LEVELS.INFO) {
      console.log(`${this.LOG_PREFIX} [INFO ]`, ...args);
    }
  },

  /** Use only for app errors */
  logError: function (...args) {
    if (this.currentLogLevel >= this.LOG_LEVELS.ERROR) {
      console.error(`${this.LOG_PREFIX} [ERROR]`, ...args);
    }
  },

  logDebug: function (...args) {
    if (this.currentLogLevel >= this.LOG_LEVELS.DEBUG) {
      console.debug(`${this.LOG_PREFIX} [DEBUG]`, ...args);
    }
  },

  /**
   * Creates a debounced version of a function that will be executed at most once
   * during the given wait interval. The wrapped function is invoked immediately
   * on the first call and then suppressed for the remainder of the interval so
   * that the real function runs **no more than once every `waitMinMs` milliseconds**.
   *
   * Uses `requestAnimationFrame` to align with the browser's repaint cycle.
   *
   * @param {Function} func - The function to debounce/throttle.
   * @param {number} waitMinMs - The minimum time between invocations in milliseconds.
   * @returns {Function} A debounced function.
   */
  debounce: function (func, wait = 30) {
    let isScheduled = false;
    let lastExecTime = 0;

    function tick(time, context, args) {
      if (!isScheduled) {
        return;
      }

      const elapsed = time - lastExecTime;

      if (elapsed >= wait) {
        func.apply(context, args);
        lastExecTime = time;
        isScheduled = false; // allow next schedule
      } else {
        requestAnimationFrame((t) => tick(t, context, args));
      }
    }

    return function (...args) {
      if (!isScheduled) {
        isScheduled = true;
        requestAnimationFrame((time) => {
          if (lastExecTime === 0) {
            // first invocation: run immediately
            func.apply(this, args);
            lastExecTime = time;
            isScheduled = false;
          } else {
            tick(time, this, args);
          }
        });
      }
    };
  },

  /**
   * Retrieves a deserialized object from session storage.
   * @param {string} key
   * @return {any|null}
   */
  getSessionCache: function (key) {
    return lruCache.get(key);
  },

  /**
   * Stores a value in session storage after serializing
   * @param {string} key
   * @param {any} value
   */
  setSessionCache: function (key, value) {
    return lruCache.set(key, value);
  },

  /**
   * @returns {string}
   */
  getPlayerSelector: function () {
    if (window.location.hostname === "m.youtube.com") {
      return "#player-container-id";
    }
    if (window.location.pathname.startsWith("/embed")) {
      return "#movie_player";
    }
    const selector = window.location.pathname.startsWith("/shorts")
      ? "#shorts-player"
      : "ytd-player .html5-video-player";
    return selector;
  },

  /**
   * @returns {string}
   */
  getBrowserOrChrome: function () {
    const result = typeof browser !== "undefined" ? browser : chrome;
    return result;
  },

  /**
   * @returns {bool}
   */
  isFirefoxBasedBrowser: function () {
    const result =
      typeof browser !== "undefined" &&
      typeof browser.runtime !== "undefined" &&
      typeof browser.runtime.getBrowserInfo === "function";
    return result;
  },

  // Detects if we are currently on the mobile YouTube site (m.youtube.com)
  isMobile: function () {
    const result = window.location.hostname === "m.youtube.com";
    return result;
  },

  /**
   * Normalize spaces in a string so that there are no more than 1 space between words
   * @param {string} str
   * @returns
   */
  normalizeSpaces: function (str) {
    const result = str.replace(/\s+/g, " ").trim();
    return result;
  },

  /**
   * Processes a string with normalization and trimming options.
   * @param {string} str - The string to process.
   * @param {object} [options] - Configuration options for processing.
   * @param {boolean} [options.ignoreCase=true] - If true, converts to lowercase. Default true
   * @param {boolean} [options.normalizeSpaces=true] - If true, replaces consecutive whitespace with a single space. Default true
   * @param {boolean} [options.normalizeNFKC=true] - If true, applies Unicode Normalization Form Compatibility Composition (NFKC). Default true
   * @param {boolean} [options.ignoreEmojis=true] - If true, replaces emojis with spaces. Default true
   * @param {boolean} [options.trim=true] - If true, trims both leading and trailing whitespace. Default true
   * @param {boolean} [options.trimLeft=false] - If true, trims leading whitespace. Ignored if `trim` is true. Default false
   * @param {boolean} [options.trimRight=false] - If true, trims trailing whitespace. Ignored if `trim` is true. Default false
   * @returns {string} The processed string.
   */
  processString: function (str, options = {}) {
    const {
      ignoreCase = true,
      normalizeSpaces = true,
      normalizeNFKC = true,
      ignoreEmojis = true,
      trim = true,
      trimLeft = false,
      trimRight = false,
    } = options;

    if (!str) {
      return str;
    }

    if (normalizeNFKC) {
      str = str.normalize("NFKC");
    }

    if (ignoreEmojis) {
      // Replace emojis with spaces (covers most emoji ranges)
      // Use Unicode property escapes for emojis (requires ES2018+)
      str = str.replace(/\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu, " ");
    }

    if (normalizeSpaces) {
      str = str.replace(/\s+/g, " ");
    }

    if (trim) {
      str = str.trim();
    } else {
      if (trimLeft) {
        str = str.trimStart();
      }
      if (trimRight) {
        str = str.trimEnd();
      }
    }

    if (ignoreCase) {
      str = str.toLowerCase();
    }

    return str;
  },

  /**
   * Advanced string equality comparison with optional normalization and trimming.
   * @param {string} str1 - First string to compare.
   * @param {string} str2 - Second string to compare.
   * @param {object} [options] - Configuration options for comparison.
   * @param {boolean} [options.ignoreCase=true] - If true, comparison is case-insensitive. Default true
   * @param {boolean} [options.normalizeSpaces=true] - If true, replaces consecutive whitespace with a single space. Default true
   * @param {boolean} [options.normalizeNFKC=true] - If true, applies Unicode Normalization Form Compatibility Composition (NFKC). Default true
   * @param {boolean} [options.trim=true] - If true, trims both leading and trailing whitespace. Default true
   * @param {boolean} [options.trimLeft=false] - If true, trims leading whitespace. Ignored if `trim` is true. Default false
   * @param {boolean} [options.trimRight=false] - If true, trims trailing whitespace. Ignored if `trim` is true. Default false
   * @returns {boolean} Whether the two processed strings are equal.
   */
  isStringEqual: function (str1, str2, options = {}) {
    return (
      this.processString(str1, options) === this.processString(str2, options)
    );
  },

  /**
   * Advanced string includes check with optional normalization and trimming.
   * @param {string} container - The string to check in.
   * @param {string} substring - The string to look for.
   * @param {object} [options] - Configuration options for comparison.
   * @param {boolean} [options.ignoreCase=true] - If true, comparison is case-insensitive. Default true
   * @param {boolean} [options.normalizeSpaces=true] - If true, replaces consecutive whitespace with a single space. Default true
   * @param {boolean} [options.normalizeNFKC=true] - If true, applies Unicode Normalization Form Compatibility Composition (NFKC). Default true
   * @param {boolean} [options.trim=true] - If true, trims both leading and trailing whitespace. Default true
   * @param {boolean} [options.trimLeft=false] - If true, trims leading whitespace. Ignored if `trim` is true. Default false
   * @param {boolean} [options.trimRight=false] - If true, trims trailing whitespace. Ignored if `trim` is true. Default false
   * @returns {boolean} Whether the processed container includes the processed substring.
   */
  doesStringInclude: function (container, substring, options = {}) {
    return this.processString(container, options).includes(
      this.processString(substring, options),
    );
  },

  /**
   * Advanced string replace with optional normalization and trimming.
   * @param {string} input - The original string to operate on.
   * @param {string|RegExp} pattern - The pattern to replace. If a string, treated as a literal substring.
   * @param {string} replacement - The replacement string.
   * @param {object} [options] - Configuration options.
   * @param {boolean} [options.ignoreCase=true] - If true, performs case-insensitive replacement. Default true
   * @param {boolean} [options.normalizeSpaces=true] - If true, replaces all whitespace sequences with a single space before matching. Default true
   * @param {boolean} [options.normalizeNFKC=true] - If true, applies Unicode Normalization Form Compatibility Composition (NFKC). Default true
   * @param {boolean} [options.trim=true] - If true, trims leading and trailing whitespace before processing. Default true
   * @param {boolean} [options.trimLeft=false] - If true, trims leading whitespace (ignored if `trim` is true). Default false
   * @param {boolean} [options.trimRight=false] - If true, trims trailing whitespace (ignored if `trim` is true). Default false
   * @returns {string} The resulting string after replacement.
   */
  stringReplaceWithOptions: function (
    input,
    pattern,
    replacement,
    options = {},
  ) {
    const { ignoreCase = true } = options;

    // Create options without ignoreCase for preprocessing (since it's handled separately)
    const preprocessOptions = { ...options, ignoreCase: false };

    const processedInput = this.processString(input, preprocessOptions);
    if (!processedInput || replacement === null || replacement === undefined) {
      return processedInput;
    }

    /*
      Replace a substring, possibly case insensitive
      - when case sensitive:
          the same as str.replace(oldString, newString);
      - when case insensitive:
          the regex magic is for replacing oldString's characters in any case (lower/upper)
    */
    let regex;
    if (typeof pattern === "string") {
      const processedPattern = this.processString(pattern, preprocessOptions);
      // Prepend any characters with special meaning in regex with a \
      // avoiding unintended matches
      const escapedPattern = processedPattern.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      regex = new RegExp(escapedPattern, ignoreCase ? "gi" : "g");
    } else if (pattern instanceof RegExp) {
      const flags = pattern.flags.replace(/i?/, ignoreCase ? "i" : "");
      regex = new RegExp(pattern.source, flags);
    } else {
      throw new TypeError("pattern must be a string or RegExp");
    }

    return processedInput.replace(regex, replacement);
  },

  /**
   * Given a Node it uses computed style to determine if it is visible
   * @param {Node} node - A Node of type ELEMENT_NODE
   * @param {boolean} shouldCheckViewport - Optional. If true the element position is checked to be inside or outside the viewport. Viewport is extended based on
   *                                        VIEWPORT_EXTENSION_PERCENTAGE_FRACTION. Defaults true
   * @param {boolean} onlyOutsideViewport - Optional. only relevant when `shouldCheckViewport` is true. When this is also true the element is returned only if fully outside
   *                                        the viewport. By default the element is returned only if inside the viewport. Defaults false
   * @param {boolean} useOutsideLimit - Optional. when true, outside elements are limited to those contained inside the frame between the extended viewport and the
   *                                    limit based on VIEWPORT_OUTSIDE_LIMIT_FRACTION. Defaults false
   * @return {boolean} - true if the node is computed as visible
   */
  isVisible: function (
    node,
    shouldCheckViewport = true,
    onlyOutsideViewport = false,
    useOutsideLimit = false,
  ) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      this.logError(
        `Provided node is not a valid Element.`,
        window.location.href,
      );
      return false;
    }

    const element = /** @type {Element} */ (node);
    const style = getComputedStyle(element);

    // If computed style of element is invisible return false
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse" ||
      parseFloat(style.opacity) === 0
    ) {
      return false;
    }

    if (shouldCheckViewport) {
      // Get element position relative to the viewport
      const rect = element.getBoundingClientRect();
      // Get viewport extended by VIEWPORT_EXTENSION_PERCENTAGE_FRACTION to allow some 'preload'
      const extendedHeight =
        window.innerHeight * this.VIEWPORT_EXTENSION_PERCENTAGE_FRACTION;
      const extendedWidth =
        window.innerWidth * this.VIEWPORT_EXTENSION_PERCENTAGE_FRACTION;

      const topBoundary = -extendedHeight;
      const bottomBoundary = window.innerHeight + extendedHeight;
      const leftBoundary = -extendedWidth;
      const rightBoundary = window.innerWidth + extendedWidth;

      if (onlyOutsideViewport) {
        // Return true if ALL part of the element is OUTSIDE the extended viewport
        const fullyOutside =
          rect.top > bottomBoundary ||
          rect.bottom < topBoundary ||
          rect.left > rightBoundary ||
          rect.right < leftBoundary;

        if (!useOutsideLimit) {
          return fullyOutside;
        }

        // Further extend the extended viewport by VIEWPORT_OUTSIDE_LIMIT_FRACTION to set the maximum outside limit
        // Use 500px as the minimum extension, as some element such as shorts are quite big
        const extraHeight = Math.max(
          window.innerHeight * this.VIEWPORT_OUTSIDE_LIMIT_FRACTION,
          500,
        );
        const extraWidth = Math.max(
          window.innerWidth * this.VIEWPORT_OUTSIDE_LIMIT_FRACTION,
          500,
        );

        const outerTopBoundary = topBoundary - extraHeight;
        const outerBottomBoundary = bottomBoundary + extraHeight;
        const outerLeftBoundary = leftBoundary - extraWidth;
        const outerRightBoundary = rightBoundary + extraWidth;

        // Check if ANY part of the element is within the outer limit extended viewport
        const intersectsOuterLimitViewport =
          rect.top <= outerBottomBoundary &&
          rect.bottom >= outerTopBoundary &&
          rect.left <= outerRightBoundary &&
          rect.right >= outerLeftBoundary;

        const result = fullyOutside && intersectsOuterLimitViewport;
        return result;
      } else {
        // Return true if ANY part of the element is INSIDE the extended viewport
        const intersectsExtendedViewport =
          rect.top <= bottomBoundary &&
          rect.bottom >= topBoundary &&
          rect.left <= rightBoundary &&
          rect.right >= leftBoundary;

        return intersectsExtendedViewport;
      }
    }
    return true;
  },

  /**
   * Given an Array of HTMLElements it returns visible HTMLElement or null
   * @param {Node|NodeList} nodes - A NodeList or single Node of type ELEMENT_NODE
   * @param {boolean} shouldBeInsideViewport - Optional. If true the element should also be inside the viewport to be considered visible. Defaults true
   * @returns {Node|null} - The first visible Node or null
   */
  getFirstVisible: function (nodes, shouldBeInsideViewport = true) {
    if (!nodes) {
      return null;
    }

    if (nodes instanceof Node) {
      nodes = [nodes];
    } else {
      nodes = Array.from(nodes);
    }

    for (const node of nodes) {
      if (this.isVisible(node, shouldBeInsideViewport, false, false)) {
        return node;
      }
    }

    return null;
  },

  /**
   * Given an Array of HTMLElements it returns visible HTMLElement or null
   * @param {Node|NodeList} nodes - A NodeList or single Node of type ELEMENT_NODE
   * @param {boolean} shouldBeInsideViewport - Optional. If true the element should also be inside the viewport to be considered visible. Defaults true
   * @param {Number} lengthLimit - Optional. Limit the number of items in the array. As soon as the correspoinding array length is reached,
   *                               the array is returned prematurelly. Defaults to Number.MAX_VALUE
   * @returns {Array<Node>|null} - A array of all the visible nodes or null
   */
  getAllVisibleNodes: function (
    nodes,
    shouldBeInsideViewport = true,
    lengthLimit = Number.MAX_VALUE,
  ) {
    if (!nodes) {
      return null;
    }

    if (nodes instanceof Node) {
      nodes = [nodes];
    } else {
      nodes = Array.from(nodes);
    }

    let visibleNodes = null;

    for (const node of nodes) {
      if (this.isVisible(node, shouldBeInsideViewport, false, false)) {
        if (visibleNodes) {
          visibleNodes.push(node);
        } else {
          visibleNodes = [node];
        }

        if (visibleNodes.length === lengthLimit) {
          break;
        }
      }
    }

    return visibleNodes;
  },

  /**
   * Given an Array of HTMLElements it returns visible HTMLElement or null only if they are loaded outside the viewport
   * @param {Node|NodeList} nodes - A NodeList or single Node of type ELEMENT_NODE
   * @param {boolean} useOutsideLimit - Optional. when true, outside elements are limited to those contained inside the frame between
   *                                    the extended viewport and the limit based on VIEWPORT_OUTSIDE_LIMIT_FRACTION. Defaults false
   * @returns {Array<Node>|null} - A array of all the visible nodes or null that are outside the viewport
   */
  getAllVisibleNodesOutsideViewport: function (nodes, useOutsideLimit = false) {
    if (!nodes) {
      return null;
    }

    if (nodes instanceof Node) {
      nodes = [nodes];
    } else {
      nodes = Array.from(nodes);
    }

    let visibleNodes = null;

    for (const node of nodes) {
      if (this.isVisible(node, true, true, useOutsideLimit)) {
        if (visibleNodes) {
          visibleNodes.push(node);
        } else {
          visibleNodes = [node];
        }
      }
    }

    return visibleNodes;
  },

  /**
   * Creates a link element with proper YouTube styling
   * @param {string} url - URL to create a link for
   * @returns {HTMLElement} - Anchor element
   */
  createLinkElement: function (url) {
    this.logDebug(`createLinkElement called for URL: ${url}`);
    const link = document.createElement("a");
    link.href = url;
    link.textContent = url;
    link.rel = "nofollow";
    link.target = "_blank";
    link.dir = "auto";
    link.className = "yt-simple-endpoint style-scope yt-formatted-string";
    this.logDebug(`createLinkElement: created link element`);
    return link;
  },

  /**
   * Converts a timecode string to seconds
   * @param {string} timecode - Timecode in format HH:MM:SS or MM:SS
   * @returns {number} - Total seconds
   */
  convertTimecodeToSeconds: function (timecode) {
    this.logDebug(`convertTimecodeToSeconds called with: ${timecode}`);
    const parts = timecode.split(":").map(Number);

    let result = 0;
    if (parts.length === 2) {
      // Format: MM:SS
      result = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // Format: HH:MM:SS
      result = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    this.logDebug(
      `convertTimecodeToSeconds: converted ${timecode} to ${result} seconds`,
    );
    return result;
  },

  /**
   * Strips all query params except "v" from "/watch" URL to:
   *  - avoid 404 when passed to YT oembed API (see https://github.com/zpix1/yt-anti-translate/issues/45)
   *  - improve cache lookups (different "t" params don't mean different vids, "v" is the only important one)
   * @param {string} url "/watch?app=desktop&v=ghuLDyUEZmY&t=472s" or https://www.youtube.com/watch?app=desktop&v=ghuLDyUEZmY&t=472s)
   * @returns {string} "/watch?v=ghuLDyUEZmY" or "https://www.youtube.com/watch?v=ghuLDyUEZmY"
   */
  stripNonEssentialParams: function (url) {
    //shorts URLs don't have search parameters afaik, so don't call this on shorts only
    //this return is here for background.js/createOrUpdateUntranslatedFakeNode, which is called for everything
    if (!url.includes("/watch?")) {
      return url;
    }
    const searchParamsText = url.split("?")[1];
    const searchParams = new URLSearchParams(searchParamsText);
    const videoId = searchParams.get("v");
    return `${url.split("?")[0]}?v=${videoId}`;
  },

  /**
   * Identify if the href is advertisement
   * @param {string} href - the href to check
   * @returns {boolean} - true if href is recognized as advertisement
   */
  isAdvertisementHref(href) {
    if (href.includes("www.googleadservices.com")) {
      return true;
    }
    return false;
  },

  /**
   * Gets the current video ID from the URL
   * @returns {string} - The YouTube video ID
   */
  getCurrentVideoId: function () {
    this.logDebug(`getCurrentVideoId called`);
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get("v") || "";
    this.logDebug(`getCurrentVideoId: found video ID: ${videoId}`);
    return videoId;
  },

  /**
   * Creates a timecode link element with proper YouTube styling
   * @param {string} timecode - Timecode string (e.g., "05:36")
   * @returns {HTMLElement} - Span element containing the timecode link
   */
  createTimecodeLink: function (timecode) {
    this.logDebug(`createTimecodeLink called with: ${timecode}`);
    // Convert timecode to seconds for the URL
    const seconds = this.convertTimecodeToSeconds(timecode);

    // Create the container span
    const span = document.createElement("span");
    span.className = "yt-core-attributed-string--link-inherit-color";
    span.dir = "auto";
    span.style.color = "rgb(62, 166, 255)";

    // Create the anchor element
    const link = document.createElement("a");
    link.className =
      "yt-core-attributed-string__link yt-core-attributed-string__link--call-to-action-color yt-timecode-link";
    link.tabIndex = "0";
    link.href = `/watch?v=${this.getCurrentVideoId()}&t=${seconds}s`;
    link.target = "";
    link.setAttribute("force-new-state", "true");
    link.setAttribute("data-seconds", seconds.toString());
    link.textContent = timecode;

    span.appendChild(link);
    return span;
  },

  /**
   * Converts URLs and timecodes in text to clickable links
   * @param {string} text - Text that may contain URLs and timecodes
   * @returns {HTMLElement} - Span element with clickable links
   */
  convertUrlsToLinks: function (text) {
    this.logDebug(`convertUrlsToLinks called with text length: ${text.length}`);
    const container = document.createElement("span");
    // Group 1: URL (https?:\/\/[^\s]+)
    // Group 2: Full timecode match including preceding space/start of line `(?:^|\s)((?:\d{1,2}:)?\d{1,2}:\d{2})`
    // Group 3: The actual timecode `(\d{1,2}:)?\d{1,2}:\d{2}`
    const combinedPattern =
      /(https?:\/\/[^\s]+)|((?:^|\s)((?:\d{1,2}:)?\d{1,2}:\d{2}))(?=\s|$)/g;

    let lastIndex = 0;
    let match;
    let linkCount = 0;

    while ((match = combinedPattern.exec(text)) !== null) {
      const urlMatch = match[1];
      const timecodeFullMatch = match[2]; // e.g., " 1:23:45" or "1:23:45" if at start
      const timecodeValue = match[3]; // e.g., "1:23:45"

      // Add text segment before the match
      if (match.index > lastIndex) {
        container.appendChild(
          document.createTextNode(text.substring(lastIndex, match.index)),
        );
      }

      if (urlMatch) {
        // It's a URL
        const linkElement = this.createLinkElement(urlMatch);
        container.appendChild(linkElement);
        lastIndex = combinedPattern.lastIndex; // Use regex lastIndex for URLs
        linkCount++;
      } else if (timecodeValue) {
        // It's a timecode
        // Add the preceding space if it exists in timecodeFullMatch
        if (timecodeFullMatch.startsWith(" ")) {
          container.appendChild(document.createTextNode(" "));
        }

        const timecodeLink = this.createTimecodeLink(timecodeValue);
        container.appendChild(timecodeLink);
        // Update lastIndex based on the full match length (including potential space)
        lastIndex = match.index + timecodeFullMatch.length;
        combinedPattern.lastIndex = lastIndex; // Important: update regex lastIndex
        linkCount++;
      }
      // No else needed, as the regex ensures either group 1 or group 3 matched
    }

    // Add remaining text after the last match
    if (lastIndex < text.length) {
      container.appendChild(document.createTextNode(text.substring(lastIndex)));
    }

    this.logDebug(`convertUrlsToLinks: created ${linkCount} links`);
    return container;
  },

  /**
   * Creates a formatted content element from the original text
   * @param {string} text - The original description text
   * @returns {HTMLElement} - Formatted span element
   */
  createFormattedContent: function (text) {
    this.logDebug(
      `createFormattedContent called with text length: ${text.length}`,
    );
    const contentElement = document.createElement("span");
    contentElement.className =
      "yt-core-attributed-string yt-core-attributed-string--white-space-pre-wrap";
    contentElement.dir = "auto";

    const textLines = text.split("\n");
    this.logDebug(
      `createFormattedContent: processing ${textLines.length} lines`,
    );

    textLines.forEach((line, index) => {
      const lineElement = this.convertUrlsToLinks(line);
      contentElement.appendChild(lineElement);

      // Add line breaks between lines, but not after the last line
      if (index < textLines.length - 1) {
        contentElement.appendChild(document.createElement("br"));
      }
    });

    this.logDebug(`createFormattedContent: created formatted content element`);
    return contentElement;
  },

  /**
   * Replace the first text note of the element
   * Any other node is retained as is
   * @param {HTMLElement} element - The element to update
   * @param {string} replaceText - The new text to insert
   */
  replaceTextOnly: function (element, replaceText) {
    this.logDebug(
      `replaceTextOnly called with text length: ${replaceText.length}`,
    );
    // Loop through child nodes to find the first text node
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = replaceText;
        this.logDebug(`replaceTextOnly: replaced first text node`);
        break; // stop after updating the first text node
      }
    }
  },

  /**
   * Replaces the content of a container with new content
   * @param {HTMLElement} container - The container to update
   * @param {HTMLElement} newContent - The new content to insert
   */
  replaceContainerContent: function (container, newContent) {
    this.logDebug(`replaceContainerContent called`);
    // Clear existing content
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Add new content
    container.appendChild(newContent);
    this.logDebug(`replaceContainerContent: replaced container content`);
  },

  SUPPORTED_BCP47_CODES: new Set([
    "af-ZA",
    "az-AZ",
    "id-ID",
    "ms-MY",
    "bs-BA",
    "ca-ES",
    "cs-CZ",
    "da-DK",
    "de-DE",
    "et-EE",
    "en-IN",
    "en-GB",
    "en-US",
    "es-ES",
    "es-419",
    "es-US",
    "eu-ES",
    "fil-PH",
    "fr-FR",
    "fr-CA",
    "gl-ES",
    "hr-HR",
    "zu-ZA",
    "is-IS",
    "it-IT",
    "sw-TZ",
    "lv-LV",
    "lt-LT",
    "hu-HU",
    "nl-NL",
    "nb-NO",
    "uz-UZ",
    "pl-PL",
    "pt-PT",
    "pt-BR",
    "ro-RO",
    "sq-AL",
    "sk-SK",
    "sl-SI",
    "sr-RS",
    "fi-FI",
    "sv-SE",
    "vi-VN",
    "tr-TR",
    "be-BY",
    "bg-BG",
    "ky-KG",
    "kk-KZ",
    "mk-MK",
    "mn-MN",
    "ru-RU",
    "sr-BA",
    "uk-UA",
    "el-GR",
    "hy-AM",
    "he-IL",
    "ur-PK",
    "ar-SA",
    "fa-IR",
    "ne-NP",
    "mr-IN",
    "hi-IN",
    "as-IN",
    "bn-BD",
    "pa-IN",
    "gu-IN",
    "or-IN",
    "ta-IN",
    "te-IN",
    "kn-IN",
    "ml-IN",
    "si-LK",
    "th-TH",
    "lo-LA",
    "my-MM",
    "ka-GE",
    "am-ET",
    "km-KH",
    "zh-CN",
    "zh-TW",
    "zh-HK",
    "ja-JP",
    "ko-KR",
  ]),

  COMMON_BCP47_FALLBACKS: {
    af: "af-ZA",
    am: "am-ET",
    ar: "ar-SA",
    as: "as-IN",
    az: "az-AZ",
    be: "be-BY",
    bg: "bg-BG",
    bn: "bn-BD",
    bs: "bs-BA",
    ca: "ca-ES",
    cs: "cs-CZ",
    da: "da-DK",
    de: "de-DE",
    el: "el-GR",
    en: "en-US",
    es: "es-419",
    et: "et-EE",
    eu: "eu-ES",
    fa: "fa-IR",
    fi: "fi-FI",
    fil: "fil-PH",
    fr: "fr-FR",
    gl: "gl-ES",
    gu: "gu-IN",
    he: "he-IL",
    hi: "hi-IN",
    hr: "hr-HR",
    hu: "hu-HU",
    hy: "hy-AM",
    id: "id-ID",
    is: "is-IS",
    it: "it-IT",
    ja: "ja-JP",
    ka: "ka-GE",
    km: "km-KH",
    kn: "kn-IN",
    ko: "ko-KR",
    lo: "lo-LA",
    lt: "lt-LT",
    lv: "lv-LV",
    mk: "mk-MK",
    ml: "ml-IN",
    mn: "mn-MN",
    mr: "mr-IN",
    ms: "ms-MY",
    ne: "ne-NP",
    nl: "nl-NL",
    nb: "nb-NO",
    or: "or-IN",
    pa: "pa-IN",
    pl: "pl-PL",
    pt: "pt-BR",
    ro: "ro-RO",
    ru: "ru-RU",
    si: "si-LK",
    sk: "sk-SK",
    sl: "sl-SI",
    sq: "sq-AL",
    sr: "sr-RS",
    sv: "sv-SE",
    sw: "sw-TZ",
    ta: "ta-IN",
    te: "te-IN",
    th: "th-TH",
    tr: "tr-TR",
    uk: "uk-UA",
    ur: "ur-PK",
    uz: "uz-UZ",
    vi: "vi-VN",
    zh: "zh-CN",
    zu: "zu-ZA",
  },

  /**
   * Attempts to detect the closest YouTube Supported BCP-47 language code(s) from the given text.
   * Uses the browser/chrome i18n.detectLanguage API with retries and filtering.
   * @param {string} text - The input text to detect the language from.
   * @param {number} [maxRetries=3] - Optional - Maximum number of retries if detection results are not valid. Defaults to 3
   * @param {number} [minProbability=50] - Optional - Minimum confidence percentage (0-100) to accept a detected language. Defaults to 50
   * @returns {Promise<string[] | null>} - Resolves with an array of valid BCP-47 language codes that match or closely fallback to supported languages,
   *                                       or null on failure or if no suitable match is found within retries.
   */
  detectSupportedLanguage: async function (
    text,
    maxRetries = 3,
    minProbability = 50,
  ) {
    this.logDebug(
      `detectSupportedLanguage called with text length: ${text.length}, maxRetries: ${maxRetries}, minProbability: ${minProbability}`,
    );
    const api = this.getBrowserOrChrome();
    let attempts = 0;

    while (attempts < maxRetries) {
      attempts++;
      this.logDebug(
        `detectSupportedLanguage: attempt ${attempts}/${maxRetries}`,
      );

      try {
        const result = await api.i18n.detectLanguage(text);

        // Filter detected languages by minProbability threshold
        const filteredLanguages = result.languages.filter(
          (l) => (l.percentage ?? 0) >= minProbability,
        );

        this.logDebug(
          `detectSupportedLanguage: found ${filteredLanguages.length} languages above ${minProbability}% confidence`,
        );

        // exact matches from VALID_BCP47_CODES
        const exactMatches = filteredLanguages
          .map((l) => l.language)
          .filter((lang) => this.SUPPORTED_BCP47_CODES.has(lang));

        if (exactMatches.length > 0) {
          this.logDebug(
            `detectSupportedLanguage: found ${exactMatches.length} exact matches: ${exactMatches.join(", ")}`,
          );
          return exactMatches;
        }

        // tolerant fallback matches using COMMON_BCP47_FALLBACKS
        const tolerantMatches = filteredLanguages
          .map((l) => this.COMMON_BCP47_FALLBACKS[l.language])
          .filter((lang) => this.SUPPORTED_BCP47_CODES.has(lang));

        if (tolerantMatches.length > 0) {
          this.logDebug(
            `detectSupportedLanguage: found ${tolerantMatches.length} fallback matches: ${tolerantMatches.join(", ")}`,
          );
          return tolerantMatches;
        }

        this.logDebug(
          `detectSupportedLanguage: no matches found in attempt ${attempts}, retrying...`,
        );
        // else retry
      } catch (error) {
        this.logError(
          `detectSupportedLanguage: error in attempt ${attempts}:`,
          error,
        );
        return null;
      }
    }

    this.logDebug(
      `detectSupportedLanguage: all attempts exhausted, returning null`,
    );
    return null;
  },
  getSettings: function () {
    const element = document.querySelector(
      'script[type="module"][data-ytantitranslatesettings]',
    );
    return JSON.parse(element?.dataset?.ytantitranslatesettings ?? "{}");
  },
  /**
   * Make a GET request. Its result will be cached in sessionStorage and will return same promise for parallel requests.
   * @param {string} url - The URL to fetch data from
   * @param {string} postData - Optional. If passed, will make a POST request with this data
   * @param {boolean} doNotCache - Optional. If true, the result will not be cached in sessionStorage, only same promise will be returned for parallel requests
   * @returns
   */
  cachedRequest: async function cachedRequest(
    url,
    postData = null,
    doNotCache = false,
  ) {
    const cacheKey = url + "|" + postData;
    const storedResponse =
      window.YoutubeAntiTranslate.getSessionCache(cacheKey);
    if (storedResponse) {
      return storedResponse;
    }

    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      try {
        const response = await fetch(url, {
          method: postData ? "POST" : "GET",
          headers: { "content-type": "application/json" },
          body: postData ? postData : undefined,
        });
        if (!response.ok) {
          if (response.status === 404 || response.status === 401) {
            if (!doNotCache) {
              window.YoutubeAntiTranslate.setSessionCache(cacheKey, null);
            }
            return null;
          }
          throw new Error(
            `HTTP error! status: ${response.status}, while fetching: ${url}`,
          );
        }
        const data = await response.json();
        if (!doNotCache) {
          window.YoutubeAntiTranslate.setSessionCache(cacheKey, data);
        }
        return data;
      } catch (error) {
        window.YoutubeAntiTranslate.logWarning("Error fetching:", error);
        // Cache null even on general fetch error to prevent immediate retries for the same failing URL
        if (!doNotCache) {
          window.YoutubeAntiTranslate.setSessionCache(cacheKey, null);
        }
        return null;
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();

    pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  },

  /**
   * Extracts the YouTube video ID from a given URL.
   * Supports /watch?v=, /shorts/, and full URLs.
   * @param {string} url
   * @returns {string|null}
   */
  extractVideoIdFromUrl: function (url) {
    try {
      const u = new URL(url, window.location.origin);
      if (u.pathname === "/watch") {
        return u.searchParams.get("v");
      }
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/")[2] || null;
      }
      return null;
    } catch {
      return null;
    }
  },
};
