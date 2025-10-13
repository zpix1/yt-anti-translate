import { expect } from "@playwright/test";
import { test } from "../playwright.config";
import { setupUBlockAndAuth } from "./helpers/SetupUBlockAndAuth";

// This is a setup test used to download uBlock and set up a Storage State with Google Auth and Locale setting

test.describe("Setup Auth And UBlock", () => {
  test("Create storage states if missing and download uBlock for both Chromium and Firefox", async ({
    allBrowserNameWithExtensions,
    allLocaleStrings,
    isMobile,
  }) => {
    // If this test is retrying then check uBlock and Auth again
    const { status, error } = await setupUBlockAndAuth(
      allBrowserNameWithExtensions,
      allLocaleStrings,
      isMobile,
      false,
    );

    if (error) {
      console.error("Error during setupUBlockAndAuth:", error);
    }
    await expect(error).toBeUndefined();
    await expect(status).toBe(true);
  });
});
