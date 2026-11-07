/* eslint-disable  @typescript-eslint/no-explicit-any */

import {
  Browser,
  BrowserContext,
  Page,
  TestInfo,
  expect,
} from "@playwright/test";
import { test } from "../playwright.config";
import {
  setupTestEnvironment,
  loadPageAndVerifyAuth,
  waitForSelectorOrRetryWithPageReload,
  getFirstVisibleLocator,
} from "./helpers/TestSetupHelper";

test.describe("YouTube Anti-Translate extension", () => {
  test("Prevents current video title and description auto-translation", async ({
    browserNameWithExtensions,
    localeString,
    isMobile,
  }, testInfo) => {
    // Handle retries and prerequisite setup
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=l-nMKJ5J3Uc",
      browserNameWithExtensions,
    );

    // Wait for the video page to fully load
    await waitForSelectorOrRetryWithPageReload(page, "ytd-watch-metadata");

    const descriptionLocator = page.locator("#description-inline-expander");
    await expect(descriptionLocator).toBeVisible({ timeout: 15_000 });

    // Expand the description if it's collapsed
    const moreButton = descriptionLocator.locator(
      "ytd-text-inline-expander #expand",
    );
    if (await moreButton.isVisible()) {
      await moreButton.click();
      // Wait for the description to expand
      await page.waitForTimeout(process.env.CI ? 1500 : 1000);
    }

    // Get the description text
    const descriptionText = await descriptionLocator.innerText();
    console.log("Description text:", descriptionText?.trim());

    // Get the video title
    const videoTitleLocator = await getFirstVisibleLocator(
      page.locator(
        "h1.ytd-watch-metadata #yt-anti-translate-fake-node-current-video",
      ),
    );
    const videoTitle = await videoTitleLocator.textContent();
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
    await page.waitForTimeout(process.env.CI ? 750 : 500);

    // Get the head link video title
    const headLinkVideoTitleLocator = await page.locator(
      "ytd-player .html5-video-player #yt-anti-translate-fake-node-video-head-link",
    );
    await headLinkVideoTitleLocator.waitFor();
    const headLinkVideoTitle = await headLinkVideoTitleLocator.textContent();
    console.log("Head Link Video title:", headLinkVideoTitle?.trim());

    // Check that the title is in English and not in Russian
    expect(headLinkVideoTitle).toContain(
      "Ages 1 - 100 Decide Who Wins $250,000",
    );
    expect(headLinkVideoTitle).not.toContain(
      "Люди от 1 до 100 Лет Решают, кто Выиграет $250,000",
    );

    // Get the full screen footer video title
    // Youtube removed this element of 15/10/2025, so this check is disabled for now
    // const fullScreenVideoTitleFooterLocator = await page
    //   .locator(".ytp-title-text .ytp-title-fullerscreen-link")
    //   .nth(1);
    // await fullScreenVideoTitleFooterLocator.waitFor();
    // const fullScreenVideoTitleFooter =
    //   await fullScreenVideoTitleFooterLocator.textContent();
    // console.log(
    //   "Full Screen Head Link Video title:",
    //   fullScreenVideoTitleFooter?.trim(),
    // );

    // // Check that the title is in English and not in Russian
    // expect(fullScreenVideoTitleFooter).toContain(
    //   "Ages 1 - 100 Decide Who Wins $250,000",
    // );
    // expect(fullScreenVideoTitleFooter).not.toContain(
    //   "Люди от 1 до 100 Лет Решают, кто Выиграет $250,000",
    // );

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-extension-test-fullscreen.png`,
    });

    // Exit full screen
    await page.keyboard.press("F");
    await page.waitForTimeout(process.env.CI ? 750 : 500);

    const descriptionLocator2 = await getFirstVisibleLocator(
      page.locator("#description-inline-expander"),
    );
    await descriptionLocator2.scrollIntoViewIfNeeded();
    const descriptionText2 = await descriptionLocator2.innerText();
    // Check that the description contains the original English text and not the Russian translation
    expect(descriptionText2).toContain("believe who they picked");
    expect(descriptionText2).toContain(
      "Thanks Top Troops for sponsoring this video",
    );
    expect(descriptionText2).not.toContain(
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
    isMobile,
  }, testInfo) => {
    // Handle retries and prerequisite setup
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=50G0kIty7Cg",
      browserNameWithExtensions,
    );

    // Wait for the video page to fully load
    await waitForSelectorOrRetryWithPageReload(page, "ytd-watch-metadata");

    // Expand the description if it's collapsed
    const moreButton = page.locator(
      "#description-inline-expander ytd-text-inline-expander #expand",
    );
    if (await moreButton.isVisible()) {
      await moreButton.click();
      // Wait for the description to expand
      await page.waitForTimeout(process.env.CI ? 1500 : 1000);
    }

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-extension-test-description-fallback.png`,
    });

    // Get the description text
    const descriptionLocator = await getFirstVisibleLocator(
      page.locator("#description-inline-expander"),
    );
    await descriptionLocator.scrollIntoViewIfNeeded();
    const descriptionText = await descriptionLocator.innerText();
    console.log("Description text:", descriptionText?.trim());

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
    isMobile,
  }, testInfo) => {
    // Handle retries and prerequisite setup
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=4PBPXbd4DkQ",
      browserNameWithExtensions,
    );

    // Wait for the video page to fully load
    await waitForSelectorOrRetryWithPageReload(page, "ytd-watch-metadata");

    // Get the initial video time
    const initialTime = await page.evaluate(() => {
      const video = document.querySelector("video");
      return video ? video.currentTime : -1;
    });
    expect(initialTime).toBeGreaterThanOrEqual(0); // Video should be loaded

    // Expand the description if it's collapsed
    const moreButton = page.locator("#expand");
    await moreButton.first().waitFor();
    await moreButton.first().click();
    // Wait for the description to expand
    await page.waitForTimeout(process.env.CI ? 1500 : 1000);

    // Get the description text to verify it's in English (not translated)
    const descriptionLocator = await getFirstVisibleLocator(
      page.locator("#description-inline-expander"),
    );
    await descriptionLocator.scrollIntoViewIfNeeded();
    const descriptionText = await descriptionLocator.innerText();
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
    const timecodeLink = await getFirstVisibleLocator(
      page.locator(secondTimecodeSelector),
    );
    await timecodeLink.scrollIntoViewIfNeeded();
    await page.waitForTimeout(process.env.CI ? 150 : 100);
    await timecodeLink.click();

    // Wait for video to update its playback position
    await page.waitForTimeout(process.env.CI ? 3000 : 2000);

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
    isMobile,
  }, testInfo) => {
    // Handle retries and prerequisite setup
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    // Load a video known to have hashtags in the description
    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=_6D-rEAZhqI",
      browserNameWithExtensions,
    );

    // Wait for the video page to fully load
    await waitForSelectorOrRetryWithPageReload(page, "ytd-watch-metadata");

    // Expand the description if it's collapsed
    const moreButton = page.locator("#expand");
    await moreButton.first().waitFor();
    await moreButton.first().click();
    await page.waitForTimeout(process.env.CI ? 1500 : 1000);

    // Take a screenshot
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-hashtag-test.png`,
    });

    // Verify hashtag link is exist
    const hashtagLinks = await getFirstVisibleLocator(
      page.locator("#description-inline-expander a[href^='/hashtag/']"),
    );
    const hashtagCount = await hashtagLinks.count();
    expect(hashtagCount).toBeGreaterThan(0);
    console.log("Hashtag links count:", hashtagCount);

    // Get the first hashtag，verify href
    const firstHashtagHref = await hashtagLinks.getAttribute("href");
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
    isMobile,
  }, testInfo) => {
    // Handle retries and prerequisite setup
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    // Load a video known to have mentions in the description
    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=krzXfKSJFQ8",
      browserNameWithExtensions,
    );

    // Wait for the video page to fully load
    await waitForSelectorOrRetryWithPageReload(page, "ytd-watch-metadata");

    // Expand the description if it's collapsed
    const moreButton = page.locator("#expand");
    await moreButton.first().waitFor();
    await moreButton.first().click();
    await page.waitForTimeout(process.env.CI ? 1500 : 1000);

    // Take a screenshot
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-mention-test.png`,
    });

    // Verify mention link is exist
    const mentionLinks = await getFirstVisibleLocator(
      page.locator("#description-inline-expander a[href^='/@']"),
    );
    const mentionCount = await mentionLinks.count();
    expect(mentionCount).toBeGreaterThan(0);
    console.log("Mention links count:", mentionCount);

    // Get the first mention, verify href
    const firstMentionHref = await mentionLinks.getAttribute("href");
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
    isMobile,
  }, testInfo) => {
    // Handle retries and prerequisite setup
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/shorts/PXevNM0awlI",
      browserNameWithExtensions,
    );

    // YouTube's current Shorts layout uses an h1. Keep this assertion next to
    // the existing fake-node assertion so selector regressions are explicit.
    await expect(
      page.locator(
        "yt-shorts-video-title-view-model > h1.ytShortsVideoTitleViewModelShortsVideoTitle",
      ),
    ).toHaveCount(1);

    // Take a screenshot for visual verification
    try {
      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-shorts-test.png`,
      });
    } catch {
      // First screenshot is not essential so it is allowed to fail
    }

    // Wait for the shorts title element to be present
    const shortsTitleSelector =
      "#yt-anti-translate-fake-node-current-short-video";
    await waitForSelectorOrRetryWithPageReload(page, shortsTitleSelector);

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

    // Featured links are optional and are not rendered for every anonymous
    // viewer. Verify their title only when YouTube includes one.
    const titleLinkElements = page.locator(
      ".ytReelMultiFormatLinkViewModelEndpoint span.yt-core-attributed-string>span:visible",
    );
    if ((await titleLinkElements.count()) > 0) {
      const shortsLinkTitle = await titleLinkElements.first().textContent();
      console.log("Shorts Link title:", shortsLinkTitle?.trim());
      expect(shortsLinkTitle?.trim()).toMatch(/[A-Za-z]/);
      expect(shortsLinkTitle?.trim()).not.toMatch(/[А-Яа-яЁё]/);
    }

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-shorts-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test("YouTube paused player retains a high-resolution original thumbnail", async ({
    browserNameWithExtensions,
    localeString,
    isMobile,
  }, testInfo) => {
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=yhB3BgJyGl8",
      browserNameWithExtensions,
    );

    await expect(page.locator(".ytp-cued-thumbnail-overlay-image")).toHaveCSS(
      "background-image",
      /https:\/\/i\.ytimg\.com\/vi\/yhB3BgJyGl8\/maxresdefault\.jpg\?youtube-anti-translate=\d+/,
    );

    expect(consoleMessageCountContainer.count).toBeLessThan(2000);
    await context.close();
  });

  test("YouTube Shorts linked video title is not translated", async ({
    browserNameWithExtensions,
    localeString,
    isMobile,
  }, testInfo) => {
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/shorts/5mU6SRS2Bxo",
      browserNameWithExtensions,
    );

    const linkedVideo = page.locator(
      'yt-reel-carousel-view-model a[href*="watch?v=_c2e1NcI3Sc"], a.ytReelMultiFormatLinkViewModelEndpoint[href*="watch?v=_c2e1NcI3Sc"]',
    );
    await expect(linkedVideo).toBeVisible();
    const originalTitle = linkedVideo.locator(
      "#yt-anti-translate-fake-node-current-short-video-links",
    );
    const translatedTitle = linkedVideo.locator(
      ":is(.yt-core-attributed-string, .ytAttributedStringHost) > span:not(#yt-anti-translate-fake-node-current-short-video-links)",
    );
    await expect(originalTitle).toHaveText(
      "Beat Professional Athlete, Win $100,000",
    );
    await expect(originalTitle).toBeVisible();
    await expect(translatedTitle).toBeHidden();
    await expect(linkedVideo).toHaveAttribute(
      "aria-label",
      "Beat Professional Athlete, Win $100,000",
    );

    expect(consoleMessageCountContainer.count).toBeLessThan(2000);
    await context.close();
  });

  test("YouTube channel Videos and Shorts tabs retain original titles", async ({
    browserNameWithExtensions,
    localeString,
    isMobile,
  }, testInfo) => {
    // Handle retries and prerequisite setup
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/@MrBeast/videos",
      browserNameWithExtensions,
    );

    const tabs = page.locator("#tabsContent");
    const popular = page.getByRole("tab", { name: "Популярные", exact: true });
    const videoTitle = page.locator(
      'ytd-rich-item-renderer h3 a[href*="v=0e3GPea1Tyg"]',
    );

    async function selectPopular() {
      await expect(async () => {
        if (
          (await popular.getAttribute("aria-selected", { timeout: 2_000 })) !==
          "true"
        ) {
          await popular.click({ timeout: 2_000 });
        }
        await expect(popular).toHaveAttribute("aria-selected", "true", {
          timeout: 2_000,
        });
      }).toPass({ timeout: 15_000 });
    }

    await selectPopular();
    await expect(videoTitle).toBeVisible();
    await expect(videoTitle).toHaveText("$456,000 Squid Game In Real Life!");

    await tabs.getByText("Shorts", { exact: true }).click();
    await expect(page).toHaveURL(/\/@MrBeast\/shorts(?:[?#]|$)/i);
    await expect(
      page
        .locator('ytd-rich-item-renderer a[href^="/shorts/"]:visible')
        .first(),
    ).toBeVisible();
    await selectPopular();
    const shortCard = page.locator("ytd-rich-item-renderer").filter({
      has: page.locator('a[href^="/shorts/50G0kIty7Cg"]'),
    });
    await expect(
      shortCard.getByText("Answer The Call, Win $10,000", { exact: true }),
    ).toBeVisible();
    await expect(
      shortCard.getByText("Ответь На Звонок, Выиграй $10,000", { exact: true }),
    ).toBeHidden();

    await tabs.getByText("Видео", { exact: true }).click();
    await expect(page).toHaveURL(/\/@MrBeast\/videos(?:[?#]|$)/i);
    await expect(
      page.locator('ytd-rich-item-renderer a[href^="/watch"]:visible').first(),
    ).toBeVisible();
    await selectPopular();
    await expect(videoTitle).toBeVisible();
    await expect(videoTitle).toHaveText("$456,000 Squid Game In Real Life!");

    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-channel-tabs-test.png`,
    });

    expect(consoleMessageCountContainer.count).toBeLessThan(2000);
    await context.close();
  });

  test("YouTube Shorts audio dubbing is untranslated with Anti-Translate extension", async ({
    browserNameWithExtensions,
    localeString,
    isMobile,
  }, testInfo) => {
    // Handle retries and prerequisite setup
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/@MrBeast/shorts",
      browserNameWithExtensions,
    );
    await page
      .locator('ytd-rich-item-renderer a[href^="/shorts/"]')
      .first()
      .click();
    await expect(page).toHaveURL(/\/shorts\/[\w-]{11}(?:[?#]|$)/);

    const readShortAudio = () =>
      page.evaluate(async () => {
        type ShortsPlayer = HTMLElement & {
          getAudioTrack?: () => Promise<Record<string, unknown>>;
          getPlayerResponse?: () => Promise<{
            videoDetails?: { videoId?: string };
          }>;
        };
        const player = document.querySelector<ShortsPlayer>("#shorts-player");
        const track = await player?.getAudioTrack?.();
        const language = Object.values(track ?? {}).find(
          (value): value is { name: string } =>
            !!value &&
            typeof value === "object" &&
            "name" in value &&
            typeof value.name === "string",
        );
        return {
          videoId: (await player?.getPlayerResponse?.())?.videoDetails?.videoId,
          trackName: language?.name,
        };
      });

    let checkedShorts = 0;
    for (let attempt = 0; attempt < 6 && checkedShorts < 3; attempt++) {
      if (attempt > 0) {
        const previousUrl = page.url();
        // YouTube ignores navigation input while the Shorts feed is loading.
        await expect(async () => {
          if (page.url() === previousUrl) {
            await page.keyboard.press("ArrowDown");
          }
          await expect(page).not.toHaveURL(previousUrl, { timeout: 1_500 });
        }).toPass({ timeout: 15_000 });
      }

      const videoId = new URL(page.url()).pathname.split("/").at(-1);
      expect(videoId).toMatch(/^[\w-]{11}$/);
      let trackName: string | undefined;
      await expect
        .poll(
          async () => {
            const audio = await readShortAudio();
            trackName = audio.trackName;
            return audio;
          },
          {
            message:
              "Wait for the current Short to select its original audio track",
            timeout: 15_000,
          },
        )
        .toEqual({
          videoId,
          trackName: expect.stringMatching(/оригинал|^Default$/),
        });

      // The player reports "Default" as the audio track for ads.
      if (trackName !== "Default") {
        checkedShorts++;
      }
    }
    expect(checkedShorts).toBe(3);

    expect(consoleMessageCountContainer.count).toBeLessThan(2000);
    await context.close();
  });

  test("YouTube channel playlist page contains 'Popular Shorts' playlist", async ({
    browserNameWithExtensions,
    localeString,
    isMobile,
  }, testInfo) => {
    // Handle retries and prerequisite setup
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/@NileRed/playlists",
      browserNameWithExtensions,
    );

    // Take a screenshot for visual verification
    try {
      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-playlists-test.png`,
      });
    } catch {
      // First screenshot is not essential so it is allowed to fail
    }

    const playlistTitle = page
      .locator("yt-lockup-view-model, ytd-grid-playlist-renderer")
      .getByText("Popular Shorts", { exact: true });
    await expect(playlistTitle).toBeVisible();

    // Take a screenshot for visual verification
    await page.screenshot({
      path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-playlists-test.png`,
    });

    // Check console message count
    expect(consoleMessageCountContainer.count).toBeLessThan(2000);

    // Close the browser context
    await context.close();
  });

  test.skip("YouTube owned feed playlists page contains 'owned-playlist-playwright-test' playlist", async ({
    browserNameWithExtensions,
    localeString,
    isMobile,
  }, testInfo) => {
    /**
     * NOTE WELL
     * This test requires the account in use to have a playlist named "owned-playlist-playwright-test" with at least one video in it.
     * If missing you must create it manually as part of setting up the test account.
     */

    // Handle retries and prerequisite setup
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/feed/playlists",
      browserNameWithExtensions,
    );

    // Take a screenshot for visual verification
    try {
      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-owned-playlists-test.png`,
      });
    } catch {
      // First screenshot is not essential so it is allowed to fail
    }

    // Wait for the video grid to appear
    await waitForSelectorOrRetryWithPageReload(page, "ytd-rich-item-renderer");

    // --- Check Videos Tab ---
    const originalPlaylistTitle = "owned-playlist-playwright-test";
    const videoSelector = `ytd-rich-item-renderer:has-text("${originalPlaylistTitle}")`;

    const originalPlaylist = page.locator(videoSelector).first();
    if (await originalPlaylist.isVisible()) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(process.env.CI ? 150 : 100);
      await originalPlaylist.scrollIntoViewIfNeeded();
      try {
        await page.waitForTimeout(process.env.CI ? 375 : 250);
        await page.waitForLoadState("networkidle", {
          timeout: process.env.CI ? 7500 : 5000,
        });
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
    isMobile,
  }, testInfo) => {
    // Handle retries and prerequisite setup
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/results?search_query=nilered+popular+shorts",
      browserNameWithExtensions,
    );

    // Take a screenshot for visual verification
    try {
      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-search-result-playlist-test.png`,
      });
    } catch {
      // First screenshot is not essential so it is allowed to fail
    }

    // Wait for the video grid to appear
    await waitForSelectorOrRetryWithPageReload(page, "yt-lockup-view-model");

    // --- Check Videos Tab ---
    const originalPlaylistTitle = "Popular Shorts";
    const videoSelector = `yt-lockup-view-model:has-text("${originalPlaylistTitle}")`;

    const originalPlaylist = page.locator(videoSelector).first();
    if (await originalPlaylist.isVisible()) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(process.env.CI ? 150 : 100);
      await originalPlaylist.scrollIntoViewIfNeeded();
      try {
        await page.waitForTimeout(process.env.CI ? 375 : 250);
        await page.waitForLoadState("networkidle", {
          timeout: process.env.CI ? 7500 : 5000,
        });
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
    isMobile,
  }, testInfo) => {
    // Handle retries and prerequisite setup
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/results?search_query=mrbeast+7+Days+Stranded+At+Sea",
      browserNameWithExtensions,
    );

    // Take a screenshot for visual verification
    try {
      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-video-thumbnail-test.png`,
      });
    } catch {
      // First screenshot is not essential so it is allowed to fail
    }

    // Wait for the video grid to appear
    await waitForSelectorOrRetryWithPageReload(page, "ytd-video-renderer");

    // --- Check Videos Tab ---
    const expectedThumbnailSrc =
      /https:\/\/i\.ytimg\.com\/vi\/yhB3BgJyGl8\/hqdefault\.jpg\?youtube-anti-translate=[0-9]+/i;
    const originalVideoTitle = "7 Days Stranded At Sea";
    const videoSelector = `ytd-video-renderer:has-text("${originalVideoTitle}")`;

    const originalPlaylist = page.locator(videoSelector).first();
    if (await originalPlaylist.isVisible()) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(process.env.CI ? 150 : 100);
      await originalPlaylist.scrollIntoViewIfNeeded();
      try {
        await page.waitForTimeout(process.env.CI ? 375 : 250);
        await page.waitForLoadState("networkidle", {
          timeout: process.env.CI ? 7500 : 5000,
        });
      } catch {
        // empty
      }
    }

    // Find the thumbnail image within the located video item
    const thumbnailImage = originalPlaylist.locator('img[src*="ytimg.com"]');
    await thumbnailImage.waitFor();
    await page.waitForTimeout(process.env.CI ? 375 : 250);
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

  test.skip("YouTube video playlist retains original thumbnail of the first video", async ({
    browserNameWithExtensions,
    localeString,
    isMobile,
  }, testInfo) => {
    /**
     * NOTE WELL
     * This test requires the account in use to have a playlist named "owned-playlist-playwright-test"
     * with as first video [@MrBeast "7 Days Stranded At Sea"](https://www.youtube.com/watch?v=yhB3BgJyGl8).
     * If missing you must create it manually as part of setting up the test account.
     */

    // Handle retries and prerequisite setup
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/feed/playlists",
      browserNameWithExtensions,
    );

    // Take a screenshot for visual verification
    try {
      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-video-playlist-thumbnail-test.png`,
      });
    } catch {
      // First screenshot is not essential so it is allowed to fail
    }

    // Wait for the video grid to appear
    await waitForSelectorOrRetryWithPageReload(page, "ytd-rich-item-renderer");

    // --- Check Videos Tab ---
    const expectedThumbnailSrc =
      /https:\/\/i\.ytimg\.com\/vi\/yhB3BgJyGl8\/hqdefault\.jpg\?youtube-anti-translate=[0-9]+/i;
    const originalPlaylistTitle = "owned-playlist-playwright-test";
    const videoSelector = `ytd-rich-item-renderer:has-text("${originalPlaylistTitle}")`;

    const originalPlaylist = page.locator(videoSelector).first();
    if (await originalPlaylist.isVisible()) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(process.env.CI ? 150 : 100);
      await originalPlaylist.scrollIntoViewIfNeeded();
      try {
        await page.waitForTimeout(process.env.CI ? 375 : 250);
        await page.waitForLoadState("networkidle", {
          timeout: process.env.CI ? 7500 : 5000,
        });
      } catch {
        // empty
      }
    }

    // Find the thumbnail image within the located video item
    const thumbnailImage = originalPlaylist.locator('img[src*="ytimg.com"]');
    await thumbnailImage.waitFor();
    await page.waitForTimeout(process.env.CI ? 375 : 250);
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
    isMobile,
  }, testInfo) => {
    // Handle retries and prerequisite setup
    const { context, page, consoleMessageCountContainer } =
      await setupTestEnvironment(
        testInfo,
        browserNameWithExtensions,
        localeString,
        isMobile,
      );

    // Open a video which contains chapters (used in time-code test)
    await loadPageAndVerifyAuth(
      page,
      "https://www.youtube.com/watch?v=4PBPXbd4DkQ",
      browserNameWithExtensions,
    );

    // Screenshot for manual visual verification when needed
    try {
      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-chapters-test.png`,
      });
    } catch {
      // First screenshot is not essential so it is allowed to fail
    }

    // Wait until the chapter button next to the progress bar is rendered
    await waitForSelectorOrRetryWithPageReload(
      page,
      ".ytp-chapter-title .ytp-chapter-title-content",
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
    await chapterButtonLocator.waitFor();
    await chapterButtonLocator.scrollIntoViewIfNeeded();

    // Wait until the attribute appears and matches exactly
    await expect(chapterButtonLocator).toHaveAttribute(
      "data-original-chapter-button",
      expectedChapterTitle,
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

  test.fixme(
    "Works on embedded videos",
    async ({ browserNameWithExtensions, localeString, isMobile }, testInfo) => {
      // Handle retries and prerequisite setup
      const { context, page, consoleMessageCountContainer } =
        await setupTestEnvironment(
          testInfo,
          browserNameWithExtensions,
          localeString,
          isMobile,
        );

      await page.goto("https://www.youtube.com/embed/iLU0CE2c2HQ");

      // Wait for the video to load safely
      let overlayButton;
      try {
        overlayButton = await waitForSelectorOrRetryWithPageReload(
          page,
          "#movie_player > div.ytp-cued-thumbnail-overlay > button",
        );
      } catch {
        await checkFor153Error(page, context, testInfo);
      }

      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-embedded-test.png`,
      });

      try {
        await overlayButton!.click();
      } catch {
        await checkFor153Error(page, context, testInfo);
      }
      // Wait for the overlay button to disappear
      await page.waitForTimeout(process.env.CI ? 750 : 500);

      await expect(overlayButton!).not.toBeVisible();
      await page.waitForTimeout(process.env.CI ? 3000 : 2000);
      await checkFor153Error(page, context, testInfo);

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
        await page.waitForTimeout(process.env.CI ? 7500 : 5000);

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
            expect(currentTrack[trackLanguageField]?.name).toContain(
              "оригинал",
            );
          }
        }
      }

      const titleLink = page.locator(".ytp-title-link.yt-uix-sessionlink");
      await titleLink.waitFor({ state: "attached" });
      await expect(titleLink).toContainText(
        "NAJTAŃSZY DYSK PCIe 5.0 – MA TO SENS W 2025?",
      );

      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-embedded-test.png`,
      });

      // Check console message count
      expect(consoleMessageCountContainer.count).toBeLessThan(2000);

      // Close the browser context
      await context.close();
    },
  );

  test.fixme(
    "Works on youtube-nocookie videos",
    async ({ browserNameWithExtensions, localeString, isMobile }, testInfo) => {
      // Handle retries and prerequisite setup
      const { context, page, consoleMessageCountContainer } =
        await setupTestEnvironment(
          testInfo,
          browserNameWithExtensions,
          localeString,
          isMobile,
        );

      await page.goto("https://www.youtube-nocookie.com/embed/iLU0CE2c2HQ");

      // Wait for the video to load safely
      let overlayButton;
      try {
        overlayButton = await waitForSelectorOrRetryWithPageReload(
          page,
          "#movie_player > div.ytp-cued-thumbnail-overlay > button",
        );
      } catch {
        await checkFor153Error(page, context, testInfo);
      }

      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-nocookie-test.png`,
      });

      try {
        await overlayButton!.click();
      } catch {
        await checkFor153Error(page, context, testInfo);
      }
      // Wait for the overlay button to disappear
      await page.waitForTimeout(process.env.CI ? 750 : 500);

      await expect(overlayButton!).not.toBeVisible();
      await page.waitForTimeout(process.env.CI ? 3000 : 2000);
      await checkFor153Error(page, context, testInfo);

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
        await page.waitForTimeout(process.env.CI ? 7500 : 5000);

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
            expect(currentTrack[trackLanguageField]?.name).toContain(
              "оригинал",
            );
          }
        }
      }

      const titleLink = page.locator(".ytp-title-link.yt-uix-sessionlink");
      await titleLink.waitFor({ state: "attached" });
      await expect(titleLink).toContainText(
        "NAJTAŃSZY DYSK PCIe 5.0 – MA TO SENS W 2025?",
      );

      await page.screenshot({
        path: `images/tests/${browserNameWithExtensions}/${localeString}/youtube-nocookie-test.png`,
      });

      // Check console message count
      expect(consoleMessageCountContainer.count).toBeLessThan(2000);

      // Close the browser context
      await context.close();
    },
  );
});

async function checkFor153Error(
  page: Page,
  context: BrowserContext | Browser,
  testInfo: TestInfo,
) {
  const errorLocator = page.locator(
    "div.ytp-error-content-wrap-subreason > span:has-text('153')",
  );

  if (await errorLocator.isVisible()) {
    // If we hit a 153 error (playback not available) then skip the rest of the test

    console.log("Video playback not available, skipping the rest of the test.");

    await context.close();

    testInfo.skip();

    return;
  }
}
