import { expect } from "@playwright/test";
import { test } from "../playwright.config";

import {
  setupTestEnvironment,
  loadPageAndVerifyAuth,
  waitForSelectorOrRetryWithPageReload,
} from "./helpers/TestSetupHelper";

// This test ensures the extension properly untranslated titles on the mobile site (m.youtube.com)
// for a known video URL. It focuses on verifying that the title retains its original English
// text rather than an auto-translated version.
// This tests use locale th-TH (instead of ru-RU)

test.describe("YouTube Anti-Translate extension on m.youtube.com", () => {
  test("YouTube search results channel author name retain original content", async ({
    browserNameWithExtensions,
    localeString,
    isMobile,
  }, testInfo) => {
    // Handle retries and prerequisite setup
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    const searchUrl = "https://m.youtube.com/results?search_query=mr+beast";
    await loadPageAndVerifyAuth(
      page,
      searchUrl,
      browserNameWithExtensions,
      isMobile,
    );

    try {
      // Screenshot for visual verification
      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-search-result-mobile-test.png`,
      });
    } catch {
      // First screenshot is not essential so it is allowed to fail
    }

    // Wait until at least one channel renderer for MrBeast appears
    const channelRenderer = (
      await waitForSelectorOrRetryWithPageReload(
        page,
        'ytm-compact-channel-renderer h4:has-text("MrBeast")',
      )
    ).first();
    await expect(channelRenderer).toBeVisible();
    const authorText = (await channelRenderer.textContent()) ?? "";
    console.log("Search result author:", authorText.trim());

    // Check that original English text is present and Thai translation is absent
    expect(authorText).toContain("MrBeast");
    expect(authorText).not.toContain("มิสเตอร์บีสต์");

    // There is no description in the mobile search results

    // Screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-search-result-mobile-test.png`,
    });

    // Ensure console output not flooded
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close context
    await context.close();
  });

  test.fixme(
    "YouTube search results video with collaborator retain original content",
    async ({ browserNameWithExtensions, localeString, isMobile }, testInfo) => {
      // Handle retries and prerequisite setup
      const { context, page, consoleMessageCountContainer } =
        await setupTestEnvironment(
          testInfo,
          browserNameWithExtensions,
          localeString,
          isMobile,
        );

      const searchUrl =
        "https://m.youtube.com/results?search_query=mark+rober+can+you+safely+drink+your+own+pee";
      await loadPageAndVerifyAuth(
        page,
        searchUrl,
        browserNameWithExtensions,
        isMobile,
      );

      // Screenshot for visual verification
      try {
        await page.screenshot({
          path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-collaborator-video-search-result-mobile-test.png`,
        });
      } catch {
        // First screenshot is not essential so it is allowed to fail
      }

      // Wait until at least one video renderer for Mark Rober appears
      const videoRenderer = (
        await waitForSelectorOrRetryWithPageReload(
          page,
          'ytm-video-with-context-renderer:has-text("Mark Rober")',
        )
      ).first();
      await expect(videoRenderer).toBeVisible();

      // Locate the channel name element inside the renderer
      const authorLocator = videoRenderer
        .locator(
          "div.media-item-metadata .YtmBadgeAndBylineRendererHost .yt-core-attributed-string",
        )
        .first();
      await authorLocator.waitFor();
      await expect(authorLocator).toBeVisible();

      const authorText = (await authorLocator.textContent()) ?? "";
      console.log("Search result author:", authorText.trim());

      // Check that original English text is present and Thai translation is absent
      expect(authorText).toContain("MrBeast");
      expect(authorText).not.toContain("มิสเตอร์บีสต์");

      // Screenshot for visual verification
      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-collaborator-video-search-result-mobile-test.png`,
      });

      // Ensure console output not flooded
      expect(consoleMessageCountContainer.count).toBeLessThan(2000);

      // Close context
      await context.close();
    },
  );
});
