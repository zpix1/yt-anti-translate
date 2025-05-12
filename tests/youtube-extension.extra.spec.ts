import { test, expect, firefox } from "@playwright/test";
import path from "path";
import { withExtension } from "playwright-webextext";
import { handleYoutubeConsent } from "./handleYoutubeConsent";
import { handleTestDistribution } from "./handleTestDistribution";

require('dotenv').config();

test.describe("YouTube Anti-Translate extension - Extras", () => {
  test("YouTube channel branding header and about retain original content", async () => {
    // --- Update Extension Settings and distribute a test copy ---
    // The object to be passed and inserted into the start.js file
    const configObject = { youtubeDataApiKey: process.env.YOUTUBE_API_KEY, untranslateChannelBranding: true };
    handleTestDistribution(configObject);

    // Launch browser with the extension
    const context = await (withExtension(
      firefox,
      path.resolve(__dirname, "testDist")
    )).launch()

    // Create a new page
    const page = await context.newPage();

    // Set up console message counting
    let consoleMessageCount = 0;
    page.on("console", () => {
      consoleMessageCount++;
    });

    // Navigate to the specified YouTube channel videos page
    await page.goto("https://www.youtube.com/@MrBeast");

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Sometimes youtube redirects to consent page so wait 2 seconds before proceeding
    await page.waitForTimeout(2000);
    await page.waitForLoadState("networkidle");

    // Sometimes youtube redirects to consent so handle it
    await handleYoutubeConsent(page);

    // Wait for the video grid to appear
    const channelHeaderSelector = "#page-header-container #page-header .page-header-view-model-wiz__page-header-headline-info"
    await page.waitForSelector(channelHeaderSelector);

    // --- Check Branding Title ---
    const channelTitleSelector = `${channelHeaderSelector} h1 .yt-core-attributed-string`;

    console.log("Checking Channel header for original title...");
    // Get the video title
    const brandingTitle = await page
      .locator(channelTitleSelector)
      .textContent();
    console.log("Channel header title:", brandingTitle?.trim());

    // Check that the branding header title is in English and not in Thai
    expect(brandingTitle).toContain("MrBeast");
    expect(brandingTitle).not.toContain("มิสเตอร์บีสต์");

    // --- Check Branding Description
    const channelDescriptionSelector = `${channelHeaderSelector} yt-description-preview-view-model .truncated-text-wiz__inline-button > .yt-core-attributed-string:nth-child(1)`;

    console.log("Checking Channel header for original description...");
    // Get the video title
    const brandingDescription = await page
      .locator(channelDescriptionSelector)
      .textContent();
    console.log("Channel header description:", brandingTitle?.trim());

    // Check that the branding header title is in English and not in Thai
    expect(brandingDescription).toContain("SUBSCRIBE FOR A COOKIE");
    expect(brandingDescription).not.toContain("ไปดู Beast Games ได้แล้ว");

    // --- Switch to Shorts Tab ---
    console.log("Clicking Shorts tab...");
    await page.locator("#tabsContent").getByText("Shorts").click();
    await page.waitForLoadState("networkidle");

    // Take a screenshot for visual verification
    await page.screenshot({ path: "images/youtube-channel-branding-header-test.png" });

    // --- Check Shorts Tab ---
    const originalShortTitle = "Baseball Tic Tac Toe vs MLB Pro";
    const translatedShortTitle = "Бейсбольные Крестики-Нолики"; // Adjust if needed
    const shortSelector = `ytd-rich-item-renderer:has-text("${originalShortTitle}")`;
    const translatedShortSelector = `ytd-rich-item-renderer:has-text("${translatedShortTitle}")`;

    console.log("Checking Shorts tab for original title...");
    // Shorts might load dynamically, scroll into view to ensure it's loaded
    const original = page.locator(shortSelector).first()
    if (await original.isVisible()) {
      original.scrollIntoViewIfNeeded();
    }
    const translated = page.locator(translatedShortSelector).first()
    if (await translated.isVisible()) {
      translated.scrollIntoViewIfNeeded();
    }
    await page.waitForTimeout(1000); // Give it a moment to load more items if needed

    await expect(page.locator(shortSelector)).toBeVisible({ timeout: 10000 }); // Increased timeout for dynamic loading
    await expect(page.locator(translatedShortSelector)).not.toBeVisible();
    console.log(
      "Original short title found, translated short title not found."
    );

    // Take a screenshot for visual verification
    await page.screenshot({ path: "images/youtube-channel-branding-about-test.png" });

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(
      2000
    );

    // Close the browser context
    await context.close();
  });
});