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
  console.log(
    `[AuthStorage] Initializing with browser: ${browserName}, locale: ${locale}`,
  );

  if (
    !process.env.GOOGLE_USER ||
    process.env.GOOGLE_USER.trim() === "" ||
    !process.env.GOOGLE_PWD ||
    process.env.GOOGLE_PWD.trim() === ""
  ) {
    console.error("[AuthStorage] Google auth environment variables not set");
    throw "Google auth env must be set.";
  }

  let authFile;
  switch (browserName) {
    case "chromium":
    case "chromium-edge":
    case "firefox":
      authFile = path.join(authFileLocationBase, browserName, authFileName);
      console.log(`[AuthStorage] Auth file path: ${authFile}`);
      break;
    default:
      console.error(`[AuthStorage] Unsupported browser: ${browserName}`);
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
      console.log(`[AuthStorage] Locale-specific auth file: ${file}`);
      break;
    default:
      console.error(`[AuthStorage] Unsupported locale: ${locale}`);
      throw "newPageWithStorageStateIfItExists: Unsupported locale";
  }

  // Helper to load cookies from file and add them to context
  const loadCookies = async (context, filePath) => {
    console.log(`[AuthStorage] Loading cookies from: ${filePath}`);
    const content = fs.readFileSync(filePath, "utf-8");
    const storageState = JSON.parse(content);
    if (storageState.cookies && storageState.cookies.length > 0) {
      console.log(
        `[AuthStorage] Adding ${storageState.cookies.length} cookies to context`,
      );
      await context.addCookies(storageState.cookies);
    } else {
      console.log(`[AuthStorage] No cookies found in storage state`);
    }
  };

  // Healper to load auth storage if fresh
  const loadStorage = async (
    context,
    storageFile,
    isLocaleLoadedTrue,
    maxHours,
  ) => {
    console.log(`[AuthStorage] Checking storage freshness for: ${storageFile}`);
    const stats = fs.statSync(storageFile);
    const modifiedTime = new Date(stats.mtime);
    const now = new Date();
    const ageInHours =
      (now.getTime() - modifiedTime.getTime()) / (1000 * 60 * 60);

    console.log(
      `[AuthStorage] Storage file age: ${ageInHours.toFixed(2)} hours (max: ${maxHours})`,
    );

    if (ageInHours <= maxHours) {
      console.log(
        `[AuthStorage] Storage is fresh, loading for browser: ${browserName}`,
      );
      if (browserName === "chromium" || browserName === "chromium-edge") {
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
    console.log(
      `[AuthStorage] Storage is too old, will need fresh authentication`,
    );
    return null;
  };

  if (file !== "") {
    if (fs.existsSync(file)) {
      console.log(
        `[AuthStorage] Locale-specific auth file exists, attempting to load`,
      );
      const result = await loadStorage(context, file, true, 24);
      if (result) {
        console.log(`[AuthStorage] Successfully loaded locale-specific auth`);
        return result;
      }
    } else {
      console.log(
        `[AuthStorage] Locale-specific auth file does not exist: ${file}`,
      );
    }
  }

  if (fs.existsSync(authFile)) {
    console.log(`[AuthStorage] Base auth file exists, attempting to load`);
    const result = await loadStorage(context, authFile, false, 24);
    if (result) {
      console.log(`[AuthStorage] Successfully loaded base auth`);
      return result;
    }
  } else {
    console.log(`[AuthStorage] Base auth file does not exist: ${authFile}`);
  }

  // Fallback if file doesn't exist or is too old.
  console.log(
    `[AuthStorage] No valid auth found, creating new page without auth`,
  );
  return { page: await context.newPage(), localeLoaded: false };
}

/**
 * @param {Page} page
 * @returns {Locator|null}
 */
export async function findLoginButton(page) {
  console.log(`[AuthStorage] Searching for login button`);
  const possibleLabels = ["Sign in", "Войти", "ลงชื่อเข้าใช้"];
  for (const label of possibleLabels) {
    console.log(
      `[AuthStorage] Checking for login button with label: "${label}"`,
    );
    const button = page.locator(`#masthead a:has-text("${label}")`).first();
    if (await button.isVisible()) {
      console.log(`[AuthStorage] Found login button with label: "${label}"`);
      return button;
    }
  }
  console.log(`[AuthStorage] No login button found`);
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
  defaultNetworkIdleTimeoutMs: number,
) {
  console.log(
    `[AuthStorage] Starting Google login process for ${browserName} with locale ${locale}`,
  );

  try {
    await page.waitForLoadState("networkidle", {
      timeout: defaultNetworkIdleTimeoutMs,
    });
  } catch {
    console.log(`[AuthStorage] Network idle timeout during initial load`);
  }

  //Check if we need to login
  const button = await findLoginButton(page);
  if (button && (await button.isVisible())) {
    console.log(`[AuthStorage] Login required, clicking login button`);
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await continueLoginSteps(page);
  } else {
    console.log(`[AuthStorage] User appears to already be logged in`);
  }

  //Check youtube locale is set correctly
  console.log(`[AuthStorage] Checking and setting YouTube locale`);
  const avatarButton = page.locator("#masthead #avatar-btn");
  if (await avatarButton.isVisible()) {
    console.log(
      `[AuthStorage] Avatar button found, clicking to access settings`,
    );
    await avatarButton.scrollIntoViewIfNeeded();
    await avatarButton.click();
    await page.waitForTimeout(500);
    try {
      await page.waitForLoadState("networkidle", {
        timeout: defaultNetworkIdleTimeoutMs,
      });
    } catch {
      console.log(`[AuthStorage] Network idle timeout after avatar click`);
    }

    const locationButton = page.locator(
      "yt-multi-page-menu-section-renderer:nth-child(3) > #items > ytd-compact-link-renderer:nth-child(3) > a#endpoint",
    );
    if (await locationButton.isVisible()) {
      console.log(`[AuthStorage] Location/Language button found, clicking`);
      await locationButton.scrollIntoViewIfNeeded();
      await locationButton.click();
      await page.waitForTimeout(500);
      try {
        await page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        });
      } catch {
        console.log(
          `[AuthStorage] Network idle timeout after location button click`,
        );
      }

      let languageOption;

      switch (locale) {
        case "ru-RU":
          console.log(`[AuthStorage] Setting language to Russian`);
          languageOption = page.getByRole("link", { name: "Русский" }).first();
          break;
        case "th-TH":
          console.log(`[AuthStorage] Setting language to Thai`);
          languageOption = page.getByRole("link", { name: "ภาษาไทย" }).first();
          break;
        default:
          console.error(
            `[AuthStorage] Unsupported locale for language setting: ${locale}`,
          );
          throw "handleGoogleLogin: Unsupported locale";
      }

      await languageOption.scrollIntoViewIfNeeded();
      await languageOption.click();
      console.log(
        `[AuthStorage] Language option clicked, waiting for page to update`,
      );
      await page.waitForTimeout(5000);

      const localeStoragePath = path.join(
        authFileLocationBase,
        browserName,
        `user_${locale}.json`,
      );

      if (browserName === "chromium" || browserName === "chromium-edge") {
        console.log(
          `[AuthStorage] Saving locale-specific storage state for Chromium: ${localeStoragePath}`,
        );
        // for chromium we must use persistent context so save the storageState from the browserContext intead of pageContext
        await context.storageState({
          path: localeStoragePath,
        });
      } else {
        console.log(
          `[AuthStorage] Saving locale-specific storage state for ${browserName}: ${localeStoragePath}`,
        );
        await page.context().storageState({
          path: localeStoragePath,
        });
      }
      try {
        await page.waitForLoadState("networkidle", {
          timeout: defaultNetworkIdleTimeoutMs,
        });
      } catch {
        console.log(`[AuthStorage] Network idle timeout after language change`);
      }
    } else {
      console.log(`[AuthStorage] Location/Language button not found`);
    }
  } else {
    console.log(`[AuthStorage] Avatar button not found`);
  }

  async function continueLoginSteps(page) {
    console.log(`[AuthStorage] Continuing with Google login steps`);

    try {
      await page.waitForLoadState("networkidle", {
        timeout: defaultNetworkIdleTimeoutMs,
      });
    } catch {
      console.log(`[AuthStorage] Network idle timeout in login steps`);
    }

    const nextText = /Next|Далее|ถัดไป/i;

    console.log(`[AuthStorage] Filling in email: ${process.env.GOOGLE_USER}`);
    await page.locator("#identifierId").fill(process.env.GOOGLE_USER);
    await page.getByRole("button", { name: nextText }).click();
    try {
      await page.waitForLoadState("networkidle", {
        timeout: defaultNetworkIdleTimeoutMs,
      });
    } catch {
      console.log(`[AuthStorage] Network idle timeout after email step`);
    }

    console.log(`[AuthStorage] Filling in password`);
    await page.locator("#password input").fill(process.env.GOOGLE_PWD);
    await page.getByRole("button", { name: nextText }).click();
    try {
      await page.waitForLoadState("networkidle", {
        timeout: defaultNetworkIdleTimeoutMs,
      });
    } catch {
      console.log(`[AuthStorage] Network idle timeout after password step`);
    }

    const totpInput = page.locator("#totpPin");
    if (await totpInput.isVisible()) {
      console.log(`[AuthStorage] 2FA required, generating OTP`);
      if (!process.env.GOOGLE_OTP_SECRET) {
        console.error(
          `[AuthStorage] GOOGLE_OTP_SECRET not set but 2FA is required`,
        );
        throw "GOOGLE_OTP_SECRET is not set while required for 2FA";
      }
      const twoFACode = generateOTP(process.env.GOOGLE_OTP_SECRET);
      console.log(`[AuthStorage] Generated OTP code, filling in 2FA`);
      await totpInput.fill(twoFACode);
      await page.getByRole("button", { name: nextText }).click();
    } else {
      console.log(`[AuthStorage] No 2FA required`);
    }

    //If we get a "Simplify you sign-in" or "Confirm your details" page cligh on "Not now" button
    const notNowButton = page.getByRole("button", {
      name: /Not now|Не сейчас|ไม่ใช่ตอนนี้/i,
    });
    if (await notNowButton.isVisible()) {
      await notNowButton.click();
    }

    await page.waitForTimeout(5000);
    try {
      await page.waitForLoadState("networkidle", {
        timeout: defaultNetworkIdleTimeoutMs,
      });
    } catch {
      console.log(`[AuthStorage] Network idle timeout after final login steps`);
    }

    const baseStoragePath = path.join(
      authFileLocationBase,
      browserName,
      authFileName,
    );

    if (browserName === "chromium" || browserName === "chromium-edge") {
      console.log(
        `[AuthStorage] Saving base storage state for Chromium: ${baseStoragePath}`,
      );
      // for chromium we must use persistent context so save the storageState from the browserContext intead of pageContext
      await context.storageState({
        path: baseStoragePath,
      });
    } else {
      console.log(
        `[AuthStorage] Saving base storage state for ${browserName}: ${baseStoragePath}`,
      );
      await page.context().storageState({
        path: baseStoragePath,
      });
    }
    console.log(`[AuthStorage] Login process completed successfully`);
  }

  await page.waitForTimeout(1500);
  console.log(`[AuthStorage] Google login handling completed`);
}

function generateOTP(secret) {
  console.log(`[AuthStorage] Generating OTP with provided secret`);
  const totp = new OTPAuth.TOTP({
    secret: secret,
    digits: 6,
    algorithm: "sha1",
    period: 30,
  });

  const code = totp.generate();
  console.log(`[AuthStorage] OTP generated successfully`);
  return code;
}
