import {
  expect,
  firefox,
  chromium,
  BrowserContext,
  Browser,
  TestInfo,
  Page,
  devices,
} from "@playwright/test";
import path, { dirname } from "node:path";
import { withExtension } from "playwright-webextext";
import {
  newPageWithStorageStateIfItExists,
  findLoginButton,
} from "./AuthStorageHelper";
import { setupUBlockAndAuth } from "./SetupUBlockAndAuth";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to handle retry setup
export async function handleRetrySetup(
  testInfo: TestInfo,
  browserNameWithExtensions: string,
  localeString: string,
) {
  if (testInfo.retry > 0) {
    console.log("retrying test", testInfo.title, "doing setup again");
    // If this test is retrying then check uBlock and Auth again
    expect(
      await setupUBlockAndAuth([browserNameWithExtensions], [localeString]),
    ).toBe(true);
  }
}

// Helper function to create browser context with extension
export async function createBrowserContext(
  browserNameWithExtensions: string,
  extensionPath: string = "../../app",
  mobile: boolean = false,
): Promise<BrowserContext | Browser> {
  let context;
  const mobileContextOptions = mobile
    ? {
        ...devices["Pixel 5"], // emulate a common Android device
      }
    : {};

  switch (browserNameWithExtensions) {
    case "chromium": {
      const browserTypeWithExtension = withExtension(chromium, [
        path.resolve(__dirname, extensionPath),
        path.resolve(__dirname, "..", "testUBlockOriginLite"),
      ]);
      context = await browserTypeWithExtension.launchPersistentContext("", {
        headless: false,
        ...mobileContextOptions,
      });
      break;
    }
    case "firefox": {
      const uBlockPath =
        extensionPath === "../testDist"
          ? "testUBlockOrigin"
          : "testUBlockOrigin";
      const browserTypeWithExtension = await withExtension(firefox, [
        path.resolve(__dirname, extensionPath),
        path.resolve(__dirname, "..", uBlockPath),
      ]);
      context = await browserTypeWithExtension.launch({
        ...mobileContextOptions,
      });
      break;
    }
    default:
      throw new Error(
        `Unsupported browserNameWithExtensions: ${browserNameWithExtensions}`,
      );
  }
  return context;
}

// Helper function to setup page with common configurations
export async function setupPageWithAuth(
  context: BrowserContext | Browser,
  browserNameWithExtensions: string,
  localeString: string,
) {
  const result = await newPageWithStorageStateIfItExists(
    context,
    browserNameWithExtensions,
    localeString,
  );
  const page = result.page;
  const localeLoaded = result.localeLoaded;

  if (!localeLoaded) {
    // Setup failed to create a matching locale so test will fail.
    expect(localeLoaded).toBe(true);
  }

  // Set up console message counting
  const consoleMessageCountContainer = { count: 0 };
  page.on("console", () => {
    consoleMessageCountContainer.count++;
  });

  return { page, consoleMessageCountContainer };
}

// Helper function for common page loading and auth checks
export async function loadPageAndVerifyAuth(
  page: Page,
  url: string,
  browserNameWithExtensions?: string,
) {
  // Navigate to the specified YouTube page
  await page.goto(url);

  // Wait for the page to load
  try {
    await page.waitForLoadState("networkidle", { timeout: 5000 });
  } catch {}
  // .waitForLoadState("networkidle" is not always right so wait 5 extra seconds
  await page.waitForTimeout(5000);

  // If for whatever reason we are not logged in, then fail the test
  expect(await findLoginButton(page)).toBe(null);

  // When chromium we need to wait some extra time to allow adds to be removed by uBlock Origin Lite
  // Ads are allowed to load and removed after so it takes time
  if (browserNameWithExtensions === "chromium") {
    await page.waitForTimeout(5000);
  }
}
