/*
 * Copyright (c) 2025 Ivan Baksheev
 * All rights reserved.
 *
 * Proprietary Source-Available License
 * ------------------------------------
 * Permission is granted, free of charge, to any person who receives
 * this file as part of the  extension YouTube Anti Translate
 * (the Software), to execute, copy, and modify this file solely for
 * the purpose of creating and maintaining forks of the Software,
 * provided that this copyright notice and license header are
 * preserved in all copies or substantial portions of the file.
 *
 * No other rights are granted. You may not sell, sublicense, or
 * distribute this file separately from the Software without prior
 * written permission from the copyright holder.
 *
 * This file is NOT covered by the MIT License that applies to other
 * parts of this project.
 *
 * For licensing inquiries, contact: dczpix@gmail.com
 */

const videoResponseCache = new Map();

const globalJsCopy = {
  LOG_PREFIX: "[YoutubeAntiTranslate]",
  LOG_LEVELS: {
    NONE: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4,
  },
  currentLogLevel: 4, // Default to WARN

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

  getSAPISID: function () {
    const match = document.cookie.match(/SAPISID=([^\s;]+)/);
    return match ? match[1] : null;
  },

  // SHA1 function (uses SubtleCrypto)
  sha1Hash: async function (msg) {
    const encoder = new TextEncoder();
    const data = encoder.encode(msg);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  },

  getSAPISIDHASH: async function (origin = "https://m.youtube.com") {
    const sapisid = this.getSAPISID();
    if (!sapisid) {
      this.logWarning("SAPISID cookie not found.");
      return null;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${timestamp} ${sapisid} ${origin}`;

    const hash = await this.sha1Hash(message);
    return `SAPISIDHASH ${timestamp}_${hash} SAPISID1HASH ${timestamp}_${hash} SAPISID3HASH ${timestamp}_${hash}`;
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
      Origin: "https://m.youtube.com",
      "X-Youtube-Client-Name": "1",
      "X-Youtube-Client-Version": "2.20250730.01.00",
    };
  },
};

async function getUntranslatedVideoResponseAsync(videoId) {
  const cacheKey = `video_response_mobile_async_${videoId}`;
  if (videoResponseCache.has(cacheKey)) {
    return videoResponseCache.get(cacheKey); // Return cached description if available
  }

  const body = {
    context: {
      client: {
        clientName: "MWEB",
        clientVersion: "2.20250730.01.00",
        originalUrl: document.location.href,
        hl: "lo", // Using "Lao" as default that is an unsupported (but valid) language of youtube
        // That always get the original language as a result
        gl: null,
        visitorData: null,
      },
    },
    playbackContext: null,
    serviceIntegrityDimensions: null,
    videoId,
  };

  const headers = await globalJsCopy.getYoutubeIHeadersWithCredentials();

  const response = await fetch(
    "https://m.youtube.com/youtubei/v1/player?prettyPrint=false&yt-anti-translate=true",
    {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
      credentials: "include", // Ensure cookies and correct Origin are sent
    },
  );

  const clonedResponse = response.clone();
  const json = await clonedResponse.json();

  // Ads do not properly work with this response so we are clearing the content of the response
  clearAdsProperties(json);

  // Add a self identification property
  json.ytAntiTranslate = true;

  if (json) {
    videoResponseCache.set(cacheKey, { bodyJson: json, response: response }); // Cache the player response for future use
  }

  return { bodyJson: json, response: response };
}

const sync = {
  post: function (url, headers, body) {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, false); // `false` = synchronous
    xhr.withCredentials = true; // Ensure cookies and credentials are sent
    for (const key in headers) {
      xhr.setRequestHeader(key, headers[key]);
    }
    xhr.send(body);
    return {
      status: xhr.status,
      responseText: xhr.responseText,
    };
  },

  // Minimal synchronous SHA-1 implementation
  sha1: function (msg) {
    function rotl(n, s) {
      return (n << s) | (n >>> (32 - s));
    }
    function toHex(val) {
      return (val >>> 0).toString(16).padStart(8, "0");
    }

    const msgBytes = new TextEncoder().encode(msg);
    const l = msgBytes.length;
    const words = new Array((((l + 8) >> 6) + 1) * 16).fill(0);
    for (let i = 0; i < l; i++) {
      words[i >> 2] |= msgBytes[i] << (24 - (i % 4) * 8);
    }
    words[l >> 2] |= 0x80 << (24 - (l % 4) * 8);
    words[words.length - 1] = l * 8;

    let h0 = 0x67452301;
    let h1 = 0xefcdab89;
    let h2 = 0x98badcfe;
    let h3 = 0x10325476;
    let h4 = 0xc3d2e1f0;

    for (let i = 0; i < words.length; i += 16) {
      const w = words.slice(i, i + 16);
      for (let t = 16; t < 80; t++) {
        w[t] = rotl(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1);
      }

      let a = h0,
        b = h1,
        c = h2,
        d = h3,
        e = h4;
      for (let t = 0; t < 80; t++) {
        const f =
          t < 20
            ? (b & c) | (~b & d)
            : t < 40
              ? b ^ c ^ d
              : t < 60
                ? (b & c) | (b & d) | (c & d)
                : b ^ c ^ d;
        const k =
          t < 20
            ? 0x5a827999
            : t < 40
              ? 0x6ed9eba1
              : t < 60
                ? 0x8f1bbcdc
                : 0xca62c1d6;
        const temp = (rotl(a, 5) + f + e + k + w[t]) >>> 0;
        e = d;
        d = c;
        c = rotl(b, 30) >>> 0;
        b = a;
        a = temp;
      }

      h0 = (h0 + a) >>> 0;
      h1 = (h1 + b) >>> 0;
      h2 = (h2 + c) >>> 0;
      h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0;
    }

    return (
      toHex(h0) +
      toHex(h1) +
      toHex(h2) +
      toHex(h3) +
      toHex(h4)
    ).toLowerCase();
  },

  getSAPISIDHASH: function (origin = "https://m.youtube.com") {
    const sapisid = globalJsCopy.getSAPISID();
    if (!sapisid) {
      globalJsCopy.logWarning("SAPISID cookie not found.");
      return null;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${timestamp} ${sapisid} ${origin}`;
    const hash = sync.sha1(message);
    return `SAPISIDHASH ${timestamp}_${hash} SAPISID1HASH ${timestamp}_${hash} SAPISID3HASH ${timestamp}_${hash}`;
  },

  getYoutubeIHeadersWithCredentials: function () {
    const sapisidhash = sync.getSAPISIDHASH();
    if (!sapisidhash) {
      globalJsCopy.logWarning(
        "getYoutubeIHeadersWithCredentials: SAPISID not found, user not logged in, returning default headers",
      );
      return {
        "Content-Type": "application/json",
      };
    }
    return {
      "Content-Type": "application/json",
      Authorization: sapisidhash,
      Origin: "https://m.youtube.com",
      priority: "u=0, i",
      "X-Youtube-Client-Name": "1",
      "X-Youtube-Client-Version": "2.20250730.01.00",
    };
  },

  getUntranslatedVideoResponse: function (videoId) {
    const cacheKey = `video_response_mobile_sync_${videoId}`;
    if (videoResponseCache.has(cacheKey)) {
      return videoResponseCache.get(cacheKey); // Return cached description if available
    }

    const body = {
      context: {
        client: {
          clientName: "MWEB",
          clientVersion: "2.20250730.01.00",
          originalUrl: document.location.href,
          hl: "lo", // Using "Lao" as default that is an unsupported (but valid) language of youtube
          // That always get the original language as a result
          gl: null,
          visitorData: null,
        },
      },
      playbackContext: null,
      serviceIntegrityDimensions: null,
      videoId,
    };

    const headers = sync.getYoutubeIHeadersWithCredentials();

    const response = sync.post(
      "https://m.youtube.com/youtubei/v1/player?prettyPrint=false&yt-anti-translate=true",
      headers,
      JSON.stringify(body),
    );

    const json = JSON.parse(response.responseText);

    // Ads do not properly work with this response so we are clearing the content of the response
    clearAdsProperties(json);

    // Add a self identification property
    json.ytAntiTranslate = true;

    if (json) {
      videoResponseCache.set(cacheKey, { bodyJson: json, response: response }); // Cache the player response for future use
    }

    return { bodyJson: json, response: response };
  },
};

(() => {
  // Store the original ytInitialPlayerResponse
  let originalPlayerResponse = null;
  let untranslatedPlayerResponse = null;
  let isIntercepted = false;

  // Intercept window['ytInitialPlayerResponse']
  function setupPlayerResponseInterception() {
    if (isIntercepted) {
      return;
    }

    // Check if ytInitialPlayerResponse already exists
    if (window.ytInitialPlayerResponse) {
      originalPlayerResponse = window.ytInitialPlayerResponse;
      globalJsCopy.logDebug(
        "Found existing ytInitialPlayerResponse, storing original",
      );
    }

    // Set up property descriptor to intercept access
    Object.defineProperty(window, "ytInitialPlayerResponse", {
      configurable: true,
      enumerable: true,
      get() {
        if (untranslatedPlayerResponse) {
          return untranslatedPlayerResponse;
        }

        if (originalPlayerResponse && originalPlayerResponse.ytAntiTranslate) {
          return originalPlayerResponse;
        }

        const videoId = globalJsCopy.getCurrentVideoId();
        if (!videoId) {
          return originalPlayerResponse;
        }
        const response = sync.getUntranslatedVideoResponse(videoId);
        untranslatedPlayerResponse = response?.bodyJson || null;
        globalJsCopy.logDebug(
          "Untranslated player response fetched",
          untranslatedPlayerResponse,
        );
        return untranslatedPlayerResponse;
      },
      set(value) {
        globalJsCopy.logDebug(
          "ytInitialPlayerResponse being set - storing original",
        );
        originalPlayerResponse = value;
      },
    });

    isIntercepted = true;
    globalJsCopy.logDebug(
      "ytInitialPlayerResponse interception setup complete",
    );
  }

  function createRewriter(origFetch) {
    return async function (input, init = {}) {
      const url = typeof input === "string" ? input : input.url;

      // Only process requests to the specific YouTube mobile player API
      if (
        !url ||
        !url.includes("m.youtube.com/youtubei/v1/player") ||
        url.includes("yt-anti-translate=true")
      ) {
        try {
          return origFetch(input, init);
        } catch {
          /* empty catch */
          // If we are executing YouTube requests as they are, we do not care if they fail
        }
      }

      try {
        const videoId = globalJsCopy.getCurrentVideoId();
        const origResponse = await getUntranslatedVideoResponseAsync(videoId);

        const responseJson = origResponse.bodyJson;

        if (window.ytInitialPlayerResponse !== undefined) {
          window.ytInitialPlayerResponse = responseJson;
        }
        // Create a new response with modified JSON
        const modifiedResponse = new Response(JSON.stringify(responseJson), {
          status: origResponse.response.status,
          statusText: origResponse.response.statusText,
          headers: origResponse.response.headers,
        });
        return modifiedResponse;
      } catch {
        try {
          return origFetch(input, init);
        } catch {
          /* empty catch */
          // If we are executing YouTube requests as they are, we do not care if they fail
        }
      }
    };
  }

  /* -----------------------------  4  INSTALL  ----------------------------- */
  (function install() {
    // Set up ytInitialPlayerResponse interception first
    try {
      setupPlayerResponseInterception();
    } catch (error) {
      globalJsCopy.logError(
        `Error setting up player response interception: ${error.message}`,
      );
    }

    /* 4-a. wrap whatever fetch exists right now (likely the native one) */
    globalJsCopy.logDebug("installing wrapper around current window.fetch");
    window.fetch = createRewriter(window.fetch.bind(window));

    /* 4-b. if YouTube later replaces fetch with ytNetworkFetch, re-wrap it */
    Object.defineProperty(window, "ytNetworkFetch", {
      configurable: true,
      set(fn) {
        globalJsCopy.logDebug("ytNetworkFetch assigned → wrapping it too");
        window.fetch = createRewriter(fn);
      },
      get() {
        return window.fetch;
      },
    });

    /* 4-c. if ytNetworkFetch was already present before our script ran,
            wrap it immediately (covers the 'parsed-but-not-executed' case) */
    if (window.ytNetworkFetch) {
      globalJsCopy.logDebug(
        "ytNetworkFetch pre-existing → wrapping immediately",
      );
      window.fetch = createRewriter(window.ytNetworkFetch);
    }
  })();
})();
function clearAdsProperties(json) {
  if (json?.playerAds && json?.playerAds?.length > 0) {
    json.playerAds = [];
  }
  if (json?.adSlots && json?.adSlots.length > 0) {
    json.adSlots = [];
  }
  if (json?.adBreakHeartbeatParams) {
    json.adBreakHeartbeatParams = null;
  }
}

// Export for testing (only in Node.js environment)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    sync,
    globalJsCopy,
  };
}
