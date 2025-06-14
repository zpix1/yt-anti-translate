import {
  chromium,
  firefox,
  expect,
  BrowserContext,
  TestInfo,
} from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { withExtension } from "playwright-webextext";
import {
  newPageWithStorageStateIfItExists,
  handleGoogleLogin,
  findLoginButton,
} from "./AuthStorageHelper";
import { downloadAndExtractUBlock } from "./ExtensionsFilesHelper";
import { handleYoutubeConsent } from "./YoutubeConsentHelper";

export async function setupUBlockAndAuth(
  testIfo: TestInfo,
  allBrowserNameWithExtensions: string[],
  allLocaleStrings: string[],
  defaultTryCatchTimeoutMs: number,
  defaultTimeoutMs: number,
) {
  try {
    for (let index = 0; index < allBrowserNameWithExtensions.length; index++) {
      const browserNameWithExtensions = allBrowserNameWithExtensions[index];
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
      for (let index = 0; index < allLocaleStrings.length; index++) {
        const localeString = allLocaleStrings[index];
        console.log(
          "setting up locale",
          localeString,
          "for browser",
          browserNameWithExtensions,
        );

        // Launch browser with the extension
        let context;
        switch (browserNameWithExtensions) {
          case "chromium":
          case "chromium-edge": {
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
                channel:
                  browserNameWithExtensions === "chromium-edge"
                    ? "msedge"
                    : undefined,
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
        );
        const page = result.page;
        const localeLoaded = result.localeLoaded;

        if (context["_type"] === "BrowserContext") {
          const browserContext = context as BrowserContext;
          browserContext.setDefaultNavigationTimeout(defaultTimeoutMs * 2);
          browserContext.setDefaultTimeout(defaultTimeoutMs);
        }
        page.setDefaultNavigationTimeout(defaultTimeoutMs * 2);
        page.setDefaultTimeout(defaultTimeoutMs);

        // Set up console message counting
        let consoleMessageCount = 0;
        page.on("console", () => {
          consoleMessageCount++;
        });

        if (!localeLoaded) {
          await page.goto("https://www.youtube.com/@MrBeast");

          try {
            await page.waitForLoadState("networkidle", {
              timeout: defaultTryCatchTimeoutMs,
            });
          } catch {}

          // Sometimes youtube redirects to consent page so wait 2 seconds before proceeding
          await page.waitForTimeout(2000);
          try {
            await page.waitForLoadState("networkidle", {
              timeout: defaultTryCatchTimeoutMs,
            });
          } catch {}

          await handleYoutubeConsent(page, defaultTryCatchTimeoutMs);

          // If we did not load a locale storage state, login to test account and set locale
          // This will also create a new storage state with the locale already set
          await handleGoogleLogin(
            testIfo,
            context,
            page,
            browserNameWithExtensions,
            localeString,
            defaultTryCatchTimeoutMs,
          );

          // If for whatever reason we are not logged in, then fail the setup
          expect(await findLoginButton(page)).toBe(null);
        }

        // Check console message count
        expect(consoleMessageCount).toBeLessThan(2000);

        // Close the browser context
        await context.close();
      }
    }
    return true;
  } catch (e) {
    return e;
  }
}
