import { test, expect, firefox } from "@playwright/test";
import path from "path";
import { withExtension } from "playwright-webextext";
import { handleYoutubeConsent } from "./handleYoutubeConsent";
import { newPageWithStorageStateIfItExists, handleGoogleLogin } from "./handleGoogleLogin";
import { handleTestDistribution, downloadAndExtractUBlock } from "./handleTestDistribution";

require('dotenv').config();

test.describe("YouTube Anti-Translate extension - Extras", () => {
  test("YouTube channel branding header and about retain original content", async () => {
    downloadAndExtractUBlock();
    // --- Update Extension Settings and distribute a test copy ---
    // The object to be passed and inserted into the start.js file
    const configObject = { youtubeDataApiKey: process.env.YOUTUBE_API_KEY, untranslateChannelBranding: true };
    handleTestDistribution(configObject);

    // Launch browser with the extension
    const context = await (withExtension(
      firefox,
      [path.resolve(__dirname, "testDist"), path.resolve(__dirname, "testUBlockOrigin")]
    )).launch()

    // Create a new page
    const result = await newPageWithStorageStateIfItExists(context, "th_TH");
    const page = result.page;
    const localeLoaded = result.localeLoaded;

    // Set up console message counting
    let consoleMessageCount = 0;
    page.on("console", () => {
      consoleMessageCount++;
    });

    // Navigate to the specified YouTube channel page
    await page.goto("https://www.youtube.com/@MrBeast");

    // Wait for the page to load
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }

    // Sometimes youtube redirects to consent page so wait 2 seconds before proceeding
    await page.waitForTimeout(2000);
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }

    // Sometimes youtube redirects to consent so handle it
    await handleYoutubeConsent(page);

    // If we did not load a locale storage state, login to test account and set locale
    // This will also create a new storage state with the locale already set
    if (localeLoaded !== true) {
      await handleGoogleLogin(page, "th_TH");
    }

    // Wait for the video grid to appear
    const channelHeaderSelector = "#page-header-container #page-header .page-header-view-model-wiz__page-header-headline-info"
    await page.waitForSelector(channelHeaderSelector);

    // --- Check Branding Title ---
    const channelTitleSelector = `${channelHeaderSelector} h1 .yt-core-attributed-string`;

    console.log("Checking Channel header for original title...");
    // Get the channel branding header title
    const brandingTitle = await page
      .locator(channelTitleSelector)
      .textContent();
    console.log("Channel header title:", brandingTitle?.trim());

    // Check that the branding header title is in English and not in Thai
    expect(brandingTitle).toContain("MrBeast");
    expect(brandingTitle).not.toContain("มิสเตอร์บีสต์");

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

    // Take a screenshot for visual verification
    await page.waitForTimeout(5000);
    await page.screenshot({ path: "images/youtube-channel-branding-header-test.png" });

    // --- Open About Popup ---
    console.log("Clicking '..more' button on description to open About Popup...");
    await page.locator(`${channelHeaderSelector} .truncated-text-wiz__absolute-button`).click();
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }
    await page.waitForTimeout(1000);

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

    const aboutDescriptionSelector = `${aboutContainer} #description-container > .yt-core-attributed-string:nth-child(1):visible`;
    // Get the about description
    const aboutDescription = await page
      .locator(aboutDescriptionSelector)
      .textContent();
    console.log("Channel about title:", aboutDescription?.trim());
    // Check that the branding about description is in English and not in Thai
    expect(aboutDescription).toContain("SUBSCRIBE FOR A COOKIE");
    expect(aboutDescription).not.toContain("ไปดู Beast Games ได้แล้ว");

    // --- Close Popup
    console.log("Clicking 'X' button to close Popup...");
    await page.locator(`${aboutContainer} #visibility-button button.yt-spec-button-shape-next`).click();
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }
    await page.waitForTimeout(1000);

    // --- Open About Popup via more links ---
    console.log("Clicking '..more links' button on description to open About Popup...");
    await page.locator(`${channelHeaderSelector} span.yt-core-attributed-string>span>a.yt-core-attributed-string__link[role="button"]`).click();
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }
    await page.waitForTimeout(1000);

    // --- Check About A second time via the moreLinks Popup ---
    // Get the about title
    const aboutTitle2 = await page
      .locator(aboutTitleSelector)
      .textContent();
    console.log("Channel about title:", aboutTitle?.trim());

    // Check that the branding about title is in English and not in Thai
    expect(aboutTitle2).toContain("MrBeast");
    expect(aboutTitle2).not.toContain("มิสเตอร์บีสต์");

    // Get the about description
    const aboutDescription2 = await page
      .locator(aboutDescriptionSelector)
      .textContent();
    console.log("Channel about title:", aboutDescription?.trim());
    // Check that the branding about description is in English and not in Thai
    expect(aboutDescription2).toContain("SUBSCRIBE FOR A COOKIE");
    expect(aboutDescription2).not.toContain("ไปดู Beast Games ได้แล้ว");

    // Take a screenshot for visual verification
    await page.screenshot({ path: "images/youtube-channel-branding-about-test.png" });

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(
      2000
    );

    // Close the browser context
    await context.close();
  });


  test("YouTube video player retain original author", async () => {
    downloadAndExtractUBlock();

    // Launch browser with the extension
    const context = await (withExtension(
      firefox,
      [path.resolve(__dirname, "../app"), path.resolve(__dirname, "testUBlockOrigin")]
    )).launch()

    // Create a new page
    const result = await newPageWithStorageStateIfItExists(context, "th_TH");
    const page = result.page;
    const localeLoaded = result.localeLoaded;

    // Set up console message counting
    let consoleMessageCount = 0;
    page.on("console", () => {
      consoleMessageCount++;
    });

    // Navigate to the specified YouTube video page
    await page.goto("https://www.youtube.com/watch?v=l-nMKJ5J3Uc");

    // Wait for the page to load
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }

    // Sometimes youtube redirects to consent page so wait 2 seconds before proceeding
    await page.waitForTimeout(2000);
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }

    // Sometimes youtube redirects to consent so handle it
    await handleYoutubeConsent(page);

    // If we did not load a locale storage state, login to test account and set locale
    // This will also create a new storage state with the locale already set
    if (localeLoaded !== true) {
      await handleGoogleLogin(page, "th_TH");
    }

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

    // Check that the branding header title is in English and not in Thai
    expect(brandingTitle).toContain("MrBeast");
    expect(brandingTitle).not.toContain("มิสเตอร์บีสต์");

    // Take a screenshot for visual verification
    await page.waitForTimeout(5000);
    await page.screenshot({ path: "images/youtube-video-author-test.png" });

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(
      2000
    );

    // Close the browser context
    await context.close();
  });
});