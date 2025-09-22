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
// AND
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

  test("Collaborators video has collaborator author, opens Collaborators popup, and retains original names (th-TH)", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    const context = await createBrowserContext(browserNameWithExtensions);

    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    // Navigate to the provided video
    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=KRhofr57Na8",
      browserNameWithExtensions,
    );

    // Wait for the upload info block, scroll into view, and click as requested
    const uploadInfo = page.locator("#attributed-channel-name").first();
    await expect(uploadInfo).toBeVisible({ timeout: 20000 });

    const uploadInfoText = await uploadInfo.textContent();
    // Check that original English text is present and Thai translation is absent
    expect(uploadInfoText).toContain("MrBeast");
    expect(uploadInfoText).not.toContain("มิสเตอร์บีสต์");

    await uploadInfo.scrollIntoViewIfNeeded();
    await uploadInfo.click();
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {
      // empty
    }
    await page.waitForTimeout(1000);

    // Expect a dialog to appear listing collaborators
    const collabItems = page.locator(
      "yt-dialog-view-model .yt-list-item-view-model__text-wrapper a.yt-core-attributed-string__link",
    );

    // Allow enough time for the extension to fetch and update names
    await expect(collabItems.first()).toBeAttached({ timeout: 20000 });

    const names = (await collabItems.allTextContents()).map((n: string) =>
      (n || "").trim(),
    );
    expect(names.length).toBeGreaterThan(0);

    // Validate that collaborator names are not in Thai (i.e., un-translated)
    const thaiRegex = /[\u0E00-\u0E7F]/;
    for (const name of names) {
      expect(thaiRegex.test(name)).toBeFalsy();
    }

    // Screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-collaborators-dialog-from-upload-info-test.png`,
    });

    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    await context.close();
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
    const channelHeaderSelector = "#page-header-container #page-header";
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
    const channelDescriptionSelector = `${channelHeaderSelector} yt-description-preview-view-model .yt-truncated-text__truncated-text-content > .yt-core-attributed-string:nth-child(1)`;

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
      .locator(
        `${channelHeaderSelector} truncated-text .yt-truncated-text__absolute-button`,
      )
      .click();
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {
      // empty
    }
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
    } catch {
      // empty
    }
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
    } catch {
      // empty
    }
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
    } catch {
      // empty
    }
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

  test("YouTube search results channel author name and description retain original content", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Open new page with auth + extension
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    const searchUrl = "https://www.youtube.com/results?search_query=mr+beast";
    await loadPageAndVerifyAuth(page, searchUrl, browserNameWithExtensions);

    // Wait until at least one channel renderer for MrBeast appears
    const channelRenderer = page
      .locator('ytd-channel-renderer:has-text("@MrBeast")')
      .first();
    await expect(channelRenderer).toBeVisible({ timeout: 15000 });

    // Locate the channel name element inside the renderer
    const authorLocator = channelRenderer.locator(
      "#channel-title yt-formatted-string",
    );
    await expect(authorLocator).toBeVisible({ timeout: 15000 });

    const authorText = (await authorLocator.textContent()) ?? "";
    console.log("Search result author:", authorText.trim());

    // Check that original English text is present and Thai translation is absent
    expect(authorText).toContain("MrBeast");
    expect(authorText).not.toContain("มิสเตอร์บีสต์");

    // Locate the description element inside the renderer
    const descriptionLocator = channelRenderer.locator("#description");
    await expect(descriptionLocator).toBeVisible({ timeout: 15000 });

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
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Open new page with auth + extension
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    const searchUrl =
      "https://www.youtube.com/results?search_query=Can+you+safely+drink+your+own+pee";
    await loadPageAndVerifyAuth(page, searchUrl, browserNameWithExtensions);

    // Wait until at least one video renderer for Mark Rober appears
    const videoRenderer = page
      .locator('ytd-video-renderer:has-text("Mark Rober")')
      .first();
    await expect(videoRenderer).toBeVisible({ timeout: 15000 });

    // Locate the channel name element inside the renderer
    const authorLocator = videoRenderer.locator("#channel-info #channel-name");
    await expect(authorLocator).toBeVisible({ timeout: 15000 });

    const authorText = (await authorLocator.textContent()) ?? "";
    console.log("Search result author:", authorText.trim());

    // Check that original English text is present and Thai translation is absent
    expect(authorText).toContain("MrBeast");
    expect(authorText).not.toContain("มิสเตอร์บีสต์");

    // Screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-collaborator-video-search-result-test.png`,
    });

    // Ensure console output not flooded
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close context
    await context.close();
  });

  test("Non english channel description retains original content", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Open new page with auth + extension
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    const channelUrl = "https://www.youtube.com/@CARTONIMORTI";
    await loadPageAndVerifyAuth(page, channelUrl, browserNameWithExtensions);

    // Wait for the channel header to appear
    const channelHeaderSelector = "#page-header-container #page-header";
    await page.waitForSelector(channelHeaderSelector);

    // Check channel description
    const channelDescriptionSelector = `${channelHeaderSelector} yt-description-preview-view-model .yt-truncated-text__truncated-text-content > .yt-core-attributed-string:nth-child(1)`;

    // Get the channel description
    const brandingDescription = await page
      .locator(channelDescriptionSelector)
      .first()
      .textContent();

    // Check that the description is in original Italian and not translated
    expect(brandingDescription).toContain("Questi cartoni non sono animati.");
    expect(brandingDescription).not.toContain("Very italian cartoons");
    await expect(
      page.locator(channelDescriptionSelector).first(),
    ).toBeVisible();

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
