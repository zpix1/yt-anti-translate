import { expect, BrowserContext, Browser, Page } from "@playwright/test";
import { test } from "../playwright.config";
import { handleTestDistribution } from "./helpers/ExtensionsFilesHelper";
import {
  setupTestEnvironment,
  loadPageAndVerifyAuth,
  waitForSelectorOrRetryWithPageReload,
  getFirstVisibleLocator,
} from "./helpers/TestSetupHelper";

import "dotenv/config";

const attributedString =
  ":is(.yt-core-attributed-string, .ytAttributedStringHost)";
const channelDescriptionSelector =
  "yt-description-preview-view-model :is(.yt-truncated-text__truncated-text-content, .truncated-text-wiz__truncated-text-content, truncated-text-content.ytTruncatedTextTruncatedTextContent:not(.ytTruncatedTextHiddenTextContent)) > " +
  attributedString +
  ":first-child:visible";

// This are tests for additional features that benefit from Youtube Data API and a APIKey provided by the user
// AND
// Tests that use locale th-TH (instead of ru-RU)

test.describe("YouTube Anti-Translate extension - Extras", () => {
  test("YouTube channel branding header and about retain original content - WITH Api Key Set", async ({
    browserNameWithExtensions,
    localeString,
    isMobile,
  }, testInfo) => {
    test.skip(
      !process.env.YOUTUBE_API_KEY?.trim(),
      "YOUTUBE_API_KEY is required for this variant",
    );

    // --- Update Extension Settings and distribute a test copy ---
    // The object to be passed and inserted into the start.js file
    const configObject = { youtubeDataApiKey: process.env.YOUTUBE_API_KEY };
    handleTestDistribution(configObject);

    // Handle retries and prerequisite setup
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
        "../testDist",
      );

    // Create a new page
    await channelBrandingAboutTest(
      context,
      page,
      consoleMessageCountContainer,
      browserNameWithExtensions,
      localeString,
    );
  });

  test("YouTube channel branding header and about retain original content - WITHOUT Api Key (YouTubeI)", async ({
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
        "../../app",
      );

    // Create a new page
    await channelBrandingAboutTest(
      context,
      page,
      consoleMessageCountContainer,
      browserNameWithExtensions,
      localeString,
      "-youtubeI",
    );
  });

  test("Collaborators video has collaborator author, opens Collaborators popup, and retains original names (th-TH)", async ({
    browserNameWithExtensions,
    localeString,
    isMobile,
  }, testInfo) => {
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    try {
      await loadPageAndVerifyAuth(
        page,
        "https://www.youtube.com/watch?v=KRhofr57Na8",
        browserNameWithExtensions,
      );

      const uploadInfo = page
        .locator("#attributed-channel-name a:visible")
        .first();
      await expect(uploadInfo).toHaveText("Mark Rober และ MrBeast", {
        timeout: 15_000,
      });
      await uploadInfo.click();

      const dialog = page.locator("yt-dialog-view-model:visible");
      const markRober = dialog.locator('a[href*="UCY1kMZp36IQSyNx_9h4mpCg"]');
      const mrBeast = dialog.locator('a[href*="UCX6OQ3DkcsbYNE6H8uQQuVA"]');
      await expect(markRober).toHaveText("Mark Rober");
      await expect(mrBeast).toHaveText("MrBeast", { timeout: 15_000 });

      await page.screenshot({
        path: testInfo.outputPath(
          "youtube-collaborators-dialog-from-upload-info-test.png",
        ),
      });
      expect(consoleMessageCountContainer.count).toBeLessThan(2000);
    } finally {
      await context.close();
    }
  });

  async function channelBrandingAboutTest(
    context: BrowserContext | Browser,
    page: Page,
    consoleMessageCountContainer: { count: number },
    browserNameWithExtensions: string,
    localeString: string,
    addToScreenshotName: string = "",
  ) {
    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/@MrBeast",
      browserNameWithExtensions,
    );

    // Take a screenshot for visual verification
    try {
      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-branding-about${addToScreenshotName}-test.png`,
      });
    } catch {
      // First screenshot is not essential so it is allowed to fail
    }

    const header = page.locator("#page-header-container #page-header");
    const channelTitle = header.locator("h1").locator(attributedString);
    const channelDescription = header.locator(channelDescriptionSelector);
    const originalTitle = "MrBeast";
    const originalDescription = "SUBSCRIBE FOR A COOKIE";
    const translatedTitle = "มิสเตอร์บีสต์";
    const translatedDescription = "ไปดู Beast Games ได้แล้ว";

    await expect(channelTitle).toBeVisible();
    await expect(channelTitle).toContainText(originalTitle);
    await expect(channelTitle).not.toContainText(translatedTitle);
    await expect(channelDescription).toBeVisible();
    await expect(channelDescription).toContainText(originalDescription);
    await expect(channelDescription).not.toContainText(translatedDescription);

    const about = page
      .locator("ytd-engagement-panel-section-list-renderer:visible")
      .filter({ has: page.locator("#description-container") });
    const aboutTitle = about.locator("#title-text");
    const aboutDescription = about
      .locator("#description-container")
      .locator(attributedString)
      .first();
    const descriptionButton = header.locator(
      "yt-description-preview-view-model button:is(.yt-truncated-text__absolute-button, .ytTruncatedTextAbsoluteButton, .truncated-text-wiz__absolute-button)",
    );
    const linksButton = header.locator(
      'a:is(.yt-core-attributed-string__link, .ytAttributedStringLink)[role="button"]',
    );
    for (const button of [descriptionButton, linksButton]) {
      await button.click();
      await expect(aboutTitle).toBeVisible();
      await expect(aboutTitle).toContainText(originalTitle);
      await expect(aboutTitle).not.toContainText(translatedTitle);
      await expect(aboutDescription).toBeVisible();
      await expect(aboutDescription).toContainText(originalDescription);
      await expect(aboutDescription).not.toContainText(translatedDescription);

      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-branding-about${addToScreenshotName}-test.png`,
      });
      await about.locator("#visibility-button button").click();
      await expect(about).toBeHidden();
    }

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-branding-header${addToScreenshotName}-test.png`,
    });

    // Check page title
    const pageTitle = await page.title();
    console.log("Document title for the Video is:", pageTitle?.trim());
    // Check that the document title is in English and not in Thai
    expect(pageTitle).toContain("MrBeast");
    expect(pageTitle).not.toContain("มิสเตอร์บีสต์");

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  }

  test("YouTube video player retain original author", async ({
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

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=l-nMKJ5J3Uc",
      browserNameWithExtensions,
    );

    // Take a screenshot for visual verification
    try {
      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-video-author-test.png`,
      });
    } catch {
      // First screenshot is not essential so it is allowed to fail
    }

    // Wait for the video player to appear
    await waitForSelectorOrRetryWithPageReload(page, "#movie_player");

    // --- Check Branding Title ---
    const videoAuthorSelector = `#upload-info.ytd-video-owner-renderer yt-formatted-string a`;
    await page.waitForSelector(videoAuthorSelector);

    console.log("Checking video author for original author...");
    // Get the channel branding header title
    const brandingTitle = await page.locator(videoAuthorSelector).textContent();
    console.log("Video author:", brandingTitle?.trim());

    // Check that the channel name is in English and not in Thai
    expect(brandingTitle).toContain("MrBeast");
    expect(brandingTitle).not.toContain("มิสเตอร์บีสต์");
    await expect(page.locator(videoAuthorSelector)).toBeVisible();

    // Take a screenshot for visual verification
    await page.waitForTimeout(process.env.CI ? 6000 : 4000);
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-video-author-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube search results channel author name and description retain original content", async ({
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

    const searchUrl = "https://www.youtube.com/results?search_query=mr+beast";
    await loadPageAndVerifyAuth(page, searchUrl, browserNameWithExtensions);

    // Screenshot for visual verification
    try {
      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-search-result-test-description.png`,
      });
    } catch {
      // First screenshot is not essential so it is allowed to fail
    }

    // Wait until at least one channel renderer for MrBeast appears
    const channelRenderer = (
      await waitForSelectorOrRetryWithPageReload(
        page,
        'ytd-channel-renderer:has-text("@MrBeast")',
      )
    ).first();

    await expect(channelRenderer).toBeVisible();

    // Locate the channel name element inside the renderer
    const authorLocator = await getFirstVisibleLocator(
      channelRenderer.locator(
        "#info ytd-channel-name#channel-title #text, #channel-title yt-formatted-string#text, #channel-title yt-formatted-string",
      ),
    );
    await expect(authorLocator).toBeVisible();

    const authorText = (await authorLocator.textContent()) ?? "";
    console.log("Search result author:", authorText.trim());

    // Check that original English text is present and Thai translation is absent
    expect(authorText).toContain("MrBeast");
    expect(authorText).not.toContain("มิสเตอร์บีสต์");

    // Locate the description element inside the renderer
    const descriptionLocator = channelRenderer.first().locator("#description");
    await descriptionLocator.waitFor();
    await expect(descriptionLocator).toBeVisible();

    const descriptionText = (await descriptionLocator.textContent()) ?? "";
    console.log("Search result description:", descriptionText.trim());

    // Check that original English text is present and Thai translation is absent
    expect(descriptionText).toContain("SUBSCRIBE FOR A COOKIE");
    expect(descriptionText).not.toContain("ไปดู Beast Games ได้แล้ว");

    // Screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-search-result-test-description.png`,
    });

    // Ensure console output not flooded
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close context
    await context.close();
  });

  test("YouTube search results video with collaborator retain original content", async ({
    browserNameWithExtensions,
    localeString,
    isMobile,
  }, testInfo) => {
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    try {
      const searchUrl =
        "https://www.youtube.com/results?search_query=mark+rober+can+you+safely+drink+your+own+pee";
      await loadPageAndVerifyAuth(
        page,
        searchUrl,
        browserNameWithExtensions,
        isMobile,
      );

      const videoCard = page
        .locator("ytd-video-renderer, yt-lockup-view-model")
        .filter({
          has: page.locator('a[href*="watch?v=KRhofr57Na8"]'),
        });
      const byline = videoCard
        .locator(
          "#channel-info #attributed-channel-name:visible, #channel-info #channel-name a:visible, ytd-video-meta-block #attributed-channel-name:visible",
        )
        .first();
      await expect(byline).toBeVisible();
      await expect(byline).toHaveText("Mark Rober และ MrBeast", {
        timeout: 15_000,
      });

      await page.screenshot({
        path: testInfo.outputPath(
          "youtube-collaborator-video-search-result-test.png",
        ),
      });
      expect(consoleMessageCountContainer.count).toBeLessThan(2000);
    } finally {
      await context.close();
    }
  });

  test("Non english channel description retains original content", async ({
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

    const channelUrl = "https://www.youtube.com/@CARTONIMORTI";
    await loadPageAndVerifyAuth(page, channelUrl, browserNameWithExtensions);

    // Take a screenshot for visual verification
    try {
      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-cartonimorti-channel-test.png`,
      });
    } catch {
      // First screenshot is not essential so it is allowed to fail
    }

    const channelDescription = page
      .locator("#page-header-container #page-header")
      .locator(channelDescriptionSelector);
    await expect(channelDescription).toBeVisible();
    await expect(channelDescription).toContainText(
      "Questi cartoni non sono animati.",
    );
    await expect(channelDescription).not.toContainText("Very italian cartoons");

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-cartonimorti-channel-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });
});
