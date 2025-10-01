/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unsafe-function-type */
/* eslint-disable  @typescript-eslint/no-wrapper-object-types */

// Extend the Window interface to include the YoutubeAntiTranslate global object
// This allows TypeScript to recognize and provide type checking for window.YoutubeAntiTranslate
// when it is used in other parts of the codebase.
interface Window {
  /** The extension global window.YoutubeAntiTranslate object implemented in `/app/src/global.js` */
  YoutubeAntiTranslate: {
    // Describe the shape of the YoutubeAntiTranslate object in `/app/src/global.js`
    // Please keep this in sync with the implementation in `/app/src/global.js` for IntelliSense support
    // and type checking when using this global object in other parts of the codebase.

    VIEWPORT_EXTENSION_PERCENTAGE_FRACTION: number;
    VIEWPORT_OUTSIDE_LIMIT_FRACTION: number;
    MAX_ATTEMPTS: number;
    LOG_PREFIX: string;
    LOG_LEVELS: { [key: string]: number };
    currentLogLevel: number;
    /**
     * Sets the current log level.
     * @param levelName - The name of the log level (e.g., "INFO", "DEBUG").
     */
    setLogLevel: (
      levelName: "NONE" | "DEBUG" | "INFO" | "WARN" | "ERROR",
    ) => void;

    CORE_ATTRIBUTED_STRING_SELECTOR: ".yt-core-attributed-string";
    ALL_ARRAYS_VIDEOS_SELECTOR: `ytd-video-renderer, ytd-rich-item-renderer, ytd-compact-video-renderer, ETC...`;
    ALL_ARRAYS_SHORTS_SELECTOR: `div.style-scope.ytd-rich-item-renderer, ytm-shorts-lockup-view-model`;

    logWarning: (message?: string, ...optionalParams: any[]) => void;

    logInfo: (message?: string, ...optionalParams: any[]) => void;

    logDebug: (message?: string, ...optionalParams: any[]) => void;

    /** Use only for app errors */
    logError: (message?: string, ...optionalParams: any[]) => void;

    /**
     * Creates a debounced version of a function with per-signature queueing.
     * The function will be executed at most once during the given wait interval
     *
     * Ensures any unique signature:
     * - First call executes immediately at the first callback. (and saves in an "executed" map)
     * - The first identical call within waitMinMs is added to a queue.
     * - Further identical calls within waitMinMs are neither executed nor queued.
     * - On new time frame window: a new empty executed map is created and the queued calls are executed. Any calls executed from the queue are also saved in the new "executed" map.
     *
     * The minimum time in the queue is measured from the last execution time and uses `requestAnimationFrame` to align with the browser's repaint cycle
     * (or falls back to setTimeout ~16 if document.hidden).
     *
     * @param func - The function to debounce/throttle.
     * @param waitMinMs - Minimum time between invocations (ms) - defaults to 90 milliseconds.
     * @param includeArgsInSignature - If true, the function arguments are included in the signature to differentiate
     *                                 calls with different args. Default: false.
     * @param getSignature - Optional function to derive signature from (ctx, args).
     *                       Default: func ref + JSON.stringify(args).
     */
    debounce: (
      func: Function,
      waitMinMs: number,
      includeArgsInSignature?: boolean,
      getSignature?: (ctx: any, args: any[]) => string,
    ) => (...args: any[]) => Function;

    /**
     * Retrieves a deserialized object from session storage.
     * @param key - The session key that should have the value under
     * @return The deserialized value or null if not found or on error
     */
    getSessionCache: (key: string) => any | null;

    /**
     * Stores a value in session storage after serializing
     * @param key - The session key used to store the value under
     * @param value - The value to store, will be serialized to JSON
     */
    setSessionCache: (key: string, value: any) => void;

    getPlayerSelector: () => string;

    /**
     * Safely returns the browser API object, preferring `browser` over `chrome`.
     * @returns The browser API object.
     */
    getBrowserOrChrome: () => any;

    /**
     * Checks if the browser is Firefox or Firefox-based (like Waterfox, Pale Moon, etc.).
     * @returns true if the browser is Firefox or Firefox-based (like Waterfox, Pale Moon, etc.), false otherwise
     */
    isFirefoxBasedBrowser: () => boolean;

    /**
     * Detects if we are currently on the mobile YouTube site (m.youtube.com)
     * @returns true if on mobile site, false otherwise
     */
    isMobile: () => boolean;

    /**
     * Normalize spaces in a string so that there are no more than 1 space between words
     * @param str - The string to normalize
     * @returns The normalized string
     */
    normalizeSpaces: (str: string) => string;

    /**
     * Processes a string with normalization and trimming options.
     * @param str - The string to process.
     * @param options - Configuration options for processing.
     * @param options.ignoreCase - If true, converts to lowercase. Default true
     * @param options.normalizeSpaces - If true, replaces consecutive whitespace with a single space. Default true
     * @param options.normalizeNFKC - If true, applies Unicode Normalization Form Compatibility Composition (NFKC). Default true
     * @param options.ignoreInvisible - If true, removes invisible/zero-width Unicode characters. Default true
     * @param options.trim - If true, trims both leading and trailing whitespace. Default true
     * @param options.trimLeft - If true, trims leading whitespace. Ignored if `trim` is true. Default false
     * @param options.trimRight - If true, trims trailing whitespace. Ignored if `trim` is true. Default false
     * @returns The processed string.
     */
    processString: (
      str: string,
      options?: {
        ignoreCase?: boolean | true;
        normalizeSpaces?: boolean | true;
        normalizeNFKC?: boolean | true;
        ignoreInvisible?: boolean | true;
        trim?: boolean | true;
        trimLeft?: boolean | false;
        trimRight?: boolean | false;
      },
    ) => string;

    /**
     * Advanced string equality comparison with optional normalization and trimming.
     * @param str1 - First string to compare.
     * @param str2 - Second string to compare.
     * @param options - Configuration options for comparison.
     * @param options.ignoreCase - If true, comparison is case-insensitive. Default true
     * @param options.normalizeSpaces - If true, replaces consecutive whitespace with a single space. Default true
     * @param options.normalizeNFKC - If true, applies Unicode Normalization Form Compatibility Composition (NFKC). Default true
     * @param options.ignoreInvisible - If true, removes invisible/zero-width Unicode characters. Default true
     * @param options.trim - If true, trims both leading and trailing whitespace. Default true
     * @param options.trimLeft - If true, trims leading whitespace. Ignored if `trim` is true. Default false
     * @param options.trimRight - If true, trims trailing whitespace. Ignored if `trim` is true. Default false
     * @returns Whether the two processed strings are equal.
     */
    isStringEqual: (
      str1: string,
      str2: string,
      options?: {
        ignoreCase?: boolean | true;
        normalizeSpaces?: boolean | true;
        normalizeNFKC?: boolean | true;
        ignoreInvisible?: boolean | true;
        trim?: boolean | true;
        trimLeft?: boolean | false;
        trimRight?: boolean | false;
      },
    ) => boolean;

    /**
     * Advanced string includes check with optional normalization and trimming.
     * @param container - The string to check in.
     * @param substring - The string to look for.
     * @param options - Configuration options for comparison.
     * @param options.ignoreCase - If true, comparison is case-insensitive. Default true
     * @param options.normalizeSpaces - If true, replaces consecutive whitespace with a single space. Default true
     * @param options.normalizeNFKC - If true, applies Unicode Normalization Form Compatibility Composition (NFKC). Default true
     * @param options.ignoreInvisible - If true, removes invisible/zero-width Unicode characters. Default true
     * @param options.trim - If true, trims both leading and trailing whitespace. Default true
     * @param options.trimLeft - If true, trims leading whitespace. Ignored if `trim` is true. Default false
     * @param options.trimRight - If true, trims trailing whitespace. Ignored if `trim` is true. Default false
     * @returns Whether the processed container includes the processed substring.
     */
    doesStringInclude: (
      container: string,
      substring: string,
      options?: {
        ignoreCase?: boolean | true;
        normalizeSpaces?: boolean | true;
        normalizeNFKC?: boolean | true;
        ignoreInvisible?: boolean | true;
        trim?: boolean | true;
        trimLeft?: boolean | false;
        trimRight?: boolean | false;
      },
    ) => boolean;

    /**
     * Advanced string replace with optional normalization and trimming.
     * @param input - The original string to operate on.
     * @param pattern - The pattern to replace. If a string, treated as a literal substring.
     * @param replacement - The replacement string.
     * @param options - Configuration options.
     * @param options.ignoreCase - If true, performs case-insensitive replacement. Default true
     * @param options.normalizeSpaces - If true, replaces all whitespace sequences with a single space before matching. Default true
     * @param options.normalizeNFKC - If true, applies Unicode Normalization Form Compatibility Composition (NFKC). Default true
     * @param options.ignoreInvisible - If true, removes invisible/zero-width Unicode characters. Default true
     * @param options.trim - If true, trims leading and trailing whitespace before processing. Default true
     * @param options.trimLeft - If true, trims leading whitespace (ignored if `trim` is true). Default false
     * @param options.trimRight - If true, trims trailing whitespace (ignored if `trim` is true). Default false
     * @returns The resulting string after replacement.
     */
    stringReplaceWithOptions: (
      input: string,
      pattern: string | RegExp,
      replacement: string,
      options?: {
        ignoreCase?: boolean | true;
        normalizeSpaces?: boolean | true;
        normalizeNFKC?: boolean | true;
        ignoreInvisible?: boolean | true;
        trim?: boolean | true;
        trimLeft?: boolean | false;
        trimRight?: boolean | false;
      },
    ) => string;

    /**
     * Given a Node it uses computed style to determine if it is visible
     * @param node - A Node of type ELEMENT_NODE
     * @param shouldCheckViewport - Optional. If true the element position is checked to be inside or outside the viewport. Viewport is extended based on
     *                              VIEWPORT_EXTENSION_PERCENTAGE_FRACTION. Defaults true
     * @param onlyOutsideViewport - Optional. only relevant when `shouldCheckViewport` is true. When this is also true the element is returned only if fully outside
     *                              the viewport. By default the element is returned only if inside the viewport. Defaults false
     * @param useOutsideLimit - Optional. when true, outside elements are limited to those contained inside the frame between the extended viewport and the
     *                          limit based on VIEWPORT_OUTSIDE_LIMIT_FRACTION. Defaults false
     * @return true if the node is computed as visible
     */
    isVisible: (
      node: Node | null | undefined,
      shouldCheckViewport?: boolean,
      onlyOutsideViewport?: boolean,
      useOutsideLimit?: boolean,
    ) => boolean;

    /**
     * Given an Array of HTMLElements it returns visible HTMLElement or null
     * @param nodes - A NodeList or single Node of type ELEMENT_NODE
     * @param shouldBeInsideViewport - Optional. If true the element should also be inside the viewport to be considered visible. Defaults true
     * @returns The first visible Node or null
     */
    getFirstVisible: (
      nodes: Node | NodeList | null | undefined,
      shouldBeInsideViewport?: boolean,
    ) => Node | null;

    /**
     * Given an Array of HTMLElements it returns visible HTMLElement or null
     * @param nodes - A NodeList or single Node of type ELEMENT_NODE
     * @param shouldBeInsideViewport - Optional. If true the element should also be inside the viewport to be considered visible. Defaults true
     * @param lengthLimit - Optional. Limit the number of items in the array. As soon as the correspoinding array length is reached,
     *                      the array is returned prematurelly. Defaults to Number.MAX_VALUE
     * @returns A array of all the visible nodes or null
     */
    getAllVisibleNodes: (
      nodes: Node | NodeList | null | undefined,
      shouldBeInsideViewport?: boolean,
      lengthLimit?: number,
    ) => Array<Node> | null;

    /**
     * Given an Array of HTMLElements it returns visible HTMLElement or null only if they are loaded outside the viewport
     * @param nodes - A NodeList or single Node of type ELEMENT_NODE
     * @param useOutsideLimit - Optional. when true, outside elements are limited to those contained inside the frame between
     *                                    the extended viewport and the limit based on VIEWPORT_OUTSIDE_LIMIT_FRACTION. Defaults false
     * @returns A array of all the visible nodes or null that are outside the viewport
     */
    getAllVisibleNodesOutsideViewport: (
      nodes: Node | NodeList | null | undefined,
      useOutsideLimit?: boolean,
    ) => Array<Node> | null;

    /**
     * Creates a link element with proper YouTube styling
     * @param url - URL to create a link for
     * @returns Anchor element
     */
    createLinkElement: (url: string) => HTMLElement;

    /**
     * Converts a timecode string to seconds
     * @param timecode - Timecode in format HH:MM:SS or MM:SS
     * @returns Total seconds
     */
    convertTimecodeToSeconds: (timecode: string) => number;

    /**
     * Strips all query params except "v" from "/watch" URL to:
     *  - avoid 404 when passed to YT oembed API (see https://github.com/zpix1/yt-anti-translate/issues/45)
     *  - improve cache lookups (different "t" params don't mean different vids, "v" is the only important one)
     * Url that do not include "/watch" are returned as is
     * @param {string} url "/watch?app=desktop&v=ghuLDyUEZmY&t=472s" or https://www.youtube.com/watch?app=desktop&v=ghuLDyUEZmY&t=472s)
     * @returns {string} "/watch?v=ghuLDyUEZmY" or "https://www.youtube.com/watch?v=ghuLDyUEZmY"
     */
    stripNonEssentialParams: (url: string) => string;

    /**
     * Identify if the href is advertisement
     * @param href - the href to check
     * @returns true if href is recognized as advertisement
     */
    isAdvertisementHref: (href: string) => boolean;

    /**
     * Gets the current video ID from the URL
     * @returns The YouTube video ID - empty string if not found
     */
    getCurrentVideoId: () => string | "";

    /**
     * Gets current theme
     * link color in dark theme: rgb(62, 166, 255)
     * link color in light theme: rgb(6, 95, 212)
     * @returns true if dark theme, false if light theme
     */
    isDarkTheme: () => boolean;

    /**
     * Creates a timecode link element with proper YouTube styling
     * @param timecode - Timecode string (e.g., "05:36")
     * @returns Span element containing the timecode link
     */
    createTimecodeLink: (timecode: string) => HTMLElement;

    /**
     * Creates a styled link for hashtag or mention
     * @param {"hashtag"|"mention"} type - Type of link to create
     * @param {string} value - Hashtag (without #) or mention (without @)
     * @returns {HTMLElement} - Span element containing the styled link
     */
    createTagLink: (type: "hashtag" | "mention", value: string) => HTMLElement;

    /**
     * Converts URLs and timecodes in text to clickable links
     * @param text - Text that may contain URLs and timecodes
     * @returns Span element with clickable links
     */
    convertUrlsToLinks: (text: string) => HTMLElement;

    /**
     * Creates a formatted content element from the original text
     * @param text - The original description text
     * @returns Formatted span element
     */
    createFormattedContent: (text: string) => HTMLElement;

    /**
     * Replace the first text node of the element
     * Any other node is retained as is
     * @param element - The element to update
     * @param replaceText - The new text to insert
     */
    replaceTextOnly: (element: HTMLElement, replaceText: string) => void;

    /**
     * Get the first text node of the element
     * Any other node is retained as is
     * @param element - The element to inspect
     */
    getFirstTextNode: (element: HTMLElement) => Text | null;

    /**
     * Replaces the content of a container with new content
     * @param container - The container to update
     * @param newContent - The new content to insert
     */
    replaceContainerContent: (
      container: HTMLElement,
      newContent: HTMLElement,
    ) => void;

    SUPPORTED_BCP47_CODES: Set<string>;

    COMMON_BCP47_FALLBACKS: { [key: string]: string };

    /**
     * Attempts to detect the closest YouTube Supported BCP-47 language code(s) from the given text.
     * Uses the browser/chrome i18n.detectLanguage API with retries and filtering.
     * @param text - The input text to detect the language from.
     * @param maxRetries - Optional - Maximum number of retries if detection results are not valid. Defaults to 3
     * @param minProbability - Optional - Minimum confidence percentage (0-100) to accept a detected language. Defaults to 50
     * @returns Resolves with an array of valid BCP-47 language codes that match or closely fallback to supported languages,
     *          or null on failure or if no suitable match is found within retries.
     */
    detectSupportedLanguage: (
      text: string,
      maxRetries?: number,
      minProbability?: number,
    ) => Promise<string[] | null>;

    /**
     * Retrieves the settings object for the YouTube Anti-Translate extension.
     * First, it attempts to read the settings from a script tag in the DOM.
     * If not found or invalid, it falls back to reading from Chrome's synchronized storage.
     * If neither method is available, it returns an empty object.
     * @returns The extension settings object
     */
    getSettings: () => Promise<{
      disabled?: boolean;
      autoreloadOption?: boolean;
      untranslateTitle?: boolean;
      whiteListUntranslateTitle?: string[];
      untranslateAudio?: boolean;
      untranslateAudioOnlyAI?: boolean;
      whiteListUntranslateAudio?: string[];
      untranslateDescription?: boolean;
      whiteListUntranslateDescription?: string[];
      untranslateChapters?: boolean;
      whiteListUntranslateChapters?: string[];
      untranslateChannelBranding?: boolean;
      whiteListUntranslateChannelBranding?: string[];
      untranslateNotification?: boolean;
      untranslateThumbnail?: boolean;
      whiteListUntranslateThumbnail?: string[];
      youtubeDataApiKey?: string | null;
    }>;

    /**
     * Make a GET request. Its result will be cached in sessionStorage and will return same promise for parallel requests.
     * @param url - The URL to fetch data from
     * @param postData - Optional. If passed, will make a POST request with this data
     * @param headersData - Optional. Headers to be sent with the request, defaults to {"content-type": "application/json"}
     * @param doNotCache - Optional. If true, the result will not be cached in sessionStorage, only same promise will be returned for parallel requests
     * @param cacheDotNotationProperty - Optional. Specify the property name to extract from the response data json for limited caching
     *                                   (e.g. "title" to cache only the title of the response data or "videoDetails.title" to cache the title of the object videoDetails).
     *                                   If not specified, and doNotCache is false, the whole response data will be cached
     *                                   NOTE: Must be a valid property of the response data json starting from the root level. Use "." for nested properties.
     *                                   If the property is not found, it will cache null.
     *                                   When cached by this cacheDotNotationProperty, when retieved "data" will be null and value will be set in "cachedWithDotNotation" property
     * @returns The response object and the data from the response
     */
    cachedRequest: (
      url: string,
      postData?: string | null,
      headersData?: { [key: string]: string },
      doNotCache?: boolean,
      cacheDotNotationProperty?: string,
    ) => Promise<{
      response?: Response;
      data?: any;
      cachedWithDotNotation?: any;
    }>;

    /**
     * Converts a value to a JSON hierarchy based on dot notation properties.
     * @param value - The value to convert.
     * @param dotNotationProperty - The dot notation property to create the hierarchy
     * @returns The resulting JSON hierarchy.
     */
    jsonHierarchy: (value: any, dotNotationProperty: string) => object;

    /**
     * Gets a property from a JSON object using dot notation.
     * @param json - The JSON object to search.
     * @param dotNotationProperty - The dot notation property with hierarchy to retrieve.
     *                       (e.g. "title" to get only the title of the response data or "videoDetails.title" to get the title of the object videoDetails).
     *                       NOTE: Must be a valid property of the response data json starting from the root level. Use "." for nested properties.
     *                       If the property is not found, it will return null.
     *                       WARNING: This function does not support array indexing in dot notation (e.g. "items[0].id" is not supported).
     * @returns The value of the property or null if not found
     * */
    getPropertyByDotNotation: (
      json: object,
      dotNotationProperty: string,
    ) => any | null;

    /**
     * Extracts the YouTube video ID from a given URL.
     * Supports /watch?v=, /shorts/, and full URLs.
     * @param url - The YouTube URL to extract the video ID from
     *              Supported formats: &#42;/watch?v=VIDEO_ID&#42;, &#42;/shorts/VIDEO_ID&#42;, &#42;/embed/VIDEO_ID&#42;, &#42;i.ytimg.com/vi/VIDEO_ID&#42;, &#42;i.ytimg.com/vi_lc/VIDEO_ID&#42;
     * @returns The YouTube video ID or null if not found
     */
    extractVideoIdFromUrl: (url: string) => string | null;

    /**
     * Fetch video details from YouTube's internal API using youtubei endpoint
     * @param videoId - The YouTube video ID
     * @returns An object containing the response and video details or null if not found
     */
    getVideoTitleFromYoutubeI: (videoId: string) => Promise<{
      response: Response | null;
      data: {
        title: string | null;
        author_name: string | null;
        author_url: string | null;
        thumbnail_url: string | null;
        maxresdefault_url: string | null;
      } | null;
    } | null>;

    /**
     * Retrieves the SAPISID cookie value.
     * That is the value used in the Authorization header for YouTube's Internal API requests.
     * @returns The SAPISID cookie value or null if not found.
     */
    getSAPISID: () => string | null;

    /**
     * Retrieves the SAPISIDHASH value. This is used for authenticated requests to YouTube's internal API.
     * It combines the SAPISID cookie, current timestamp, and the origin URL, then hashes them using SHA-1.
     * @param origin - The origin URL, defaults to YouTube's main site or mobile site based on device type.
     *                 If not provided, it will use "https://m.youtube.com" for mobile and "https://www.youtube.com" for desktop.
     * @returns The SAPISIDHASH string or null if SAPISID cookie is not found.
     */
    getSAPISIDHASH: (origin?: string) => Promise<string | null>;

    /**
     * Retrieves the headers required for authenticated requests to YouTube's internal APIs.
     * @returns Headers object including Content-Type, Authorization (with SAPISIDHASH), Origin, X-Youtube-Client-Name, and X-Youtube-Client-Version.
     */
    getYoutubeIHeadersWithCredentials: () => Promise<{
      "Content-Type": string;
      Authorization?: string;
      Origin?: "https://m.youtube.com" | "https://www.youtube.com";
      "X-Youtube-Client-Name"?: string;
      "X-Youtube-Client-Version"?: string;
    }>;

    /**
     * Fetch collaborators items from YouTube I API based on a search query.
     * @param search_query - The search query string.
     * @returns Returns an array of collaborator items or null if no results.
     */
    getOriginalCollaboratorsItemsWithYoutubeI: (
      search_query: string,
    ) => Promise<Array<{
      name: string | null;
      avatarImage: string | null;
      url: string | null;
      navigationEndpointUrl: string | null;
      videoId: string | null;
    }> | null>;

    /**
     * Extract collaborator items from YouTube search JSON response.
     * @param json - The JSON response from YouTube search.
     * @returns Array of collaborator items.
     */
    extractCollaboratorsItemsFromSearch: (json: Object) => Array<{
      name: string | null;
      avatarImage: string | null;
      url: string | null;
      navigationEndpointUrl: string | null;
      videoId: string | null;
    }>;

    /**
     * Get the localized translation of "and" for a given BCP-47 language code.
     * If the language code is not found, defaults to "and".
     * @param languageCode - The BCP-47 language code (e.g., "en-US", "fr-FR").
     * @returns The localized translation of "and".
     */
    getLocalizedAnd: (languageCode: string) => string;

    /**
     * Get the natural width and height of an image from its source URL.
     * @param src - The source URL of the image.
     * @returns  An object containing the width and height of the image, or null if not available.
     */
    getImageSize: (
      src: string,
    ) => Promise<{ width: number | null; height: number | null }>;

    /**
     * Check if an image URL is valid and the image exists.
     * @param src - The image URL to check.
     * @returns True if the image exists, false otherwise.
     */
    isFoundImageSrc: (src: string) => Promise<boolean>;

    /**
     * Check if a channel is whitelisted.
     * @param whiteStoragePropertyName - The type of whitelist to check against.
     * @param handle - The channel handle (e.g. "@mrbeast"). At least one of handle, channelId, channelUrl or channelName must be provided.
     * @param channelId - The channel ID (e.g. "UC123456").
     * @param channelUrl - The channel URL (e.g. "https://www.youtube.com/@mrbeast" or "https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA").
     *                     URL like /user/ or /c/ are not supported.
     * @param channelName - Optional. The channel name (not used for whitelist check, only for logging).
     * @returns True if the channel is whitelisted, false otherwise.
     */
    isWhitelistedChannel: (
      whiteStoragePropertyName:
        | "whiteListUntranslateTitle"
        | "whiteListUntranslateAudio"
        | "whiteListUntranslateDescription"
        | "whiteListUntranslateChapters"
        | "whiteListUntranslateChannelBranding"
        | "whiteListUntranslateThumbnail",
      handle?: string,
      channelId?: string,
      channelUrl?: string,
      channelName?: string,
    ) => Promise<boolean>;

    /**
     * Retrieve the UCID of a channel using youtubei/v1/search
     * @param query - the YouTube channel handle (e.g. "@mrbeast" or "MrBeast")
     * @returns the UCID of the channel or null if not found
     */
    lookupChannelId: (
      query: string,
    ) => Promise<
      | { channelUcid: string | null; channelHandle: string | null }
      | null
      | undefined
    >;

    /**
     * Extract the Channel UCID (UC...) from a given YouTube channel URL using lookupChannelId() if needed
     * @param href - YouTube channel URL
     * @returns channel UCID
     */
    getChannelUCIDFromHref: (href: string) => Promise<string | null>;

    /**
     * Retrieved the Channel UCID (UC...) for the current Channel page using window.location and lookupChannelId() search
     * @returns channel UCID
     */
    getChannelUCID: () => Promise<string | null>;

    /**
     * Fetch the About/branding section of a YouTube channel.
     * @param ucid - Optional Channel ID (starts with "UC…"). Defaults to UCID of the current channel page if not provided.
     * @returns The title and description branding.
     */
    getChannelBrandingWithYoutubeI: (ucid?: string) => Promise<
      | {
          title: string | null;
          truncatedDescription: string | null;
          description: string | null;
          channelHandle: string | null;
        }
      | null
      | undefined
    >;

    /**
     * Retrieves the YouTube player response object in a resilient way that works
     * across desktop and mobile layouts.
     * @param playerEl - Player element if already located.
     * @returns The player response object or null if it cannot be found.
     */
    getPlayerResponseSafely: (
      playerEl: HTMLElement | null | undefined,
    ) => object | null;

    /**
     * Increases the video attempt attribute for a specific video element.
     * If the attribute does not exist, it initializes it to 1.
     * If the attribute exists, it increments its value by 1, up to a maximum defined by window.YoutubeAntiTranslate.MAX_ATTEMPTS
     * @param {HTMLElement} element - The HTML element to update the attribute on.
     * @param {string} attributeName - The name of the attribute to update.
     * @param {string} videoId - The video ID to associate with the attempt count.
     */
    increaseVideoAttemptAttribute: (
      element: HTMLElement,
      attributeName: string,
      videoId: string,
    ) => void;
  };
}
