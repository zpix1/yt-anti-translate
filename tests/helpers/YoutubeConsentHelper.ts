import { Page } from "@playwright/test";

export async function handleYoutubeConsent(page: Page) {
  await page.waitForTimeout(process.env.CI ? 1500 : 1000);
  try {
    await page.waitForTimeout(process.env.CI ? 375 : 250);
    await page.waitForLoadState("networkidle", {
      timeout: process.env.CI ? 7500 : 5000,
    });
  } catch {
    // empty
  }

  // Sometimes YouTube shows a consent dialog, handle it if it appears
  const consentButton = page.getByRole("button", {
    name: /I agree|Принимаю|Я согласен|ฉันยอมรับ/i,
  });
  if (await consentButton.isVisible()) {
    await consentButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(process.env.CI ? 150 : 100);
    await consentButton.click();
    await page.waitForTimeout(process.env.CI ? 2250 : 1500);
  }
  try {
    await page.waitForTimeout(process.env.CI ? 375 : 250);
    await page.waitForLoadState("networkidle", {
      timeout: process.env.CI ? 7500 : 5000,
    });
  } catch {
    // empty
  }

  // Sometimes YouTube shows a cookies dialog, handle it if it appears
  const possibleLabels = /Accept all|Принять все|ยอมรับทั้งหมด/i;
  const button = page.getByRole("button", { name: possibleLabels }).first();
  if (await button.isVisible()) {
    await button.scrollIntoViewIfNeeded();
    await page.waitForTimeout(process.env.CI ? 150 : 100);
    await button.click();
    // Most of the time we are redirected after the cookies dialog so allow extra time for load
    await page.waitForTimeout(process.env.CI ? 7500 : 5000);
  }

  await page.waitForTimeout(process.env.CI ? 1500 : 1000);
  try {
    await page.waitForTimeout(process.env.CI ? 375 : 250);
    await page.waitForLoadState("networkidle", {
      timeout: process.env.CI ? 7500 : 5000,
    });
  } catch {
    // empty
  }
}
