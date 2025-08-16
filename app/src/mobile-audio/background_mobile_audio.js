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

  getSAPISIDHASH: async function (origin = "https://m.youtube.com") {
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
      Origin: "https://m.youtube.com",
      "X-Youtube-Client-Name": "1",
      "X-Youtube-Client-Version": "2.20250730.01.00",
    };
  },
};

async function getOriginalVideoResponse(videoId) {
  const cacheKey = `video_response_mobile_${videoId}`;
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
    },
  );

  const clonedResponse = response.clone();
  const json = await clonedResponse.json();

  if (json?.playerAds && json?.playerAds?.length > 0) {
    json.playerAds = [];
  }
  if (json?.adSlots && json?.adSlots.length > 0) {
    json.adSlots = [];
  }
  if (json?.adBreakHeartbeatParams) {
    json.adBreakHeartbeatParams = null;
  }

  // Add a self identification property
  json.ytAntiTranslate = true;

  if (json) {
    videoResponseCache.set(cacheKey, { bodyJson: json, response: response }); // Cache the player response for future use
  }

  return { bodyJson: json, response: response };
}

(() => {
  // Simple logging function
  function log(message) {
    console.log(`[YoutubeAntiTranslate] ${message}`);
  }

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
      log("Found existing ytInitialPlayerResponse, storing original");
    }

    // Set up property descriptor to intercept access
    Object.defineProperty(window, "ytInitialPlayerResponse", {
      configurable: true,
      enumerable: true,
      get() {
        if (
          untranslatedPlayerResponse &&
          untranslatedPlayerResponse.ytAntiTranslate
        ) {
          return untranslatedPlayerResponse;
        }

        if (originalPlayerResponse && originalPlayerResponse.ytAntiTranslate) {
          return originalPlayerResponse;
        }

        const videoId = globalJsCopy.getCurrentVideoId();
        return getOriginalVideoResponse(videoId).then((response) => {
          untranslatedPlayerResponse = response?.bodyJson;
          return untranslatedPlayerResponse;
        });
      },
      set(value) {
        log("ytInitialPlayerResponse being set - storing original");
        originalPlayerResponse = value;
      },
    });

    isIntercepted = true;
    log("ytInitialPlayerResponse interception setup complete");
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
        return origFetch(input, init);
      }

      try {
        const videoId = globalJsCopy.getCurrentVideoId();
        const origResponse = await getOriginalVideoResponse(videoId);

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
        return origFetch(input, init);
      }
    };
  }

  /* -----------------------------  4  INSTALL  ----------------------------- */
  (function install() {
    // Set up ytInitialPlayerResponse interception first
    try {
      setupPlayerResponseInterception();
    } catch (error) {
      log(`Error setting up player response interception: ${error.message}`);
    }

    /* 4-a. wrap whatever fetch exists right now (likely the native one) */
    log("installing wrapper around current window.fetch");
    window.fetch = createRewriter(window.fetch.bind(window));

    /* 4-b. if YouTube later replaces fetch with ytNetworkFetch, re-wrap it */
    Object.defineProperty(window, "ytNetworkFetch", {
      configurable: true,
      set(fn) {
        log("ytNetworkFetch assigned → wrapping it too");
        window.fetch = createRewriter(fn);
      },
      get() {
        return window.fetch;
      },
    });

    /* 4-c. if ytNetworkFetch was already present before our script ran,
            wrap it immediately (covers the 'parsed-but-not-executed' case) */
    if (window.ytNetworkFetch) {
      log("ytNetworkFetch pre-existing → wrapping immediately");
      window.fetch = createRewriter(window.ytNetworkFetch);
    }
  })();
})();
