/* eslint-disable  @typescript-eslint/no-explicit-any */

import {
  chromium,
  firefox,
  expect,
  Browser,
  BrowserContext,
  Page,
} from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withExtension } from "playwright-webextext";
import {
  newPageWithStorageStateIfItExists,
  handleGoogleLogin,
  findLoginButton,
  isLocaleCorrect,
} from "./AuthStorageHelper";
import { downloadAndExtractUBlock } from "./ExtensionsFilesHelper";
import { handleYoutubeConsent } from "./YoutubeConsentHelper";
import { waitForSelectorOrRetryWithPageReload } from "./TestSetupHelper";

export async function setupUBlockAndAuth(
  allBrowserNameWithExtensions: string[],
  allLocaleStrings: string[],
  isMobile: boolean,
  isRetrySetup: boolean = false,
): Promise<{
  status: boolean;
  error?: string;
  context?: BrowserContext | Browser;
  page?: Page;
}> {
  try {
    for (const browserNameWithExtensions of allBrowserNameWithExtensions) {
      await downloadAndExtractUBlock(browserNameWithExtensions);

      // For each localeString is allLocaleStrings[]
      // 0. Create browser context
      // 1. create a page attempting to get a storage state if it exist already "newPageWithStorageStateIfItExists"
      // 2. call "handleYoutubeConsent" to avoid any blocker caused by consent prompts
      // 3a. if no storage was loaded or the storage loaded was not a matching locale, then call "handleGoogleLogin"
      //     to handle the login and then select the locale matching the current localeString
      // 3b. Id a matching locale was already loaded then "handleGoogleLogin" is skipped
      // 4. Check console message count
      // 5. Close browser context
      for (const localeString of allLocaleStrings) {
        console.log(
          "setting up locale",
          localeString,
          "for browser",
          browserNameWithExtensions,
        );

        // Launch browser with the extension
        let context;
        switch (browserNameWithExtensions) {
          case "chromium": {
            const browserTypeWithExtension = withExtension(chromium, [
              path.resolve(
                path.dirname(fileURLToPath(import.meta.url)),
                "../../app",
              ),
              path.resolve(
                path.dirname(fileURLToPath(import.meta.url)),
                "../testUBlockOriginLite",
              ),
            ]);
            context = await browserTypeWithExtension.launchPersistentContext(
              "",
              {
                headless: false,
              },
            );
            break;
          }
          case "firefox": {
            context = await withExtension(firefox, [
              path.resolve(
                path.dirname(fileURLToPath(import.meta.url)),
                "../../app",
              ),
              path.resolve(
                path.dirname(fileURLToPath(import.meta.url)),
                "../testUBlockOrigin",
              ),
            ]).launch();
            break;
          }
          default:
            throw "Unsupported browserNameWithExtensions";
        }

        // Create a new page
        const result = await newPageWithStorageStateIfItExists(
          context,
          browserNameWithExtensions,
          localeString,
          isMobile,
        );
        const page = result.page;
        const localeLoaded = result.localeLoaded;

        // Set up console message counting
        let consoleMessageCount = 0;
        page.on("console", () => {
          consoleMessageCount++;
        });

        let loginButton;
        let isCorrectLocale = false;

        // If localeLoaded check login status
        if (localeLoaded) {
          await openYoutubeStartingPage(page);

          loginButton = await findLoginButton(
            page,
            browserNameWithExtensions,
            isMobile,
          );

          isCorrectLocale = await isLocaleCorrect(
            page,
            localeString,
            browserNameWithExtensions,
            isMobile,
          );
        }

        if (loginButton || !isCorrectLocale || !localeLoaded) {
          await openYoutubeStartingPage(page, true);

          // If we did not load a locale storage state, login to test account and set locale
          // This will also create a new storage state with the locale already set
          await handleGoogleLogin(
            context,
            page,
            browserNameWithExtensions,
            localeString,
            isMobile,
          );

          await openYoutubeStartingPage(page);

          // If for whatever reason we are still not logged in, then fail the setup
          expect(
            await findLoginButton(page, browserNameWithExtensions, isMobile),
          ).toBe(null);

          // If locale is wrong then fail the setup
          expect(
            await isLocaleCorrect(
              page,
              localeString,
              browserNameWithExtensions,
              isMobile,
            ),
          ).toBe(true);
        }

        // Check console message count
        expect(consoleMessageCount).toBeLessThan(2000);

        if (
          isRetrySetup &&
          allBrowserNameWithExtensions?.length === 1 &&
          allLocaleStrings?.length === 1
        ) {
          // If we are retrying setup and only have one browser and one locale, we can return the context and page
          return {
            status: true,
            error: undefined,
            context: context,
            page: page,
          };
        } else {
          // Close the browser context
          await context.close();
        }
      }
    }
    return {
      status: true,
      error: undefined,
      context: undefined,
      page: undefined,
    };
  } catch (e: any) {
    return {
      status: false,
      error: e.message,
      context: undefined,
      page: undefined,
    };
  }

  async function openYoutubeStartingPage(
    page: Page,
    loginNeeded: boolean = false,
  ) {
    await page.goto("https://www.youtube.com/feed/you");

    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {
      // empty
    }

    // Sometimes youtube redirects to consent page so wait 2 seconds before proceeding
    await page.waitForTimeout(2000);
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {
      // empty
    }

    await handleYoutubeConsent(page);

    if (loginNeeded) {
      await waitForSelectorOrRetryWithPageReload(
        page,
        "#items > [is-primary] > a#endpoint, [role='tablist'] [role='tab']",
      );
    }
  }
}
