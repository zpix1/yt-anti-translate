import fs from 'fs';
import * as OTPAuth from "otpauth";
import path from 'path';

const authFile_thTH = path.join(__dirname, '../playwright/.auth/user_thTH.json');
const authFile_ruRU = path.join(__dirname, '../playwright/.auth/user_ruRU.json');
const authFile = path.join(__dirname, '../playwright/.auth/user.json');

require('dotenv').config();

/**
 * @param {Browser} context
 * @returns {JSON} {"page": Page, "localeLoaded": boolean }
 */
export async function newPageWithStorageStateIfItExists(context, locale = "") {
  let file = "";

  switch (locale) {
    case "ru-RU":
      file = authFile_ruRU;
      break;
    case "th_TH":
      file = authFile_thTH;
      break;
    default:
      break;
  }

  if (file !== "") {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      const modifiedTime = new Date(stats.mtime);
      const now = new Date();
      const ageInHours = (now.getTime() - modifiedTime.getTime()) / (1000 * 60 * 60);

      if (ageInHours <= 12) {
        // Reuse existing LOCALE authentication state if it's fresh (less than 12 hours old).
        return { page: (await context.newPage({ storageState: file })), localeLoaded: true }
      }
    }
  }

  if (fs.existsSync(authFile)) {
    const stats = fs.statSync(authFile);
    const modifiedTime = new Date(stats.mtime);
    const now = new Date();
    const ageInHours = (now.getTime() - modifiedTime.getTime()) / (1000 * 60 * 60);

    if (ageInHours <= 4) {
      // Reuse existing authentication state if it's fresh (less than 4 hours old).
      return { page: (await context.newPage({ storageState: authFile })), localeLoaded: false }
    }
  }

  // Fallback if file doesn't exist or is too old.
  return { page: (await context.newPage()), localeLoaded: false }
}

/**
 * @param {Page} page
 * @param {string} locale
 */
export async function handleGoogleLogin(page, locale: string) {
  try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }

  //Check if we need to login
  const possibleLabels = ["Sign in", "Войти", "ลงชื่อเข้าใช้"];
  for (const label of possibleLabels) {
    const button = page.locator(`#masthead a:has-text("${label}")`).first();
    if (await button.isVisible()) {
      await button.scrollIntoViewIfNeeded();
      await button.click();
      await continueLoginSteps(page);
      break;
    }
  }

  //Check youtube locale is set correctly
  const avatarButton = page.locator("#masthead #avatar-btn")
  if (await avatarButton.isVisible()) {
    await avatarButton.scrollIntoViewIfNeeded();
    await avatarButton.click();
    await page.waitForTimeout(500);
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }

    const locationButton = page.locator("yt-multi-page-menu-section-renderer:nth-child(3) > #items > ytd-compact-link-renderer:nth-child(3) > a#endpoint");
    if (await locationButton.isVisible()) {
      await locationButton.scrollIntoViewIfNeeded();
      await locationButton.click();
      await page.waitForTimeout(500);
      try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }

      switch (locale) {
        case "ru-RU":
          const russian = page.locator('yt-multi-page-menu-section-renderer a:has-text("Русский")');
          await russian.scrollIntoViewIfNeeded();
          await russian.click();
          await page.waitForTimeout(5000);
          await page.context().storageState({ path: authFile_ruRU });
          try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }
          break;
        case "th_TH":
          const thai = page.locator('yt-multi-page-menu-section-renderer a:has-text("ภาษาไทย")');
          await thai.scrollIntoViewIfNeeded();
          await thai.click();
          await page.waitForTimeout(5000);
          await page.context().storageState({ path: authFile_thTH });
          try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }
          break;
        default:
          break;
      }
    }
  }

  async function continueLoginSteps(page) {
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }

    const nextText = /Next|Далее|ถัดไป/i

    await page.locator('#identifierId').fill(process.env.GOOGLE_USER);
    await page.getByRole('button', { name: nextText }).click();
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }

    await page.locator('#password input').fill(process.env.GOOGLE_PWD);
    await page.getByRole('button', { name: nextText }).click();
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }

    const twoFACode = generateOTP(process.env.GOOGLE_OTP_SECRET);
    await page.locator('#totpPin').fill(twoFACode);
    await page.getByRole('button', { name: nextText }).click();

    await page.waitForTimeout(5000);
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }

    await page.context().storageState({ path: authFile });
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