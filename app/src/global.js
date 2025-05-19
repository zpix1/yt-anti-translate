//Reusable global properties for scripts should be declared here to avoid redeclaration of already existing constants
//These properties are added to the Window DOM and injected into the page to make it available to all scripts
//We are using Object.freeze() to make window.YoutubeAntiTranslate immutable
window.YoutubeAntiTranslate = {
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
   * Given a Node it uses computed style to determine if it is visible
   * @type {Function}
   * @param {Node} node - A Node of type ELEMENT_NODE
   * @return {boolean} - true if the node is computed as visible
   */
  isVisible: function (node) {
    let style;
    let /** @type {Element} */ element
    if (node.nodeType === Node.ELEMENT_NODE) {
      element = /** @type {Element} */ (node);
    }
    else {
      console.error(
        `${this.LOG_PREFIX} elem is not an Element or a Node`,
        window.location.href
      );
      return false;
    }

    style = getComputedStyle(element);

    if (
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    ) {
      return true;
    }
    return false;
  },

  /**
   * Given an Array of HTMLElements it returns visible HTMLElement or null
   * @type {Function}
   * @param {Node|NodeList} nodes - A NodeList or single Node of type ELEMENT_NODE
   * @returns {Node|null} - The first visible Node or null
   */
  getFirstVisible: function (nodes) {
    if (!nodes) {
      return null;
    }
    else if (!(nodes instanceof NodeList)) {
      nodes = [nodes];
    } else {
      nodes = Array.from(nodes);
    }

    for (const node of nodes) {
      if (this.isVisible(node)) {
        return node;
      }
    }

    return null;
  },

  /**
   * Given an Array of HTMLElements it returns visible HTMLElement or null
   * @type {Function}
   * @param {Node|NodeList} nodes - A NodeList or single Node of type ELEMENT_NODE
   * @returns {Array<Node>|null} - A array of all the visible nodes or null
   */
  getAllVisibleNodes: function (nodes) {
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
      if (this.isVisible(node)) {
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
