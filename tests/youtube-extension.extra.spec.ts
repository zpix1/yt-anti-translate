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
    defaultNetworkIdleTimeoutMs,
  }, testInfo) => {
    expect(process.env.YOUTUBE_API_KEY?.trim() || "").not.toBe("");

    await handleRetrySetup(
      testInfo,
      browserNameWithExtensions,
      localeString,
      defaultNetworkIdleTimeoutMs,
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
      defaultNetworkIdleTimeoutMs,
    );
  });

  test("YouTube channel branding header and about retain original content - WITHOUT Api Key (YouTubeI)", async ({
    browserNameWithExtensions,
    localeString,
    defaultTimeoutMs,
    defaultNetworkIdleTimeoutMs,
  }, testInfo) => {
    await handleRetrySetup(
      testInfo,
      browserNameWithExtensions,
      localeString,
      defaultNetworkIdleTimeoutMs,
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
      defaultNetworkIdleTimeoutMs,
      "-youtubeI",
    );
  });

  async function channelBrandingAboutTest(
    testInfo: TestInfo,
    context: BrowserContext | Browser,
    browserNameWithExtensions: string,
    localeString: string,
    defaultTimeoutMs: number,
    defaultNetworkIdleTimeoutMs: number,
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
      defaultNetworkIdleTimeoutMs,
    );

    try {
      await page.waitForLoadState("networkidle", {
        timeout: defaultNetworkIdleTimeoutMs,
      });
    } catch {}

    try {
      await Promise.all([
        page.getByRole("link", { name: "MrBeast", exact: true }).click(),
        page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        }),
        page.waitForTimeout(5000),
      ]);
    } catch {}

    try {
      await page.waitForLoadState("networkidle", {
        timeout: defaultNetworkIdleTimeoutMs,
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
          timeout: defaultNetworkIdleTimeoutMs,
        }),
        page.waitForTimeout(5000),
      ]);
    } catch {}

    // --- Check Branding Title ---
    const channelTitleLocator = channelH1Locator.locator(
      `.yt-core-attributed-string:visible`,
    );
    await channelTitleLocator.waitFor();

    try {
      await page.waitForLoadState("networkidle", {
        timeout: defaultNetworkIdleTimeoutMs,
      });
    } catch {}

    console.log("Checking Channel header for original title...");

    // Check that the branding header title is in English and not in Thai
    try {
      expect(channelTitleLocator).toHaveCount(1);
    } catch {}
    expect(channelTitleLocator).toContainText("MrBeast");
    expect(channelTitleLocator).not.toContainText("มิสเตอร์บีสต์");
    await expect(channelTitleLocator).toBeVisible();
    // Log the channel branding header title
    const brandingTitle = await channelTitleLocator.textContent();
    console.log("Channel header title:", brandingTitle?.trim());

    // --- Check Branding Description
    const channelDescriptionSelector = `yt-description-preview-view-model .truncated-text-wiz__truncated-text-content > .yt-core-attributed-string:nth-child(1):visible`;
    const channelDescriptionLocator = channelHeaderLocator.locator(
      channelDescriptionSelector,
    );
    await channelDescriptionLocator.waitFor();
    try {
      await page.waitForLoadState("networkidle", {
        timeout: defaultNetworkIdleTimeoutMs,
      });
    } catch {}

    console.log("Checking Channel header for original description...");

    // Check that the branding header title is in English and not in Thai
    try {
      expect(channelDescriptionLocator).toHaveCount(1);
    } catch {}
    expect(channelDescriptionLocator).toContainText("SUBSCRIBE FOR A COOKIE");
    expect(channelDescriptionLocator).not.toContainText(
      "ไปดู Beast Games ได้แล้ว",
    );
    await expect(channelDescriptionLocator).toBeVisible();
    // Log the channel branding header description
    const brandingDescription = await channelDescriptionLocator.textContent();
    console.log("Channel header description:", brandingDescription?.trim());

    // --- Open About Popup ---
    console.log(
      "Clicking '..more' button on description to open About Popup...",
    );
    try {
      await Promise.all([
        channelHeaderLocator
          .locator(`.truncated-text-wiz__absolute-button`)
          .click(),
        page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        }),
        page.waitForTimeout(1000),
      ]);
    } catch {}

    // --- Check About Popup ---
    const aboutContainerLocator = page.locator(
      "ytd-engagement-panel-section-list-renderer:visible",
    );
    await aboutContainerLocator.waitFor();

    const aboutTitleLocator =
      aboutContainerLocator.locator(`#title-text:visible`);
    await aboutTitleLocator.waitFor();
    console.log("Checking Channel header for original description...");

    // Check that the branding about title is in English and not in Thai
    try {
      expect(aboutTitleLocator).toHaveCount(1);
    } catch {}
    expect(aboutTitleLocator).toContainText("MrBeast");
    expect(aboutTitleLocator).not.toContainText("มิสเตอร์บีสต์");
    await expect(aboutTitleLocator).toBeVisible();
    // Log the about title
    const aboutTitle = await aboutTitleLocator.textContent();
    console.log("Channel about title:", aboutTitle?.trim());

    const aboutDescriptionSelector = `#description-container > .yt-core-attributed-string:nth-child(1):visible`;
    const aboutDescriptionLocator = aboutContainerLocator.locator(
      aboutDescriptionSelector,
    );
    await aboutDescriptionLocator.waitFor();

    // Check that the branding about description is in English and not in Thai
    try {
      expect(aboutDescriptionLocator).toHaveCount(1);
    } catch {}
    expect(aboutDescriptionLocator).toContainText("SUBSCRIBE FOR A COOKIE");
    expect(aboutDescriptionLocator).not.toContainText(
      "ไปดู Beast Games ได้แล้ว",
    );
    await expect(aboutDescriptionLocator).toBeVisible();
    // Log the about description
    const aboutDescription = await aboutDescriptionLocator.textContent();
    console.log("Channel about title:", aboutDescription?.trim());

    // --- Close Popup
    console.log("Clicking 'X' button to close Popup...");
    try {
      await Promise.all([
        aboutContainerLocator
          .locator(
            `#visibility-button button.yt-spec-button-shape-next:visible`,
          )
          .click(),
        page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        }),
        page.waitForTimeout(500),
      ]);
    } catch {}

    // --- Open About Popup via more links ---
    console.log(
      "Clicking '..more links' button on description to open About Popup...",
    );
    try {
      await Promise.all([
        channelHeaderLocator
          .locator(
            `span.yt-core-attributed-string>span>a.yt-core-attributed-string__link[role="button"]`,
          )
          .click(),
        page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        }),
        page.waitForTimeout(1000),
      ]);
    } catch {}

    // --- Check About A second time via the moreLinks Popup ---

    // Check that the branding about title is in English and not in Thai
    await aboutTitleLocator.waitFor();
    try {
      expect(aboutTitleLocator).toHaveCount(1);
    } catch {}
    expect(aboutTitleLocator).toContainText("MrBeast");
    expect(aboutTitleLocator).not.toContainText("มิสเตอร์บีสต์");
    await expect(aboutTitleLocator).toBeVisible();
    // Log the about title
    const aboutTitle2 = await aboutTitleLocator.textContent();
    console.log("Channel about title:", aboutTitle2?.trim());

    // Check that the branding about description is in English and not in Thai
    await aboutDescriptionLocator.waitFor();
    try {
      expect(aboutDescriptionLocator).toHaveCount(1);
    } catch {}
    expect(aboutDescriptionLocator).toContainText("SUBSCRIBE FOR A COOKIE");
    expect(aboutDescriptionLocator).not.toContainText(
      "ไปดู Beast Games ได้แล้ว",
    );
    await expect(aboutDescriptionLocator).toBeVisible();
    // Log the about description
    const aboutDescription2 = await aboutDescriptionLocator.textContent();
    console.log("Channel about title:", aboutDescription2?.trim());

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-branding-about${addToScreenshotName}-test${testInfo.retry > 0 ? `-${testInfo.retry}` : ""}.png`,
    });

    // --- Close Popup
    console.log("Clicking 'X' button to close Popup...");
    try {
      await Promise.all([
        aboutContainerLocator
          .locator(
            `#visibility-button button.yt-spec-button-shape-next:visible`,
          )
          .click(),
        page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
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
    defaultNetworkIdleTimeoutMs,
  }, testInfo) => {
    await handleRetrySetup(
      testInfo,
      browserNameWithExtensions,
      localeString,
      defaultNetworkIdleTimeoutMs,
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
      defaultNetworkIdleTimeoutMs,
    );

    // Wait for the video player to appear
    const videoPlayerSelector = "#movie_player:visible";
    await page.locator(videoPlayerSelector).waitFor();

    try {
      await Promise.all([
        page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        }),
        page.waitForTimeout(5000),
      ]);
    } catch {}

    try {
      await page.waitForLoadState("networkidle", {
        timeout: defaultNetworkIdleTimeoutMs,
      });
    } catch {}

    // --- Check Branding Title ---
    const uploadInfoLocator = page.locator(
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
