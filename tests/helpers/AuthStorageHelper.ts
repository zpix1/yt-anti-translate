/* eslint-disable  @typescript-eslint/no-explicit-any */
import fs from "node:fs";
import * as OTPAuth from "otpauth";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import TwoCaptcha from "2captcha-ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const authFileLocationBase = path.join(__dirname, "../../playwright/.auth/");
const authFileBase = "user";

import "dotenv/config";
import { Browser, BrowserContext, Page } from "@playwright/test";
import {
  getFirstVisibleLocator,
  waitForSelectorOrRetryWithPageReload,
  waitForVisibleLocatorOrRetryWithPageReload,
} from "./TestSetupHelper";
import { decryptAuthFile, encryptAuthFile } from "./CryptAuthHelper";

/**
 * @param {BrowserContext} context
 * @param {string} browserName
 * @param {string} locale
 * @returns
 */
export async function newPageWithStorageStateIfItExists(
  context: Browser | BrowserContext,
  browserName: string,
  locale: string,
  isMobile: boolean = false,
) {
  console.log(
    `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Initializing, locale: ${locale}`,
  );

  if (
    !process.env.GOOGLE_USER ||
    process.env.GOOGLE_USER.trim() === "" ||
    !process.env.GOOGLE_PWD ||
    process.env.GOOGLE_PWD.trim() === "" ||
    !process.env.GOOGLE_OTP_SECRET ||
    process.env.GOOGLE_OTP_SECRET.trim() === ""
  ) {
    console.error(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Google auth environment variables not set`,
    );
    throw "Google auth env must be set.";
  }

  let baseAuthFile;
  let baseAuthFileName;
  switch (browserName) {
    case "chromium":
    case "firefox":
      baseAuthFileName = `${authFileBase}${isMobile ? "_mobile" : ""}.json`;
      baseAuthFile = path.join(
        authFileLocationBase,
        browserName,
        baseAuthFileName,
      );
      console.log(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Auth file path: ${baseAuthFile}`,
      );
      break;
    default:
      console.error(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Unsupported browser: ${browserName}`,
      );
      throw "newPageWithStorageStateIfItExists: Unsupported browserName";
  }

  let localeAuthFile = "";
  let localeAuthFileName = "";

  switch (locale) {
    case "ru-RU":
    case "th-TH":
      localeAuthFileName = `${authFileBase}_${locale}${isMobile ? "_mobile" : ""}.json`;
      localeAuthFile = path.join(
        authFileLocationBase,
        browserName,
        localeAuthFileName,
      );
      console.log(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Locale-specific auth file: ${localeAuthFile}`,
      );
      break;
    default:
      console.error(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Unsupported locale: ${locale}`,
      );
      throw "newPageWithStorageStateIfItExists: Unsupported locale";
  }

  // Helper to load cookies from file and add them to context
  const loadCookies = async (context: any, filePath: string) => {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Loading cookies from: ${filePath}`,
    );
    const content = fs.readFileSync(filePath, "utf-8");
    const storageState = JSON.parse(content);
    if (storageState.cookies && storageState.cookies.length > 0) {
      console.log(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Adding ${storageState.cookies.length} cookies to context`,
      );
      await context.addCookies(storageState.cookies);
    } else {
      console.log(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] No cookies found in storage state`,
      );
    }
  };

  // Helper to load auth storage if fresh
  const loadStorage = async (
    context: Browser | BrowserContext,
    storageFile: any,
    isLocaleLoadedTrue: boolean,
    maxHours: number,
    isMobile: boolean = false,
  ) => {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Checking storage freshness for: ${storageFile}`,
    );
    const stats = fs.statSync(storageFile);
    const modifiedTime = new Date(stats.mtime);
    const now = new Date();
    const ageInHours =
      (now.getTime() - modifiedTime.getTime()) / (1000 * 60 * 60);

    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Storage file age: ${ageInHours.toFixed(2)} hours (max: ${maxHours})`,
    );

    if (ageInHours <= maxHours) {
      console.log(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Storage is fresh, loading for browser: ${browserName}`,
      );
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
        page: await (context as Browser).newPage({ storageState: storageFile }),
        localeLoaded: isLocaleLoadedTrue,
      };
    }
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Storage is too old, will need fresh authentication`,
    );
    return null;
  };

  if (localeAuthFile !== "") {
    if (!fs.existsSync(localeAuthFile)) {
      console.log(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Locale-specific auth file does not exist, attempting to decrypt`,
      );
      decryptAuthFile(browserName, localeAuthFileName);
    }
    if (fs.existsSync(localeAuthFile)) {
      console.log(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Locale-specific auth file exists, attempting to load`,
      );
      const result = await loadStorage(
        context,
        localeAuthFile,
        true,
        24,
        isMobile,
      );
      if (result) {
        console.log(
          `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Successfully loaded locale-specific auth`,
        );
        return result;
      }
    } else {
      console.log(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Locale-specific auth file does not exist: ${localeAuthFile}`,
      );
    }
  }

  if (!fs.existsSync(baseAuthFile)) {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Base auth file does not exist, attempting to decrypt`,
    );
    decryptAuthFile(browserName, baseAuthFileName);
  }
  if (fs.existsSync(baseAuthFile)) {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Base auth file exists, attempting to load`,
    );
    const result = await loadStorage(
      context,
      baseAuthFile,
      false,
      24,
      isMobile,
    );
    if (result) {
      console.log(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Successfully loaded base auth`,
      );
      return result;
    }
  } else {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Base auth file does not exist: ${baseAuthFile}`,
    );
  }

  // Fallback if file doesn't exist or is too old.
  console.log(
    `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] No valid auth found, creating new page without auth`,
  );
  return { page: await context.newPage(), localeLoaded: false };
}

/**
 * @param {Page} page
 * @returns {Locator|null}
 */
export async function findLoginButton(
  page: Page,
  browserName: string,
  isMobile: boolean = false,
  maxLocatorsRetry: number = 0,
  needsCompleteFind: boolean = false,
) {
  if (isMobile) {
    if (page.url().includes("/watch?v=") || page.url().includes("/shorts/")) {
      console.log(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Searching for "Subscribe" button on mobile videos/shorts`,
      );
      const possibleLabels = /Subscribe|Подписаться|ติดตาม/i;

      const subscribeButtonLocator = page
        .locator(":visible")
        .getByRole("button", {
          name: possibleLabels,
          disabled: false,
        });
      const subscribeButtonHeader =
        maxLocatorsRetry > 0
          ? (
              await waitForVisibleLocatorOrRetryWithPageReload(
                page,
                subscribeButtonLocator,
                maxLocatorsRetry,
                true,
              )
            ).first()
          : subscribeButtonLocator.first();
      if (await subscribeButtonHeader.isVisible()) {
        await subscribeButtonHeader.scrollIntoViewIfNeeded();
        await page.waitForTimeout(process.env.CI ? 150 : 100);
        await subscribeButtonHeader.click();

        try {
          await page.waitForTimeout(process.env.CI ? 375 : 250);
          await page.waitForLoadState("networkidle", {
            timeout: process.env.CI ? 7500 : 5000,
          });
        } catch {
          console.log(
            `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Network idle timeout after subscribe click`,
          );
        }

        await page.waitForTimeout(process.env.CI ? 1500 : 1000);

        if (needsCompleteFind) {
          const possibleLabels2 = /Sign in|Войти|ลงชื่อเข้าใช้/i;

          console.log(
            `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Checking for login button with label: "${possibleLabels2}"`,
          );
          const buttonLocator = page
            .locator(":visible")
            .getByRole(`link`, { name: possibleLabels2 });
          const button = (
            maxLocatorsRetry > 0
              ? (
                  await waitForVisibleLocatorOrRetryWithPageReload(
                    page,
                    buttonLocator,
                    maxLocatorsRetry,
                    true,
                  )
                ).first()
              : buttonLocator
          ).first();
          if (await button.isVisible()) {
            console.log(
              `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Found login button with label: "${possibleLabels2}"`,
            );
            return button;
          }
        }
        console.warn(
          `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] [WARNING] FOR MOBILE The test account must be subscribed to the channel of any test playing videos/shorts`,
        );
        console.log(
          `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Found login button with label: "${possibleLabels}"`,
        );
        return subscribeButtonHeader;
      }
    } else {
      console.log(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Searching for login button on mobile`,
      );
      const possibleLabels = /You|Вы|คุณ/i;

      const youTabLocator = page
        .locator(":visible")
        .locator(
          "#items > [role='tab'] > a#endpoint, [role='navigation'] #items a#endpoint, [role='tablist'] [role='tab']",
          {
            hasText: possibleLabels,
          },
        );
      const youTab =
        maxLocatorsRetry > 0
          ? (
              await waitForVisibleLocatorOrRetryWithPageReload(
                page,
                youTabLocator,
                maxLocatorsRetry,
                true,
              )
            ).first()
          : youTabLocator.first();
      const containsIconLocator = await getFirstVisibleLocator(
        youTab.locator("svg"),
        true,
      );
      if (
        (await youTab.isVisible()) &&
        (await containsIconLocator.isVisible())
      ) {
        // If this is not setup we can skip this as it already confirms the test is not logged in
        if (needsCompleteFind) {
          await youTab.scrollIntoViewIfNeeded();
          await page.waitForTimeout(process.env.CI ? 150 : 100);
          await youTab.click();

          try {
            await page.waitForTimeout(process.env.CI ? 375 : 250);
            await page.waitForLoadState("networkidle", {
              timeout: process.env.CI ? 7500 : 5000,
            });
          } catch {
            console.log(
              `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Network idle timeout after 'You' Tab click`,
            );
          }

          await page.waitForTimeout(process.env.CI ? 1500 : 1000);

          const possibleLabels2 = /Sign in|Войти|ลงชื่อเข้าใช้/i;

          console.log(
            `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Checking for login button with label: "${possibleLabels2}"`,
          );
          const buttonLocator = page
            .locator(":visible")
            .getByRole(`link`, { name: possibleLabels2 });
          const button =
            maxLocatorsRetry > 0
              ? (
                  await waitForVisibleLocatorOrRetryWithPageReload(
                    page,
                    buttonLocator,
                    maxLocatorsRetry,
                    true,
                  )
                ).first()
              : buttonLocator.first();
          if (await button.isVisible()) {
            console.log(
              `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Found login button with label: "${possibleLabels2}"`,
            );
            return button;
          }
        }
        console.log(
          `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Found login button with label: "${possibleLabels}"`,
        );
        return youTab;
      }
    }
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] No login button found`,
    );
  } else {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Searching for login button`,
    );
    const possibleLabels = /Sign in|Войти|ลงชื่อเข้าใช้/i;

    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Checking for login button with label: "${possibleLabels}"`,
    );
    const buttonLocator = page
      .locator(":visible")
      .getByRole("link", { name: possibleLabels });
    const button =
      maxLocatorsRetry > 0
        ? (
            await waitForVisibleLocatorOrRetryWithPageReload(
              page,
              buttonLocator,
              maxLocatorsRetry,
              true,
            )
          ).first()
        : buttonLocator.first();
    if (await button.isVisible()) {
      console.log(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Found login button with label: "${possibleLabels}"`,
      );
      return button;
    }

    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] No login button found`,
    );
  }
  return null;
}

