import {
  expect,
  firefox,
  chromium,
  BrowserContext,
  Browser,
  TestInfo,
  Page,
} from "@playwright/test";
import path, { dirname } from "path";
import { withExtension } from "playwright-webextext";
import {
  newPageWithStorageStateIfItExists,
  findLoginButton,
} from "./AuthStorageHelper";
import { setupUBlockAndAuth } from "./SetupUBlockAndAuth";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to handle retry setup
export async function handleRetrySetup(
  testInfo: TestInfo,
  browserNameWithExtensions: string,
  localeString: string,
  defaultTryCatchTimeoutMs: number,
  defaultTimeoutMs: number,
) {
  if (testInfo.retry > 0) {
    console.log("retrying test", testInfo.title, "doing setup again");
    // If this test is retrying then check uBlock and Auth again
    expect(
      await setupUBlockAndAuth(
        testInfo,
        [browserNameWithExtensions],
        [localeString],
        defaultTryCatchTimeoutMs,
        defaultTimeoutMs,
      ),
    ).toBe(true);
  }
}

// Helper function to create browser context with extension
export async function createBrowserContext(
  browserNameWithExtensions: string,
  extensionPath: string = "../../app",
): Promise<BrowserContext | Browser> {
  let context;
  switch (browserNameWithExtensions) {
    case "chromium":
    case "chromium-edge": {
      const browserTypeWithExtension = withExtension(chromium, [
        path.resolve(__dirname, extensionPath),
        path.resolve(__dirname, "..", "testUBlockOriginLite"),
      ]);
      context = await browserTypeWithExtension.launchPersistentContext("", {
        headless: false,
        channel:
          browserNameWithExtensions === "chromium-edge" ? "msedge" : undefined,
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
      context = await browserTypeWithExtension.launch();
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
  defaultTimeoutMs: number,
): Promise<{ page: Page; consoleMessageCount: number }> {
  const result = await newPageWithStorageStateIfItExists(
    context,
    browserNameWithExtensions,
    localeString,
  );
  const page: Page = result.page;
  const localeLoaded: boolean = result.localeLoaded;

  if (!localeLoaded) {
    // Setup failed to create a matching locale so test will fail.
    expect(localeLoaded).toBe(true);
  }

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

  return { page, consoleMessageCount };
}

// Helper function for common page loading and auth checks
export async function loadPageAndVerifyAuth(
  page: Page,
  url: string,
  browserNameWithExtensions: string,
  defaultTryCatchTimeoutMs: number,
) {
  // Navigate to the specified YouTube page
  try {
    await goToUrl();
  } catch {
    console.warn("Page navigation failed once");
  }

  if (page.url() !== url) {
    // Retry once
    try {
      await goToUrl();
    } catch {
      console.warn("Page navigation failed twice");
    }
  }
  if (page.url() !== url) {
    // Fail test early cause playwright did not navigate to page
    expect(page.url()).toBe(url);
  }

  // If for whatever reason we are not logged in, then fail the test
  expect(await findLoginButton(page)).toBe(null);

  // When chromium we need to wait some extra time to allow adds to be removed by uBlock Origin Lite
  // Ads are allowed to load and removed after so it takes time
  if (
    browserNameWithExtensions === "chromium" ||
    browserNameWithExtensions === "chromium-edge"
  ) {
    await page.waitForTimeout(7000);
  }

  async function goToUrl() {
    await page.goto(url);

    // Wait for the page to load
    try {
      await Promise.all([
        page.waitForLoadState("networkidle", {
          timeout: defaultTryCatchTimeoutMs * 2, // Increased timeout for navigation
        }),
        page.waitForTimeout(5000),
      ]);
    } catch {
      console.log(`[TestSetupHelper] networkidle timeout`);
    }
  }
}
