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
    const { page, consoleMessageCount } = await setupPageWithAuth(
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
      .locator(
        "ytd-player .html5-video-player div.ytp-fullerscreen-edu-text#yt-anti-translate-fake-node-fullscreen-edu",
      )
      .textContent();
    console.log("Head Link Video title:", fullStreenVideoTitleFooter?.trim());

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
    expect(consoleMessageCount).toBeLessThan(2000);

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
    const { page, consoleMessageCount } = await setupPageWithAuth(
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
    expect(consoleMessageCount).toBeLessThan(2000);

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
    const { page, consoleMessageCount } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/shorts/PXevNM0awlI",
      browserNameWithExtensions,
    );

    // Wait for the shorts title element to be present
    const shortsTitleSelector = "yt-shorts-video-title-view-model > h2 > span";
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
    expect(consoleMessageCount).toBeLessThan(2000);

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
    const { page, consoleMessageCount } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/@MrBeast/videos",
      browserNameWithExtensions,
    );

    // Wait for the video grid to appear
    await page.waitForSelector("ytd-rich-grid-media");

    // --- Check Videos Tab ---
    const originalVideoTitle = "I Survived The 5 Deadliest Places On Earth";
    const translatedVideoTitle = "Я Выжил В 5 Самых Опасных Местах На Земле";
    const videoSelector = `ytd-rich-item-renderer:has-text("${originalVideoTitle}")`;
    const translatedVideoSelector = `ytd-rich-item-renderer:has-text("${translatedVideoTitle}")`;

    const originalVideo = page.locator(videoSelector).first();
    if (await originalVideo.isVisible()) {
      await page.mouse.wheel(0, 500);
      await originalVideo.scrollIntoViewIfNeeded();
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {}
    }
    const translatedVideo = page.locator(translatedVideoSelector).first();
    if (await translatedVideo.isVisible()) {
      await page.mouse.wheel(0, 500);
      await translatedVideo.scrollIntoViewIfNeeded();
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {}
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
    } catch {}
    await page.waitForTimeout(1000); // Give it a moment to load more items if needed

    // --- Check Shorts Tab ---
    const originalShortTitle = "$10,000 Human Shuffleboard";
    const translatedShortTitle = "Человеческий Шаффлборд за $10,000"; // Adjust if needed
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
      } catch {}
    }
    const translatedShort = page.locator(translatedShortSelector).first();
    if (await translatedShort.isVisible()) {
      await page.mouse.wheel(0, 500);
      await translatedShort.scrollIntoViewIfNeeded();
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {}
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
    } catch {}
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
    expect(consoleMessageCount).toBeLessThan(2000);

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
    const { page, consoleMessageCount } = await setupPageWithAuth(
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
      } catch {}
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
        getAudioTrack?: () => Promise<unknown>;
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
      } catch {}
    }
    await page.waitForTimeout(2000);

    let [currentTrack2, currentId2] = await page.evaluate(async () => {
      type PlayerResponse = {
        videoDetails?: { videoId?: string };
      };
      const video = document.querySelector(
        "#shorts-player",
      ) as HTMLVideoElement & {
        getAudioTrack?: () => Promise<unknown>;
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
      } catch {}
    }
    await page.waitForTimeout(2000);

    let [currentTrack3, currentId3] = await page.evaluate(async () => {
      type PlayerResponse = {
        videoDetails?: { videoId?: string };
      };
      const video = document.querySelector(
        "#shorts-player",
      ) as HTMLVideoElement & {
        getAudioTrack?: () => Promise<unknown>;
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
    expect(consoleMessageCount).toBeLessThan(2000);

    // Close the browser context
    await context.close();

    /**
     * If Track name is "Default" that is always an advert
     * @param currentTrack the audio track that could be of an advert
     * @returns a new short audio track and video id
     */
    async function IfAdvertThenReturnNext(currentTrack, currentVideoId) {
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
          } catch {}
        }
        await page.waitForTimeout(2000);

        return await page.evaluate(async () => {
          type PlayerResponse = {
            videoDetails?: { videoId?: string };
          };
          const video = document.querySelector(
            "#shorts-player",
          ) as HTMLVideoElement & {
            getAudioTrack?: () => Promise<unknown>;
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

  test("YouTube playlist page contains Popular Shorts playlist", async ({
    browserNameWithExtensions,
    localeString,
  }, testInfo) => {
    await handleRetrySetup(testInfo, browserNameWithExtensions, localeString);

    // Launch browser with the extension
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCount } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/@NileRed/playlists",
      browserNameWithExtensions,
    );
    // Locate the elements with the text "Popular Shorts"
    const popularShortsLocator = page.locator(
      'div.yt-lockup-metadata-view-model-wiz__text-container > h3 > a > span:has-text("Popular Shorts")',
    );

    // Assert that at least one matching element exists
    const popularShortsCount = await popularShortsLocator.count();
    expect(popularShortsCount).toBeGreaterThan(0);

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-playlists-test.png`,
    });

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });
});
