import { expect, BrowserContext, Browser } from "@playwright/test";
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
  }, testInfo) => {
    expect(process.env.YOUTUBE_API_KEY?.trim() || "").not.toBe("");

    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

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
      context,
      browserNameWithExtensions,
      localeString,
    );
  });

  test("YouTube channel branding header and about retain original content - WITHOUT Api Key (YouTubeI)", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(
      browserNameWithExtensions,
      "../../app",
    );

    // Create a new page
    await channelBrandingAboutTest(
      context,
      browserNameWithExtensions,
      localeString,
      "-youtubeI",
    );
  });

  async function channelBrandingAboutTest(
    context: BrowserContext | Browser,
    browserNameWithExtensions: string,
    localeString: string,
    addToScreenshotName: string = "",
  ) {
    const { page, consoleMessageCount } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=l-nMKJ5J3Uc",
    );

    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {}

    try {
      await Promise.all([
        page.waitForNavigation({
          waitUntil: "networkidle0",
          timeout: 15_000,
        }),
        page.getByRole("link", { name: "MrBeast", exact: true }).click(),
        page.waitForTimeout(5000),
      ]);
    } catch {}

    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {}

    // Wait for the video grid to appear
    const channelHeaderSelector =
      "#page-header-container #page-header .page-header-view-model-wiz__page-header-headline-info";
    await page.waitForSelector(channelHeaderSelector);

    // --- Check Branding Title ---
    const channelTitleSelector = `${channelHeaderSelector} h1 .yt-core-attributed-string:visible`;

    console.log("Checking Channel header for original title...");

    // Check that the branding header title is in English and not in Thai
    const channelTitleLocator = page.locator(channelTitleSelector);
    try {
      expect(channelTitleLocator).toHaveCount(1, {
        timeout: 10000,
      });
    } catch {}
    expect(channelTitleLocator).toContainText("MrBeast", {
      timeout: 10000,
    });
    expect(channelTitleLocator).not.toContainText("มิสเตอร์บีสต์", {
      timeout: 10000,
    });
    await expect(channelTitleLocator).toBeVisible();
    // Log the channel branding header title
    const brandingTitle = await page
      .locator(channelTitleSelector)
      .textContent();
    console.log("Channel header title:", brandingTitle?.trim());

    // --- Check Branding Description
    const channelDescriptionSelector = `${channelHeaderSelector} yt-description-preview-view-model .truncated-text-wiz__truncated-text-content > .yt-core-attributed-string:nth-child(1)`;

    console.log("Checking Channel header for original description...");

    // Check that the branding header title is in English and not in Thai
    const channelDescriptionLocator = page.locator(channelDescriptionSelector);
    try {
      expect(channelDescriptionLocator).toHaveCount(1, {
        timeout: 10000,
      });
    } catch {}
    expect(channelDescriptionLocator).toContainText("SUBSCRIBE FOR A COOKIE", {
      timeout: 10000,
    });
    expect(channelDescriptionLocator).not.toContainText(
      "ไปดู Beast Games ได้แล้ว",
      { timeout: 10000 },
    );
    await expect(channelDescriptionLocator).toBeVisible();
    // Log the channel branding header description
    const brandingDescription = await channelDescriptionLocator.textContent();
    console.log("Channel header description:", brandingDescription?.trim());

    // --- Open About Popup ---
    console.log(
      "Clicking '..more' button on description to open About Popup...",
    );
    await page
      .locator(`${channelHeaderSelector} .truncated-text-wiz__absolute-button`)
      .click();
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {}

    // --- Check About Popup ---
    const aboutContainer = "ytd-engagement-panel-section-list-renderer";

    const aboutTitleSelector = `${aboutContainer} #title-text:visible`;
    console.log("Checking Channel header for original description...");

    // Check that the branding about title is in English and not in Thai
    const aboutTitleLocator = page.locator(aboutTitleSelector);
    try {
      expect(aboutTitleLocator).toHaveCount(1, {
        timeout: 10000,
      });
    } catch {}
    expect(aboutTitleLocator).toContainText("MrBeast", {
      timeout: 10000,
    });
    expect(aboutTitleLocator).not.toContainText("มิสเตอร์บีสต์", {
      timeout: 10000,
    });
    await expect(aboutTitleLocator).toBeVisible();
    // Log the about title
    const aboutTitle = await aboutTitleLocator.textContent();
    console.log("Channel about title:", aboutTitle?.trim());

    const aboutDescriptionSelector = `${aboutContainer} #description-container > .yt-core-attributed-string:nth-child(1):visible`;

    // Check that the branding about description is in English and not in Thai
    const aboutDescriptionLocator = page.locator(aboutDescriptionSelector);
    try {
      expect(aboutDescriptionLocator).toHaveCount(1, {
        timeout: 10000,
      });
    } catch {}
    expect(aboutDescriptionLocator).toContainText("SUBSCRIBE FOR A COOKIE", {
      timeout: 10000,
    });
    expect(aboutDescriptionLocator).not.toContainText(
      "ไปดู Beast Games ได้แล้ว",
      { timeout: 10000 },
    );
    await expect(aboutDescriptionLocator).toBeVisible();
    // Log the about description
    const aboutDescription = await aboutDescriptionLocator.textContent();
    console.log("Channel about title:", aboutDescription?.trim());

    // --- Close Popup
    console.log("Clicking 'X' button to close Popup...");
    await page
      .locator(
        `${aboutContainer} #visibility-button button.yt-spec-button-shape-next:visible`,
      )
      .click();
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {}

    // --- Open About Popup via more links ---
    console.log(
      "Clicking '..more links' button on description to open About Popup...",
    );
    await page
      .locator(
        `${channelHeaderSelector} span.yt-core-attributed-string>span>a.yt-core-attributed-string__link[role="button"]`,
      )
      .click();
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {}

    // --- Check About A second time via the moreLinks Popup ---

    // Check that the branding about title is in English and not in Thai
    try {
      expect(aboutTitleLocator).toHaveCount(1, {
        timeout: 10000,
      });
    } catch {}
    expect(aboutTitleLocator).toContainText("MrBeast", {
      timeout: 10000,
    });
    expect(aboutTitleLocator).not.toContainText("มิสเตอร์บีสต์", {
      timeout: 10000,
    });
    await expect(aboutTitleLocator).toBeVisible();
    // Log the about title
    const aboutTitle2 = await aboutTitleLocator.textContent();
    console.log("Channel about title:", aboutTitle2?.trim());

    // Check that the branding about description is in English and not in Thai
    try {
      expect(aboutDescriptionLocator).toHaveCount(1, {
        timeout: 10000,
      });
    } catch {}
    expect(aboutDescriptionLocator).toContainText("SUBSCRIBE FOR A COOKIE", {
      timeout: 10000,
    });
    expect(aboutDescriptionLocator).not.toContainText(
      "ไปดู Beast Games ได้แล้ว",
      { timeout: 10000 },
    );
    await expect(aboutDescriptionLocator).toBeVisible();
    // Log the about description
    const aboutDescription2 = await aboutDescriptionLocator.textContent();
    console.log("Channel about title:", aboutDescription2?.trim());

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-branding-about${addToScreenshotName}-test.png`,
    });

    // --- Close Popup
    console.log("Clicking 'X' button to close Popup...");
    await page
      .locator(
        `${aboutContainer} #visibility-button button.yt-spec-button-shape-next:visible`,
      )
      .click();
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {}

    // Check that the document title is in English and not in Thai
    await page.waitForFunction(() => document.title.includes("MrBeast"), null, {
      timeout: 5000,
    });
    // Check page title
    const pageTitle = await page.title();
    console.log("Document title for the Video is:", pageTitle?.trim());
    expect(pageTitle).toContain("MrBeast");
    expect(pageTitle).not.toContain("มิสเตอร์บีสต์");

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-branding-header${addToScreenshotName}-test.png`,
    });

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  }

  test("YouTube video player retain original author", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

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
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=l-nMKJ5J3Uc",
    );

    // Wait for the video player to appear
    const videoPlayerSelector = "#movie_player";
    await page.waitForSelector(videoPlayerSelector);

    // --- Check Branding Title ---
    const videoAuthorSelector = `#upload-info.ytd-video-owner-renderer yt-formatted-string a`;
    const videoAuthorLocator = page.locator(videoAuthorSelector);

    console.log("Checking video author for original author...");

    // Check that the channel name is in English and not in Thai
    expect(videoAuthorLocator).toHaveCount(1, {
      timeout: 10000,
    });
    expect(videoAuthorLocator).toContainText("MrBeast", {
      timeout: 10000,
    });
    expect(videoAuthorLocator).not.toContainText("มิสเตอร์บีสต์", {
      timeout: 10000,
    });
    await expect(videoAuthorLocator).toBeVisible();
    // Log the channel branding header title
    const brandingTitle = await videoAuthorLocator.textContent();
    console.log("Video author:", brandingTitle?.trim());

    // Take a screenshot for visual verification
    const target = page.locator("ytd-video-owner-renderer yt-icon div");
    await expect(target).toHaveCount(1, { timeout: 20000 }); // Ensure it exists
    await expect(target).toBeVisible({ timeout: 20000 }); // Then check visibility
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-video-author-test.png`,
    });

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });
});
