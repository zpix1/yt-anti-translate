import fs from "fs";
import * as OTPAuth from "otpauth";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const authFileLocationBase = path.join(__dirname, "../../playwright/.auth/");
const authFileName = "user.json";

import "dotenv/config";
import { Page } from "@playwright/test";

/**
 * @param {BrowserContext} context
 * @param {string} browserName
 * @param {string} locale
 * @returns
 */
export async function newPageWithStorageStateIfItExists(
  context,
  browserName: string,
  locale: string,
) {
  if (
    !process.env.GOOGLE_USER ||
    process.env.GOOGLE_USER.trim() === "" ||
    !process.env.GOOGLE_PWD ||
    process.env.GOOGLE_PWD.trim() === ""
  ) {
    throw "Google auth env must be set.";
  }

  let authFile;
  switch (browserName) {
    case "chromium":
    case "firefox":
      authFile = path.join(authFileLocationBase, browserName, authFileName);
      break;
    default:
      throw "newPageWithStorageStateIfItExists: Unsupported browserName";
  }

  let file = "";

  switch (locale) {
    case "ru-RU":
    case "th-TH":
      file = path.join(
        authFileLocationBase,
        browserName,
        `user_${locale}.json`,
      );
      break;
    default:
      throw "newPageWithStorageStateIfItExists: Unsupported locale";
  }

  // Helper to load cookies from file and add them to context
  const loadCookies = async (context, filePath) => {
    const content = fs.readFileSync(filePath, "utf-8");
    const storageState = JSON.parse(content);
    if (storageState.cookies && storageState.cookies.length > 0) {
      await context.addCookies(storageState.cookies);
    }
  };

  // Healper to load auth storage if fresh
  const loadStorage = async (
    context,
    storageFile,
    isLocaleLoadedTrue,
    maxHours,
  ) => {
    const stats = fs.statSync(storageFile);
    const modifiedTime = new Date(stats.mtime);
    const now = new Date();
    const ageInHours =
      (now.getTime() - modifiedTime.getTime()) / (1000 * 60 * 60);

    if (ageInHours <= maxHours) {
      if (browserName === "chromium") {
        // Chromium must be launched as persistentContext to load
        // So we can only load the cookies as the newPage does not accept a storage state
        await loadCookies(context, storageFile);
        return {
          page: await context.newPage(),
          localeLoaded: isLocaleLoadedTrue,
        };
      }
      return {
        page: await context.newPage({ storageState: storageFile }),
        localeLoaded: isLocaleLoadedTrue,
      };
    }
    return null;
  };

  if (file !== "") {
    if (fs.existsSync(file)) {
      const result = await loadStorage(context, file, true, 24);
      if (result) {
        return result;
      }
    }
  }

  if (fs.existsSync(authFile)) {
    const result = await loadStorage(context, authFile, false, 24);
    if (result) {
      return result;
    }
  }

  // Fallback if file doesn't exist or is too old.
  return { page: await context.newPage(), localeLoaded: false };
}

/**
 * @param {Page} page
 * @returns {Locator|null}
 */
export async function findLoginButton(page) {
  const possibleLabels = ["Sign in", "Войти", "ลงชื่อเข้าใช้"];
  for (const label of possibleLabels) {
    const button = page.locator(`#masthead a:has-text("${label}")`).first();
    if (await button.isVisible()) {
      return button;
    }
  }
  return null;
}

/**
 * @param {Browser} context
 * @param {Page} page
 * @param {string} browserName
 * @param {string} locale
 */
export async function handleGoogleLogin(
  context,
  page: Page,
  browserName: string,
  locale: string,
) {
  try {
    await page.waitForLoadState("networkidle", { timeout: 5000 });
  } catch {}

  //Check if we need to login
  const button = await findLoginButton(page);
  if (button && (await button.isVisible())) {
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await continueLoginSteps(page);
  }

  //Check youtube locale is set correctly
  const avatarButton = page.locator("#masthead #avatar-btn");
  if (await avatarButton.isVisible()) {
    await avatarButton.scrollIntoViewIfNeeded();
    await avatarButton.click();
    await page.waitForTimeout(500);
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {}

    const locationButton = page.locator(
      "yt-multi-page-menu-section-renderer:nth-child(3) > #items > ytd-compact-link-renderer:nth-child(3) > a#endpoint",
    );
    if (await locationButton.isVisible()) {
      await locationButton.scrollIntoViewIfNeeded();
      await locationButton.click();
      await page.waitForTimeout(500);
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {}

      let languageOption;

      switch (locale) {
        case "ru-RU":
          languageOption = page.getByRole("link", { name: "Русский" }).first();
          break;
        case "th-TH":
          languageOption = page.getByRole("link", { name: "ภาษาไทย" }).first();
          break;
        default:
          throw "handleGoogleLogin: Unsupported locale";
      }

      await languageOption.scrollIntoViewIfNeeded();
      await languageOption.click();
      await page.waitForTimeout(5000);
      if (browserName === "chromium") {
        // for chromium we must use persistent context so save the storageState from the browserContext intead of pageContext
        await context.storageState({
          path: path.join(
            authFileLocationBase,
            browserName,
            `user_${locale}.json`,
          ),
        });
      } else {
        await page.context().storageState({
          path: path.join(
            authFileLocationBase,
            browserName,
            `user_${locale}.json`,
          ),
        });
      }
      try {
        await page.waitForLoadState("networkidle", { timeout: 5000 });
      } catch {}
    }
  }

  async function continueLoginSteps(page) {
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {}

    const nextText = /Next|Далее|ถัดไป/i;

    await page.locator("#identifierId").fill(process.env.GOOGLE_USER);
    await page.getByRole("button", { name: nextText }).click();
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {}

    await page.locator("#password input").fill(process.env.GOOGLE_PWD);
    await page.getByRole("button", { name: nextText }).click();
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {}

    const totpInput = page.locator("#totpPin");
    if (await totpInput.isVisible()) {
      const twoFACode = generateOTP(process.env.GOOGLE_OTP_SECRET);
      await totpInput.fill(twoFACode);
      await page.getByRole("button", { name: nextText }).click();
    }

    await page.waitForTimeout(5000);
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {}

    if (browserName === "chromium") {
      // for chromium we must use persistent context so save the storageState from the browserContext intead of pageContext
      await context.storageState({
        path: path.join(authFileLocationBase, browserName, authFileName),
      });
    } else {
      await page.context().storageState({
        path: path.join(authFileLocationBase, browserName, authFileName),
      });
    }
  }

  await page.waitForTimeout(1500);
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
