import { defineConfig, devices, test as base } from "@playwright/test";

export type TestOptions = {
  browserNameWithExtensions: string;
  allBrowserNameWithExtensions: string[];
  localeString: string;
  allLocaleStrings: string[];
};

export const test = base.extend<TestOptions>({
  // Define an option and provide a default value.
  browserNameWithExtensions: ["John", { option: true }],
  allBrowserNameWithExtensions: [["John"], { option: true }],
  localeString: ["John", { option: true }],
  allLocaleStrings: [["John"], { option: true }],
});

export default defineConfig<TestOptions>({
  timeout: 2 * 60 * 1000,
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry 3 times on CI, or once locally */
  retries: process.env.CI ? 5 : 1,
  /* Limit parallel workers on CI as they cause random failures some of the times */
  workers: process.env.CI ? 3 : undefined,
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
    // Desktop Chrome
    {
      name: "setup-auth-and-ublock-chromium",
      testMatch: /.*setup\.spec\.ts/,
      use: {
        allBrowserNameWithExtensions: ["chromium"],
        allLocaleStrings: ["ru-RU", "th-TH"],
        isMobile: false,
      },
    },
    {
      name: "chromium-extension-ru-RU",
      testMatch: /.*extension\.spec\.ts/,
      use: {
        browserNameWithExtensions: "chromium",
        localeString: "ru-RU",
        ...devices["Desktop Chrome"],
        isMobile: false,
        contextOptions: {
          // Load the extension from the app directory
          permissions: ["clipboard-read", "clipboard-write"],
        },
        launchOptions: {
          args: ["--headless=new"],
        },
        locale: "ru-RU",
      },
      dependencies: ["setup-auth-and-ublock-chromium"],
    },
    {
      name: "chromium-extension-extra-th-TH",
      testMatch: /.*extension\.extra\.spec\.ts/,
      use: {
        browserNameWithExtensions: "chromium",
        localeString: "th-TH",
        ...devices["Desktop Chrome"],
        isMobile: false,
        contextOptions: {
          // Load the extension from the app directory
          permissions: ["clipboard-read", "clipboard-write"],
        },
        launchOptions: {
          args: ["--headless=new"],
        },
        locale: "th-TH",
      },
      dependencies: ["setup-auth-and-ublock-chromium"],
    },

    // Desktop Firefox
    {
      name: "setup-auth-and-ublock-firefox",
      testMatch: /.*setup\.spec\.ts/,
      use: {
        allBrowserNameWithExtensions: ["firefox"],
        allLocaleStrings: ["ru-RU", "th-TH"],
        isMobile: false,
      },
    },
    {
      name: "firefox-extension-ru-RU",
      testMatch: /.*extension\.spec\.ts/,
      use: {
        browserNameWithExtensions: "firefox",
        localeString: "ru-RU",
        ...devices["Desktop Firefox"],
        isMobile: false,
        contextOptions: {},
        launchOptions: {
          args: ["--headless=new"],
        },
        locale: "ru-RU",
      },
      dependencies: ["setup-auth-and-ublock-firefox"],
    },
    {
      name: "firefox-extension-extra-th-TH",
      testMatch: /.*extension\.extra\.spec\.ts/,
      use: {
        browserNameWithExtensions: "firefox",
        localeString: "th-TH",
        ...devices["Desktop Firefox"],
        isMobile: false,
        contextOptions: {},
        launchOptions: {
          args: ["--headless=new"],
        },
        locale: "th-TH",
      },
      dependencies: ["setup-auth-and-ublock-firefox"],
    },

    // Mobile Chrome
    {
      name: "setup-auth-and-ublock-mobile",
      testMatch: /.*setup\.spec\.ts/,
      use: {
        ...devices["Pixel 5"],
        allBrowserNameWithExtensions: ["chromium"],
        allLocaleStrings: ["ru-RU", "th-TH"],
      },
    },
    {
      name: "chromium-extension-mobile-ru-RU",
      testMatch: /.*extension-mobile\.spec\.ts/,
      use: {
        browserNameWithExtensions: "chromium",
        localeString: "ru-RU",
        ...devices["Pixel 5"],
        isMobile: true,
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        launchOptions: {
          args: ["--headless=new"],
        },
        locale: "ru-RU",
      },
      dependencies: ["setup-auth-and-ublock-mobile"],
    },
    {
      name: "chromium-extension-mobile-extra-th-TH",
      testMatch: /.*extension-mobile\.extra\.spec\.ts/,
      use: {
        browserNameWithExtensions: "chromium",
        localeString: "th-TH",
        ...devices["Pixel 5"],
        isMobile: true,
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
        launchOptions: {
          args: ["--headless=new"],
        },
        locale: "th-TH",
      },
      dependencies: ["setup-auth-and-ublock-mobile"],
    },
  ],
});
