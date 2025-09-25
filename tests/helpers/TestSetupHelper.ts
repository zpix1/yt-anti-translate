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
  isMobile: boolean = false,
): Promise<{ context?: BrowserContext | Browser; page?: Page }> {
  if (testInfo.retry > 0) {
    console.log("retrying test", testInfo.title, "doing setup again");
    // If this test is retrying then check uBlock and Auth again
    const { status, error, context, page } = await setupUBlockAndAuth(
      [browserNameWithExtensions],
      [localeString],
      isMobile,
      true,
    );

    await expect(status).toBe(true);

    if (error) {
      console.error("Error during setupUBlockAndAuth:", error);
    }

    return { context: context, page: page };
  } else {
    return { context: undefined, page: undefined };
  }
}

// Helper function to create Browser|BrowserContext, Page, and console message counting
// Used by all tests at start and retrys
export async function setupTestEnvironment(
  testInfo: TestInfo,
  browserNameWithExtensions: string,
  localeString: string,
  isMobile: boolean = false,
  extensionPath: string | undefined = undefined,
): Promise<{
  context: BrowserContext | Browser;
  page: Page;
  consoleMessageCountContainer: { count: number };
}> {
  // Handle retries and prerequisite setup
  let { context, page } = await handleRetrySetup(
    testInfo,
    browserNameWithExtensions,
    localeString,
    isMobile,
  );
  let consoleMessageCountContainer: { count: number };

  if (!context || !page) {
    // Launch browser with the extension
    context = await createBrowserContext(
      browserNameWithExtensions,
      extensionPath,
      isMobile,
    );

    // Open new page with auth + extension
    ({ page, consoleMessageCountContainer } = await setupPageWithAuth(
      context,
      browserNameWithExtensions,
      localeString,
      isMobile,
    ));
  } else {
    // Set up console message counting
    consoleMessageCountContainer = { count: 0 };
    page.on("console", () => {
      consoleMessageCountContainer.count++;
    });
  }

  return {
    context: context,
    page: page,
    consoleMessageCountContainer: consoleMessageCountContainer,
  };
}

// Helper function to create browser context with extension
export async function createBrowserContext(
  browserNameWithExtensions: string,
  extensionPath: string = "../../app",
  isMobile: boolean = false,
): Promise<BrowserContext | Browser> {
  let context;
  const mobileContextOptions = isMobile
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
  isMobile: boolean = false,
) {
  const result = await newPageWithStorageStateIfItExists(
    context,
    browserNameWithExtensions,
    localeString,
    isMobile,
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
  isMobile: boolean = false,
) {
  // Navigate to the specified YouTube page
  await page.goto(url);

  // Wait for the page to load
  try {
    await page.waitForLoadState("networkidle", { timeout: 5000 });
  } catch {
    // empty
  }
  // .waitForLoadState("networkidle" is not always right so wait 5 extra seconds
  await page.waitForTimeout(5000);

  // If for whatever reason we are not logged in, then fail the test
  expect(await findLoginButton(page, browserNameWithExtensions, isMobile)).toBe(
    null,
  );

  // When chromium we need to wait some extra time to allow adds to be removed by uBlock Origin Lite
  // Ads are allowed to load and removed after so it takes time
  if (browserNameWithExtensions === "chromium") {
    await page.waitForTimeout(5000);
  }
}
