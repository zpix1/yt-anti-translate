import { test, expect, chromium } from "@playwright/test";
import path from "path";

test("YouTube Anti-Translate extension prevents auto-translation", async () => {
  // Launch browser with the extension
  const extensionPath = path.resolve(__dirname, "../app");
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      // Additional arguments needed for headless mode with extensions
      // "--headless=new",
    ],
    locale: "ru-RU",
  });

  // Create a new page
  const page = await context.newPage();

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
  const videoTitle = await page.locator("h1.ytd-watch-metadata").textContent();
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
  expect(descriptionText).not.toContain("Я не могу поверить, кого они выбрали");

  // Take a screenshot for visual verification
  await page.screenshot({ path: "images/youtube-extension-test.png" });

  // Close the browser context
  await context.close();
});

test("YouTube timecode links in description work correctly with Anti-Translate extension", async () => {
  // Launch browser with the extension
  const extensionPath = path.resolve(__dirname, "../app");
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      // Additional arguments needed for headless mode with extensions
      // "--headless=new",
    ],
    locale: "ru-RU", // Use Russian locale to test anti-translation
  });

  // Create a new page
  const page = await context.newPage();

  // Navigate to the specified YouTube video
  await page.goto("https://www.youtube.com/watch?v=4PBPXbd4DkQ");

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
    "Model Rockets Battle - Fun Adventure for kids"
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

  // Close the browser context
  await context.close();
});
