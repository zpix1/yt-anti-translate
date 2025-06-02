window.YoutubeAntiTranslate = {
  VIEWPORT_EXTENSION_PERCENTAGE_FRACTION: 0.5,
  VIEWPORT_OUTSIDE_LIMIT_FRACTION: 0.5,
  LOG_PREFIX: "[YoutubeAntiTranslate]",
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
    console.warn(`${this.LOG_PREFIX}`, ...args);
  },
  logInfo: function (...args) {
    return;
    console.log(`${this.LOG_PREFIX}`, ...args);
  },
  logError: function (...args) {
    console.error(`${this.LOG_PREFIX}`, ...args);
  },

  /**
   * Retrieves a deserialized object from session storage.
   * @param {string} key
   * @return {any|null}
   */
  getSessionCache: function (key) {
    this.logInfo(`getSessionCache called with key: ${key}`);
    const fullKey = `${this.cacheSessionStorageKey}_${key}`;
    const raw = sessionStorage.getItem(fullKey);
    if (!raw) {
      this.logInfo(`getSessionCache: No data found for key ${key}`);
      return null;
    }

    try {
      const result = JSON.parse(raw);
      this.logInfo(`getSessionCache: Successfully parsed data for key ${key}`);
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
    this.logInfo(`setSessionCache called with key: ${key}`);
    const fullKey = `${this.cacheSessionStorageKey}_${key}`;
    try {
      sessionStorage.setItem(fullKey, JSON.stringify(value));
      this.logInfo(`setSessionCache: Successfully stored data for key ${key}`);
    } catch (err) {
      this.logError(`Failed to set session cache for key "${key}"`, err);
    }
  },

  /**
   * @returns {string}
   */
  getPlayerSelector: function () {
    this.logInfo(`getPlayerSelector called`);
    const selector = window.location.pathname.startsWith("/shorts")
      ? "#shorts-player"
      : "ytd-player .html5-video-player";
    this.logInfo(`getPlayerSelector returning: ${selector}`);
    return selector;
  },

  /**
   * @returns {string}
   */
  getBrowserOrChrome: function () {
    this.logInfo(`getBrowserOrChrome called`);
    const result = typeof browser !== "undefined" ? browser : chrome;
    this.logInfo(`getBrowserOrChrome returning browser type`);
    return result;
  },

  /**
   * @returns {bool}
   */
  isFirefoxBasedBrowser: function () {
    this.logInfo(`isFirefoxBasedBrowser called`);
    const result =
      typeof browser !== "undefined" &&
      typeof browser.runtime !== "undefined" &&
      typeof browser.runtime.getBrowserInfo === "function";
    this.logInfo(`isFirefoxBasedBrowser returning: ${result}`);
    return result;
  },

  /**
   * Normalize spaces in a string so that there are no more than 1 space between words
   * @param {string} str
   * @returns
   */
  normalizeSpaces: function (str) {
    this.logInfo(`normalizeSpaces called`);
    const result = str.replace(/\s+/g, " ").trim();
    this.logInfo(
      `normalizeSpaces: processed string of length ${str.length} to ${result.length}`,
    );
    return result;
  },

  /**
   * Given a Node it uses computed style to determine if it is visible
   * @param {Node} node - A Node of type ELEMENT_NODE
   * @param {boolean} shouldCheckViewport - Optional. If true the element position is checked to be inside or outside the viewport. Viewport is extended based on
   *                                        VIEWPORT_EXTENSION_PERCENTAGE_FRACTION. Defaults true
   * @param {boolean} onlyOutsideViewport - Optional. only relevant when `shouldCheckViewport` is true. When this is also true the element is returned only if outside
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
    this.logInfo(
      `isVisible called with shouldCheckViewport: ${shouldCheckViewport}, onlyOutsideViewport: ${onlyOutsideViewport}, useOutsideLimit: ${useOutsideLimit}`,
    );

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
      parseFloat(style.opacity) === 0 ||
      element.offsetWidth === 0 ||
      element.offsetHeight === 0
    ) {
      this.logInfo(`isVisible: Element is not visible due to style properties`);
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
        // Return true if ANY part of the element is OUTSIDE the extended viewport
        const fullyContained =
          rect.top >= topBoundary &&
          rect.bottom <= bottomBoundary &&
          rect.left >= leftBoundary &&
          rect.right <= rightBoundary;

        if (!useOutsideLimit) {
          const result = !fullyContained;
          this.logInfo(
            `isVisible: onlyOutsideViewport check result: ${result}`,
          );
          return result;
        }

        // Further extend the extended viewport by VIEWPORT_OUTSIDE_LIMIT_FRACTION to set the maximum outside limit
        const extraHeight =
          window.innerHeight * this.VIEWPORT_OUTSIDE_LIMIT_FRACTION;
        const extraWidth =
          window.innerWidth * this.VIEWPORT_OUTSIDE_LIMIT_FRACTION;

        const outerTopBoundary = topBoundary - extraHeight;
        const outerBottomBoundary = bottomBoundary + extraHeight;
        const outerLeftBoundary = leftBoundary - extraWidth;
        const outerRightBoundary = rightBoundary + extraWidth;

        // Check if ANY part of the element is within the outer limit extended viewport
        const intersectsOuterLimitViewport =
          rect.bottom > outerTopBoundary &&
          rect.top < outerBottomBoundary &&
          rect.right > outerLeftBoundary &&
          rect.left < outerRightBoundary;

        const result = !fullyContained && intersectsOuterLimitViewport;
        this.logInfo(
          `isVisible: onlyOutsideViewport with limit check result: ${result}`,
        );
        return result;
      } else {
        // Return true if ANY part of the element is INSIDE the extended viewport
        const intersectsExtendedViewport =
          rect.top < bottomBoundary &&
          rect.bottom > topBoundary &&
          rect.left < rightBoundary &&
          rect.right > leftBoundary;

        this.logInfo(
          `isVisible: viewport intersection check result: ${intersectsExtendedViewport}`,
        );
        return intersectsExtendedViewport;
      }
    }
    this.logInfo(`isVisible: returning true (no viewport check)`);
    return true;
  },

  /**
   * Given an Array of HTMLElements it returns visible HTMLElement or null
   * @param {Node|NodeList} nodes - A NodeList or single Node of type ELEMENT_NODE
   * @param {boolean} shouldBeInsideViewport - Optional. If true the element should also be inside the viewport to be considered visible. Defaults true
   * @returns {Node|null} - The first visible Node or null
   */
  getFirstVisible: function (nodes, shouldBeInsideViewport = true) {
    this.logInfo(
      `getFirstVisible called with shouldBeInsideViewport: ${shouldBeInsideViewport}`,
    );

    if (!nodes) {
      this.logInfo(`getFirstVisible: no nodes provided`);
      return null;
    } else {
      nodes = Array.from(nodes);
    }

    this.logInfo(`getFirstVisible: checking ${nodes.length} nodes`);

    for (const node of nodes) {
      if (this.isVisible(node, shouldBeInsideViewport, false, false)) {
        this.logInfo(`getFirstVisible: found visible node`);
        return node;
      }
    }

    this.logInfo(`getFirstVisible: no visible nodes found`);
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
    this.logInfo(
      `getAllVisibleNodes called with shouldBeInsideViewport: ${shouldBeInsideViewport}, lengthLimit: ${lengthLimit}`,
    );

    if (!nodes) {
      this.logInfo(`getAllVisibleNodes: no nodes provided`);
      return null;
    } else {
      nodes = Array.from(nodes);
    }

    this.logInfo(`getAllVisibleNodes: checking ${nodes.length} nodes`);
    let visibleNodes = null;

    for (const node of nodes) {
      if (this.isVisible(node, shouldBeInsideViewport, false, false)) {
        if (visibleNodes) {
          visibleNodes.push(node);
        } else {
          visibleNodes = [node];
        }

        if (visibleNodes.length === lengthLimit) {
          this.logInfo(
            `getAllVisibleNodes: reached length limit ${lengthLimit}`,
          );
          break;
        }
      }
    }

    const count = visibleNodes ? visibleNodes.length : 0;
    this.logInfo(`getAllVisibleNodes: found ${count} visible nodes`);
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
    this.logInfo(
      `getAllVisibleNodesOutsideViewport called with useOutsideLimit: ${useOutsideLimit}`,
    );

    if (!nodes) {
      this.logInfo(`getAllVisibleNodesOutsideViewport: no nodes provided`);
      return null;
    } else {
      nodes = Array.from(nodes);
    }

    this.logInfo(
      `getAllVisibleNodesOutsideViewport: checking ${nodes.length} nodes`,
    );
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

    const count = visibleNodes ? visibleNodes.length : 0;
    this.logInfo(
      `getAllVisibleNodesOutsideViewport: found ${count} visible nodes outside viewport`,
    );
    return visibleNodes;
  },

  /**
   * Creates a link element with proper YouTube styling
   * @param {string} url - URL to create a link for
   * @returns {HTMLElement} - Anchor element
   */
  createLinkElement: function (url) {
    this.logInfo(`createLinkElement called for URL: ${url}`);
    const link = document.createElement("a");
    link.href = url;
    link.textContent = url;
    link.rel = "nofollow";
    link.target = "_blank";
    link.dir = "auto";
    link.className = "yt-simple-endpoint style-scope yt-formatted-string";
    this.logInfo(`createLinkElement: created link element`);
    return link;
  },

  /**
   * Converts a timecode string to seconds
   * @param {string} timecode - Timecode in format HH:MM:SS or MM:SS
   * @returns {number} - Total seconds
   */
  convertTimecodeToSeconds: function (timecode) {
    this.logInfo(`convertTimecodeToSeconds called with: ${timecode}`);
    const parts = timecode.split(":").map(Number);

    let result = 0;
    if (parts.length === 2) {
      // Format: MM:SS
      result = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // Format: HH:MM:SS
      result = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    this.logInfo(
      `convertTimecodeToSeconds: converted ${timecode} to ${result} seconds`,
    );
    return result;
  },

  /**
   * Gets the current video ID from the URL
   * @returns {string} - The YouTube video ID
   */
  getCurrentVideoId: function () {
    this.logInfo(`getCurrentVideoId called`);
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get("v") || "";
    this.logInfo(`getCurrentVideoId: found video ID: ${videoId}`);
    return videoId;
  },

  /**
   * Creates a timecode link element with proper YouTube styling
   * @param {string} timecode - Timecode string (e.g., "05:36")
   * @returns {HTMLElement} - Span element containing the timecode link
   */
  createTimecodeLink: function (timecode) {
    this.logInfo(`createTimecodeLink called with: ${timecode}`);
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
    this.logInfo(`convertUrlsToLinks called with text length: ${text.length}`);
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

    this.logInfo(`convertUrlsToLinks: created ${linkCount} links`);
    return container;
  },

  /**
   * Creates a formatted content element from the original text
   * @param {string} text - The original description text
   * @returns {HTMLElement} - Formatted span element
   */
  createFormattedContent: function (text) {
    this.logInfo(
      `createFormattedContent called with text length: ${text.length}`,
    );
    const contentElement = document.createElement("span");
    contentElement.className =
      "yt-core-attributed-string yt-core-attributed-string--white-space-pre-wrap";
    contentElement.dir = "auto";

    const textLines = text.split("\n");
    this.logInfo(
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

    this.logInfo(`createFormattedContent: created formatted content element`);
    return contentElement;
  },

  /**
   * Replace the first text note of the element
   * Any other node is retained as is
   * @param {HTMLElement} element - The element to update
   * @param {string} replaceText - The new text to insert
   */
  replaceTextOnly: function (element, replaceText) {
    this.logInfo(
      `replaceTextOnly called with text length: ${replaceText.length}`,
    );
    // Loop through child nodes to find the first text node
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = replaceText;
        this.logInfo(`replaceTextOnly: replaced first text node`);
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
    this.logInfo(`replaceContainerContent called`);
    // Clear existing content
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Add new content
    container.appendChild(newContent);
    this.logInfo(`replaceContainerContent: replaced container content`);
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
    this.logInfo(
      `detectSupportedLanguage called with text length: ${text.length}, maxRetries: ${maxRetries}, minProbability: ${minProbability}`,
    );
    const api = this.getBrowserOrChrome();
    let attempts = 0;

    while (attempts < maxRetries) {
      attempts++;
      this.logInfo(
        `detectSupportedLanguage: attempt ${attempts}/${maxRetries}`,
      );

      try {
        const result = await api.i18n.detectLanguage(text);

        // Filter detected languages by minProbability threshold
        const filteredLanguages = result.languages.filter(
          (l) => (l.percentage ?? 0) >= minProbability,
        );

        this.logInfo(
          `detectSupportedLanguage: found ${filteredLanguages.length} languages above ${minProbability}% confidence`,
        );

        // exact matches from VALID_BCP47_CODES
        const exactMatches = filteredLanguages
          .map((l) => l.language)
          .filter((lang) => this.SUPPORTED_BCP47_CODES.has(lang));

        if (exactMatches.length > 0) {
          this.logInfo(
            `detectSupportedLanguage: found ${exactMatches.length} exact matches: ${exactMatches.join(", ")}`,
          );
          return exactMatches;
        }

        // tolerant fallback matches using COMMON_BCP47_FALLBACKS
        const tolerantMatches = filteredLanguages
          .map((l) => this.COMMON_BCP47_FALLBACKS[l.language])
          .filter((lang) => this.SUPPORTED_BCP47_CODES.has(lang));

        if (tolerantMatches.length > 0) {
          this.logInfo(
            `detectSupportedLanguage: found ${tolerantMatches.length} fallback matches: ${tolerantMatches.join(", ")}`,
          );
          return tolerantMatches;
        }

        this.logInfo(
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

    this.logInfo(
      `detectSupportedLanguage: all attempts exhausted, returning null`,
    );
    return null;
  },
};

Object.freeze(window.YoutubeAntiTranslate);
