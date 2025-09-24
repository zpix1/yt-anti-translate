import { expect } from "@playwright/test";
import { test } from "../playwright.config";

import {
  handleRetrySetup,
  createBrowserContext,
  setupPageWithAuth,
  loadPageAndVerifyAuth,
} from "./helpers/TestSetupHelper";

// This test ensures the extension properly untranslated titles on the mobile site (m.youtube.com)
// for a known video URL. It focuses on verifying that the title retains its original English
// text rather than an auto-translated version.

test.describe("YouTube Anti-Translate extension on m.youtube.com", () => {
  test("Prevents mobile video title auto-translation", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    // Handle retries and prerequisite setup
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch a browser context with the extension loaded
    const context = await createBrowserContext(
      browserNameWithExtensions,
      undefined,
      true,
    );

    // Create a page in the context and ensure auth is applied
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    // Navigate to the mobile YouTube URL (with timestamp & extra params)
    const mobileVideoUrl =
      "https://m.youtube.com/watch?v=pe_ejTiIcSs&t=122s&pp=2AF6kAIB";
    await loadPageAndVerifyAuth(
      page,
      mobileVideoUrl,
      browserNameWithExtensions,
      true,
    );

    // Capture a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-extension-mobile-test-title.png`,
    });

    // The mobile layout renders the video title inside a slim container.
    // Wait for the extension to inject its fake untranslated node.
    const fakeNodeSelector = "#yt-anti-translate-fake-node-current-video";
    await page.waitForSelector(fakeNodeSelector, { timeout: 15000 });

    // Retrieve the title text
    const videoTitle = (
      await page.locator(fakeNodeSelector).textContent()
    )?.trim();
    console.log("Mobile video title:", videoTitle);

    // Expect the title to contain English letters and no Cyrillic characters
    expect(videoTitle).toMatch(/[A-Za-z]/);
    expect(videoTitle).not.toMatch(/[А-Яа-яЁё]/);

    // Also validate the document title
    const pageTitle = await page.title();
    console.log("Document title:", pageTitle);
    expect(pageTitle).toMatch("Lose 100 LBs, Win $250,000!");

    // Capture a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-extension-mobile-test-title.png`,
    });

    // Expand the description section ("Show more" button)
    const showMoreSelector = ".slim-video-information-show-more";
    await page.waitForSelector(showMoreSelector, { timeout: 15000 });
    await page.locator(showMoreSelector).click();

    // Wait for the original (untranslated) description text to appear
    const expectedText = "In Loving Memory of Coach Tyler Wall*";
    await page.getByText(expectedText);

    // Capture screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-extension-mobile-test-description.png`,
    });

    // Ensure console output is not excessive
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Clean up
    await context.close();
  });

  test("Restores original channel branding on mobile channel page", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    // Handle retries and prerequisite setup
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch a browser context with the extension loaded
    const context = await createBrowserContext(
      browserNameWithExtensions,
      undefined,
      true,
    );

    // Create a page in the context and ensure auth is applied
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    // Navigate to the MrBeast mobile channel videos tab
    const channelUrl = "https://m.youtube.com/@MrBeast/videos";
    await loadPageAndVerifyAuth(page, channelUrl, browserNameWithExtensions);

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-branding-header-mobile-test.png`,
    });

    // Wait for branding description text to appear (English original)
    const expectedBrandingText = "SUBSCRIBE FOR A COOKIE";
    await page.waitForSelector(`text=${expectedBrandingText}`, {
      timeout: 20000,
    });

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-branding-header-mobile-test.png`,
    });

    // Ensure console output is not excessive
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Clean up
    await context.close();
  });

  test("YouTube channel playlist page contains 'Popular Shorts' playlist", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/@NileRed/playlists",
      browserNameWithExtensions,
      true,
    );

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-playlists-mobile-test.png`,
    });

    // Locate the elements with the text "Popular Shorts"
    const popularShortsLocator = page.locator(
      'ytm-compact-playlist-renderer span:has-text("Popular Shorts")',
    );

    // Assert that at least one matching element exists
    const popularShortsCount = await popularShortsLocator.count();
    expect(popularShortsCount).toBeGreaterThan(0);

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-playlists-mobile-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube owned feed playlists page contains 'owned-playlist-playwright-test' playlist", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    /**
     * NOTE WELL
     * This test requires the account in use to have a playlist named "owned-playlist-playwright-test" with at least one video in it.
     * If missing you must create it manually as part of setting up the test account.
     */

    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/feed/playlists",
      browserNameWithExtensions,
      true,
    );

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-owned-playlists-mobile-test.png`,
    });

    // Wait for the video grid to appear
    await page.waitForSelector("ytm-rich-item-renderer");

    // --- Check Videos Tab ---
    const originalPlaylistTitle = "owned-playlist-playwright-test";
    const videoSelector = `ytm-rich-item-renderer:has-text("${originalPlaylistTitle}")`;

    const originalPlaylist = page.locator(videoSelector).first();
    if (await originalPlaylist.isVisible()) {
      await page.mouse.wheel(0, 500);
      await originalPlaylist.scrollIntoViewIfNeeded();
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {
        // empty
      }
    }

    console.log("Checking Videos tab for original title...");
    await expect(originalPlaylist).toBeVisible();
    console.log("Original video title found.");

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-owned-playlists-mobile-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube search results page contains NileRed 'Popular Shorts' playlist", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://m.youtube.com/results?search_query=nilered+popular+shorts",
      browserNameWithExtensions,
      true,
    );

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-search-result-playlist-mobile-test.png`,
    });

    // Wait for the video grid to appear
    await page.waitForSelector("ytm-compact-playlist-renderer");

    // --- Check Videos Tab ---
    const originalPlaylistTitle = "Popular Shorts";
    const videoSelector = `ytm-compact-playlist-renderer:has-text("${originalPlaylistTitle}")`;

    const originalPlaylist = page.locator(videoSelector).first();
    if (await originalPlaylist.isVisible()) {
      await page.mouse.wheel(0, 500);
      await originalPlaylist.scrollIntoViewIfNeeded();
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {
        // empty
      }
    }

    console.log("Checking Videos tab for original title...");
    await expect(originalPlaylist).toBeVisible();
    console.log("Original video title found.");

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-search-result-playlist-mobile-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });
});
