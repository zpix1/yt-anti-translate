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
  console.log("Description text:", descriptionText);

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
