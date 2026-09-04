import {
  firefox,
  chromium,
  BrowserContext,
  Browser,
  TestInfo,
  Page,
  devices,
  Locator,
} from "@playwright/test";
import path, { dirname } from "node:path";
import { withExtension } from "playwright-webextext";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  if (testInfo.retry > 0) {
    console.log(
      "retrying test",
      testInfo.title,
      "with a fresh browser context",
    );
  }

  const context = await createBrowserContext(
    browserNameWithExtensions,
    extensionPath,
    isMobile,
  );

  const { page, consoleMessageCountContainer } = await setupPage(
    context,
    localeString,
  );

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

// Helper function to set up an unauthenticated page in the requested locale
export async function setupPage(
  context: BrowserContext | Browser,
  localeString: string,
) {
  const page = await context.newPage();
  const youtubeLocale = localeString.split("-")[0];
  await page.context().addCookies([
    {
      name: "PREF",
      value: `hl=${youtubeLocale}`,
      domain: ".youtube.com",
      path: "/",
      secure: true,
      sameSite: "Lax",
    },
  ]);

  // Set up console message counting
  const consoleMessageCountContainer = { count: 0 };
  page.on("console", () => {
    consoleMessageCountContainer.count++;
  });

  return { page, consoleMessageCountContainer };
}

// Helper function for common page loading. Kept under its existing name to
// avoid churn in callers now that tests intentionally run without authentication.
export async function loadPageAndVerifyAuth(
  page: Page,
  url: string,
  browserNameWithExtensions: string,
  isMobile: boolean = false,
) {
  // Navigate to the specified YouTube page
  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Wait for the page to load
  try {
    await page.waitForTimeout(process.env.CI ? 375 : 250);
    await page.waitForLoadState("networkidle", {
      timeout: process.env.CI ? 7500 : 5000,
    });
  } catch {
    // empty
  }
  // .waitForLoadState("networkidle" is not always right so wait 5 extra seconds
  await page.waitForTimeout(process.env.CI ? 7500 : 5000);

  // When chromium we need to wait some extra time to allow adds to be removed by uBlock Origin Lite
  // Ads are allowed to load and removed after so it takes time
  if (
    (url.includes("/watch?v") ||
      url.includes("/shorts/") ||
      url.includes("/embed/")) &&
    (browserNameWithExtensions === "chromium" || isMobile)
  ) {
    await page.waitForTimeout(process.env.CI ? 9000 : 6000);
  } else {
    await page.waitForTimeout(process.env.CI ? 1500 : 1000);
  }
}

export async function waitForSelectorOrRetryWithPageReload(
  page: Page,
  selector: string,
  state: "attached" | "detached" | "visible" | "hidden" = "visible",
  maxRetries: number = 2,
): Promise<Locator> {
  try {
    let attributedSelector;
    if (selector.includes(",")) {
      // multiple selectors, need to wrap in :is()
      attributedSelector = `:is(${selector})`;
    } else {
      attributedSelector = selector;
    }

    let locator;
    if (state === "visible" || state === "hidden") {
      locator = page.locator(`${attributedSelector}:${state}`);
      await locator.first().waitFor({ state });
    } else {
      locator = page.locator(attributedSelector);
      for (const elem of await locator.all()) {
        await elem.waitFor({ state });
        if (state === "attached") {
          // when state "attached", is enough to wait just one
          break;
        }
      }
    }
    await page.waitForTimeout(process.env.CI ? 7500 : 5000);
    return locator;
  } catch {
    if (maxRetries <= 0) {
      throw new Error(`Too many retries to find ${state} element: ${selector}`);
    }
    await page.reload();
    try {
      await page.waitForTimeout(process.env.CI ? 375 : 250);
      await page.waitForLoadState("networkidle", {
        timeout: process.env.CI ? 7500 : 5000,
      });
    } catch {
      // empty
    }
    return waitForSelectorOrRetryWithPageReload(
      page,
      selector,
      state,
      maxRetries - 1,
    );
  }
}

export async function waitForVisibleLocatorOrRetryWithPageReload(
  page: Page,
  locator: Locator,
  maxRetries: number = 2,
  allowNotFound: boolean = false,
): Promise<Locator> {
  try {
    const fistVisible = await getFirstVisibleLocator(locator);
    return fistVisible;
  } catch {
    if (maxRetries <= 0) {
      if (allowNotFound) {
        return locator;
      } else {
        throw new Error(`Too many retries to find locator: ${locator}`);
      }
    }
    await page.reload();
    try {
      await page.waitForTimeout(process.env.CI ? 375 : 250);
      await page.waitForLoadState("networkidle", {
        timeout: process.env.CI ? 7500 : 5000,
      });
    } catch {
      // empty
    }
    return waitForVisibleLocatorOrRetryWithPageReload(
      page,
      locator,
      maxRetries - 1,
      allowNotFound,
    );
  }
}

export async function getFirstVisibleLocator(
  locator: Locator,
  allowNotFound: boolean = false,
): Promise<Locator> {
  const elements: Locator[] = await locator.all();
  if (elements.length === 0) {
    if (allowNotFound) {
      return locator;
    }
  }
  let firstVisibleLocator: Locator | undefined = undefined;
  for (const element of elements) {
    if (await element.isVisible()) {
      firstVisibleLocator = element;
      break;
    }
  }

  if (!firstVisibleLocator) {
    if (allowNotFound) {
      return locator.first();
    } else {
      throw new Error(`No visible elements found for the locator: ${locator}`);
    }
  }

  return firstVisibleLocator;
}
