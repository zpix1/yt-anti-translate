import { test } from "../playwright.config"
import { setupUBlockAndAuth } from "./helpers/setupUBlockAndAuth";

require('dotenv').config();

// This is a setup test used to download uBlock and set up a Storage State with Google Auth and Locale setting

test.describe("Setup Auth And UBlock", () => {
  test("Create storage states if missing and download uBlock for both Chromium and Firefox", async ({ allBrowserNameWithExtensions, allLocaleStrings }) => {
    await setupUBlockAndAuth(allBrowserNameWithExtensions, allLocaleStrings);
  });
});