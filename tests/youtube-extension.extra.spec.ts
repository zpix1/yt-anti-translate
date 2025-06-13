import { expect, BrowserContext, Browser, TestInfo } from "@playwright/test";
import { test } from "../playwright.config";
import { handleTestDistribution } from "./helpers/ExtensionsFilesHelper";
import {
  handleRetrySetup,
  createBrowserContext,
  setupPageWithAuth,
  loadPageAndVerifyAuth,
} from "./helpers/TestSetupHelper";

import "dotenv/config";

// This are tests for additional features that benefit from Youtube Data API and a APIKey provided by the user
// OR
// Tests that use locale th-TH (instead of ru-RU)

test.describe("YouTube Anti-Translate extension - Extras", () => {
  test("YouTube channel branding header and about retain original content - WITH Api Key Set", async ({
    browserNameWithExtensions,
    localeString,
    defaultTimeoutMs,
    defaultTryCatchTimeoutMs,
  }, testInfo) => {
    expect(process.env.YOUTUBE_API_KEY?.trim() || "").not.toBe("");

    await handleRetrySetup(
      testInfo,
      browserNameWithExtensions,
      localeString,
      defaultTryCatchTimeoutMs,
      defaultTimeoutMs,
    );

    // --- Update Extension Settings and distribute a test copy ---
    // The object to be passed and inserted into the start.js file
    const configObject = { youtubeDataApiKey: process.env.YOUTUBE_API_KEY };
    await handleTestDistribution(configObject);

    // Launch browser with the extension
    const context = await createBrowserContext(
      browserNameWithExtensions,
      "../testDist",
    );

    // Create a new page
    await channelBrandingAboutTest(
      testInfo,
      context,
      browserNameWithExtensions,
      localeString,
      defaultTimeoutMs,
      defaultTryCatchTimeoutMs,
    );
  });

  test("YouTube channel branding header and about retain original content - WITHOUT Api Key (YouTubeI)", async ({
    browserNameWithExtensions,
    localeString,
    defaultTimeoutMs,
    defaultTryCatchTimeoutMs,
  }, testInfo) => {
    await handleRetrySetup(
      testInfo,
      browserNameWithExtensions,
      localeString,
      defaultTryCatchTimeoutMs,
      defaultTimeoutMs,
    );

    // Launch browser with the extension
    const context = await createBrowserContext(
      browserNameWithExtensions,
      "../../app",
    );

    // Create a new page
    await channelBrandingAboutTest(
      testInfo,
      context,
      browserNameWithExtensions,
      localeString,
      defaultTimeoutMs,
      defaultTryCatchTimeoutMs,
      "-youtubeI",
    );
  });

  async function channelBrandingAboutTest(
    testInfo: TestInfo,
    context: BrowserContext | Browser,
    browserNameWithExtensions: string,
    localeString: string,
    defaultTimeoutMs: number,
    defaultTryCatchTimeoutMs: number,
    addToScreenshotName: string = "",
  ) {
    const { page, consoleMessageCount } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
      defaultTimeoutMs,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=l-nMKJ5J3Uc",
      browserNameWithExtensions,
      defaultTryCatchTimeoutMs,
    );

    try {
      await page.waitForLoadState("networkidle", {
        timeout: defaultTryCatchTimeoutMs,
      });
    } catch {}

    const channel = page.getByRole("link", {
      name: "MrBeast",
      exact: true,
      includeHidden: false,
      disabled: false,
    });
    await channel.waitFor();
    await expect(channel).toBeVisible();
    await channel.click();
    try {
      await Promise.all([
        page.waitForLoadState("networkidle", {
          timeout: defaultTryCatchTimeoutMs,
        }),
        page.waitForTimeout(5000),
      ]);
    } catch {}

    try {
      await page.waitForLoadState("networkidle", {
        timeout: defaultTryCatchTimeoutMs,
      });
    } catch {}

    // Wait for the channel header to appear
    const pageHeaderContainerLocator = page.locator(
      "#page-header-container:visible",
    );
    await pageHeaderContainerLocator.waitFor();
    const pageHeaderLocator = pageHeaderContainerLocator.locator(
      "#page-header:visible",
    );
    await pageHeaderLocator.waitFor();
    const channelHeaderLocator = pageHeaderLocator.locator(
      ".page-header-view-model-wiz__page-header-headline-info:visible",
    );
    await channelHeaderLocator.waitFor();
    const channelH1Locator = channelHeaderLocator.locator(`h1`);
    await channelH1Locator.waitFor();

    try {
      await Promise.all([
        page.waitForLoadState("networkidle", {
          timeout: defaultTryCatchTimeoutMs,
        }),
        page.waitForTimeout(5000),
      ]);
    } catch {}

    // --- Check Branding Title ---
    const channelTitleAnyLocator = channelH1Locator.locator(
      `.yt-core-attributed-string:visible`,
    );
    await channelTitleAnyLocator.waitFor();
    const channelTitleProcessedLocator = channelH1Locator.locator(
      `.yt-core-attributed-string.untranslate-processed:visible`,
    );
    await channelTitleProcessedLocator.waitFor();

    try {
      await page.waitForLoadState("networkidle", {
        timeout: defaultTryCatchTimeoutMs,
      });
    } catch {}

    console.log("Checking Channel header for original title...");

    // Check that the branding header title is in English and not in Thai
    expect(channelTitleProcessedLocator).toHaveCount(1);
    expect(channelTitleProcessedLocator).toContainText("MrBeast");
    expect(channelTitleProcessedLocator).not.toContainText("มิสเตอร์บีสต์");
    await expect(channelTitleProcessedLocator).toBeVisible();
    // Log the channel branding header title
    const brandingTitle = await channelTitleProcessedLocator.textContent();
    console.log("Channel header title:", brandingTitle?.trim());

    // --- Check Branding Description
    const channelDescriptionAnyLocator = channelHeaderLocator.locator(
      `yt-description-preview-view-model .truncated-text-wiz__truncated-text-content > .yt-core-attributed-string:nth-child(1):visible`,
    );
    await channelDescriptionAnyLocator.waitFor();
    const channelDescriptionProcessedLocator = channelHeaderLocator.locator(
      `yt-description-preview-view-model .truncated-text-wiz__truncated-text-content > .yt-core-attributed-string.untranslate-processed:nth-child(1):visible`,
    );
    await channelDescriptionProcessedLocator.waitFor();
    try {
      await page.waitForLoadState("networkidle", {
        timeout: defaultTryCatchTimeoutMs,
      });
    } catch {}

    console.log("Checking Channel header for original description...");

    // Check that the branding header title is in English and not in Thai
    expect(channelDescriptionProcessedLocator).toHaveCount(1);
    expect(channelDescriptionProcessedLocator).toContainText(
      "SUBSCRIBE FOR A COOKIE",
    );
    expect(channelDescriptionProcessedLocator).not.toContainText(
      "ไปดู Beast Games ได้แล้ว",
    );
    await expect(channelDescriptionProcessedLocator).toBeVisible();
    // Log the channel branding header description
    const brandingDescription =
      await channelDescriptionProcessedLocator.textContent();
    console.log("Channel header description:", brandingDescription?.trim());

    // --- Open About Popup ---
    console.log(
      "Clicking '..more' button on description to open About Popup...",
    );
    const moreButton = channelHeaderLocator.locator(
      `.truncated-text-wiz__absolute-button`,
    );
    await moreButton.waitFor();
    await expect(moreButton).toBeVisible();
    await moreButton.click();
    try {
      await Promise.all([
        page.waitForLoadState("networkidle", {
          timeout: defaultTryCatchTimeoutMs,
        }),
        page.waitForTimeout(1000),
      ]);
    } catch {}

    // --- Check About Popup ---
    const aboutContainerLocator = page.locator(
      "ytd-engagement-panel-section-list-renderer:visible",
    );
    await aboutContainerLocator.waitFor();

    const aboutTitleAnyLocator =
      aboutContainerLocator.locator(`#title-text:visible`);
    await aboutTitleAnyLocator.waitFor();
    const aboutTitleProcessedLocator = aboutContainerLocator.locator(
      `#title-text.untranslate-processed:visible`,
    );
    await aboutTitleProcessedLocator.waitFor();
    console.log("Checking Channel header for original description...");

    // Check that the branding about title is in English and not in Thai
    expect(aboutTitleProcessedLocator).toHaveCount(1);
    expect(aboutTitleProcessedLocator).toContainText("MrBeast");
    expect(aboutTitleProcessedLocator).not.toContainText("มิสเตอร์บีสต์");
    await expect(aboutTitleProcessedLocator).toBeVisible();
    // Log the about title
    const aboutTitle = await aboutTitleProcessedLocator.textContent();
    console.log("Channel about title:", aboutTitle?.trim());

    const aboutDescriptionAnyLocator = aboutContainerLocator.locator(
      `#description-container > .yt-core-attributed-string:nth-child(1):visible`,
    );
    await aboutDescriptionAnyLocator.waitFor();
    const aboutDescriptionProcessedLocator = aboutDescriptionAnyLocator.locator(
      `.untranslate-processed:visible`,
    );
    await aboutDescriptionProcessedLocator.waitFor();

    // Check that the branding about description is in English and not in Thai
    expect(aboutDescriptionProcessedLocator).toHaveCount(1);
    expect(aboutDescriptionProcessedLocator).toContainText(
      "SUBSCRIBE FOR A COOKIE",
    );
    expect(aboutDescriptionProcessedLocator).not.toContainText(
      "ไปดู Beast Games ได้แล้ว",
    );
    await expect(aboutDescriptionProcessedLocator).toBeVisible();
    // Log the about description
    const aboutDescription =
      await aboutDescriptionProcessedLocator.textContent();
    console.log("Channel about title:", aboutDescription?.trim());

    // --- Close Popup
    console.log("Clicking 'X' button to close Popup...");
    const closeButton = aboutContainerLocator.locator(
      `#visibility-button button.yt-spec-button-shape-next:visible`,
    );
    await closeButton.waitFor();
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    try {
      await Promise.all([
        page.waitForLoadState("networkidle", {
          timeout: defaultTryCatchTimeoutMs,
        }),
        page.waitForTimeout(500),
      ]);
    } catch {}

    // --- Open About Popup via more links ---
    console.log(
      "Clicking '..more links' button on description to open About Popup...",
    );
    const moreLinksButton = channelHeaderLocator.locator(
      `span.yt-core-attributed-string>span>a.yt-core-attributed-string__link[role="button"]`,
    );
    await moreLinksButton.waitFor();
    await expect(moreLinksButton).toBeVisible();
    await moreLinksButton.click();
    try {
      await Promise.all([
        page.waitForLoadState("networkidle", {
          timeout: defaultTryCatchTimeoutMs,
        }),
        page.waitForTimeout(1000),
      ]);
    } catch {}

    // --- Check About A second time via the moreLinks Popup ---

    // Check that the branding about title is in English and not in Thai
    await aboutTitleProcessedLocator.waitFor();
    expect(aboutTitleProcessedLocator).toHaveCount(1);
    expect(aboutTitleProcessedLocator).toContainText("MrBeast");
    expect(aboutTitleProcessedLocator).not.toContainText("มิสเตอร์บีสต์");
    await expect(aboutTitleProcessedLocator).toBeVisible();
    // Log the about title
    const aboutTitle2 = await aboutTitleProcessedLocator.textContent();
    console.log("Channel about title:", aboutTitle2?.trim());

    // Check that the branding about description is in English and not in Thai
    await aboutDescriptionProcessedLocator.waitFor();
    expect(aboutDescriptionProcessedLocator).toHaveCount(1);
    expect(aboutDescriptionProcessedLocator).toContainText(
      "SUBSCRIBE FOR A COOKIE",
    );
    expect(aboutDescriptionProcessedLocator).not.toContainText(
      "ไปดู Beast Games ได้แล้ว",
    );
    await expect(aboutDescriptionProcessedLocator).toBeVisible();
    // Log the about description
    const aboutDescription2 =
      await aboutDescriptionProcessedLocator.textContent();
    console.log("Channel about title:", aboutDescription2?.trim());

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-branding-about${addToScreenshotName}-test${testInfo.retry > 0 ? `-${testInfo.retry}` : ""}.png`,
    });

    // --- Close Popup
    console.log("Clicking 'X' button to close Popup...");
    await closeButton.waitFor();
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    try {
      await Promise.all([
        page.waitForLoadState("networkidle", {
          timeout: defaultTryCatchTimeoutMs,
        }),
        page.waitForTimeout(500),
      ]);
    } catch {}

    // Check that the document title is in English and not in Thai
    await page.waitForFunction(() => document.title.includes("MrBeast"), null);
    // Check page title
    const pageTitle = await page.title();
    console.log("Document title for the Video is:", pageTitle?.trim());
    expect(pageTitle).toContain("MrBeast");
    expect(pageTitle).not.toContain("มิสเตอร์บีสต์");

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-branding-header${addToScreenshotName}-test${testInfo.retry > 0 ? `-${testInfo.retry}` : ""}.png`,
    });

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  }

  test("YouTube video player retain original author", async ({
    browserNameWithExtensions,
    localeString,
    defaultTimeoutMs,
    defaultTryCatchTimeoutMs,
  }, testInfo) => {
    await handleRetrySetup(
      testInfo,
      browserNameWithExtensions,
      localeString,
      defaultTryCatchTimeoutMs,
      defaultTimeoutMs,
    );

    // Launch browser with the extension
    const context = await createBrowserContext(
      browserNameWithExtensions,
      "../../app",
    );

    // Create a new page
    const { page, consoleMessageCount } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
      defaultTimeoutMs,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=l-nMKJ5J3Uc",
      browserNameWithExtensions,
      defaultTryCatchTimeoutMs,
    );

    // Wait for the video page to fully load
    await page.locator("#primary-inner:visible").waitFor();
    await page.locator("#player:visible").waitFor();
    await page.locator("#movie_player:visible").waitFor();
    await page.locator("#below:visible").waitFor();
    const ytdWatchMetadataLocator = page.locator("ytd-watch-metadata:visible");
    await ytdWatchMetadataLocator.waitFor();

    try {
      await Promise.all([
        page.waitForLoadState("networkidle", {
          timeout: defaultTryCatchTimeoutMs,
        }),
        page.waitForTimeout(5000),
      ]);
    } catch {}

    try {
      await page.waitForLoadState("networkidle", {
        timeout: defaultTryCatchTimeoutMs,
      });
    } catch {}

    // --- Check Branding Title ---
    const uploadInfoLocator = ytdWatchMetadataLocator.locator(
      `#upload-info.ytd-video-owner-renderer:visible`,
    );
    await uploadInfoLocator.waitFor();
    const uploadInfoTextLocator = uploadInfoLocator.locator(
      `yt-formatted-string#text`,
    );
    await uploadInfoTextLocator.waitFor();
    const videoAuthorLocator = uploadInfoTextLocator.locator(`a:visible`);
    await videoAuthorLocator.waitFor();

    console.log("Checking video author for original author...");

    // Check that the channel name is in English and not in Thai
    expect(videoAuthorLocator).toHaveCount(1);
    expect(videoAuthorLocator).toContainText("MrBeast");
    expect(videoAuthorLocator).not.toContainText("มิสเตอร์บีสต์");
    await expect(videoAuthorLocator).toBeVisible();
    // Log the channel branding header title
    const brandingTitle = await videoAuthorLocator.textContent();
    console.log("Video author:", brandingTitle?.trim());

    // Take a screenshot for visual verification
    const target = page.locator("ytd-video-owner-renderer yt-icon div:visible");
    await expect(target).toHaveCount(1, {
      timeout: defaultTimeoutMs * 2, // Increased timeout cause YouTube takes a while to add the "verified" chackmark
    });
    await expect(target).toBeVisible({ timeout: defaultTimeoutMs * 2 }); // Increased timeout cause YouTube takes a while to add the "verified" chackmark
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-video-author-test${testInfo.retry > 0 ? `-${testInfo.retry}` : ""}.png`,
    });

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });
});