/**
 * @param {BrowserContext | Browser} context
 * @param {Page} page
 * @param {string} browserName
 * @param {string} locale
 * @param {boolean} isMobile - optional, default false
 */
export async function handleGoogleLogin(
  context: BrowserContext | Browser,
  page: Page,
  browserName: string,
  locale: string,
  isMobile: boolean = false,
) {
  console.log(
    `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Starting Google login process for ${browserName} with locale ${locale}`,
  );

  try {
    await page.waitForTimeout(process.env.CI ? 375 : 250);
    await page.waitForLoadState("networkidle", {
      timeout: process.env.CI ? 7500 : 5000,
    });
  } catch {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Network idle timeout during initial load`,
    );
  }

  //Check if we need to login
  const button = await findLoginButton(page, browserName, isMobile, 2, true);
  if (button && (await button.isVisible())) {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Login required, clicking login button`,
    );
    await button.scrollIntoViewIfNeeded();
    await page.waitForTimeout(process.env.CI ? 150 : 100);
    await button.click();
    const { isEarlyLogin } = await continueLoginSteps(
      browserName,
      context,
      page,
      isMobile,
    );
    if (isEarlyLogin) {
      if (await isLocaleCorrect(page, locale, browserName, isMobile)) {
        console.log(
          `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Early login from cookies detected, and locale was correct`,
        );
        return;
      } else {
        console.log(
          `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Early login from cookies detected, but locale was incorrect, continuing to set locale`,
        );
      }
    }
  } else {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] User appears to already be logged in`,
    );
  }

  //Check youtube locale is set correctly
  console.log(
    `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Checking and setting YouTube locale`,
  );

  if (isMobile) {
    await page.goto("https://m.youtube.com/select_site");

    try {
      await page.waitForTimeout(process.env.CI ? 375 : 250);
      await page.waitForLoadState("networkidle", {
        timeout: process.env.CI ? 7500 : 5000,
      });
    } catch {
      console.log(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Network idle timeout after settings page load`,
      );
    }

    await page.waitForTimeout(process.env.CI ? 1500 : 1000);

    await page.getByRole("button").first().waitFor();

    const settingsLabels = ["General", "Generali", "Общие", "ทั่วไป"];
    for (const label of settingsLabels) {
      const settingsButton = page.getByRole("button", { name: label }).first();
      if (await settingsButton.isVisible()) {
        console.log(
          `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Found settings button with label: "${label}"`,
        );
        await settingsButton.scrollIntoViewIfNeeded();
        await page.waitForTimeout(process.env.CI ? 150 : 100);
        await settingsButton.click();

        try {
          await page.waitForTimeout(process.env.CI ? 375 : 250);
          await page.waitForLoadState("networkidle", {
            timeout: process.env.CI ? 7500 : 5000,
          });
        } catch {
          console.log(
            `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Network idle timeout after general settings click`,
          );
        }

        await page.waitForTimeout(process.env.CI ? 1500 : 1000);

        const languageLabels = ["Language", "Lingua", "Язык", "ภาษา"];
        for (const langLabel of languageLabels) {
          const languageButton = page
            .getByRole("button", { name: langLabel })
            .first();
          if (await languageButton.isVisible()) {
            console.log(
              `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Found language button with label: "${langLabel}"`,
            );
            await languageButton.scrollIntoViewIfNeeded();
            await page.waitForTimeout(process.env.CI ? 150 : 100);
            await languageButton.click();
            break;
          } else {
            console.log(
              `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Language button not found`,
            );
          }
        }
        break;
      } else {
        console.log(
          `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] General Settings button not found`,
        );
      }
    }
  } else {
    const avatarButton = page
      .locator(":visible")
      .locator("#masthead #avatar-btn");
    if (await avatarButton.isVisible()) {
      console.log(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Avatar button found, clicking to access settings`,
      );
      await avatarButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(process.env.CI ? 150 : 100);
      await avatarButton.click();
      await page.waitForTimeout(process.env.CI ? 750 : 500);
      try {
        await page.waitForTimeout(process.env.CI ? 375 : 250);
        await page.waitForLoadState("networkidle", {
          timeout: process.env.CI ? 7500 : 5000,
        });
      } catch {
        console.log(
          `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Network idle timeout after avatar click`,
        );
      }

      const languageButton = page.locator(
        "yt-multi-page-menu-section-renderer:nth-child(3) > #items > ytd-compact-link-renderer:nth-child(3) > a#endpoint",
      );
      await languageButton.waitFor();
      if (await languageButton.isVisible()) {
        console.log(
          `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Language button found, clicking`,
        );
        await languageButton.scrollIntoViewIfNeeded();
        await page.waitForTimeout(process.env.CI ? 150 : 100);
        await languageButton.click();
      } else {
        console.log(
          `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Language button not found`,
        );
      }
    } else {
      console.log(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Avatar button not found`,
      );
    }
  }

  let languageOption;

  await page.waitForTimeout(process.env.CI ? 750 : 500);
  try {
    await page.waitForTimeout(process.env.CI ? 375 : 250);
    await page.waitForLoadState("networkidle", {
      timeout: process.env.CI ? 7500 : 5000,
    });
  } catch {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Network idle timeout after language button click`,
    );
  }

  switch (locale) {
    case "ru-RU":
      console.log(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Setting language to Russian`,
      );
      languageOption = page
        .getByRole(isMobile ? "option" : "link", { name: "Русский" })
        .first();
      break;
    case "th-TH":
      console.log(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Setting language to Thai`,
      );
      languageOption = page
        .getByRole(isMobile ? "option" : "link", { name: "ภาษาไทย" })
        .first();
      break;
    default:
      console.error(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Unsupported locale for language setting: ${locale}`,
      );
      throw "handleGoogleLogin: Unsupported locale";
  }

  await languageOption.scrollIntoViewIfNeeded();
  await page.waitForTimeout(process.env.CI ? 150 : 100);
  await languageOption.click();
  console.log(
    `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Language option clicked, waiting for page to update`,
  );
  await page.waitForTimeout(process.env.CI ? 7500 : 5000);

  const localeAuthFileName = `${authFileBase}_${locale}${isMobile ? "_mobile" : ""}.json`;
  const localeStoragePath = path.join(
    authFileLocationBase,
    browserName,
    localeAuthFileName,
  );

  if (browserName === "chromium") {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Saving locale-specific storage state for Chromium: ${localeStoragePath}`,
    );
    // for chromium we must use persistent context so save the storageState from the browserContext intead of pageContext
    await (context as BrowserContext).storageState({
      path: localeStoragePath,
    });
  } else {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Saving locale-specific storage state for ${browserName}: ${localeStoragePath}`,
    );
    await page.context().storageState({
      path: localeStoragePath,
    });
  }
  try {
    await page.waitForTimeout(process.env.CI ? 375 : 250);
    await page.waitForLoadState("networkidle", {
      timeout: process.env.CI ? 7500 : 5000,
    });
  } catch {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Network idle timeout after language change`,
    );
  }
  if (!process.env.CI) {
    encryptAuthFile(browserName, localeAuthFileName);
  }

  await page.waitForTimeout(process.env.CI ? 2250 : 1500);
  console.log(
    `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Google login handling completed`,
  );
}

async function continueLoginSteps(
  browserName: string,
  context: BrowserContext | Browser,
  page: Page,
  isMobile: boolean = false,
): Promise<{ isEarlyLogin: boolean }> {
  console.log(
    `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Continuing with Google login steps`,
  );

  try {
    await page.waitForTimeout(process.env.CI ? 375 : 250);
    await page.waitForLoadState("networkidle", {
      timeout: process.env.CI ? 7500 : 5000,
    });
  } catch {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Network idle timeout in login steps`,
    );
  }

  await page.waitForTimeout(process.env.CI ? 1500 : 1000);
  // Sometimes clicking the "Sign In" button is sufficient to log in directly
  if (
    !page.url().includes("google.com") &&
    !(await findLoginButton(page, browserName, isMobile, 1))
  ) {
    return { isEarlyLogin: true };
  }

  const nextText = /Next|Далее|ถัดไป/i;

  console.log(
    `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Filling in email: ${process.env.GOOGLE_USER}`,
  );
  const emailInput = await waitForSelectorOrRetryWithPageReload(
    page,
    "#identifierId, input[type='email']",
  );
  await emailInput.waitFor();
  await emailInput.fill(process.env.GOOGLE_USER!);
  await page.getByRole("button", { name: nextText }).click();
  try {
    await page.waitForTimeout(process.env.CI ? 375 : 250);
    await page.waitForLoadState("networkidle", {
      timeout: process.env.CI ? 7500 : 5000,
    });
  } catch {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Network idle timeout after email step`,
    );
  }

  await solveCaptcha(page);

  console.log(
    `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Filling in password`,
  );
  const passwordInput = await getFirstVisibleLocator(
    page.locator("#password input, input[name='password']"),
  );
  await passwordInput.fill(process.env.GOOGLE_PWD!);
  await page.getByRole("button", { name: nextText }).click();
  try {
    await page.waitForTimeout(process.env.CI ? 375 : 250);
    await page.waitForLoadState("networkidle", {
      timeout: process.env.CI ? 7500 : 5000,
    });
  } catch {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Network idle timeout after password step`,
    );
  }

  await solveCaptcha(page);

  const totpInput = await getFirstVisibleLocator(
    page.locator("#totpPin, input[name='totpPin']"),
  );
  await totpInput.waitFor();
  if (await totpInput.isVisible()) {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] 2FA required, generating OTP`,
    );
    if (!process.env.GOOGLE_OTP_SECRET) {
      console.error(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] GOOGLE_OTP_SECRET not set but 2FA is required`,
      );
      throw "GOOGLE_OTP_SECRET is not set while required for 2FA";
    }
    const twoFACode = generateOTP(
      process.env.GOOGLE_OTP_SECRET,
      browserName,
      isMobile,
    );
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Generated OTP code, filling in 2FA`,
    );
    await totpInput.fill(twoFACode);
    await page.getByRole("button", { name: nextText }).click();
  } else {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] No 2FA required`,
    );
  }

  await solveCaptcha(page);

  await page.waitForTimeout(process.env.CI ? 7500 : 5000);
  try {
    await page.waitForTimeout(process.env.CI ? 375 : 250);
    await page.waitForLoadState("networkidle", {
      timeout: process.env.CI ? 7500 : 5000,
    });
  } catch {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Network idle timeout after final login steps`,
    );
  }

  const baseAuthFileName = `${authFileBase}${isMobile ? "_mobile" : ""}.json`;
  const baseStoragePath = path.join(
    authFileLocationBase,
    browserName,
    baseAuthFileName,
  );

  if (browserName === "chromium") {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Saving base storage state: ${baseStoragePath}`,
    );
    // for chromium we must use persistent context so save the storageState from the browserContext intead of pageContext
    await (context as BrowserContext).storageState({
      path: baseStoragePath,
    });
  } else {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Saving base storage state: ${baseStoragePath}`,
    );
    await page.context().storageState({
      path: baseStoragePath,
    });
  }
  console.log(
    `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Login process completed successfully`,
  );

  if (!process.env.CI) {
    encryptAuthFile(browserName, baseAuthFileName);
  }

  return { isEarlyLogin: false };
}

function generateOTP(
  secret: string,
  browserName?: string,
  isMobile: boolean = false,
) {
  console.log(
    `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Generating OTP with provided secret`,
  );
  const totp = new OTPAuth.TOTP({
    secret: secret,
    digits: 6,
    algorithm: "sha1",
    period: 30,
  });

  const code = totp.generate();
  console.log(
    `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] OTP generated successfully`,
  );
  return code;
}

export async function isLocaleCorrect(
  page: Page,
  locale: string,
  browserName?: string,
  isMobile: boolean = false,
): Promise<boolean> {
  // Find Home Tab
  let homeLabel;
  switch (locale) {
    case "ru-RU":
      homeLabel = "Главная";
      break;
    case "th-TH":
      homeLabel = "หน้าแรก";
      break;
    default:
      console.error(
        `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Unsupported locale for home tab check: ${locale}`,
      );
      throw "isEarlyLoginLocaleCorrect: Unsupported locale";
  }

  const homeTab = page
    .locator(
      "#items > [role='tab'] > a#endpoint, [role='navigation'] #items a#endpoint, [role='tablist'] [role='tab']",
      { hasText: homeLabel },
    )
    .first();

  try {
    await homeTab.waitFor();
  } catch {
    return false;
  }

  if (await homeTab.isVisible()) {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Home tab found with correct locale label: ${homeLabel}`,
    );
    return true;
  } else {
    console.log(
      `[AuthStorage] [${isMobile ? "Mobile" : "Desktop"} ${browserName}] Home tab not found with locale label: ${homeLabel}, locale may be incorrect`,
    );
    return false;
  }
}

