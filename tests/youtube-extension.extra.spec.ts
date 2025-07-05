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
    handleTestDistribution(configObject);

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
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(page, "https://www.youtube.com/@MrBeast");

    // Wait for the video grid to appear
    const channelHeaderSelector =
      "#page-header-container #page-header .page-header-view-model-wiz__page-header-headline-info";
    await page.waitForSelector(channelHeaderSelector);

    // --- Check Branding Title ---
    const channelTitleSelector = `${channelHeaderSelector} h1 .yt-core-attributed-string:visible`;

    console.log("Checking Channel header for original title...");
    // Get the channel branding header title
    const brandingTitle = await page
      .locator(channelTitleSelector)
      .textContent();
    console.log("Channel header title:", brandingTitle?.trim());

    // Check that the branding header title is in English and not in Thai
    expect(brandingTitle).toContain("MrBeast");
    expect(brandingTitle).not.toContain("มิสเตอร์บีสต์");
    await expect(page.locator(channelTitleSelector)).toBeVisible();

    // --- Check Branding Description
    const channelDescriptionSelector = `${channelHeaderSelector} yt-description-preview-view-model .truncated-text-wiz__truncated-text-content > .yt-core-attributed-string:nth-child(1)`;

    console.log("Checking Channel header for original description...");
    // Get the channel branding header description
    const brandingDescription = await page
      .locator(channelDescriptionSelector)
      .first()
      .textContent();
    console.log("Channel header description:", brandingTitle?.trim());

    // Check that the branding header title is in English and not in Thai
    expect(brandingDescription).toContain("SUBSCRIBE FOR A COOKIE");
    expect(brandingDescription).not.toContain("ไปดู Beast Games ได้แล้ว");
    await expect(
      page.locator(channelDescriptionSelector).first(),
    ).toBeVisible();

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
    await page.waitForTimeout(500);

    // --- Check About Popup ---
    const aboutContainer = "ytd-engagement-panel-section-list-renderer";

    const aboutTitleSelector = `${aboutContainer} #title-text:visible`;
    console.log("Checking Channel header for original description...");
    // Get the about title
    const aboutTitle = await page.locator(aboutTitleSelector).textContent();
    console.log("Channel about title:", aboutTitle?.trim());

    // Check that the branding about title is in English and not in Thai
    expect(aboutTitle).toContain("MrBeast");
    expect(aboutTitle).not.toContain("มิสเตอร์บีสต์");
    await expect(page.locator(aboutTitleSelector)).toBeVisible();

    const aboutDescriptionSelector = `${aboutContainer} #description-container > .yt-core-attributed-string:nth-child(1):visible`;
    // Get the about description
    const aboutDescription = await page
      .locator(aboutDescriptionSelector)
      .textContent();
    console.log("Channel about title:", aboutDescription?.trim());
    // Check that the branding about description is in English and not in Thai
    expect(aboutDescription).toContain("SUBSCRIBE FOR A COOKIE");
    expect(aboutDescription).not.toContain("ไปดู Beast Games ได้แล้ว");
    await expect(page.locator(aboutDescriptionSelector)).toBeVisible();

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
    await page.waitForTimeout(500);

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
    await page.waitForTimeout(500);

    // --- Check About A second time via the moreLinks Popup ---
    // Get the about title
    const aboutTitle2 = await page.locator(aboutTitleSelector).textContent();
    console.log("Channel about title:", aboutTitle?.trim());

    // Check that the branding about title is in English and not in Thai
    expect(aboutTitle2).toContain("MrBeast");
    expect(aboutTitle2).not.toContain("มิสเตอร์บีสต์");
    await expect(page.locator(aboutTitleSelector)).toBeVisible();

    // Get the about description
    const aboutDescription2 = await page
      .locator(aboutDescriptionSelector)
      .textContent();
    console.log("Channel about title:", aboutDescription?.trim());
    // Check that the branding about description is in English and not in Thai
    expect(aboutDescription2).toContain("SUBSCRIBE FOR A COOKIE");
    expect(aboutDescription2).not.toContain("ไปดู Beast Games ได้แล้ว");
    await expect(page.locator(aboutDescriptionSelector)).toBeVisible();

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
    await page.waitForTimeout(500);

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
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(
      browserNameWithExtensions,
      "../../app",
    );

    // Create a new page
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
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

    console.log("Checking video author for original author...");
    // Get the channel branding header title
    const brandingTitle = await page.locator(videoAuthorSelector).textContent();
    console.log("Video author:", brandingTitle?.trim());

    // Check that the channel name is in English and not in Thai
    expect(brandingTitle).toContain("MrBeast");
    expect(brandingTitle).not.toContain("มิสเตอร์บีสต์");
    await expect(page.locator(videoAuthorSelector)).toBeVisible();

    // Take a screenshot for visual verification
    await page.waitForTimeout(4000);
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-video-author-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });
});
