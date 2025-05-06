import fs from "fs";
import path from "path";
import archiver from "archiver";
import fse from "fs-extra";
import { firefox, BrowserContext } from "playwright";

interface SetupOptions {
  extensionPath: string;
  profilePath: string;
  extensionId: string;
}

export async function setupFirefoxProfileWithExtension(options: SetupOptions): Promise<BrowserContext> {
  const { extensionPath, profilePath, extensionId } = options;

  const extensionsDir = path.join(profilePath, "extensions");
  const userJsPath = path.join(profilePath, "user.js");
  const xpiPath = path.join(extensionsDir, `${extensionId}.xpi`);

  // Clean profile
  fse.removeSync(profilePath);
  fse.ensureDirSync(extensionsDir);

  // 1. Zip the extension
  await zipDirectory(extensionPath, xpiPath);
  if (!fs.existsSync(xpiPath)) {
    throw new Error(`Failed to create .xpi at: ${xpiPath}`);
  }

  console.log(`✅ Created XPI: ${xpiPath}`);

  // 2. Write Firefox preferences
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

  // Log file structure
  console.log("\n🗂 Firefox profile contents before launch:");
  logDirectoryContents(profilePath);

  // 3. Launch Firefox
  const context = await firefox.launchPersistentContext(profilePath, {
    headless: false,
    locale: "ru-RU",
  });

  return context;
}

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


