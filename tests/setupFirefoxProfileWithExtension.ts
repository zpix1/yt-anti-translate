import fs from "fs";
import path from "path";
import archiver from "archiver";
import fse from "fs-extra";
import { firefox, BrowserContext } from "playwright";

interface SetupOptions {
  extensionPath: string;      // Absolute path to your unpacked extension folder
  profilePath: string;        // Path to generate the Firefox profile
  extensionId: string;        // Gecko extension ID from manifest.json
}

export async function setupFirefoxProfileWithExtension(options: SetupOptions): Promise<BrowserContext> {
  const { extensionPath, profilePath, extensionId } = options;

  const extensionsDir = path.join(profilePath, "extensions");
  const userJsPath = path.join(profilePath, "user.js");
  const xpiPath = path.join(extensionsDir, `${extensionId}.xpi`);

  // Clean and recreate profile directory
  fse.removeSync(profilePath);
  fse.ensureDirSync(extensionsDir);

  // Step 1: Package the extension folder into a .xpi (ZIP) file
  await zipDirectory(extensionPath, xpiPath);

  // Step 2: Write user.js to enable unsigned extensions
  const userPrefs = `
user_pref("xpinstall.signatures.required", false);
user_pref("extensions.install.requireBuiltInCerts", false);
user_pref("extensions.autoDisableScopes", 0);
user_pref("extensions.enabledScopes", 15);
user_pref("extensions.allowPrivateBrowsingByDefault", true);
user_pref("extensions.logging.enabled", true);
user_pref("devtools.chrome.enabled", true);
user_pref("devtools.debugger.remote-enabled", true);
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("browser.tabs.warnOnClose", false);
`.trim();

  fs.writeFileSync(userJsPath, userPrefs);

  // Step 3: Launch Firefox with the profile
  const context = await firefox.launchPersistentContext(profilePath, {
    headless: false,
  });
  
  // Add at the end of setupFirefoxProfileWithExtension
  console.log("\n🗂 Firefox profile contents:");
  logDirectoryContents(profilePath);

  return context;
}

// Helper: Zip the extension folder into a .xpi file
async function zipDirectory(sourceDir: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

function logDirectoryContents(dirPath: string, prefix: string = ""): void {
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      console.log(`${prefix}📁 ${item}/`);
      logDirectoryContents(fullPath, prefix + "  ");
    } else {
      console.log(`${prefix}📄 ${item}`);
    }
  }
}

