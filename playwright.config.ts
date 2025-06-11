import { defineConfig, devices, test as base } from "@playwright/test";

// Timeout Settings
const defaultTimeoutMultiplier: number = 1;
const ciTimeoutMultiplier: number = 2;
const basePageTimeoutMs: number = 15000;
const networkIdleTimeoutMs: number = 5000;
const defaultPageTimeoutMs: number = process.env.CI
  ? basePageTimeoutMs * ciTimeoutMultiplier
  : basePageTimeoutMs * defaultTimeoutMultiplier;

export type TestOptions = {
  browserNameWithExtensions: string;
  allBrowserNameWithExtensions: string[];
  localeString: string;
  allLocaleStrings: string[];
  defaultTimeoutMs: number;
  defaultNetworkIdleTimeoutMs: number;
};

export const test = base.extend<TestOptions>({
  // Define an option and provide a default value.
  browserNameWithExtensions: ["John", { option: true }],
  allBrowserNameWithExtensions: [["John"], { option: true }],
  localeString: ["John", { option: true }],
  allLocaleStrings: [["John"], { option: true }],
  defaultTimeoutMs: [defaultPageTimeoutMs, { option: true }],
  defaultNetworkIdleTimeoutMs: [networkIdleTimeoutMs, { option: true }],
});

export default defineConfig<TestOptions>({
  timeout: 960_000,
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry 3 times on CI, or once locally */
  retries: process.env.CI ? 3 : 0,
  /* Limit parallel workers on CI as they cause random failures some of the times */
  workers: process.env.CI ? 5 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [["github"], ["html"]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "setup-auth-and-ublock",
      testMatch: /.*setup\.spec\.ts/,
      use: {
        allBrowserNameWithExtensions: ["chromium", "chromium-edge", "firefox"],
        allLocaleStrings: ["ru-RU", "th-TH"],
      },
    },
    {
      name: "chromium-extension-ru-RU",
      testMatch: /.*extension\.spec\.ts/,
      use: {
        browserNameWithExtensions: "chromium",
        localeString: "ru-RU",
        ...devices["Desktop Chrome"],
        contextOptions: {
          // Load the extension from the app directory
          permissions: ["clipboard-read", "clipboard-write"],
        },
        launchOptions: {
          args: ["--headless=new"],
        },
        locale: "ru-RU",
      },
      dependencies: ["setup-auth-and-ublock"],
    },
    {
      name: "edge-extension-ru-RU",
      testMatch: /.*extension\.spec\.ts/,
      use: {
        browserNameWithExtensions: "chromium-edge",
        localeString: "ru-RU",
        ...devices["Desktop Edge"],
        channel: "msedge",
        contextOptions: {
          // Load the extension from the app directory
          permissions: ["clipboard-read", "clipboard-write"],
        },
        launchOptions: {
          args: ["--headless=new"],
        },
        locale: "ru-RU",
      },
      dependencies: ["setup-auth-and-ublock"],
    },
    {
      name: "firefox-extension-ru-RU",
      testMatch: /.*extension\.spec\.ts/,
      use: {
        browserNameWithExtensions: "firefox",
        localeString: "ru-RU",
        ...devices["Desktop Firefox"],
        contextOptions: {},
        launchOptions: {
          args: ["--headless=new"],
        },
        locale: "ru-RU",
      },
      dependencies: ["setup-auth-and-ublock"],
    },
    {
      name: "chromium-extension-extra-th-TH",
      testMatch: /.*extension\.extra\.spec\.ts/,
      use: {
        browserNameWithExtensions: "chromium",
        localeString: "th-TH",
        ...devices["Desktop Chrome"],
        contextOptions: {
          // Load the extension from the app directory
          permissions: ["clipboard-read", "clipboard-write"],
        },
        launchOptions: {
          args: ["--headless=new"],
        },
        locale: "th-TH",
      },
      dependencies: ["setup-auth-and-ublock"],
    },
    {
      name: "edge-extension-extra-th-TH",
      testMatch: /.*extension\.extra\.spec\.ts/,
      use: {
        browserNameWithExtensions: "chromium-edge",
        localeString: "th-TH",
        ...devices["Desktop Edge"],
        channel: "msedge",
        contextOptions: {
          // Load the extension from the app directory
          permissions: ["clipboard-read", "clipboard-write"],
        },
        launchOptions: {
          args: ["--headless=new"],
        },
        locale: "th-TH",
      },
      dependencies: ["setup-auth-and-ublock"],
    },
    {
      name: "firefox-extension-extra-th-TH",
      testMatch: /.*extension\.extra\.spec\.ts/,
      use: {
        browserNameWithExtensions: "firefox",
        localeString: "th-TH",
        ...devices["Desktop Firefox"],
        contextOptions: {},
        launchOptions: {
          args: ["--headless=new"],
        },
        locale: "th-TH",
      },
      dependencies: ["setup-auth-and-ublock"],
    },
  ],
});
