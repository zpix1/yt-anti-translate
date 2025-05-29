import { expect, firefox, chromium } from "@playwright/test";
import { test } from "../playwright.config"
import path from "path";
import { withExtension } from "playwright-webextext";
import { newPageWithStorageStateIfItExists, findLoginButton } from "./helpers/AuthStorageHelper";
import { handleTestDistribution } from "./helpers/ExtensionsFilesHelper";
import { setupUBlockAndAuth } from "./helpers/setupUBlockAndAuth";

require('dotenv').config();

// This are tests for additional features using Youtube Data API and a APIKey provided by the user
// We are using locale th-TH for this tests as MrBeast channel name is not translated in ru-RU, but it is th-TH

test.describe("YouTube Anti-Translate extension - Extras", () => {
  test("YouTube channel branding header and about retain original content", async ({ browserNameWithExtensions, localeString }, testInfo) => {
    if (testInfo.retry > 0) {
      // If this test is retring then check uBlock and Auth again
      await setupUBlockAndAuth([browserNameWithExtensions], [localeString]);
    }

    // --- Update Extension Settings and distribute a test copy ---
    // The object to be passed and inserted into the start.js file
    const configObject = { youtubeDataApiKey: process.env.YOUTUBE_API_KEY, untranslateChannelBranding: true };
    handleTestDistribution(configObject);

    // Launch browser with the extension
    let context;
    switch (browserNameWithExtensions) {
      case "chromium":
        const browserTypeWithExtension = withExtension(
          chromium,
          [path.resolve(__dirname, "testDist"), path.resolve(__dirname, "testUBlockOriginLite")]
        );
        context = await browserTypeWithExtension.launchPersistentContext("", {
          headless: false
        });
        break;
      case "firefox":
        context = await (withExtension(
          firefox,
          [path.resolve(__dirname, "testDist"), path.resolve(__dirname, "testUBlockOrigin")]
        )).launch()
        break;
      default:
        throw "Unsupported browserNameWithExtensions"
    }

    // Create a new page
    const result = await newPageWithStorageStateIfItExists(context, browserNameWithExtensions, localeString);
    const page = result.page;
    const localeLoaded = result.localeLoaded;
    if (!localeLoaded) {
      // Setup failed to create a matching locale so test wil fail.
      expect(localeLoaded).toBe(true)
    }

    // Set up console message counting
    let consoleMessageCount = 0;
    page.on("console", () => {
      consoleMessageCount++;
    });

    // Navigate to the specified YouTube channel page
    await page.goto("https://www.youtube.com/@MrBeast");

    // Wait for the page to load
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }
    // .waitForLoadState("networkidle" is not always right so wait 5 extra seconds
    await page.waitForTimeout(5000);

    // If for whatever reason we are not logged in, then fail the test
    expect(await findLoginButton(page)).toBe(null);

    // Wait for the video grid to appear
    const channelHeaderSelector = "#page-header-container #page-header .page-header-view-model-wiz__page-header-headline-info"
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
    await expect(page.locator(channelTitleSelector)).toBeVisible()

    // --- Check Branding Description
    const channelDescriptionSelector = `${channelHeaderSelector} yt-description-preview-view-model .truncated-text-wiz__truncated-text-content > .yt-core-attributed-string:nth-child(1)`;

    console.log("Checking Channel header for original description...");
    // Get the channel branding header description
    const brandingDescription = await page
      .locator(channelDescriptionSelector)
      .textContent();
    console.log("Channel header description:", brandingTitle?.trim());

    // Check that the branding header title is in English and not in Thai
    expect(brandingDescription).toContain("SUBSCRIBE FOR A COOKIE");
    expect(brandingDescription).not.toContain("ไปดู Beast Games ได้แล้ว");
    await expect(page.locator(channelDescriptionSelector)).toBeVisible()

    // --- Open About Popup ---
    console.log("Clicking '..more' button on description to open About Popup...");
    await page.locator(`${channelHeaderSelector} .truncated-text-wiz__absolute-button`).click();
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }
    await page.waitForTimeout(500);

    // --- Check About Popup ---
    const aboutContainer = 'ytd-engagement-panel-section-list-renderer'

    const aboutTitleSelector = `${aboutContainer} #title-text:visible`;
    console.log("Checking Channel header for original description...");
    // Get the about title
    const aboutTitle = await page
      .locator(aboutTitleSelector)
      .textContent();
    console.log("Channel about title:", aboutTitle?.trim());

    // Check that the branding about title is in English and not in Thai
    expect(aboutTitle).toContain("MrBeast");
    expect(aboutTitle).not.toContain("มิสเตอร์บีสต์");
    await expect(page.locator(aboutTitleSelector)).toBeVisible()

    const aboutDescriptionSelector = `${aboutContainer} #description-container > .yt-core-attributed-string:nth-child(1):visible`;
    // Get the about description
    const aboutDescription = await page
      .locator(aboutDescriptionSelector)
      .textContent();
    console.log("Channel about title:", aboutDescription?.trim());
    // Check that the branding about description is in English and not in Thai
    expect(aboutDescription).toContain("SUBSCRIBE FOR A COOKIE");
    expect(aboutDescription).not.toContain("ไปดู Beast Games ได้แล้ว");
    await expect(page.locator(aboutDescriptionSelector)).toBeVisible()

    // --- Close Popup
    console.log("Clicking 'X' button to close Popup...");
    await page.locator(`${aboutContainer} #visibility-button button.yt-spec-button-shape-next:visible`).click();
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }
    await page.waitForTimeout(500);

    // --- Open About Popup via more links ---
    console.log("Clicking '..more links' button on description to open About Popup...");
    await page.locator(`${channelHeaderSelector} span.yt-core-attributed-string>span>a.yt-core-attributed-string__link[role="button"]`).click();
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }
    await page.waitForTimeout(500);

    // --- Check About A second time via the moreLinks Popup ---
    // Get the about title
    const aboutTitle2 = await page
      .locator(aboutTitleSelector)
      .textContent();
    console.log("Channel about title:", aboutTitle?.trim());

    // Check that the branding about title is in English and not in Thai
    expect(aboutTitle2).toContain("MrBeast");
    expect(aboutTitle2).not.toContain("มิสเตอร์บีสต์");
    await expect(page.locator(aboutTitleSelector)).toBeVisible()

    // Get the about description
    const aboutDescription2 = await page
      .locator(aboutDescriptionSelector)
      .textContent();
    console.log("Channel about title:", aboutDescription?.trim());
    // Check that the branding about description is in English and not in Thai
    expect(aboutDescription2).toContain("SUBSCRIBE FOR A COOKIE");
    expect(aboutDescription2).not.toContain("ไปดู Beast Games ได้แล้ว");
    await expect(page.locator(aboutDescriptionSelector)).toBeVisible()

    // Take a screenshot for visual verification
    await page.screenshot({ path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-branding-about-test.png` });

    // --- Close Popup
    console.log("Clicking 'X' button to close Popup...");
    await page.locator(`${aboutContainer} #visibility-button button.yt-spec-button-shape-next:visible`).click();
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }
    await page.waitForTimeout(500);

    // Take a screenshot for visual verification
    await page.screenshot({ path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-branding-header-test.png` });

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(
      2000
    );

    // Close the browser context
    await context.close();
  });

  test("YouTube video player retain original author", async ({ browserNameWithExtensions, localeString }, testInfo) => {
    if (testInfo.retry > 0) {
      // If this test is retring then check uBlock and Auth again
      await setupUBlockAndAuth([browserNameWithExtensions], [localeString]);
    }

    // Launch browser with the extension
    let context;
    switch (browserNameWithExtensions) {
      case "chromium":
        const browserTypeWithExtension = withExtension(
          chromium,
          [path.resolve(__dirname, "../app"), path.resolve(__dirname, "testUBlockOriginLite")]
        );
        context = await browserTypeWithExtension.launchPersistentContext("", {
          headless: false
        });
        break;
      case "firefox":
        context = await (withExtension(
          firefox,
          [path.resolve(__dirname, "../app"), path.resolve(__dirname, "testUBlockOrigin")]
        )).launch()
        break;
      default:
        throw "Unsupported browserNameWithExtensions"
    }

    // Create a new page
    const result = await newPageWithStorageStateIfItExists(context, browserNameWithExtensions, localeString);
    const page = result.page;
    const localeLoaded = result.localeLoaded;
    if (!localeLoaded) {
      // Setup failed to create a matching locale so test wil fail.
      expect(localeLoaded).toBe(true)
    }

    // Set up console message counting
    let consoleMessageCount = 0;
    page.on("console", () => {
      consoleMessageCount++;
    });

    // Navigate to the specified YouTube video page
    await page.goto("https://www.youtube.com/watch?v=l-nMKJ5J3Uc");

    // Wait for the page to load
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }
    // .waitForLoadState("networkidle" is not always right so wait 5 extra seconds
    await page.waitForTimeout(5000);

    // If for whatever reason we are not logged in, then fail the test
    expect(await findLoginButton(page)).toBe(null);

    // Wait for the video player to appear
    const videoPlayerSelector = "#movie_player"
    await page.waitForSelector(videoPlayerSelector);

    // --- Check Branding Title ---
    const videoAuthorSelector = `#upload-info.ytd-video-owner-renderer yt-formatted-string a`;

    console.log("Checking video author for original author...");
    // Get the channel branding header title
    const brandingTitle = await page
      .locator(videoAuthorSelector)
      .textContent();
    console.log("Video author:", brandingTitle?.trim());

    // Check that the channel name is in English and not in Thai
    expect(brandingTitle).toContain("MrBeast");
    expect(brandingTitle).not.toContain("มิสเตอร์บีสต์");
    await expect(page.locator(videoAuthorSelector)).toBeVisible()

    // Take a screenshot for visual verification
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-video-author-test.png` });

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(
      2000
    );

    // Close the browser context
    await context.close();
  });
});