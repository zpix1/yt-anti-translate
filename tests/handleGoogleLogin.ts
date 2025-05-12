import * as OTPAuth from "otpauth";

require('dotenv').config();
/**
 * @param page
 */
export async function handleGoogleLogin(page) {
  await page.waitForLoadState("load");

  //Check if we need to login
  const possibleLabels = ["Sign in", "Войти"];
  for (const label of possibleLabels) {
    const button = page.locator(`#masthead a:has-text("${label}")`).first();
    if (await button.isVisible()) {
      await button.scrollIntoViewIfNeeded();
      await button.click();
      await continueLoginSteps(page);
      break;
    }
  }

  async function continueLoginSteps(page) {
    await page.waitForLoadState("networkidle");

    await page.locator('#identifierId').fill(process.env.GOOGLE_USER);
    await page.getByRole('button', { name: /Next|Далее/i }).click();
    await page.waitForLoadState("networkidle");

    await page.locator('#password input').fill(process.env.GOOGLE_PWD);
    await page.getByRole('button', { name: /Next|Далее/i }).click();
    await page.waitForLoadState("networkidle");

    const twoFACode = generateOTP(process.env.GOOGLE_OTP_SECRET);
    await page.locator('#totpPin').fill(twoFACode);
    await page.getByRole('button', { name: /Next|Далее/i }).click();

    await page.waitForTimeout(5000);
    await page.waitForLoadState("load");
  }
}

function generateOTP(secret) {
  const totp = new OTPAuth.TOTP({
    secret: secret,
    digits: 6,
    algorithm: "sha1",
    period: 30,
  });

  return totp.generate();
}