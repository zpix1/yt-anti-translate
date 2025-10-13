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

(() => {
  // Your custom data to replace streamingData.adaptiveFormats
  const customAdaptiveFormats = [{}];

  // Simple logging function
  function log(message) {
    console.log(`[YoutubeAntiTranslate] ${message}`);
  }

  // Store the original ytInitialPlayerResponse
  let originalPlayerResponse = null;
  let isIntercepted = false;

  function getModifiedPlayerResponse(original) {
    if (!original) {
      return original;
    }

    try {
      // Create a deep copy to avoid modifying the original
      const modified = JSON.parse(JSON.stringify(original));

      // Replace streamingData.adaptiveFormats with custom data
      if (modified.streamingData && modified.streamingData.adaptiveFormats) {
        log(
          "Modifying streamingData.adaptiveFormats in ytInitialPlayerResponse",
        );
        modified.streamingData.adaptiveFormats = customAdaptiveFormats;
      }

      return modified;
    } catch (error) {
      log(`Error modifying player response: ${error.message}`);
      return original;
    }
  }

  // Intercept window['ytInitialPlayerResponse']
  function setupPlayerResponseInterception() {
    if (isIntercepted) {
      return;
    }

    // Check if ytInitialPlayerResponse already exists
    if (window["ytInitialPlayerResponse"]) {
      originalPlayerResponse = window["ytInitialPlayerResponse"];
      log("Found existing ytInitialPlayerResponse, storing original");
    }

    // Set up property descriptor to intercept access
    Object.defineProperty(window, "ytInitialPlayerResponse", {
      configurable: true,
      enumerable: true,
      get() {
        log("ytInitialPlayerResponse accessed - returning modified version");
        return getModifiedPlayerResponse(originalPlayerResponse);
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
      if (!url || !url.includes("m.youtube.com/youtubei/v1/player")) {
        return origFetch(input, init);
      }

      log(`Processing YouTube mobile player API request: ${url}`);
      const response = await origFetch(input, init);

      // Only process JSON responses that might contain streamingData
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return response;
      }

      try {
        // Clone the response to read the body
        const responseClone = response.clone();
        const jsonData = await responseClone.json();

        // Check if this response contains streamingData.adaptiveFormats
        if (jsonData.streamingData && jsonData.streamingData.adaptiveFormats) {
          log(
            `Found streamingData.adaptiveFormats, replacing with custom data`,
          );

          // Replace with your custom data
          jsonData.streamingData.adaptiveFormats = customAdaptiveFormats;

          // Create a new response with modified JSON
          const modifiedResponse = new Response(JSON.stringify(jsonData), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });

          return modifiedResponse;
        }
      } catch (error) {
        log(`Error processing JSON response: ${error.message}`);
      }

      return response;
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
    if (window["ytNetworkFetch"]) {
      log("ytNetworkFetch pre-existing → wrapping immediately");
      window.fetch = createRewriter(window["ytNetworkFetch"]);
    }
  })();
})();
