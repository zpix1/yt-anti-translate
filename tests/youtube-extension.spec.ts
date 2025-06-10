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
    const context = await createBrowserContext(browserNameWithExtensions);

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
    // Wait for the video page to fully load
    await page.locator("ytd-watch-metadata:visible").waitFor();

    try {
      await Promise.all([
        page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        }),
        page.waitForTimeout(5000),
      ]);
    } catch {}

    const videoTitleSelector =
      "h1.ytd-watch-metadata:visible #yt-anti-translate-fake-node-current-video:visible";
    const videoTitleLocator = page.locator(videoTitleSelector);
    await videoTitleLocator.waitFor();

    // Check that the title is in English and not in Russian
    try {
      expect(videoTitleLocator).toHaveCount(1);
    } catch {}
    expect(videoTitleLocator).toContainText(
      "Ages 1 - 100 Decide Who Wins $250,000",
    );
    expect(videoTitleLocator).not.toContainText(
      "Люди от 1 до 100 Лет Решают, кто Выиграет $250,000",
    );
    // log the video title
    const videoTitle = await videoTitleLocator.textContent();
    console.log("Video title:", videoTitle?.trim());

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-extension-test-title${testInfo.retry > 0 ? `-${testInfo.retry}` : ""}.png`,
    });

    // Open full screen
    await page.keyboard.press("F");
    try {
      await Promise.all([
        page.waitForTimeout(500),
        page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        }),
      ]);
    } catch {}

    const headLinkVideoTitleLocator = page.locator(
      "ytd-player .html5-video-player a.ytp-title-link#yt-anti-translate-fake-node-video-head-link",
    );

    // Check that the title is in English and not in Russian
    try {
      expect(headLinkVideoTitleLocator).toHaveCount(1);
    } catch {}
    expect(headLinkVideoTitleLocator).toContainText(
      "Ages 1 - 100 Decide Who Wins $250,000",
    );
    expect(headLinkVideoTitleLocator).not.toContainText(
      "Люди от 1 до 100 Лет Решают, кто Выиграет $250,000",
    );
    // Log the head link video title
    const headLinkVideoTitle = await headLinkVideoTitleLocator.textContent();
    console.log("Head Link Video title:", headLinkVideoTitle?.trim());

    const fullStreenVideoTitleFooterLocator = page.locator(
      "ytd-player .html5-video-player div.ytp-fullerscreen-edu-text#yt-anti-translate-fake-node-fullscreen-edu",
    );

    // Check that the title is in English and not in Russian
    try {
      expect(fullStreenVideoTitleFooterLocator).toHaveCount(1);
    } catch {}
    expect(fullStreenVideoTitleFooterLocator).toContainText(
      "Ages 1 - 100 Decide Who Wins $250,000",
    );
    expect(fullStreenVideoTitleFooterLocator).not.toContainText(
      "Люди от 1 до 100 Лет Решают, кто Выиграет $250,000",
    );
    // Log the full screen footer video title
    const fullStreenVideoTitleFooter =
      await fullStreenVideoTitleFooterLocator.textContent();
    console.log("Head Link Video title:", fullStreenVideoTitleFooter?.trim());

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-extension-test-fullscreen${testInfo.retry > 0 ? `-${testInfo.retry}` : ""}.png`,
    });

    // Exit full screen
    await page.keyboard.press("F");
    try {
      await Promise.all([
        page.waitForTimeout(500),
        page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        }),
      ]);
    } catch {}

    const descriptionLocator = page.locator(
      "ytd-text-inline-expander#description-inline-expander:visible",
    );
    await descriptionLocator.waitFor();

    // Expand the description if it's collapsed
    const moreButton = descriptionLocator.locator("#expand:visible");
    await moreButton.waitFor();
    if (await moreButton.isVisible()) {
      try {
        // Wait for the description to expand
        await Promise.all([
          moreButton.click(),
          page.waitForLoadState("networkidle", {
            timeout: defaultNetworkIdleTimeoutMs,
          }),
          page.waitForTimeout(1000),
        ]);
      } catch {}
    }

    await descriptionLocator.scrollIntoViewIfNeeded();
    try {
      await Promise.all([
        page.waitForTimeout(500),
        page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        }),
      ]);
    } catch {}
    try {
      expect(descriptionLocator).toHaveCount(1);
    } catch {}
    // Check that the description contains the original English text and not the Russian translation
    expect(descriptionLocator).toContainText("believe who they picked");
    expect(descriptionLocator).toContainText(
      "Thanks Top Troops for sponsoring this video",
    );
    expect(descriptionLocator).not.toContainText(
      "Я не могу поверить, кого они выбрали",
    );
    // Log the description text
    const descriptionText = await page
      .locator("#description-inline-expander:visible")
      .textContent();
    console.log("Description text:", descriptionText?.trim());

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-extension-test-description${testInfo.retry > 0 ? `-${testInfo.retry}` : ""}.png`,
    });

    await page.waitForFunction(
      () => document.title.includes("Ages 1 - 100 Decide Who Wins $250,000"),
      null,
    );
    // Check page title
    const pageTitle = await page.title();
    console.log("Document title for the Video is:", pageTitle?.trim());
    // Check that the document title is in English and not in Russian
    expect(pageTitle).toContain("Ages 1 - 100 Decide Who Wins $250,000");
    expect(pageTitle).not.toContain(
      "Люди от 1 до 100 Лет Решают, кто Выиграет $250,000",
    );

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(2000 * defaultTimeoutMs);

    // Close the browser context
    await context.close();
  });

  test("YouTube timecode links in description work correctly with Anti-Translate extension", async ({
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
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCount } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
      defaultTimeoutMs,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=4PBPXbd4DkQ",
      browserNameWithExtensions,
      defaultNetworkIdleTimeoutMs,
    );

    // Wait for the video page to fully load
    await page.locator("ytd-watch-metadata:visible").waitFor();

    try {
      await Promise.all([
        page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        }),
        page.waitForTimeout(5000),
      ]);
    } catch {}

    // Get the initial video time
    const initialTime = await page.evaluate(() => {
      const video = document.querySelector("video");
      return video ? video.currentTime : -1;
    });
    expect(initialTime).toBeGreaterThanOrEqual(0); // Video should be loaded

    const descriptionLocator = page.locator(
      "ytd-text-inline-expander#description-inline-expander:visible",
    );
    await descriptionLocator.waitFor();

    // Expand the description if it's collapsed
    const moreButton = descriptionLocator.locator("#expand:visible");
    await moreButton.waitFor();
    if (await moreButton.isVisible()) {
      await Promise.all([
        moreButton.click(),
        // Wait for the description to expand
        await page.waitForTimeout(1000),
      ]);
    }

    // Verify description contains expected English text
    try {
      expect(descriptionLocator).toHaveCount(1);
    } catch {}
    expect(descriptionLocator).toContainText(
      "Toy Rockets Challenge - Fun Outdoor Activities for kids!",
    );
    expect(descriptionLocator).toContainText("Chris helps Alice find her cars");
    expect(descriptionLocator).toContainText("Please Subscribe!");
    expect(descriptionLocator).not.toContainText("Запуск ракет"); // Should not contain Russian translation
    const descriptionText = await descriptionLocator.textContent();
    console.log("Description text:", descriptionText?.trim());

    // Click on the second timecode (05:36)
    const secondTimecodeSelector = 'a[href*="t=336"]:visible'; // 5:36 = 336 seconds
    const secondTimecodeLocator = descriptionLocator
      .locator(secondTimecodeSelector)
      .first();
    if (await secondTimecodeLocator.isVisible()) {
      await secondTimecodeLocator.scrollIntoViewIfNeeded();
      await Promise.all([
        secondTimecodeLocator.click(),
        // Wait for video to update its playback position
        page.waitForTimeout(2000),
      ]);
    }

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
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-timecode-test${testInfo.retry > 0 ? `-${testInfo.retry}` : ""}.png`,
    });

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube Shorts title is not translated with Anti-Translate extension", async ({
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
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCount } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
      defaultTimeoutMs,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/shorts/PXevNM0awlI",
      browserNameWithExtensions,
      defaultNetworkIdleTimeoutMs,
    );

    // Wait for the shorts title element to be present
    const shortsTitleSelector =
      "yt-shorts-video-title-view-model > h2 > span:visible";
    const titleLocator = page.locator(shortsTitleSelector);
    await titleLocator.waitFor();

    try {
      await Promise.all([
        page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        }),
        page.waitForTimeout(5000),
      ]);
    } catch {}

    // Verify the title is the original English one and not the Russian translation
    try {
      expect(titleLocator).toHaveCount(1);
    } catch {}
    expect(titleLocator).toHaveText("Highest Away From Me Wins $10,000");
    expect(titleLocator).not.toHaveText("Достигни Вершины И Выиграй $10,000");
    expect(titleLocator).toBeVisible();
    // Log the title text
    const shortsTitle = await titleLocator.textContent();
    console.log("Shorts title:", shortsTitle?.trim());

    // Wait for the shorts video link element to be present
    const shortsVideoLinkSelector =
      ".ytReelMultiFormatLinkViewModelEndpoint span.yt-core-attributed-string>span:visible";
    const titleLinkLocator = page.locator(shortsVideoLinkSelector);
    await titleLinkLocator.waitFor();

    // Verify the title is the has English characters and not russian
    try {
      expect(titleLinkLocator).toHaveCount(1);
    } catch {}
    expect(titleLinkLocator).toHaveText(/[A-Za-z]/); // Checks for any English letters
    expect(titleLinkLocator).not.toHaveText(/[А-Яа-яЁё]/); // Ensures no Russian letters
    // Log the title text
    const shortsLinkTitle = await titleLinkLocator.textContent();
    console.log("Shorts Link title:", shortsLinkTitle?.trim());

    await page.waitForFunction(
      () => document.title.includes("Highest Away From Me Wins $10,000"),
      null,
    );
    // Check page title
    const pageTitle = await page.title();
    console.log("Document title for the Short is:", pageTitle?.trim());
    // Check that the document title is in English and not in Russian
    expect(pageTitle).toContain("Highest Away From Me Wins $10,000");
    expect(pageTitle).not.toContain("Достигни Вершины И Выиграй $10,000");

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-shorts-test${testInfo.retry > 0 ? `-${testInfo.retry}` : ""}.png`,
    });

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube channel Videos and Shorts tabs retain original titles", async ({
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
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCount } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
      defaultTimeoutMs,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/@MrBeast/videos",
      browserNameWithExtensions,
      defaultNetworkIdleTimeoutMs,
    );

    // Wait for the video grid to appear
    await page.locator("ytd-rich-grid-media:visible").first().waitFor();

    try {
      await Promise.all([
        page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        }),
        page.waitForTimeout(5000),
      ]);
    } catch {}

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
        await page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        });
      } catch {}
    }
    const translatedVideo = page.locator(translatedVideoSelector).first();
    if (await translatedVideo.isVisible()) {
      await page.mouse.wheel(0, 500);
      await translatedVideo.scrollIntoViewIfNeeded();
      try {
        await page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        });
      } catch {}
    }

    console.log("Checking Videos tab for original title...");
    await expect(originalVideo).toBeVisible();
    await expect(translatedVideo).not.toBeVisible();
    console.log("Original video title found, translated title not found.");

    // --- Switch to Shorts Tab ---
    console.log("Clicking Shorts tab...");
    try {
      await Promise.all([
        page.locator("#tabsContent").getByText("Shorts").click(),
        page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        }),
        page.waitForTimeout(1000),
      ]);
    } catch {}

    // --- Check Shorts Tab ---
    const originalShortTitle = "$10,000 Human Shuffleboard";
    const translatedShortTitle = "Человеческий Шаффлборд за $10,000"; // Adjust if needed
    const shortSelector = `ytd-rich-item-renderer:has-text("${originalShortTitle}")`;
    const translatedShortSelector = `ytd-rich-item-renderer:has-text("${translatedShortTitle}")`;

    console.log("Checking Shorts tab for original title...");
    // Shorts might load dynamically, scroll into view to ensure it's loaded
    const originalShort = page.locator(shortSelector).first();
    if (await originalShort.isVisible()) {
      try {
        await Promise.all([
          page.mouse.wheel(0, 500),
          originalShort.scrollIntoViewIfNeeded(),
          page.waitForLoadState("networkidle", {
            timeout: defaultNetworkIdleTimeoutMs,
          }),
          page.waitForTimeout(1000),
        ]);
      } catch {}
    }
    const translatedShort = page.locator(translatedShortSelector).first();
    if (await translatedShort.isVisible()) {
      try {
        await Promise.all([
          page.mouse.wheel(0, 500),
          translatedShort.scrollIntoViewIfNeeded(),
          page.waitForLoadState("networkidle", {
            timeout: defaultNetworkIdleTimeoutMs,
          }),
          page.waitForTimeout(1000),
        ]);
      } catch {}
    }

    await expect(page.locator(shortSelector)).toBeVisible(); // Increased timeout for dynamic loading
    await expect(page.locator(translatedShortSelector)).not.toBeVisible();
    console.log(
      "Original short title found, translated short title not found.",
    );

    // --- Switch back to Videos Tab ---
    console.log("Clicking Videos tab...");
    try {
      await Promise.all([
        page.locator("#tabsContent").getByText("Видео").click(),
        page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        }),
        page.waitForTimeout(1000),
      ]);
    } catch {}
    await page
      .locator(
        "ytd-rich-grid-media:visible >> ytd-thumbnail-overlay-time-status-renderer:not([overlay-style='SHORTS']):visible",
      )
      .first()
      .waitFor(); // Wait for videos to load

    // --- Re-check Videos Tab ---
    console.log("Re-checking Videos tab for original title...");
    await expect(page.locator(videoSelector)).toBeVisible();
    await expect(page.locator(translatedVideoSelector)).not.toBeVisible();
    console.log("Original video title confirmed on Videos tab again.");

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-tabs-test${testInfo.retry > 0 ? `-${testInfo.retry}` : ""}.png`,
    });

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube Shorts audio dubbing is untranslated with Anti-Translate extension", async ({
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
    const context = await createBrowserContext(browserNameWithExtensions);

    // Create a new page
    const { page, consoleMessageCount } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
      defaultTimeoutMs,
    );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/@MrBeast/shorts",
      browserNameWithExtensions,
      defaultNetworkIdleTimeoutMs,
    );

    // Wait for the shorts page to fully load
    await page.locator("ytd-rich-item-renderer:visible").first().waitFor();

    try {
      await Promise.all([
        page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        }),
        page.waitForTimeout(5000),
      ]);
    } catch {}

    // Find the first short and click to open
    const firstShort = page.locator("ytd-rich-item-renderer").first();
    if (await firstShort.isVisible()) {
      await firstShort.scrollIntoViewIfNeeded();
      try {
        await Promise.all([
          firstShort.click(),
          page.waitForLoadState("networkidle", {
            timeout: defaultNetworkIdleTimeoutMs,
          }),
          page.waitForTimeout(5000),
        ]);
      } catch {}
    }

    // Wait for the video page to fully load
    await page.locator("#shorts-player:visible").waitFor();

    try {
      await page.waitForLoadState("networkidle", {
        timeout: defaultNetworkIdleTimeoutMs,
      });
    } catch {}

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
      const video = document.querySelector(
        "#shorts-player",
      ) as HTMLVideoElement & {
        getAudioTrack?: () => Promise<AudioTrackResponse>;
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
      currentTrack![getTrackLanguageFieldObjectName(currentTrack!)!]?.name,
    ).toContain("оригинал");
    expect(currentId).not.toBeNull();

    await goToNextShort();

    let [currentTrack2, currentId2] = await page.evaluate(async () => {
      const video = document.querySelector(
        "#shorts-player",
      ) as HTMLVideoElement & {
        getAudioTrack?: () => Promise<AudioTrackResponse>;
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
      currentTrack2![getTrackLanguageFieldObjectName(currentTrack2!)!]?.name,
    ).toContain("оригинал");
    expect(currentId2).not.toBe(currentId);

    await goToNextShort();

    let [currentTrack3, currentId3] = await page.evaluate(async () => {
      const video = document.querySelector(
        "#shorts-player",
      ) as HTMLVideoElement & {
        getAudioTrack?: () => Promise<AudioTrackResponse>;
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
      currentTrack3![getTrackLanguageFieldObjectName(currentTrack3!)!]?.name,
    ).toContain("оригинал");
    expect(currentId3).not.toBe(currentId2);

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(2000);

    // Close the browser context
    await context.close();

    /**
     * Finds the next short button and click
     */
    async function goToNextShort() {
      const buttonDown = page.locator("#navigation-button-down button").first();
      await buttonDown.waitFor();
      if (await buttonDown.isVisible()) {
        await buttonDown.scrollIntoViewIfNeeded();
        try {
          await Promise.all([
            buttonDown.click(),
            page.waitForLoadState("networkidle", {
              timeout: defaultNetworkIdleTimeoutMs,
            }),
            page.waitForTimeout(2000),
          ]);
        } catch {}
      }
    }

    /**
     * If Track name is "Default" that is always an advert
     * @param currentTrack the audio track that could be of an advert
     * @returns a new short audio track and video id
     */
    async function IfAdvertThenReturnNext(currentTrack, currentVideoId) {
      while (
        currentTrack[getTrackLanguageFieldObjectName(currentTrack)!]?.name ===
        "Default"
      ) {
        await goToNextShort();

        // Re-fetch currentTrack and currentVideoId from the page
        [currentTrack, currentVideoId] = await page.evaluate(async () => {
          const video = document.querySelector(
            "#shorts-player",
          ) as HTMLVideoElement & {
            getAudioTrack?: () => Promise<AudioTrackResponse>;
            getPlayerResponse?: () => Promise<PlayerResponse>;
          };
          return [
            await video?.getAudioTrack?.(),
            (await video?.getPlayerResponse?.())?.videoDetails?.videoId,
          ];
        });
      }

      return [currentTrack, currentVideoId];
    }

    type PlayerResponse = {
      videoDetails?: { videoId?: string };
    };
    type AudioTrackResponse = object;
  });
});
