/* eslint-disable  @typescript-eslint/no-explicit-any */

import { expect } from "@playwright/test";
import { test } from "../playwright.config";
import {
  handleRetrySetup,
  createBrowserContext,
  setupPageWithAuth,
  loadPageAndVerifyAuth,
} from "./helpers/TestSetupHelper";

test.describe("YouTube Anti-Translate extension", () => {
  test("Prevents current video title and description auto-translation", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=l-nMKJ5J3Uc",
      browserNameWithExtensions,
    );

    // Wait for the video page to fully load
    await page.waitForSelector("ytd-watch-metadata");

    // Expand the description if it's collapsed
    const moreButton = page.locator(
      "#description-inline-expander ytd-text-inline-expander #expand",
    );
    if (await moreButton.isVisible()) {
      await moreButton.click();
      // Wait for the description to expand
      await page.waitForTimeout(1000);
    }

    // Get the description text
    const descriptionText = await page
      .locator("#description-inline-expander:visible")
      .textContent();
    console.log("Description text:", descriptionText?.trim());

    // Get the video title
    const videoTitle = await page
      .locator(
        "h1.ytd-watch-metadata #yt-anti-translate-fake-node-current-video:visible",
      )
      .textContent();
    console.log("Video title:", videoTitle?.trim());

    // Check that the title is in English and not in Russian
    expect(videoTitle).toContain("Ages 1 - 100 Decide Who Wins $250,000");
    expect(videoTitle).not.toContain(
      "Люди от 1 до 100 Лет Решают, кто Выиграет $250,000",
    );

    // Check page title
    const pageTitle = await page.title();
    console.log("Document title for the Video is:", pageTitle?.trim());
    // Check that the document title is in English and not in Russian
    expect(pageTitle).toContain("Ages 1 - 100 Decide Who Wins $250,000");
    expect(pageTitle).not.toContain(
      "Люди от 1 до 100 Лет Решают, кто Выиграет $250,000",
    );

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-extension-test-title.png`,
    });

    // Open full screen
    await page.keyboard.press("F");
    await page.waitForTimeout(500);

    // Get the head link video title
    const headLinkVideoTitle = await page
      .locator(
        "ytd-player .html5-video-player a.ytp-title-link#yt-anti-translate-fake-node-video-head-link",
      )
      .textContent();
    console.log("Head Link Video title:", headLinkVideoTitle?.trim());

    // Check that the title is in English and not in Russian
    expect(headLinkVideoTitle).toContain(
      "Ages 1 - 100 Decide Who Wins $250,000",
    );
    expect(headLinkVideoTitle).not.toContain(
      "Люди от 1 до 100 Лет Решают, кто Выиграет $250,000",
    );

    // Get the full screen footer video title
    const fullStreenVideoTitleFooter = await page
      .locator(".ytp-title-text .ytp-title-fullerscreen-link")
      .nth(1)
      .textContent();
    console.log(
      "Full Screen Head Link Video title:",
      fullStreenVideoTitleFooter?.trim(),
    );

    // Check that the title is in English and not in Russian
    expect(fullStreenVideoTitleFooter).toContain(
      "Ages 1 - 100 Decide Who Wins $250,000",
    );
    expect(fullStreenVideoTitleFooter).not.toContain(
      "Люди от 1 до 100 Лет Решают, кто Выиграет $250,000",
    );

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-extension-test-fullscreen.png`,
    });

    // Exit full screen
    await page.keyboard.press("F");
    await page.waitForTimeout(500);

    await page
      .locator("#description-inline-expander:visible")
      .scrollIntoViewIfNeeded();
    // Check that the description contains the original English text and not the Russian translation
    expect(descriptionText).toContain("believe who they picked");
    expect(descriptionText).toContain(
      "Thanks Top Troops for sponsoring this video",
    );
    expect(descriptionText).not.toContain(
      "Я не могу поверить, кого они выбрали",
    );

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-extension-test-description.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("Prevents current video description to fallback to translated title", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=50G0kIty7Cg",
      browserNameWithExtensions,
    );

    // Wait for the video page to fully load
    await page.waitForSelector("ytd-watch-metadata");

    // Expand the description if it's collapsed
    const moreButton = page.locator(
      "#description-inline-expander ytd-text-inline-expander #expand",
    );
    if (await moreButton.isVisible()) {
      await moreButton.click();
      // Wait for the description to expand
      await page.waitForTimeout(1000);
    }

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-extension-test-description-fallback.png`,
    });

    // Get the description text
    const descriptionText = await page
      .locator("#description-inline-expander:visible")
      .textContent();
    console.log("Description text:", descriptionText?.trim());

    await page
      .locator("#description-inline-expander:visible")
      .scrollIntoViewIfNeeded();
    // Check that the description contains the original English title as fallback and not the Russian title translation fallback
    expect(descriptionText).toContain("Answer The Call, Win $10,000");
    expect(descriptionText).not.toContain("Ответь На Звонок, Выиграй $10,000");

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-extension-test-description-fallback.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube timecode links in description work correctly with Anti-Translate extension", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=4PBPXbd4DkQ",
      browserNameWithExtensions,
    );

    // Wait for the video page to fully load
    await page.waitForSelector("ytd-watch-metadata");

    // Get the initial video time
    const initialTime = await page.evaluate(() => {
      const video = document.querySelector("video");
      return video ? video.currentTime : -1;
    });
    expect(initialTime).toBeGreaterThanOrEqual(0); // Video should be loaded

    // Expand the description if it's collapsed
    const moreButton = page.locator("#expand");
    await moreButton.first().click();
    // Wait for the description to expand
    await page.waitForTimeout(1000);

    // Get the description text to verify it's in English (not translated)
    const descriptionText = await page
      .locator("#description-inline-expander:visible")
      .textContent();
    console.log("Description text:", descriptionText?.trim());

    // Verify description contains expected English text
    expect(descriptionText).toContain(
      "Toy Rockets Challenge - Fun Outdoor Activities for kids!",
    );
    expect(descriptionText).toContain("Chris helps Alice find her cars");
    expect(descriptionText).toContain("Please Subscribe!");
    expect(descriptionText).not.toContain("Запуск ракет"); // Should not contain Russian translation

    // Click on the second timecode (05:36)
    const secondTimecodeSelector = 'a[href*="t=336"]'; // 5:36 = 336 seconds
    await page.waitForSelector(secondTimecodeSelector);
    await page.click(secondTimecodeSelector);

    // Wait for video to update its playback position
    await page.waitForTimeout(2000);

    // Verify the video time has changed to be near the clicked timecode
    const newTime = await page.evaluate(() => {
      const video = document.querySelector("video");
      return video ? video.currentTime : -1;
    });

    // The time should be close to 5:36 (336 seconds)
    expect(newTime).toBeGreaterThanOrEqual(330); // Allow a small buffer below
    expect(newTime).toBeLessThan(350); // And a small buffer above

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-timecode-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube hashtags in description work correctly with Anti-Translate extension", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    // Load a video known to have hashtags in the description
    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=_6D-rEAZhqI",
      browserNameWithExtensions,
    );

    // Wait for the video page to fully load
    await page.waitForSelector("ytd-watch-metadata");

    // Expand the description if it's collapsed
    const moreButton = page.locator("#expand");
    await moreButton.first().click();
    await page.waitForTimeout(1000);

    // Take a screenshot
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-hashtag-test.png`,
    });

    // Verify hashtag link is exist
    const hashtagLinks = page.locator(
      "#description-inline-expander:visible a[href^='/hashtag/']",
    );
    const hashtagCount = await hashtagLinks.count();
    expect(hashtagCount).toBeGreaterThan(0);
    console.log("Hashtag links count:", hashtagCount);

    // Get the first hashtag，verify href
    const firstHashtagHref = await hashtagLinks.first().getAttribute("href");
    expect(firstHashtagHref).toBe(
      "/hashtag/%E6%AD%8C%E3%81%A3%E3%81%A6%E3%81%BF%E3%81%9F",
    );

    // Take a screenshot
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-hashtag-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube mentions in description work correctly with Anti-Translate extension", async ({
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

    // Load a video known to have mentions in the description
    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=krzXfKSJFQ8",
      browserNameWithExtensions,
    );

    // Wait for the video page to fully load
    await page.waitForSelector("ytd-watch-metadata");

    // Expand the description if it's collapsed
    const moreButton = page.locator("#expand");
    await moreButton.first().click();
    await page.waitForTimeout(1000);

    // Take a screenshot
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-mention-test.png`,
    });

    // Verify mention link is exist
    const mentionLinks = page.locator(
      "#description-inline-expander:visible a[href^='/@']",
    );
    const mentionCount = await mentionLinks.count();
    expect(mentionCount).toBeGreaterThan(0);
    console.log("Mention links count:", mentionCount);

    // Get the first mention, verify href
    const firstMentionHref = await mentionLinks.first().getAttribute("href");
    expect(firstMentionHref).toBe("/@AitsukiNakuru");

    // Take a screenshot
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-mention-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube Shorts title is not translated with Anti-Translate extension", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/shorts/PXevNM0awlI",
      browserNameWithExtensions,
    );

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-shorts-test.png`,
    });

    // Wait for the shorts title element to be present
    const shortsTitleSelector =
      "#yt-anti-translate-fake-node-current-short-video";
    await page.waitForSelector(shortsTitleSelector);

    // Get the title text
    const titleElement = page.locator(shortsTitleSelector);
    const shortsTitle = await titleElement.textContent();
    console.log("Shorts title:", shortsTitle?.trim());

    // Verify the title is the original English one and not the Russian translation
    expect(shortsTitle?.trim()).toBe("Highest Away From Me Wins $10,000");
    expect(shortsTitle?.trim()).not.toBe("Достигни Вершины И Выиграй $10,000");
    await expect(page.locator(shortsTitleSelector)).toBeVisible();

    // Check page title
    const pageTitle = await page.title();
    console.log("Document title for the Short is:", pageTitle?.trim());
    // Check that the document title is in English and not in Russian
    expect(pageTitle).toContain("Highest Away From Me Wins $10,000");
    expect(pageTitle).not.toContain("Достигни Вершины И Выиграй $10,000");

    // Wait for the shorts video link element to be present
    const shortsVideoLinkSelector =
      ".ytReelMultiFormatLinkViewModelEndpoint span.yt-core-attributed-string>span:visible";
    await page.waitForSelector(shortsVideoLinkSelector);

    // Get the title text
    const titleLinkElement = page.locator(shortsVideoLinkSelector);
    const shortsLinkTitle = await titleLinkElement.textContent();
    console.log("Shorts Link title:", shortsLinkTitle?.trim());

    // Verify the title is the has English characters and not russian
    expect(shortsLinkTitle?.trim()).toMatch(/[A-Za-z]/); // Checks for any English letters
    expect(shortsLinkTitle?.trim()).not.toMatch(/[А-Яа-яЁё]/); // Ensures no Russian letters

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-shorts-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube channel Videos and Shorts tabs retain original titles", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/@MrBeast/videos",
      browserNameWithExtensions,
    );

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-tabs-test.png`,
    });

    // Wait for the video grid to appear
    await page.waitForSelector("ytd-rich-grid-media");

    // --- Check Videos Tab ---
    const originalVideoTitle = "World's Fastest Car Vs Cheetah!";
    const translatedVideoTitle = "Самая Быстрая Машина в Мире vs Гепард!";
    const videoSelector = `ytd-rich-item-renderer:has-text("${originalVideoTitle}")`;
    const translatedVideoSelector = `ytd-rich-item-renderer:has-text("${translatedVideoTitle}")`;

    const originalVideo = page.locator(videoSelector).first();
    if (await originalVideo.isVisible()) {
      await page.mouse.wheel(0, 500);
      await originalVideo.scrollIntoViewIfNeeded();
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {
        // empty
      }
    }
    const translatedVideo = page.locator(translatedVideoSelector).first();
    if (await translatedVideo.isVisible()) {
      await page.mouse.wheel(0, 500);
      await translatedVideo.scrollIntoViewIfNeeded();
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {
        // empty
      }
    }

    console.log("Checking Videos tab for original title...");
    await expect(originalVideo).toBeVisible();
    await expect(translatedVideo).not.toBeVisible();
    console.log("Original video title found, translated title not found.");

    // --- Switch to Shorts Tab ---
    console.log("Clicking Shorts tab...");
    await page.locator("#tabsContent").getByText("Shorts").click();
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {
      // empty
    }
    await page.waitForTimeout(1000); // Give it a moment to load more items if needed

    // --- Check Shorts Tab ---
    const originalShortTitle = "Find This Briefcase, Win $10,000";
    const translatedShortTitle = "Найдите Этот Портфель, Выиграй $10,000"; // Adjust if needed
    const shortSelector = `ytd-rich-item-renderer:has-text("${originalShortTitle}")`;
    const translatedShortSelector = `ytd-rich-item-renderer:has-text("${translatedShortTitle}")`;

    console.log("Checking Shorts tab for original title...");
    // Shorts might load dynamically, scroll into view to ensure it's loaded
    const originalShort = page.locator(shortSelector).first();
    if (await originalShort.isVisible()) {
      await page.mouse.wheel(0, 500);
      await originalShort.scrollIntoViewIfNeeded();
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {
        // empty
      }
    }
    const translatedShort = page.locator(translatedShortSelector).first();
    if (await translatedShort.isVisible()) {
      await page.mouse.wheel(0, 500);
      await translatedShort.scrollIntoViewIfNeeded();
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {
        // empty
      }
    }
    await page.waitForTimeout(1000); // Give it a moment to load more items if needed

    await expect(page.locator(shortSelector)).toBeVisible({ timeout: 10000 }); // Increased timeout for dynamic loading
    await expect(page.locator(translatedShortSelector)).not.toBeVisible();
    console.log(
      "Original short title found, translated short title not found.",
    );

    // --- Switch back to Videos Tab ---
    console.log("Clicking Videos tab...");
    await page.locator("#tabsContent").getByText("Видео").click();
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {
      // empty
    }
    await page.waitForSelector(
      "ytd-rich-grid-media >> ytd-thumbnail-overlay-time-status-renderer:not([overlay-style='SHORTS'])",
      { state: "visible" },
    ); // Wait for videos to load

    // --- Re-check Videos Tab ---
    console.log("Re-checking Videos tab for original title...");
    await expect(page.locator(videoSelector)).toBeVisible();
    await expect(page.locator(translatedVideoSelector)).not.toBeVisible();
    console.log("Original video title confirmed on Videos tab again.");

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-tabs-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube Shorts audio dubbing is untranslated with Anti-Translate extension", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/@MrBeast/shorts",
      browserNameWithExtensions,
    );

    // Wait for the video page to fully load
    await page.waitForSelector("ytd-rich-item-renderer");

    // Find the first short and click to open
    const firstShort = page.locator("ytd-rich-item-renderer").first();
    if (await firstShort.isVisible()) {
      await firstShort.scrollIntoViewIfNeeded();
      await firstShort.click();
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {
        // empty
      }
    }
    await page.waitForTimeout(2000);

    // Wait for the video page to fully load
    await page.waitForSelector("#shorts-player");

    function getTrackLanguageFieldObjectName(track: object) {
      let languageFieldName: string;

      for (const [fieldName, field] of Object.entries(track)) {
        if (field && typeof field === "object" && field.name) {
          languageFieldName = fieldName;
          break;
        }
      }
      if (!languageFieldName!) {
        return;
      } else {
        return languageFieldName;
      }
    }

    let [currentTrack, currentId] = await page.evaluate(async () => {
      type PlayerResponse = {
        videoDetails?: { videoId?: string };
      };
      const video = document.querySelector(
        "#shorts-player",
      ) as HTMLVideoElement & {
        getAudioTrack?: () => Promise<any>;
        getPlayerResponse?: () => Promise<PlayerResponse>;
      };
      return [
        await video?.getAudioTrack?.(),
        (await video?.getPlayerResponse?.())?.videoDetails?.videoId,
      ];
    });

    // When we detect an Ads short then go next and return the new audio track and video id
    [currentTrack, currentId] = await IfAdvertThenReturnNext(
      currentTrack,
      currentId,
    );

    // Check original track is the selected one
    expect(
      currentTrack[getTrackLanguageFieldObjectName(currentTrack)!]?.name,
    ).toContain("оригинал");
    expect(currentId).not.toBeNull();

    // Go to next short
    const buttonDown = page.locator("#navigation-button-down button").first();
    if (await buttonDown.isVisible()) {
      await buttonDown.scrollIntoViewIfNeeded();
      await buttonDown.click();
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {
        // empty
      }
    }
    await page.waitForTimeout(2000);

    let [currentTrack2, currentId2] = await page.evaluate(async () => {
      type PlayerResponse = {
        videoDetails?: { videoId?: string };
      };
      const video = document.querySelector(
        "#shorts-player",
      ) as HTMLVideoElement & {
        getAudioTrack?: () => Promise<any>;
        getPlayerResponse?: () => Promise<PlayerResponse>;
      };
      return [
        await video?.getAudioTrack?.(),
        (await video?.getPlayerResponse?.())?.videoDetails?.videoId,
      ];
    });

    // When we detect an Ads short then go next and return the new audio track and video id
    [currentTrack2, currentId2] = await IfAdvertThenReturnNext(
      currentTrack2,
      currentId2,
    );

    // Check original track is the selected one
    expect(
      currentTrack2[getTrackLanguageFieldObjectName(currentTrack2)!]?.name,
    ).toContain("оригинал");
    expect(currentId2).not.toBe(currentId);

    // Go to next short
    const buttonDown2 = page.locator("#navigation-button-down button").first();
    if (await buttonDown2.isVisible()) {
      await buttonDown2.scrollIntoViewIfNeeded();
      await buttonDown2.click();
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {
        // empty
      }
    }
    await page.waitForTimeout(2000);

    let [currentTrack3, currentId3] = await page.evaluate(async () => {
      type PlayerResponse = {
        videoDetails?: { videoId?: string };
      };
      const video = document.querySelector(
        "#shorts-player",
      ) as HTMLVideoElement & {
        getAudioTrack?: () => Promise<any>;
        getPlayerResponse?: () => Promise<PlayerResponse>;
      };
      return [
        await video?.getAudioTrack?.(),
        (await video?.getPlayerResponse?.())?.videoDetails?.videoId,
      ];
    });

    // When we detect an Ads short then go next and return the new audio track and video id
    [currentTrack3, currentId3] = await IfAdvertThenReturnNext(
      currentTrack3,
      currentId3,
    );

    // Check original track is the selected one
    expect(
      currentTrack3[getTrackLanguageFieldObjectName(currentTrack3)!]?.name,
    ).toContain("оригинал");
    expect(currentId3).not.toBe(currentId2);

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();

    /**
     * If Track name is "Default" that is always an advert
     * @param currentTrack - the audio track that could be of an advert
     * @param currentVideoId - the video id that could be of an advert
     * @returns a new short audio track and video id
     */
    async function IfAdvertThenReturnNext(
      currentTrack: any,
      currentVideoId: string | undefined,
    ): Promise<[any, string | undefined]> {
      if (
        currentTrack[getTrackLanguageFieldObjectName(currentTrack)!]?.name ===
        "Default"
      ) {
        const buttonDown2 = page
          .locator("#navigation-button-down button")
          .first();
        if (await buttonDown2.isVisible()) {
          await buttonDown2.scrollIntoViewIfNeeded();
          await buttonDown2.click();
          try {
            await page.waitForLoadState("networkidle", { timeout: 5000 });
          } catch {
            // empty
          }
        }
        await page.waitForTimeout(2000);

        return await page.evaluate(async () => {
          type PlayerResponse = {
            videoDetails?: { videoId?: string };
          };
          const video = document.querySelector(
            "#shorts-player",
          ) as HTMLVideoElement & {
            getAudioTrack?: () => Promise<any>;
            getPlayerResponse?: () => Promise<PlayerResponse>;
          };
          return [
            await video?.getAudioTrack?.(),
            (await video?.getPlayerResponse?.())?.videoDetails?.videoId,
          ];
        });
      } else {
        return [currentTrack, currentVideoId];
      }
    }
  });

  test("YouTube channel playlist page contains 'Popular Shorts' playlist", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/@NileRed/playlists",
      browserNameWithExtensions,
    );

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-playlists-test.png`,
    });

    // Locate the elements with the text "Popular Shorts"
    const popularShortsLocator = page.locator(
      '.yt-lockup-metadata-view-model__heading-reset span:has-text("Popular Shorts")',
    );

    // Assert that at least one matching element exists
    const popularShortsCount = await popularShortsLocator.count();
    expect(popularShortsCount).toBeGreaterThan(0);

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-playlists-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube owned feed playlists page contains 'owned-playlist-playwright-test' playlist", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    /**
     * NOTE WELL
     * This test requires the account in use to have a playlist named "owned-playlist-playwright-test" with at least one video in it.
     * If missing you must create it manually as part of setting up the test account.
     */

    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/feed/playlists",
      browserNameWithExtensions,
    );

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-owned-playlists-test.png`,
    });

    // Wait for the video grid to appear
    await page.waitForSelector("ytd-rich-item-renderer");

    // --- Check Videos Tab ---
    const originalPlaylistTitle = "owned-playlist-playwright-test";
    const videoSelector = `ytd-rich-item-renderer:has-text("${originalPlaylistTitle}")`;

    const originalPlaylist = page.locator(videoSelector).first();
    if (await originalPlaylist.isVisible()) {
      await page.mouse.wheel(0, 500);
      await originalPlaylist.scrollIntoViewIfNeeded();
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {
        // empty
      }
    }

    console.log("Checking Videos tab for original title...");
    await expect(originalPlaylist).toBeVisible();
    console.log("Original video title found.");

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-owned-playlists-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube search results page contains NileRed 'Popular Shorts' playlist", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/results?search_query=nilered+popular+shorts",
      browserNameWithExtensions,
    );

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-search-result-playlist-test.png`,
    });

    // Wait for the video grid to appear
    await page.waitForSelector("yt-lockup-view-model");

    // --- Check Videos Tab ---
    const originalPlaylistTitle = "Popular Shorts";
    const videoSelector = `yt-lockup-view-model:has-text("${originalPlaylistTitle}")`;

    const originalPlaylist = page.locator(videoSelector).first();
    if (await originalPlaylist.isVisible()) {
      await page.mouse.wheel(0, 500);
      await originalPlaylist.scrollIntoViewIfNeeded();
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {
        // empty
      }
    }

    console.log("Checking Videos tab for original title...");
    await expect(originalPlaylist).toBeVisible();
    console.log("Original video title found.");

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-search-result-playlist-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube video retains original thumbnail", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/results?search_query=mrbeast+7+Days+Stranded+At+Sea",
      browserNameWithExtensions,
    );

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-video-thumbnail-test.png`,
    });

    // Wait for the video grid to appear
    await page.waitForSelector("ytd-video-renderer");

    // --- Check Videos Tab ---
    const expectedThumbnailSrc =
      "https://i.ytimg.com/vi/yhB3BgJyGl8/hqdefault.jpg";
    const originalVideoTitle = "7 Days Stranded At Sea";
    const videoSelector = `ytd-video-renderer:has-text("${originalVideoTitle}")`;

    const originalPlaylist = page.locator(videoSelector).first();
    if (await originalPlaylist.isVisible()) {
      await page.mouse.wheel(0, 500);
      await originalPlaylist.scrollIntoViewIfNeeded();
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {
        // empty
      }
    }

    // Find the thumbnail image within the located video item
    const thumbnailImage = originalPlaylist.locator('img[src*="ytimg.com"]');
    await expect(thumbnailImage).toHaveAttribute("src", expectedThumbnailSrc);

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-video-thumbnail-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube video playlist retains original thumbnail of the first video", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    /**
     * NOTE WELL
     * This test requires the account in use to have a playlist named "owned-playlist-playwright-test"
     * with as first video [@MrBeast "7 Days Stranded At Sea"](https://www.youtube.com/watch?v=yhB3BgJyGl8).
     * If missing you must create it manually as part of setting up the test account.
     */

    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/feed/playlists",
      browserNameWithExtensions,
    );

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-video-playlist-thumbnail-test.png`,
    });

    // Wait for the video grid to appear
    await page.waitForSelector("ytd-rich-item-renderer");

    // --- Check Videos Tab ---
    const expectedThumbnailSrc =
      "https://i.ytimg.com/vi/yhB3BgJyGl8/hqdefault.jpg";
    const originalPlaylistTitle = "owned-playlist-playwright-test";
    const videoSelector = `ytd-rich-item-renderer:has-text("${originalPlaylistTitle}")`;

    const originalPlaylist = page.locator(videoSelector).first();
    if (await originalPlaylist.isVisible()) {
      await page.mouse.wheel(0, 500);
      await originalPlaylist.scrollIntoViewIfNeeded();
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {
        // empty
      }
    }

    // Find the thumbnail image within the located video item
    const thumbnailImage = originalPlaylist.locator('img[src*="ytimg.com"]');
    await expect(thumbnailImage).toHaveAttribute("src", expectedThumbnailSrc);

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-video-playlist-thumbnail-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube chapters titles are not translated and chapter 2 has expected text", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page with the extension already authenticated
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    // Open a video which contains chapters (used in time-code test)
    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=4PBPXbd4DkQ",
      browserNameWithExtensions,
    );

    // Screenshot for manual visual verification when needed
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-chapters-test.png`,
    });

    // Wait until the chapter button next to the progress bar is rendered
    await page.waitForSelector(
      ".ytp-chapter-title .ytp-chapter-title-content",
      { timeout: 15000 },
    );

    // Seek near the start to allow the extension to map chapters then later to chapter 2 time (≈ 40s based on timecode)
    await page.evaluate(() => {
      const video = document.querySelector("video");
      if (video) {
        video.currentTime = 5 * 60 + 50;
      } // second chapter begins around 0:45 – 1:00 for this video
    });

    // --- Verify chapter button (above progress bar) contains expected chapter 2 English title ---
    const expectedChapterTitle = "Chris helps Alice find her cars";

    // Filter to the element which the extension has decorated with the attribute
    const chapterButtonLocator = page
      .locator(
        ".ytp-chapter-title .ytp-chapter-title-content[data-original-chapter-button]",
      )
      .first();

    // Wait until the attribute appears and matches exactly
    await expect(chapterButtonLocator).toHaveAttribute(
      "data-original-chapter-button",
      expectedChapterTitle,
      { timeout: 10000 },
    );

    // Screenshot for manual visual verification when needed
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-chapters-test.png`,
    });

    // Ensure console is not flooded
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("Works on embedded videos", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page with the extension already authenticated
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await page.goto("https://www.youtube.com/embed/iLU0CE2c2HQ");

    // Wait for the video to load
    try {
      await page.waitForSelector("video", { timeout: 10000 });
    } catch {
      await page.waitForSelector(
        "div.ytp-error-content-wrap-subreason > span:has-text('153')",
        { timeout: 10000 },
      );
      // If we hit a 153 error (playback not available) then skip the rest of the test
      console.log(
        "Video playback not available, skipping the rest of the test.",
      );
      await context.close();
      testInfo.skip();
    }

    await page.click("#movie_player > div.ytp-cued-thumbnail-overlay > button");

    await expect(
      page.locator("#movie_player > div.ytp-cued-thumbnail-overlay > button"),
    ).not.toBeVisible();
    await page.waitForTimeout(2000);

    function getTrackLanguageFieldObjectName(track: object) {
      let languageFieldName: string;

      for (const [fieldName, field] of Object.entries(track)) {
        if (field && typeof field === "object" && field.name) {
          languageFieldName = fieldName;
          break;
        }
      }
      if (!languageFieldName!) {
        return;
      } else {
        return languageFieldName;
      }
    }

    // Check that audio track is set to original
    let currentTrack = await page.evaluate(async () => {
      const video = document.querySelector(
        "#movie_player",
      ) as HTMLVideoElement & {
        getAudioTrack?: () => Promise<any>;
      };
      return await video?.getAudioTrack?.();
    });

    expect(currentTrack).toBeTruthy();

    // Get track the selected name
    let trackLanguageField = getTrackLanguageFieldObjectName(currentTrack);
    if (trackLanguageField) {
      // If value is "Default" then it is an advert
      // Wait for 5 seconds and get a new track
      await page.waitForTimeout(5000);

      if (currentTrack[trackLanguageField]?.name === "Default") {
        // Check that audio track is set to original
        currentTrack = await page.evaluate(async () => {
          const video = document.querySelector(
            "#movie_player",
          ) as HTMLVideoElement & {
            getAudioTrack?: () => Promise<any>;
          };
          return await video?.getAudioTrack?.();
        });

        expect(currentTrack).toBeTruthy();

        // Get track the selected name again
        trackLanguageField = getTrackLanguageFieldObjectName(currentTrack);
      }

      if (trackLanguageField) {
        // If value is still "Default" then it is an advert again so skip the check this time
        if (currentTrack[trackLanguageField]?.name === "Default") {
          console.log("Skipping advert track check.");
        } else {
          expect(currentTrack[trackLanguageField]?.name).toContain("оригинал");
        }
      }
    }

    await expect(
      page.locator(".ytp-title-link.yt-uix-sessionlink"),
    ).toContainText("NAJTAŃSZY DYSK PCIe 5.0 – MA TO SENS W 2025?");

    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-embedded-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("Works on youtube-nocookie videos", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page with the extension already authenticated
    const { page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await page.goto("https://www.youtube-nocookie.com/embed/iLU0CE2c2HQ");

    // Wait for the video to load
    try {
      await page.waitForSelector("video", { timeout: 10000 });
    } catch {
      await page.waitForSelector(
        "div.ytp-error-content-wrap-subreason > span:has-text('153')",
        { timeout: 10000 },
      );
      // If we hit a 153 error (playback not available) then skip the rest of the test
      console.log(
        "Video playback not available, skipping the rest of the test.",
      );
      await context.close();
      testInfo.skip();
    }

    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-nocookie-test.png`,
    });

    await page.click("#movie_player > div.ytp-cued-thumbnail-overlay > button");

    await expect(
      page.locator("#movie_player > div.ytp-cued-thumbnail-overlay > button"),
    ).not.toBeVisible();
    await page.waitForTimeout(2000);

    function getTrackLanguageFieldObjectName(track: object) {
      let languageFieldName: string;

      for (const [fieldName, field] of Object.entries(track)) {
        if (field && typeof field === "object" && field.name) {
          languageFieldName = fieldName;
          break;
        }
      }
      if (!languageFieldName!) {
        return;
      } else {
        return languageFieldName;
      }
    }

    // Check that audio track is set to original
    let currentTrack = await page.evaluate(async () => {
      const video = document.querySelector(
        "#movie_player",
      ) as HTMLVideoElement & {
        getAudioTrack?: () => Promise<any>;
      };
      return await video?.getAudioTrack?.();
    });

    expect(currentTrack).toBeTruthy();

    // Get track the selected name
    let trackLanguageField = getTrackLanguageFieldObjectName(currentTrack);
    if (trackLanguageField) {
      // If value is "Default" then it is an advert
      // Wait for 5 seconds and get a new track
      await page.waitForTimeout(5000);

      if (currentTrack[trackLanguageField]?.name === "Default") {
        // Check that audio track is set to original
        currentTrack = await page.evaluate(async () => {
          const video = document.querySelector(
            "#movie_player",
          ) as HTMLVideoElement & {
            getAudioTrack?: () => Promise<any>;
          };
          return await video?.getAudioTrack?.();
        });

        expect(currentTrack).toBeTruthy();

        // Get track the selected name again
        trackLanguageField = getTrackLanguageFieldObjectName(currentTrack);
      }

      if (trackLanguageField) {
        // If value is still "Default" then it is an advert again so skip the check this time
        if (currentTrack[trackLanguageField]?.name === "Default") {
          console.log("Skipping advert track check.");
        } else {
          expect(currentTrack[trackLanguageField]?.name).toContain("оригинал");
        }
      }
    }

    await expect(
      page.locator(".ytp-title-link.yt-uix-sessionlink"),
    ).toContainText("NAJTAŃSZY DYSK PCIe 5.0 – MA TO SENS W 2025?");

    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-nocookie-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });
});