export async function solveCaptcha(
  page: Page,
  maxRetries: number = 3,
): Promise<void> {
  const captchaSelector = "img#captchaimg";
  const inputSelector = "input#ca";
  const nextText = /Next|Далее|ถัดไป/i;

  await page.waitForTimeout(process.env.CI ? 3000 : 2000);
  try {
    await page.waitForTimeout(process.env.CI ? 375 : 250);
    await page.waitForLoadState("networkidle", {
      timeout: process.env.CI ? 7500 : 5000,
    });
  } catch {
    console.log(
      `Network idle at the start of captcha attempt, retries left: ${maxRetries - 1}`,
    );
  }
  await page.waitForTimeout(process.env.CI ? 3000 : 2000);

  if (!page.url().includes("google.com")) {
    return;
  }

  const captchalocatorSearch = await getFirstVisibleLocator(
    page.locator(captchaSelector),
    true,
  );
  const inputLocatorSearch = await getFirstVisibleLocator(
    page.locator(inputSelector),
    true,
  );

  if (
    (await captchalocatorSearch.isVisible()) ||
    (await inputLocatorSearch.isVisible())
  ) {
    if (maxRetries <= 0) {
      throw new Error("Failed to solve captcha after maximum retries");
    }

    const captchaLocator = await getFirstVisibleLocator(
      page.locator(captchaSelector),
    );

    if (!process.env.TWOCAPTCHA_API_KEY) {
      if (!process.env.CI) {
        await page.pause();
      } else {
        throw "TWOCAPTCHA_API_KEY is not set while login per this browser is currently showing a captcha";
      }
      return;
    }

    // Get captcha image as base64
    const captchaSrc = await captchaLocator.getAttribute("src");
    let imageData: string;

    if (captchaSrc?.startsWith("data:image")) {
      imageData = captchaSrc;
    } else {
      // Download image from URL
      const response = await page.request.get(
        captchaSrc!.startsWith("http")
          ? captchaSrc!
          : `${new URL(page.url()).origin}${captchaSrc}`,
      );
      const buffer = await response.body();
      imageData = `data:image/png;base64,${buffer.toString("base64")}`;
    }

    // Use 2captcha to solve captcha
    const solver = new TwoCaptcha.Solver(process.env.TWOCAPTCHA_API_KEY, 500);
    let captchaText = "";
    const captchaAnswer = await solver.imageCaptcha({
      body: imageData,
      numeric: 2,
      min_len: 5,
      max_len: 30,
    });

    // Fill the input
    captchaText = captchaAnswer.data;
    console.log(`Captcha solved: ${captchaText}`);
    const inputLocator = await getFirstVisibleLocator(
      page.locator(inputSelector),
    );
    await inputLocator.fill(captchaText);

    // Click next
    await page.getByRole("button", { name: nextText }).click();

    // Check if captcha is still visible or retry
    await solveCaptcha(page, maxRetries - 1);
    return;
  } else {
    // No captcha found, exit
    return;
  }
}
