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
ytm-playlist-panel-video-renderer,
yt-lockup-view-model,
ytm-compact-video-renderer,
ytm-rich-item-renderer,
ytm-video-with-context-renderer,
ytm-video-card-renderer,
ytm-media-item,
ytm-playlist-video-renderer,
a.ytp-videowall-still,
a.ytp-ce-covering-overlay,
a.ytp-suggestion-link,
div.fullscreen-recommendation,
ytm-playlist-card-renderer` /*this last one is a playlist element but is used for thumbnail*/,
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
    // Helper to schedule the next frame. Falls back to setTimeout when the
    // document is in the background where requestAnimationFrame callbacks are
    // throttled or do not fire at all.
    function schedule(callback) {
      if (document.hidden || typeof requestAnimationFrame === "undefined") {
        return setTimeout(() => {
          const now =
            typeof performance !== "undefined" &&
            typeof performance.now === "function"
              ? performance.now()
              : Date.now();
          callback(now);
        }, 16); // Approx. one frame at 60fps
      }
      return requestAnimationFrame(callback);
    }

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
        schedule((t) => tick(t, context, args));
      }
    }

    return function (...args) {
      if (!isScheduled) {
        isScheduled = true;
        schedule((time) => {
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

    // Check computed style for ancestors
    // DOM traversal and style computation should not have performance impact but limit to a max depth of 25 to be safe
    // DevTools Performance analysis shows no time difference with or without this code
    // This is needed when any of the parent elements is invisible
    let parent = element.parentElement;
    let depth = 0;
    const MAX_PARENT_DEPTH = 25;
    while (parent && depth < MAX_PARENT_DEPTH) {
      const parentStyle = getComputedStyle(parent);
      if (
        parentStyle.display === "none" ||
        parentStyle.visibility === "hidden" ||
        parentStyle.visibility === "collapse" ||
        parseFloat(parentStyle.opacity) === 0
      ) {
        return false;
      }
      parent = parent.parentElement;
      depth++;
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
   * Gets current theme
   * link color in dark theme: rgb(62, 166, 255)
   * link color in light theme: rgb(6, 95, 212)
   */
  isDarkTheme: function () {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
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
    span.style.color = this.isDarkTheme()
      ? "rgb(62, 166, 255)"
      : "rgb(6, 95, 212)";

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
   * Creates a styled link for hashtag or mention
   * @param {"hashtag"|"mention"} type - Type of link to create
   * @param {string} value - Hashtag (without #) or mention (without @)
   * @returns {HTMLElement} - Span element containing the styled link
   */
  createTagLink: function (type, value) {
    this.logDebug(`createTagLink called with: ${type}: ${value}`);

    // Create the container span
    const span = document.createElement("span");
    span.className = "yt-core-attributed-string--link-inherit-color";
    span.dir = "auto";
    span.style.color = this.isDarkTheme()
      ? "rgb(62, 166, 255)"
      : "rgb(6, 95, 212)";

    // Create the anchor element
    const link = document.createElement("a");
    link.className =
      "yt-core-attributed-string__link yt-core-attributed-string__link--call-to-action-color";
    link.tabIndex = "0";
    if (type === "hashtag") {
      link.href = `/hashtag/${encodeURIComponent(value)}`;
      link.textContent = `#${value}`;
    } else if (type === "mention") {
      link.href = `/@${value}`;
      link.textContent = `@${value}`;
    }
    link.target = "";
    link.setAttribute("force-new-state", "true");

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
    // Group 4: Hashtag has prefix "#" and possibly space `(?:^|\s)#([\p{L}\p{N}_\p{Script=Han}-]{1,50})`
    // Group 5: Hashtag only `#([\p{L}\p{N}_\p{Script=Han}-]{1,50})`
    // Group 6: Mention has prefix "@" and possibly space `(?:^|\s)@([\w\-]{3,100})`
    // Group 7: Mention only `([\w\-]{3,100})`
    const combinedPattern =
      /(https?:\/\/[^\s]+)|((?:^|\s)((?:\d{1,2}:)?\d{1,2}:\d{2}))(?=\s|$)|((?:^|\s)#([A-Za-z0-9_\-\u0080-\u02af\u0370-\u1fff\u2e80-\u2fdf\u3040-\ufdff]{1,50}))|((?:^|\s)@([\w-]{3,100}))/g;

    let lastIndex = 0;
    let match;
    let linkCount = 0;

    while ((match = combinedPattern.exec(text)) !== null) {
      const urlMatch = match[1];
      const timecodeFullMatch = match[2]; // e.g., " 1:23:45" or "1:23:45" if at start
      const timecodeValue = match[3]; // e.g., "1:23:45"
      const hashtagFullMatch = match[4]; // e.g., " #hashtag" or "#hashtag" if at start
      const hashtag = match[5]; // e.g., "hashtag"
      const mentionFullMatch = match[6]; // e.g., " @username" or "@username" if at start
      const mention = match[7]; // e.g., "username"

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
      } else if (hashtag) {
        // It's a hashtag
        // Add preceding space if it exists in hashtagFullMatch
        if (hashtagFullMatch.startsWith(" ")) {
          container.appendChild(document.createTextNode(" "));
        }

        const hashtagLink = this.createTagLink("hashtag", hashtag);
        container.appendChild(hashtagLink);

        lastIndex = match.index + hashtagFullMatch.length;
        combinedPattern.lastIndex = lastIndex;
        linkCount++;
      } else if (mention) {
        // It's a mention
        // Add preceding space if it exists in mentionFullMatch
        if (mentionFullMatch.startsWith(" ")) {
          container.appendChild(document.createTextNode(" "));
        }

        const mentionLink = this.createTagLink("mention", mention);
        container.appendChild(mentionLink);

        lastIndex = match.index + mentionFullMatch.length;
        combinedPattern.lastIndex = lastIndex;
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
   * Replace the first text node of the element
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
   * Get the first text node of the element
   * Any other node is retained as is
   * @param {HTMLElement} element - The element to inspect
   */
  getFirstTextNode: function (element) {
    // Loop through child nodes to find the first text node
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node;
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
  getSettings: async function () {
    // First try to read from the DOM
    const element = document.querySelector(
      'script[type="module"][data-ytantitranslatesettings]',
    );
    if (element?.dataset?.ytantitranslatesettings) {
      try {
        return JSON.parse(element.dataset.ytantitranslatesettings);
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
  },
  /**
   * Make a GET request. Its result will be cached in sessionStorage and will return same promise for parallel requests.
   * @param {string} url - The URL to fetch data from
   * @param {string} postData - Optional. If passed, will make a POST request with this data
   * @param {object} headersData - Optional. Headers to be sent with the request, defaults to {"content-type": "application/json"}
   * @param {boolean} doNotCache - Optional. If true, the result will not be cached in sessionStorage, only same promise will be returned for parallel requests
   * @param {string} cacheDotNotationProperty - Optional. Specify the property name to extract from the response data json for limited caching
   *                       (e.g. "title" to cache only the title of the response data or "videoDetails.title" to cache the title of the object videoDetails).
   *                       If not specified, and doNotCache is false, the whole response data will be cached
   *                       NOTE: Must be a valid property of the response data json starting from the root level. Use "." for nested properties.
   *                       If the property is not found, it will cache null.
   *                       When cached by this cacheDotNotationProperty, when retieved "data" will be null and value will be set in "cachedWithDotNotation" property
   * @returns { response: Response, data: any, cachedWithDotNotation: any } - The response object and the data from the response
   */
  cachedRequest: async function cachedRequest(
    url,
    postData = null,
    headersData = { "content-type": "application/json" },
    doNotCache = false,
    cacheDotNotationProperty = null,
  ) {
    const cacheKey = url + "|" + postData + "|" + cacheDotNotationProperty;
    const storedResponse = this.getSessionCache(cacheKey);
    if (storedResponse) {
      if (cacheDotNotationProperty) {
        return {
          response: new Response(
            {
              data: null,
              cachedWithDotNotation: storedResponse,
            },
            { status: storedResponse.status || 200 },
          ),
          data: null,
          cachedWithDotNotation: storedResponse,
        };
      } else {
        return {
          response: new Response(
            {
              data: storedResponse,
              cachedWithDotNotation: null,
            },
            { status: storedResponse.status || 200 },
          ),
          data: storedResponse,
          cachedWithDotNotation: null,
        };
      }
    }

    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      try {
        const response = await fetch(url, {
          method: postData ? "POST" : "GET",
          headers: headersData,
          body: postData ? postData : undefined,
        });
        if (!response.ok) {
          if (response.status === 404) {
            if (!doNotCache) {
              this.setSessionCache(cacheKey, null);
            }
            return null;
          } else if (response.status === 401) {
            if (!doNotCache) {
              if (url.includes("oembed?url=")) {
                // 401 on youtube.com/oembed will not resolve so we actually cache a 401 response so that we do not retry
                this.setSessionCache(cacheKey, {
                  title: undefined,
                  status: 401,
                });
              } else {
                this.setSessionCache(cacheKey, null);
              }
            }
            return { response: response, data: null };
          }
          throw new Error(
            `HTTP error! status: ${response.status}, while fetching: ${url}`,
          );
        }
        const data = await response.json();
        if (!doNotCache) {
          if (cacheDotNotationProperty) {
            this.setSessionCache(
              cacheKey,
              this.getPropertyByDotNotation(data, cacheDotNotationProperty) ||
                null,
            );
          } else {
            this.setSessionCache(cacheKey, data);
          }
        }
        return { response: response, data: data };
      } catch (error) {
        this.logWarning("Error fetching:", error);
        // Cache null even on general fetch error to prevent immediate retries for the same failing URL
        if (!doNotCache) {
          this.setSessionCache(cacheKey, null);
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
   * Converts a value to a JSON hierarchy based on dot notation properties.
   * @param {any} value - The value to convert.
   * @param {string} dotNotationProperty - The dot notation property to create the hierarchy
   * @returns {object} - The resulting JSON hierarchy.
   */
  jsonHierarchy: function (value, dotNotationProperty) {
    // If no dots, just return { property: value }
    if (!dotNotationProperty.includes(".")) {
      return { [dotNotationProperty]: value };
    }

    // Split by dots
    const keys = dotNotationProperty.split(".");
    const result = {};
    let current = result;

    // Iterate through keys
    keys.forEach((key, index) => {
      if (index === keys.length - 1) {
        // Last key: assign the value
        current[key] = value;
      } else {
        // Create an empty object and go deeper
        current[key] = {};
        current = current[key];
      }
    });

    return result;
  },

  /**
   * Gets a property from a JSON object using dot notation.
   * @param {object} json - The JSON object to search.
   * @param {string} dotNotationProperty - The dot notation property with hierarchy to retrieve.
   * @returns {any|null} - The value of the property or null if not found
   * */
  getPropertyByDotNotation: function (json, dotNotationProperty) {
    if (!dotNotationProperty) {
      return null;
    }
    if (typeof json !== "object" || json === null) {
      return null;
    }

    const keys = dotNotationProperty.split(".");
    let current = json;

    for (const key of keys) {
      if (current && Object.prototype.hasOwnProperty.call(current, key)) {
        current = current[key];
      } else {
        return null; // Path doesn't exist
      }
    }
    return current;
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
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.split("/")[2] || null;
      }
      if (u.hostname.includes("i.ytimg.com")) {
        // https://i.ytimg.com/vi_lc/**yhB3BgJyGl8**/mqdefault_th.jpg?sqp=COiW0cYG&rs=AOn4CLCEvTmuT5DfKOB-bYHzp00LiI4wlw
        const parts = u.pathname.split("/");
        if (parts.length >= 3 && (parts[1] === "vi_lc" || parts[1] === "vi")) {
          return parts[2];
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  getVideoTitleFromYoutubeI: async function (videoId) {
    const body = {
      context: {
        client: {
          clientName: this.isMobile() ? "MWEB" : "WEB",
          clientVersion: "2.20250731.09.00",
        },
      },
      videoId,
    };

    const headers = await this.getYoutubeIHeadersWithCredentials();

    const response = await this.cachedRequest(
      `https://${this.isMobile() ? "m" : "www"}.youtube.com/youtubei/v1/player?prettyPrint=false`,
      JSON.stringify(body),
      headers,
      false,
      "videoDetails",
    );
    const title =
      response?.cachedWithDotNotation?.title ||
      response?.data?.videoDetails?.title ||
      null;
    const author_name =
      response?.cachedWithDotNotation?.author ||
      response?.data?.videoDetails?.author ||
      null;

    const /**@type {Array<{url: string}>}*/ thumbnails =
        response?.cachedWithDotNotation?.thumbnail?.thumbnails ||
        response?.data?.videoDetails?.thumbnail?.thumbnails ||
        null;
    // try to get the thumbnail with width 320 first, if not found get the first one
    let thumbnail_url = thumbnails?.[0]?.url || null;

    const maxresdefault_url =
      thumbnails?.find((thumb) => thumb.url.includes("maxresdefault"))?.url ||
      null;

    const channelId =
      response?.cachedWithDotNotation?.channelId ||
      response?.data?.videoDetails?.channelId ||
      null;
    const author_url = channelId
      ? `https://www.youtube.com/channel/${channelId}`
      : null;

    // if thumbnail_url is not null strip it of any query parameters
    if (thumbnail_url) {
      const urlObj = new URL(thumbnail_url);
      urlObj.search = "";
      thumbnail_url = urlObj.toString();
    }

    if (title) {
      return {
        response: response.response,
        data: {
          title: title,
          author_name: author_name,
          author_url: author_url,
          thumbnail_url: thumbnail_url,
          maxresdefault_url: maxresdefault_url,
        },
      };
    }
    return { response: response?.response, data: null };
  },

  getSAPISID: function () {
    const match = document.cookie.match(/SAPISID=([^\s;]+)/);
    return match ? match[1] : null;
  },

  getSAPISIDHASH: async function (
    origin = this.isMobile()
      ? "https://m.youtube.com"
      : "https://www.youtube.com",
  ) {
    const sapisid = this.getSAPISID();
    if (!sapisid) {
      this.logWarning("SAPISID cookie not found.");
      return null;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${timestamp} ${sapisid} ${origin}`;

    // SHA1 function (uses SubtleCrypto)
    async function sha1Hash(msg) {
      const encoder = new TextEncoder();
      const data = encoder.encode(msg);
      const hashBuffer = await crypto.subtle.digest("SHA-1", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    const hash = await sha1Hash(message);
    return `SAPISIDHASH ${timestamp}_${hash}`;
  },

  getYoutubeIHeadersWithCredentials: async function () {
    const sapisidhash = await this.getSAPISIDHASH();
    if (!sapisidhash) {
      this.logWarning(
        "getYoutubeIHeadersWithCredentials: SAPISID not found, user not logged in, returning default headers",
      );
      return {
        "Content-Type": "application/json",
      };
    }
    return {
      "Content-Type": "application/json",
      Authorization: sapisidhash,
      Origin: this.isMobile()
        ? "https://m.youtube.com"
        : "https://www.youtube.com",
      "X-Youtube-Client-Name": "1",
      "X-Youtube-Client-Version": "2.20250731.09.00",
    };
  },

  getOriginalCollaboratorsItemsWithYoutubeI: async function (search_query) {
    if (!search_query || search_query.trim() === "") {
      return null;
    }

    // build the request body
    const body = {
      context: {
        client: {
          clientName: this.isMobile() ? "MWEB" : "WEB",
          clientVersion: "2.20250527.00.00",
          hl: "lo", // Using "Lao" as default that is an unsupported (but valid) language of youtube
          // That always get the original language as a result
        },
      },
      query: search_query,
    };

    const requestIdentifier = `youtubei/v1/results_${JSON.stringify(body)}`;

    // Check cache
    const storedResponse =
      window.YoutubeAntiTranslate.getSessionCache(requestIdentifier);
    if (storedResponse) {
      return storedResponse;
    }

    const search = `https://${this.isMobile() ? "m" : "www"}.youtube.com/youtubei/v1/search?prettyPrint=false`;
    const response = await this.cachedRequest(
      search,
      JSON.stringify(body),
      await this.getYoutubeIHeadersWithCredentials(),
      // doNotCache true as would take too much space
      true,
    );

    if (!response?.data) {
      this.logWarning(`Failed to fetch ${search} or parse response`);
      return;
    }

    const result = this.extractCollaboratorsItemsFromSearch(response.data);

    if (!result) {
      return;
    }

    return result;
  },

  extractCollaboratorsItemsFromSearch: function (json) {
    const results = [];

    const sections =
      json?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents ||
      json?.contents?.sectionListRenderer?.contents ||
      [];

    for (const section of sections) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const video = item?.videoRenderer || item?.videoWithContextRenderer;
        if (!video) {
          continue;
        }

        const byline = video.shortBylineText || video.longBylineText;
        const runs = byline?.runs || [];
        for (const run of runs) {
          const showDialog =
            run?.navigationEndpoint?.showDialogCommand ||
            run?.navigationEndpoint?.showSheetCommand;
          if (!showDialog) {
            continue;
          }

          const listItems =
            showDialog?.panelLoadingStrategy?.inlineContent?.dialogViewModel
              ?.customContent?.listViewModel?.listItems ||
            showDialog?.panelLoadingStrategy?.inlineContent?.sheetViewModel
              ?.content?.listViewModel?.listItems;

          if (Array.isArray(listItems)) {
            for (const listItem of listItems) {
              const view = listItem?.listItemViewModel || {};
              const name = view.title?.content || null;
              const avatarImage =
                view.leadingAccessory?.avatarViewModel?.image?.sources?.[0]
                  ?.url || null;
              const url =
                view.rendererContext?.commandContext?.onTap?.innertubeCommand
                  ?.commandMetadata?.webCommandMetadata?.url || null;
              const navigationEndpointUrl =
                video.navigationEndpoint?.commandMetadata?.webCommandMetadata
                  ?.url;
              const videoId =
                video.navigationEndpoint?.watchEndpoint?.videoId ||
                this.extractVideoIdFromUrl(
                  navigationEndpointUrl.startsWith("http")
                    ? navigationEndpointUrl
                    : window.location.origin + navigationEndpointUrl,
                );

              results.push({
                name,
                avatarImage,
                url,
                navigationEndpointUrl,
                videoId,
              });
            }
          }
        }
      }
    }

    return results;
  },

  getLocalizedAnd: function (languageCode) {
    const andTranslations = {
      "af-ZA": "en",
      "az-AZ": "və",
      "id-ID": "dan",
      "ms-MY": "dan",
      "bs-BA": "i",
      "ca-ES": "i",
      "cs-CZ": "a",
      "da-DK": "og",
      "de-DE": "und",
      "et-EE": "ja",
      "en-IN": "and",
      "en-GB": "and",
      "en-US": "and",
      "es-ES": "y",
      "es-419": "y",
      "es-US": "y",
      "eu-ES": "eta",
      "fil-PH": "at",
      "fr-FR": "et",
      "fr-CA": "et",
      "gl-ES": "e",
      "hr-HR": "i",
      "zu-ZA": "futhi",
      "is-IS": "og",
      "it-IT": "e",
      "sw-TZ": "na",
      "lv-LV": "un",
      "lt-LT": "ir",
      "hu-HU": "és",
      "nl-NL": "en",
      "nb-NO": "og",
      "uz-UZ": "va",
      "pl-PL": "i",
      "pt-PT": "e",
      "pt-BR": "e",
      "ro-RO": "și",
      "sq-AL": "dhe",
      "sk-SK": "a",
      "sl-SI": "in",
      "sr-RS": "и",
      "fi-FI": "ja",
      "sv-SE": "och",
      "vi-VN": "và",
      "tr-TR": "ve",
      "be-BY": "і",
      "bg-BG": "и",
      "ky-KG": "жана",
      "kk-KZ": "және",
      "mk-MK": "и",
      "mn-MN": "ба",
      "ru-RU": "и",
      "sr-BA": "и",
      "uk-UA": "і",
      "el-GR": "και",
      "hy-AM": "եւ",
      "he-IL": "ו",
      "ur-PK": "اور",
      "ar-SA": "و",
      "fa-IR": "و",
      "ne-NP": "र",
      "mr-IN": "आणि",
      "hi-IN": "और",
      "as-IN": "আৰু",
      "bn-BD": "এবং",
      "pa-IN": "ਅਤੇ",
      "gu-IN": "અને",
      "or-IN": "ଏବଂ",
      "ta-IN": "மற்றும்",
      "te-IN": "మరియు",
      "kn-IN": "ಮತ್ತು",
      "ml-IN": "കൂടാതെ",
      "si-LK": "සහ",
      "th-TH": "และ",
      "lo-LA": "ແລະ",
      "my-MM": "နှင့်",
      "ka-GE": "და",
      "am-ET": "እና",
      "km-KH": "និង",
      "zh-CN": "和",
      "zh-TW": "和",
      "zh-HK": "和",
      "ja-JP": "と",
      "ko-KR": "그리고",
    };
    return andTranslations[languageCode] || "and";
  },

  getImageSize: async function (src) {
    if (!src) {
      return { width: null, height: null };
    }
    const img = new Image();
    img.src = src;

    // Wait for load or error events
    await img.decode(); // built-in async method for images

    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  },

  isFoundImageSrc: async function (src) {
    if (!src) {
      return false;
    }
    try {
      const response = await fetch(src, { method: "GET", redirect: "manual" });
      return response.ok && response.status >= 200 && response.status < 300;
    } catch {
      return false;
    }
  },

  /**
   * Check if a channel is whitelisted.
   * @param {string} whiteStoragePropertyName - The type of whitelist to check against.
   * @param {string} handle - The channel handle (e.g. "@mrbeast").
   * @param {string} channelId - The channel ID (e.g. "UC123456").
   * @param {string} channelUrl - The channel URL (e.g. "https://www.youtube.com/@mrbeast" or "https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA").
   *                              URL like /user/ or /c/ are not supported.
   * @param {string} channelName - Optional. The channel name (not used for whitelist check, only for logging).
   * @returns {Promise<boolean>} - True if the channel is whitelisted, false otherwise.
   */
  isWhitelistedChannel: async function (
    whiteStoragePropertyName,
    handle = null,
    channelUrl = null,
    channelId = null,
    channelName = null,
  ) {
    const settings = await this.getSettings();
    const /** @type {string[]} */ whitelist =
        settings?.[whiteStoragePropertyName];
    if (!whitelist) {
      throw new Error(`Unsupported whiteListType: ${whiteStoragePropertyName}`);
    }

    if (whitelist.length === 0) {
      this.logDebug(
        `isWhitelistedChannel: ${whiteStoragePropertyName} is empty, no channel is whitelisted`,
      );
      return false;
    }

    // lower case version for case insensitive comparison
    const lowerCaseWhitelist = whitelist.map((item) => item.toLowerCase());

    if (
      (!channelId ||
        typeof channelId !== "string" ||
        channelId.trim() === "") &&
      (!handle || typeof handle !== "string" || handle.trim() === "") &&
      (!channelUrl ||
        typeof channelUrl !== "string" ||
        channelUrl.trim() === "") &&
      (!channelName ||
        typeof channelName !== "string" ||
        channelName.trim() === "")
    ) {
      return false;
    }

    let /** @type {URL} */ channelURL = null;
    if (channelUrl && typeof channelUrl === "string") {
      const url = channelUrl.startsWith("http")
        ? channelUrl
        : window.location.origin + channelUrl;
      try {
        channelURL = new URL(url);
      } catch {
        this.logWarning(`isWhitelistedChannel: invalid channelUrl: ${url}`);
      }
    }

    if (channelURL) {
      // Extract id or handle from URL
      if (!channelId && channelURL.pathname.startsWith("/channel/")) {
        var match = channelURL.pathname.match(/\/channel\/([^/?]+)/);
        channelId = match ? match[1] : null;
      } else if (!handle && channelURL.pathname.startsWith("/@")) {
        const match = channelURL.pathname.match(/\/(@[^/?]+)/);
        handle = match ? match[1] : null;
      }
    }

    if (
      !handle ||
      typeof handle !== "string" ||
      handle.trim() === "" ||
      !handle.trim().startsWith("@")
    ) {
      if (handle) {
        this.logInfo(`isWhitelistedChannel: invalid handle: ${handle}`);
      }
      if (
        (!channelId ||
          typeof channelId !== "string" ||
          channelId.trim() === "") &&
        (!channelName ||
          typeof channelName !== "string" ||
          channelName.trim() === "")
      ) {
        return false;
      }
    } else {
      return lowerCaseWhitelist.includes(handle.trim().toLowerCase());
    }

    if (
      !channelId ||
      typeof channelId !== "string" ||
      channelId.trim() === ""
    ) {
      if (channelId) {
        this.logInfo(`isWhitelistedChannel: invalid channelId: ${channelId}`);
      }
      if (
        !channelName ||
        typeof channelName !== "string" ||
        channelName.trim() === ""
      ) {
        return false;
      }
    } else {
      // Get handle form channel UCID
      const response = await this.getChannelBrandingWithYoutubeI(channelId);
      handle = response?.channelHandle || null;
    }

    if (!handle) {
      this.logInfo(
        `isWhitelistedChannel: could not retrieve handle for channelId: ${channelId}`,
      );
      if (
        !channelName ||
        typeof channelName !== "string" ||
        channelName.trim() === ""
      ) {
        return false;
      }
    } else {
      return lowerCaseWhitelist.includes(handle.trim().toLowerCase());
    }

    if (
      !channelName ||
      typeof channelName !== "string" ||
      channelName.trim() === ""
    ) {
      this.logInfo(`isWhitelistedChannel: invalid channelName: ${channelName}`);
      return false;
    } else {
      // Try to use channelName as handle if does not have spaces
      if (
        !channelName.trim().includes(" ") &&
        lowerCaseWhitelist.includes(`@${channelName}`.trim().toLowerCase())
      ) {
        return true;
      }
      // Get handle from channel name
      const lookupResult = await this.lookupChannelId(channelName);
      handle = lookupResult?.channelHandle;
    }

    if (!handle) {
      this.logInfo(
        `isWhitelistedChannel: could not retrieve handle for channelName: ${channelName}`,
      );
      return false;
    } else {
      return lowerCaseWhitelist.includes(handle.trim().toLowerCase());
    }
  },

  /**
   * Retrieve the UCID of a channel using youtubei/v1/search
   * @param {string} query the YouTube channel handle (e.g. "@mrbeast" or "MrBeast")
   * @returns {string} channel UCID
   */
  lookupChannelId: async function (query) {
    if (!query) {
      return null;
    }

    let decodedQuery;
    try {
      decodedQuery = decodeURIComponent(query);
    } catch {
      decodedQuery = query;
    }

    // build the request body ──
    const body = {
      context: {
        client: {
          clientName: this.isMobile() ? "MWEB" : "WEB",
          clientVersion: "2.20250527.00.00",
        },
      },
      query: decodedQuery,
      // "EgIQAg==" = filter=channels  (protobuf: {12: {1:2}})
      params: "EgIQAg==",
    };

    const requestIdentifier = `youtubei/v1/search_${JSON.stringify(body)}`;

    // Check cache
    const storedResponse = this.getSessionCache(requestIdentifier);
    if (storedResponse) {
      return storedResponse;
    }

    // TODO: Validate mobile (MWEB) support
    const search = `https://${this.isMobile() ? "m" : "www"}.youtube.com/youtubei/v1/search?prettyPrint=false`;
    const result = await this.cachedRequest(
      search,
      JSON.stringify(body),
      await this.getYoutubeIHeadersWithCredentials(),
      // As it might take too much space
      true,
    );

    if (!result || !result.response || !result.response.ok) {
      this.logInfo(
        `Failed to fetch ${search}:`,
        result?.response?.statusText || "Unknown error",
      );
      return;
    }

    const json = result.data;

    let channelUcid;
    let channelHandle;

    for (const sectionContent of json.contents?.twoColumnSearchResultsRenderer
      ?.primaryContents.sectionListRenderer?.contents || []) {
      for (const itemRenderedContent of sectionContent?.itemSectionRenderer
        ?.contents || []) {
        if (
          itemRenderedContent?.channelRenderer?.title?.simpleText === query ||
          itemRenderedContent?.channelRenderer?.subscriberCountText
            ?.simpleText === query
        ) {
          channelUcid = itemRenderedContent?.channelRenderer?.channelId;
          channelHandle =
            itemRenderedContent?.channelRenderer?.subscriberCountText
              ?.simpleText;
          break;
        }
      }
    }

    // TODO: Validate mobile (MWEB) support
    for (const sectionContent of json.contents?.sectionListRenderer?.contents ||
      []) {
      for (const itemRenderedContent of sectionContent?.itemSectionRenderer
        ?.contents || []) {
        let /** @type {boolean} */ itemMatchChannelName = false;
        for (const runs of itemRenderedContent?.compactChannelRenderer
          ?.displayName?.runs || []) {
          if (runs.text === query) {
            itemMatchChannelName = true;
            break;
          }
        }

        let /** @type {boolean} */ itemMatchChannelHandle = false;
        let /** @type {number} */ itemMatchChannelHandleIndex = -1;
        for (const runs of itemRenderedContent?.compactChannelRenderer
          ?.subscriberCountText?.runs || []) {
          if (runs.text === query) {
            itemMatchChannelHandle = true;
            itemMatchChannelHandleIndex =
              itemRenderedContent?.compactChannelRenderer?.subscriberCountText?.runs.indexOf(
                runs,
              );
            break;
          }
        }

        if (itemMatchChannelName || itemMatchChannelHandle) {
          channelUcid = itemRenderedContent?.compactChannelRenderer?.channelId;
          channelHandle =
            itemRenderedContent?.compactChannelRenderer?.subscriberCountText
              ?.runs?.[itemMatchChannelHandleIndex]?.text;
          break;
        }
      }
    }

    const response = {
      channelUcid: channelUcid,
      channelHandle: channelHandle,
    };

    if (!response || !response.channelUcid) {
      return;
    }

    // Store in cache
    this.setSessionCache(requestIdentifier, response);

    return response;
  },

  getChannelUCIDFromHref: async function (href) {
    if (!href) {
      return null;
    }
    // Direct UCID reference
    const channelMatch = href.match(/\/channel\/([^/?&#]+)/);
    if (channelMatch && channelMatch[1]) {
      return channelMatch[1];
    }

    // Handle paths such as /@handle or /c/Custom or /user/Username
    const handleMatch = href.match(/\/(?:@|c\/|user\/)([^/?&#]+)/);
    if (handleMatch && handleMatch[1]) {
      let handle = handleMatch[1];
      // restore missing @ for handle form
      if (!handle.startsWith("@")) {
        handle = href.includes("/@") ? `@${handle}` : handle;
      }
      const lookupResult = await this.lookupChannelId(handle);
      return lookupResult?.channelUcid;
    }
    return null;
  },

  /**
   * Retrieved the Channel UCID (UC...) for the current Channel page using window.location and lookupChannelId() search
   * @returns {string} channel UCID
   */
  getChannelUCID: async function () {
    if (window.location.pathname.startsWith("/channel/")) {
      var match = window.location.pathname.match(/\/channel\/([^/?]+)/);
      return match ? `${match[1]}` : null;
    }

    let handle = null;
    if (window.location.pathname.startsWith("/c/")) {
      const match = window.location.pathname.match(/\/c\/([^/?]+)/);
      handle = match ? `${match[1]}` : null;
    } else if (window.location.pathname.startsWith("/@")) {
      const match = window.location.pathname.match(/\/(@[^/?]+)/);
      handle = match ? `${match[1]}` : null;
    } else if (window.location.pathname.startsWith("/user/")) {
      const match = window.location.pathname.match(/\/user\/([^/?]+)/);
      handle = match ? `${match[1]}` : null;
    }
    const lookupResult = await this.lookupChannelId(handle);
    return lookupResult?.channelUcid;
  },

  /**
   * Fetch the About/branding section of a YouTube channel.
   * @param {string} ucid   Optional Channel ID (starts with "UC…"). Defaults to UCID of the current channel
   * @param {string} locale Optional BCP-47 tag, e.g. "it-IT" or "fr". Defaults to the user's browser language.
   * @returns {object}      The title and description branding.
   */
  getChannelBrandingWithYoutubeI: async function (ucid = null) {
    if (!ucid) {
      ucid = await this.getChannelUCID();
    }
    if (!ucid) {
      this.logInfo(`could not find channel UCID`);
      return;
    }

    // 1. get continuation to get country in english
    // const locale = await getChannelLocale(ucid, "en-US");

    // const [hl, gl] = locale.split(/[-_]/); // "en-US" → ["en", "US"]

    // build the request body
    const body = {
      context: {
        client: {
          clientName: this.isMobile() ? "MWEB" : "WEB",
          clientVersion: "2.20250527.00.00",
          hl: "lo", // Using "Lao" as default that is an unsupported (but valid) language of youtube
          // That always get the original language as a result
        },
      },
      browseId: ucid,
    };

    const requestIdentifier = `youtubei/v1/browse_${JSON.stringify(body)}`;

    // Check cache
    const storedResponse = this.getSessionCache(requestIdentifier);
    if (storedResponse) {
      return storedResponse;
    }

    const browse = `https://${this.isMobile() ? "m" : "www"}.youtube.com/youtubei/v1/browse?prettyPrint=false`;
    const response = await this.cachedRequest(
      browse,
      JSON.stringify(body),
      await this.getYoutubeIHeadersWithCredentials(),
      // As it might take too much space
      true,
    );

    if (!response?.data) {
      this.logWarning(`Failed to fetch ${browse} or parse response`);
      return;
    }

    const hdr = response.data.header?.pageHeaderRenderer;
    const metadata = response.data.metadata?.channelMetadataRenderer;
    const hdrMetadataRows =
      hdr?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel
        ?.metadataRows;

    let channelHandle;
    for (const metadataRow of hdrMetadataRows || []) {
      for (const metadataPart of metadataRow?.metadataParts || []) {
        if (metadataPart?.text?.content?.startsWith("@")) {
          channelHandle = metadataPart?.text?.content;
          break;
        }
      }
    }
    // TODO: Validate mobile (MWEB) support

    const result = {
      title: metadata?.title, // channel name
      truncatedDescription:
        hdr?.content?.pageHeaderViewModel?.description
          ?.descriptionPreviewViewModel?.description?.content,
      description: metadata?.description, // full description
      channelHandle: channelHandle,
    };

    if (!metadata || !hdr) {
      return;
    }

    // Store in cache
    this.setSessionCache(requestIdentifier, result);

    // Store also the successful detected locale that worked
    // this.setSessionCache(ucid, locale);

    return result;
  },
};
