//Reusable global properties for scripts should be declared here to avoid redeclaration of already existing code or values
//These properties are added to the Window DOM and injected into the page to make it available to all scripts
//We are using Object.freeze() to make window.YoutubeAntiTranslate immutable
window.YoutubeAntiTranslate = {
  /** @type {float} */ VIEWPORT_EXTENSION_PERCENTAGE_FRACTION: 0.5,
  /** @type {float} */ VIEWPORT_OUTSIDE_LIMIT_FRACTION: 0.5,

  /** @type {string} */ LOG_PREFIX: "[YoutubeAntiTranslate]",

  /** @type {string} */ CORE_ATTRIBUTED_STRING_SELECTOR: ".yt-core-attributed-string",

  /** @type {Map<any, any>} */ cache: new Map(),

  /** 
   * @type {Fuction} 
   * @returns {string}
  */
  getPlayerSelector: function () {
    return window.location.pathname.startsWith("/shorts")
      ? "#shorts-player"
      : "ytd-player .html5-video-player";
  },

  /**
   * normalize spaces in a string so that there are no more than 1 space between words
   * @type {Fuction} 
   * @param {string} str 
   * @returns 
   */
  normalizeSpaces: function (str) {
    return str.replace(/\s+/g, ' ').trim();
  },

  /**
   * Given a Node it uses computed style to determine if it is visible
   * @type {Function}
   * @param {Node} node - A Node of type ELEMENT_NODE
   * @param {boolean} shouldCheckViewport - If true the element position is checked to be inside or outside the viewport. Viewport is extended based on VIEWPORT_EXTENSION_PERCENTAGE_FRACTION
   * @param {boolean} onlyOutsideViewport - only relevant when `shouldCheckViewport` is true. When this is also true the element is returned only if outside the viewport. By default the element is returned only if inside the viewport
   * @param {boolean} useOutsideLimit - when true, outside elements are limited to those contained inside the frame between the extended viewport and the limit based on VIEWPORT_OUTSIDE_LIMIT_FRACTION.
   * @return {boolean} - true if the node is computed as visible
   */
  isVisible: function (node, shouldCheckViewport = true, onlyOutsideViewport = false, useOutsideLimit = false) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      console.error(
        `${this.LOG_PREFIX} Provided node is not a valid Element.`,
        window.location.href
      );
      return false;
    }

    const element = /** @type {Element} */ (node);
    const style = getComputedStyle(element);

    // If computed style of element is invisible return false
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.visibility === 'collapse' ||
      parseFloat(style.opacity) === 0 ||
      element.offsetWidth === 0 ||
      element.offsetHeight === 0
    ) {
      return false;
    }

    if (shouldCheckViewport) {
      // Get element position relative to the viewport
      const rect = element.getBoundingClientRect();
      // Get viewport extended by VIEWPORT_EXTENSION_PERCENTAGE_FRACTION to allow some 'preload'
      const extendedHeight = window.innerHeight * this.VIEWPORT_EXTENSION_PERCENTAGE_FRACTION;
      const extendedWidth = window.innerWidth * this.VIEWPORT_EXTENSION_PERCENTAGE_FRACTION;

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
          return !fullyContained;
        }

        // Further extend the extended viewport by VIEWPORT_OUTSIDE_LIMIT_FRACTION to set the maximum outside limit
        const extraHeight = window.innerHeight * this.VIEWPORT_OUTSIDE_LIMIT_FRACTION;
        const extraWidth = window.innerWidth * this.VIEWPORT_OUTSIDE_LIMIT_FRACTION;

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

        return !fullyContained && intersectsOuterLimitViewport;
      }
      else {
        // Return true if ANY part of the element is INSIDE the extended viewport
        const intersectsExtendedViewport =
          rect.top < bottomBoundary &&
          rect.bottom > topBoundary &&
          rect.left < rightBoundary &&
          rect.right > leftBoundary;

        return intersectsExtendedViewport;
      }
    }
    return true;
  },

  /**
   * Given an Array of HTMLElements it returns visible HTMLElement or null
   * @type {Function}
   * @param {Node|NodeList} nodes - A NodeList or single Node of type ELEMENT_NODE
   * @param {boolean} shouldBeInsideViewport - If true the element should also be inside the viewport to be considered visible
   * @returns {Node|null} - The first visible Node or null
   */
  getFirstVisible: function (nodes, shouldBeInsideViewport = true) {
    if (!nodes) {
      return null;
    }
    else {
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
   * @type {Function}
   * @param {Node|NodeList} nodes - A NodeList or single Node of type ELEMENT_NODE
   * @param {boolean} shouldBeInsideViewport - If true the element should also be inside the viewport to be considered visible
   * @returns {Array<Node>|null} - A array of all the visible nodes or null
   */
  getAllVisibleNodes: function (nodes, shouldBeInsideViewport = true) {
    if (!nodes) {
      return null;
    }
    else {
      nodes = Array.from(nodes);
    }

    let /** @type {Array<Node>} */ visibleNodes = null;

    for (const node of nodes) {
      if (this.isVisible(node, shouldBeInsideViewport, false, false)) {
        if (visibleNodes) {
          visibleNodes.push(node);
        }
        else {
          visibleNodes = [node];
        }
      }
    }

    return visibleNodes;
  },

  /**
   * Given an Array of HTMLElements it returns visible HTMLElement or null only if they are loaded outside the viewport
   * @type {Function}
   * @param {Node|NodeList} nodes - A NodeList or single Node of type ELEMENT_NODE
   * @param {boolean} useOutsideLimit - when true, outside elements are limited to those contained inside the frame between the extended viewport and the limit based on VIEWPORT_OUTSIDE_LIMIT_FRACTION.
   * @returns {Array<Node>|null} - A array of all the visible nodes or null that are outside the viewport
   */
  getAllVisibleNodesOutsideViewport: function (nodes, useOutsideLimit = false) {
    if (!nodes) {
      return null;
    }
    else {
      nodes = Array.from(nodes);
    }

    let /** @type {Array<Node>} */ visibleNodes = null;

    for (const node of nodes) {
      if (this.isVisible(node, true, true, useOutsideLimit)) {
        if (visibleNodes) {
          visibleNodes.push(node);
        }
        else {
          visibleNodes = [node];
        }
      }
    }

    return visibleNodes;
  },

  /**
   * Creates a link element with proper YouTube styling
   * @type {Function}
   * @param {string} url - URL to create a link for
   * @returns {HTMLElement} - Anchor element
   */
  createLinkElement: function (url) {
    const link = document.createElement("a");
    link.href = url;
    link.textContent = url;
    link.rel = "nofollow";
    link.target = "_blank";
    link.dir = "auto";
    link.className = "yt-simple-endpoint style-scope yt-formatted-string";
    return link;
  },

  /**
   * Converts a timecode string to seconds
   * @type {Function}
   * @param {string} timecode - Timecode in format HH:MM:SS or MM:SS
   * @returns {number} - Total seconds
   */
  convertTimecodeToSeconds: function (timecode) {
    const parts = timecode.split(":").map(Number);

    if (parts.length === 2) {
      // Format: MM:SS
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // Format: HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    return 0;
  },

  /**
   * Gets the current video ID from the URL
   * @type {Function}
   * @returns {string} - The YouTube video ID
   */
  getCurrentVideoId: function () {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("v") || "";
  },

  /**
   * Creates a timecode link element with proper YouTube styling
   * @type {Function}
   * @param {string} timecode - Timecode string (e.g., "05:36")
   * @returns {HTMLElement} - Span element containing the timecode link
   */
  createTimecodeLink: function (timecode) {
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
   * @type {Function}
   * @param {string} text - Text that may contain URLs and timecodes
   * @returns {HTMLElement} - Span element with clickable links
   */
  convertUrlsToLinks: function (text) {
    const container = document.createElement("span");
    // Group 1: URL (https?:\/\/[^\s]+)
    // Group 2: Full timecode match including preceding space/start of line `(?:^|\s)((?:\d{1,2}:)?\d{1,2}:\d{2})`
    // Group 3: The actual timecode `(\d{1,2}:)?\d{1,2}:\d{2}`
    const combinedPattern =
      /(https?:\/\/[^\s]+)|((?:^|\s)((?:\d{1,2}:)?\d{1,2}:\d{2}))(?=\s|$)/g;

    let lastIndex = 0;
    let match;

    while ((match = combinedPattern.exec(text)) !== null) {
      const urlMatch = match[1];
      const timecodeFullMatch = match[2]; // e.g., " 1:23:45" or "1:23:45" if at start
      const timecodeValue = match[3]; // e.g., "1:23:45"

      // Add text segment before the match
      if (match.index > lastIndex) {
        container.appendChild(
          document.createTextNode(text.substring(lastIndex, match.index))
        );
      }

      if (urlMatch) {
        // It's a URL
        const linkElement = this.createLinkElement(urlMatch);
        container.appendChild(linkElement);
        lastIndex = combinedPattern.lastIndex; // Use regex lastIndex for URLs
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
      }
      // No else needed, as the regex ensures either group 1 or group 3 matched
    }

    // Add remaining text after the last match
    if (lastIndex < text.length) {
      container.appendChild(document.createTextNode(text.substring(lastIndex)));
    }

    return container;
  },

  /**
   * Creates a formatted content element from the original text
   * @type {Function}
   * @param {string} text - The original description text
   * @returns {HTMLElement} - Formatted span element
   */
  createFormattedContent: function (text) {
    const contentElement = document.createElement("span");
    contentElement.className =
      "yt-core-attributed-string yt-core-attributed-string--white-space-pre-wrap";
    contentElement.dir = "auto";

    const textLines = text.split("\n");
    textLines.forEach((line, index) => {
      const lineElement = this.convertUrlsToLinks(line);
      contentElement.appendChild(lineElement);

      // Add line breaks between lines, but not after the last line
      if (index < textLines.length - 1) {
        contentElement.appendChild(document.createElement("br"));
      }
    });

    return contentElement;
  },

  /**
   * Replace the first text note of the element
   * Any other node is retained as is
   * @type {Function}
   * @param {HTMLElement} element - The element to update
   * @param {string} replaceText - The new text to insert
   */
  replaceTextOnly: function (element, replaceText) {
    // Loop through child nodes to find the first text node
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = replaceText;
        break; // stop after updating the first text node
      }
    }
  },

  /**
   * Replaces the content of a container with new content
   * @type {Function}
   * @param {HTMLElement} container - The container to update
   * @param {HTMLElement} newContent - The new content to insert
   */
  replaceContainerContent: function (container, newContent) {
    // Clear existing content
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Add new content
    container.appendChild(newContent);
  }
}

// Make object immutable
Object.freeze(window.YoutubeAntiTranslate)
