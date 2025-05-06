import fs from "fs";
import path from "path";
import fse from "fs-extra";
import { firefox, BrowserContext } from "playwright";

interface SetupOptions {
  extensionPath: string;      // Absolute path to your extension directory
  profilePath: string;        // Where to generate the profile (e.g. /tmp/firefox-profile)
  extensionId: string;        // Must match the "gecko.id" in your manifest.json
}

export async function setupFirefoxProfileWithExtension(options: SetupOptions): Promise<BrowserContext> {
  const { extensionPath, profilePath, extensionId } = options;

  const extensionsDir = path.join(profilePath, "extensions");
  const userJsPath = path.join(profilePath, "user.js");

  // Ensure clean profile directory
  fse.removeSync(profilePath);
  fse.ensureDirSync(extensionsDir);

  // Copy extension to extensions directory
  const targetExtensionDir = path.join(extensionsDir, extensionId);
  fse.copySync(extensionPath, targetExtensionDir);

  // Write user preferences
  const userPrefs = `
user_pref("xpinstall.signatures.required", false);
user_pref("devtools.chrome.enabled", true);
user_pref("devtools.debugger.remote-enabled", true);
user_pref("extensions.autoDisableScopes", 0);
user_pref("extensions.enabledScopes", 15);
user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);
  `.trim();

  fs.writeFileSync(userJsPath, userPrefs);

  // Launch Firefox with the prepared profile
  const context = await firefox.launchPersistentContext(profilePath, {
    headless: false,
    locale: "ru-RU",
  });

  return context;
}
