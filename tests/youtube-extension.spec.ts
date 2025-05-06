import { test, expect, firefox } from "@playwright/test";
import path from "path";
import { setupFirefoxProfileWithExtension } from "./setupFirefoxProfileWithExtension";

test.describe("YouTube Anti-Translate extension", () => {
  test("YouTube Anti-Translate extension prevents auto-translation", async () => {
    // Launch browser with the extension
    process.env.MOZ_DISABLE_EXTENSION_SIGNING = "1";
    const context = await setupFirefoxProfileWithExtension({
      extensionPath: path.resolve(__dirname, "../app"),      // The extension directory
      profilePath: "./tmp/firefox-playwright-profile",        // Any temp path
      extensionId: "youtube-anti-translate@namakeingo.co.uk" // Must match manifest.json
    });

    // Create a new page
    const page = await context.newPage();

    // Set up console message counting
    let consoleMessageCount = 0;
    page.on("console", () => {
      consoleMessageCount++;
    });

    // Navigate to the specified YouTube video
    await page.goto("https://www.youtube.com/watch?v=l-nMKJ5J3Uc");

    // Wait for the page to load and for YouTube to process the locale
    await page.waitForLoadState("networkidle");

    // Sometimes YouTube shows a consent dialog, handle it if it appears
    const consentButton = page.getByRole("button", {
      name: /I agree|Принимаю|Я согласен/i,
    });
    if (await consentButton.isVisible()) {
      await consentButton.click();
    }

    // Wait for the video page to fully load
    await page.waitForSelector("ytd-watch-metadata");

    // Expand the description if it's collapsed
    const moreButton = page.locator(
      "#description-inline-expander ytd-text-inline-expander #expand"
    );
    if (await moreButton.isVisible()) {
      await moreButton.click();
      // Wait for the description to expand
      await page.waitForTimeout(1000);
    }

    // Get the description text
    const descriptionText = await page
      .locator("#description-inline-expander")
      .textContent();
    console.log("Description text:", descriptionText?.trim());

    // Get the video title
    const videoTitle = await page
      .locator("h1.ytd-watch-metadata")
      .textContent();
    console.log("Video title:", videoTitle?.trim());

    // Check that the title is in English and not in Russian
    expect(videoTitle).toContain("Ages 1 - 100 Decide Who Wins $250,000");
    expect(videoTitle).not.toContain(
      "Люди от 1 до 100 Лет Решают, кто Выиграет $250,000"
    );

    // Check that the description contains the original English text and not the Russian translation
    expect(descriptionText).toContain("believe who they picked");
    expect(descriptionText).toContain(
      "Thanks Top Troops for sponsoring this video"
    );
    expect(descriptionText).not.toContain(
      "Я не могу поверить, кого они выбрали"
    );

    // Take a screenshot for visual verification
    await page.screenshot({ path: "images/youtube-extension-test.png" });

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(
      2000
    );

    // Close the browser context
    await context.close();
  });

  test("YouTube timecode links in description work correctly with Anti-Translate extension", async () => {
    // Launch browser with the extension
    process.env.MOZ_DISABLE_EXTENSION_SIGNING = "1";
    const context = await setupFirefoxProfileWithExtension({
      extensionPath: path.resolve(__dirname, "../app"),       // The extension directory
      profilePath: "./tmp/firefox-playwright-profile",         // Any temp path
      extensionId: "youtube-anti-translate@namakeingo.co.uk"  // Must match manifest.json
    });

    // Create a new page
    const page = await context.newPage();

    // Set up console message counting
    let consoleMessageCount = 0;
    page.on("console", () => {
      consoleMessageCount++;
    });

    // Navigate to the specified YouTube video
    await page.goto("https://www.youtube.com/watch?v=4PBPXbd4DkQ");

    // Wait for the page to load and for YouTube to process the locale

    // Sometimes YouTube shows a consent dialog, handle it if it appears
    const consentButton = page.getByRole("button", {
      name: /I agree|Принимаю|Я согласен/i,
    });
    if (await consentButton.isVisible()) {
      await consentButton.click();
    }

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
      .locator("#description-inline-expander")
      .textContent();
    console.log("Description text:", descriptionText?.trim());

    // Verify description contains expected English text
    expect(descriptionText).toContain(
      "Toy Rockets Challenge - Fun Outdoor Activities for kids!"
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
    await page.screenshot({ path: "images/youtube-timecode-test.png" });

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(
      2000
    );

    // Close the browser context
    await context.close();
  });

  test("YouTube Shorts title is not translated with Anti-Translate extension", async () => {
    // Launch browser with the extension
    process.env.MOZ_DISABLE_EXTENSION_SIGNING = "1";
    const context = await setupFirefoxProfileWithExtension({
      extensionPath: path.resolve(__dirname, "../app"),       // The extension directory
      profilePath: "./tmp/firefox-playwright-profile",        // Any temp path
      extensionId: "youtube-anti-translate@namakeingo.co.uk"  // Must match manifest.json
    });

    // Create a new page
    const page = await context.newPage();

    // Set up console message counting
    let consoleMessageCount = 0;
    page.on("console", () => {
      consoleMessageCount++;
    });

    // Navigate to the specified YouTube Short
    await page.goto("https://www.youtube.com/shorts/PXevNM0awlI");

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Sometimes YouTube shows a consent dialog, handle it if it appears
    const consentButton = page.getByRole("button", {
      name: /I agree|Принимаю|Я согласен/i,
    });
    if (await consentButton.isVisible()) {
      await consentButton.click();
    }

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

    // Take a screenshot for visual verification
    await page.screenshot({ path: "images/youtube-shorts-test.png" });

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(
      2000
    );

    // Close the browser context
    await context.close();
  });

  test("YouTube channel Videos and Shorts tabs retain original titles", async () => {
    // Launch browser with the extension
    process.env.MOZ_DISABLE_EXTENSION_SIGNING = "1";
    const context = await setupFirefoxProfileWithExtension({
      extensionPath: path.resolve(__dirname, "../app"),       // The extension directory
      profilePath: "/tmp/firefox-playwright-profile",         // Any temp path
      extensionId: "youtube-anti-translate@namakeingo.co.uk"  // Must match manifest.json
    });

    // Create a new page
    const page = await context.newPage();

    // Set up console message counting
    let consoleMessageCount = 0;
    page.on("console", () => {
      consoleMessageCount++;
    });

    // Navigate to the specified YouTube channel videos page
    await page.goto("https://www.youtube.com/@MrBeast/videos");

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Sometimes YouTube shows a consent dialog, handle it if it appears
    const consentButton = page.getByRole("button", {
      name: /I agree|Принимаю|Я согласен/i,
    });
    if (await consentButton.isVisible({ timeout: 5000 })) {
      await consentButton.click();
      await page.waitForLoadState("networkidle"); // Wait again after consent
    }

    // Wait for the video grid to appear
    await page.waitForSelector("ytd-rich-grid-media");

    // --- Check Videos Tab ---
    const originalVideoTitle = "I Survived The 5 Deadliest Places On Earth";
    const translatedVideoTitle = "Я Выжил В 5 Самых Опасных Местах На Земле";
    const videoSelector = `ytd-rich-item-renderer:has-text("${originalVideoTitle}")`;
    const translatedVideoSelector = `ytd-rich-item-renderer:has-text("${translatedVideoTitle}")`;

    console.log("Checking Videos tab for original title...");
    await expect(page.locator(videoSelector)).toBeVisible();
    await expect(page.locator(translatedVideoSelector)).not.toBeVisible();
    console.log("Original video title found, translated title not found.");

    // --- Switch to Shorts Tab ---
    console.log("Clicking Shorts tab...");
    await page.locator("#tabsContent").getByText("Shorts").click();
    await page.waitForLoadState("networkidle");

    // --- Check Shorts Tab ---
    const originalShortTitle = "Baseball Tic Tac Toe vs MLB Pro";
    const translatedShortTitle = "Бейсбольные Крестики-Нолики"; // Adjust if needed
    const shortSelector = `ytd-rich-item-renderer:has-text("${originalShortTitle}")`;
    const translatedShortSelector = `ytd-rich-item-renderer:has-text("${translatedShortTitle}")`;

    console.log("Checking Shorts tab for original title...");
    // Shorts might load dynamically, scroll down slightly to ensure it's loaded
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(1000); // Give it a moment to load more items if needed

    await expect(page.locator(shortSelector)).toBeVisible({ timeout: 10000 }); // Increased timeout for dynamic loading
    await expect(page.locator(translatedShortSelector)).not.toBeVisible();
    console.log(
      "Original short title found, translated short title not found."
    );

    // --- Switch back to Videos Tab ---
    console.log("Clicking Videos tab...");
    await page.locator("#tabsContent").getByText("Видео").click();
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(
      "ytd-rich-grid-media >> ytd-thumbnail-overlay-time-status-renderer:not([overlay-style='SHORTS'])",
      { state: "visible" }
    ); // Wait for videos to load

    // --- Re-check Videos Tab ---
    console.log("Re-checking Videos tab for original title...");
    await expect(page.locator(videoSelector)).toBeVisible();
    await expect(page.locator(translatedVideoSelector)).not.toBeVisible();
    console.log("Original video title confirmed on Videos tab again.");

    // Take a screenshot for visual verification
    await page.screenshot({ path: "images/youtube-channel-tabs-test.png" });

    // Check console message count
    expect(consoleMessageCount).toBeLessThan(
      2000
    );

    // Close the browser context
    await context.close();
  });
});
