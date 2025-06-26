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
ytd-playlist-panel-video-renderer`,
  ALL_ARRAYS_SHORTS_SELECTOR: `div.style-scope.ytd-rich-item-renderer,
ytm-shorts-lockup-view-model`,
  cacheSessionStorageKey: "[YoutubeAntiTranslate]cache",

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
   * Retrieves a deserialized object from session storage.
   * @param {string} key
   * @return {any|null}
   */
  getSessionCache: function (key) {
    this.logDebug(`getSessionCache called with key: ${key}`);
    const fullKey = `${this.cacheSessionStorageKey}_${key}`;
    const raw = sessionStorage.getItem(fullKey);
    if (!raw) {
      this.logDebug(`getSessionCache: No data found for key ${key}`);
      return null;
    }

    try {
      const result = JSON.parse(raw);
      this.logDebug(`getSessionCache: Successfully parsed data for key ${key}`);
      return result;
    } catch (err) {
      this.logError(`Failed to parse session cache for key "${key}"`, err);
      sessionStorage.removeItem(fullKey); // clear corrupted entry
      return null;
    }
  },

  /**
   * Stores a value in session storage after serializing
   * @param {string} key
   * @param {any} value
   */
  setSessionCache: function (key, value) {
    this.logDebug(`setSessionCache called with key: ${key}`);
    const fullKey = `${this.cacheSessionStorageKey}_${key}`;
    try {
      sessionStorage.setItem(fullKey, JSON.stringify(value));
      this.logDebug(`setSessionCache: Successfully stored data for key ${key}`);
    } catch (err) {
      this.logError(`Failed to set session cache for key "${key}"`, err);
    }
  },

  /**
   * @returns {string}
   */
  getPlayerSelector: function () {
    this.logDebug(`getPlayerSelector called`);
    const selector = window.location.pathname.startsWith("/shorts")
      ? "#shorts-player"
      : "ytd-player .html5-video-player";
    this.logDebug(`getPlayerSelector returning: ${selector}`);
    return selector;
  },

  /**
   * @returns {string}
   */
  getBrowserOrChrome: function () {
    this.logDebug(`getBrowserOrChrome called`);
    const result = typeof browser !== "undefined" ? browser : chrome;
    this.logDebug(`getBrowserOrChrome returning browser type`);
    return result;
  },

  /**
   * @returns {bool}
   */
  isFirefoxBasedBrowser: function () {
    this.logDebug(`isFirefoxBasedBrowser called`);
    const result =
      typeof browser !== "undefined" &&
      typeof browser.runtime !== "undefined" &&
      typeof browser.runtime.getBrowserInfo === "function";
    this.logDebug(`isFirefoxBasedBrowser returning: ${result}`);
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
   * Advanced string equality comparison with optional normalization and trimming.
   * @param {string} str1 - First string to compare.
   * @param {string} str2 - Second string to compare.
   * @param {object} [options] - Configuration options for comparison.
   * @param {boolean} [options.ignoreCase=false] - If true, comparison is case-insensitive.
   * @param {boolean} [options.normalizeSpaces=false] - If true, replaces consecutive whitespace with a single space.
   * @param {boolean} [options.normalizeNFKC=false] - If true, applies Unicode Normalization Form Compatibility Composition (NFKC).
   * @param {boolean} [options.trim=false] - If true, trims both leading and trailing whitespace.
   * @param {boolean} [options.trimLeft=false] - If true, trims leading whitespace. Ignored if `trim` is true.
   * @param {boolean} [options.trimRight=false] - If true, trims trailing whitespace. Ignored if `trim` is true.
   * @returns {boolean} Whether the two processed strings are equal.
   */
  isStringEqual: function (str1, str2, options = {}) {
    const {
      ignoreCase = false,
      normalizeSpaces = false,
      normalizeNFKC = false,
      trim = false,
      trimLeft = false,
      trimRight = false,
    } = options;

    function process(str) {
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
    }

    return process(str1) === process(str2);
  },

  /**
   * Advanced string replace with optional normalization and trimming.
   * @param {string} input - The original string to operate on.
   * @param {string|RegExp} pattern - The pattern to replace. If a string, treated as a literal substring.
   * @param {string} replacement - The replacement string.
   * @param {object} [options] - Configuration options.
   * @param {boolean} [options.ignoreCase=false] - If true, performs case-insensitive replacement.
   * @param {boolean} [options.normalizeSpaces=false] - If true, replaces all whitespace sequences with a single space before matching.
   * @param {boolean} [options.normalizeNFKC=false] - If true, applies Unicode Normalization Form Compatibility Composition (NFKC).
   * @param {boolean} [options.trim=false] - If true, trims leading and trailing whitespace before processing.
   * @param {boolean} [options.trimLeft=false] - If true, trims leading whitespace (ignored if `trim` is true).
   * @param {boolean} [options.trimRight=false] - If true, trims trailing whitespace (ignored if `trim` is true).
   * @returns {string} The resulting string after replacement.
   */
  stringReplaceWithOptions: function (
    input,
    pattern,
    replacement,
    options = {},
  ) {
    const {
      ignoreCase = false,
      normalizeSpaces = false,
      normalizeNFKC = false,
      trim = false,
      trimLeft = false,
      trimRight = false,
    } = options;

    function preprocess(str) {
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

      return str;
    }

    const processedInput = preprocess(input);
    if (!processedInput || !replacement) {
      return processedInput;
    }

    let regex;
    if (typeof pattern === "string") {
      const processedPattern = preprocess(pattern);
      const escapedPattern = processedPattern.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      ); // Escape string
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
        // Use 500px as the miniimum extension, as some element such as shorts are quite big
        const extraHeight =
          window.innerHeight * this.VIEWPORT_OUTSIDE_LIMIT_FRACTION > 500
            ? window.innerHeight * this.VIEWPORT_OUTSIDE_LIMIT_FRACTION
            : 500;
        const extraWidth =
          window.innerWidth * this.VIEWPORT_OUTSIDE_LIMIT_FRACTION > 500
            ? window.innerWidth * this.VIEWPORT_OUTSIDE_LIMIT_FRACTION
            : 500;

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
};
