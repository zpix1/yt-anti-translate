import { test } from "../playwright.config"
import { setupUBlockAndAuth } from "./helpers/setupUBlockAndAuth";

require('dotenv').config();

// This are tests for additional features using Youtube Data API and a APIKey provided by the user
// We are using locale th-TH for this tests as MrBeast channel name is not translated in ru-RU, but it is th-TH

test.describe("Setup Auth And UBlock", () => {
  test("Create storage states if missing and download uBlock for both Chromium and Firefox", async ({ allBrowserNameWithExtensions, allLocaleStrings }) => {
    // Dowload uBlock for all Browsers to setup
    await setupUBlockAndAuth(allBrowserNameWithExtensions, allLocaleStrings);
  });
});