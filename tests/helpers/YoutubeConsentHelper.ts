import { Page } from "@playwright/test";

export async function handleYoutubeConsent(
  page: Page,
  defaultTryCatchTimeoutMs: number,
) {
  await page.waitForTimeout(1000);
  try {
    await page.waitForLoadState("networkidle", {
      timeout: defaultTryCatchTimeoutMs,
    });
  } catch {
    console.log(`[YoutubeConsentHelper] networkidle timeout`);
  }

  // Sometimes YouTube shows a consent dialog, handle it if it appears
  const consentButton = page.getByRole("button", {
    name: /I agree|Принимаю|Я согласен|ฉันยอมรับ/i,
  });
  if (await consentButton.isVisible()) {
    try {
      await consentButton.scrollIntoViewIfNeeded({
        timeout: defaultTryCatchTimeoutMs,
      });
    } catch {
      console.log(`[YoutubeConsentHelper] scrollIntoViewIfNeeded timeout`);
    }
    await consentButton.click();
    await page.waitForTimeout(1500);
  }
  try {
    await page.waitForLoadState("networkidle", {
      timeout: defaultTryCatchTimeoutMs,
    });
  } catch {
    console.log(`[YoutubeConsentHelper] networkidle timeout`);
  }

  // Sometimes YouTube shows a cookies dialog, handle it if it appears
  const possibleLabels = ["Accept all", "Принять все", "ยอมรับทั้งหมด"];
  for (const label of possibleLabels) {
    const button = page.locator(`button:has-text("${label}")`).first();
    if (await button.isVisible()) {
      try {
        await button.scrollIntoViewIfNeeded({
          timeout: defaultTryCatchTimeoutMs,
        });
      } catch {
        console.log(`[YoutubeConsentHelper] scrollIntoViewIfNeeded timeout`);
      }
      await button.click();
      // Most of the time we are redirected after the cookies dialog so allow extra time for load
      await page.waitForTimeout(5000);
      break;
    }
  }

  await page.waitForTimeout(1000);
  try {
    await page.waitForLoadState("networkidle", {
      timeout: defaultTryCatchTimeoutMs,
    });
  } catch {
    console.log(`[YoutubeConsentHelper] networkidle timeout`);
  }
}
