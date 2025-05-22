import { expect, chromium, firefox } from "@playwright/test";
import { test } from "../playwright.config"
import path from "path";
import { withExtension } from "playwright-webextext";
import { handleYoutubeConsent } from "./handleYoutubeConsent";
import { newPageWithStorageStateIfItExists, handleGoogleLogin, findLoginButton } from "./handleGoogleLogin";
import { downloadAndExtractUBlock } from "./handleTestDistribution";

require('dotenv').config();

// This are tests for additional features using Youtube Data API and a APIKey provided by the user
// We are using locale th-TH for this tests as MrBeast channel name is not translated in ru-RU, but it is th-TH

test.describe("Setup Auth And UBlock", () => {
  test("Create storage states if missing and download uBlock for both Chromium and Firefox", async ({ allBrowserNameWithExtensions, allLocaleStrings }) => {
    // Dowload uBlock for all Browsers to setup
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

        // Launch browser with the extension
        let context;
        switch (browserNameWithExtensions) {
          case "chromium":
            const browserTypeWithExtension = withExtension(
              chromium,
              [path.resolve(__dirname, "../app"), path.resolve(__dirname, "testUBlockOriginLite")]
            );
            context = await browserTypeWithExtension.launchPersistentContext("", {
              headless: false
            });
            break;
          case "firefox":
            context = await (withExtension(
              firefox,
              [path.resolve(__dirname, "../app"), path.resolve(__dirname, "testUBlockOrigin")]
            )).launch()
            break;
          default:
            throw "Unsupported browserNameWithExtensions"
        }

        // Create a new page
        const result = await newPageWithStorageStateIfItExists(context, browserNameWithExtensions, localeString);
        const page = result.page;
        const localeLoaded = result.localeLoaded;

        // Set up console message counting
        let consoleMessageCount = 0;
        page.on("console", () => {
          consoleMessageCount++;
        });

        if (!localeLoaded) {
          // Navigate to the specified YouTube channel page
          await page.goto("https://www.youtube.com/@MrBeast");

          // Wait for the page to load
          try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }

          // Sometimes youtube redirects to consent page so wait 2 seconds before proceeding
          await page.waitForTimeout(2000);
          try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { }

          // Sometimes youtube redirects to consent so handle it
          await handleYoutubeConsent(page);

          // If we did not load a locale storage state, login to test account and set locale
          // This will also create a new storage state with the locale already set
          await handleGoogleLogin(context, page, browserNameWithExtensions, localeString);

          // If for whatever reason we are not logged in, then fail the setup
          expect(await findLoginButton(page)).toBe(null);
        }

        // Check console message count
        expect(consoleMessageCount).toBeLessThan(
          2000
        );

        // Close the browser context
        await context.close();
      }
    }
  });
});