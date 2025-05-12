export async function handleYoutubeConsent(page) {
  await page.waitForTimeout(2000);
  await page.waitForLoadState("networkidle");

  // Sometimes YouTube shows a consent dialog, handle it if it appears
  const consentButton = page.getByRole("button", {
    name: /I agree|Принимаю|Я согласен|ฉันยอมรับ/i,
  });
  if (await consentButton.isVisible()) {
    await consentButton.scrollIntoViewIfNeeded();
    await consentButton.click();
  }
  // Sometimes YouTube shows a cookies dialog, handle it if it appears
  const possibleLabels = ["Accept all", "Принять все", "ยอมรับทั้งหมด"];
  for (const label of possibleLabels) {
    const button = page.locator(`button:has-text("${label}")`).first();
    if (await button.isVisible()) {
      await button.scrollIntoViewIfNeeded();
      await button.click();
      break;
    }
  }
}
