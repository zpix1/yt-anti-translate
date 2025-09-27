import { expect } from "@playwright/test";
import { test } from "../playwright.config";
import { setupUBlockAndAuth } from "./helpers/SetupUBlockAndAuth";
import { acquireLock, releaseLock } from "./helpers/lock";

// This is a setup test used to download uBlock and set up a Storage State with Google Auth and Locale setting

test.describe("Setup Auth And UBlock", () => {
  test("Create storage states if missing and download uBlock for both Chromium and Firefox", async ({
    allBrowserNameWithExtensions,
    allLocaleStrings,
    isMobile,
  }) => {
    // use a lock to prevent multiple runs of this test at the same time
    // this allow parallelism globally, but not when doing the setup
    // (which is critical that is not flacky to avoid repeated fails and login attmpts)
    await acquireLock(
      "setup-auth-and-ublock",
      100,
      process.env.CI ? 18 * 60 * 1000 : 6 * 60 * 1000,
    );

    try {
      // If this test is retrying then check uBlock and Auth again
      const { status, error } = await setupUBlockAndAuth(
        allBrowserNameWithExtensions,
        allLocaleStrings,
        isMobile,
        false,
      );

      await expect(status).toBe(true);

      if (error) {
        console.error("Error during setupUBlockAndAuth:", error);
      }
    } finally {
      releaseLock("setup-auth-and-ublock");
    }
  });
});
