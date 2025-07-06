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
    );

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
    const expectedText =
      "Go start the business you’ve been dreaming of and visit ";
    await page.waitForSelector(`text=${expectedText}`, { timeout: 15000 });

    // Retrieve full page text and assert it contains the expected English fragment
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain(expectedText);

    // Capture screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-extension-mobile-test-description.png`,
    });

    // Ensure console output is not excessive
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Clean up
    await context.close();
  });
});
