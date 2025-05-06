import fs from "fs";
import path from "path";
import fse from "fs-extra";
import { firefox, BrowserContext } from "playwright";
import { execa } from "execa";
import crypto from "crypto";

interface SetupOptions {
  extensionPath: string;
  profilePath: string;
  extensionId: string;
}

export async function setupFirefoxProfileWithExtension(options: SetupOptions): Promise<BrowserContext> {
  const { extensionPath, profilePath, extensionId } = options;

  const extensionsDir = path.join(profilePath, "extensions");
  const userJsPath = path.join(profilePath, "user.js");
  
  const cacheDir = path.resolve(".web-ext-cache");
  fse.ensureDirSync(cacheDir);

  const xpiCacheKey = getCacheKey(extensionPath);
  const cachedXpiPath = path.join(cacheDir, `${xpiCacheKey}.xpi`);

  // Check if we already have a signed XPI
  if (!fs.existsSync(cachedXpiPath)) {
    console.log("🔐 No cached signed XPI found. Signing extension...");
    const { stdout } = await execa("web-ext", [
      "sign",
      `--api-key="${ process.env.AMO_JWT_ISSUER }"`,
      `--api-secret="${ process.env.AMO_JWT_SECRET }"`,
      "--channel=unlisted",
      "--source-dir", extensionPath
    ]);
	

    const match = stdout.match(/"signedFile":"([^"]+\.xpi)"/);
    if (!match) {
      throw new Error("❌ Failed to find signed XPI path in web-ext output.");
    }

    const signedXpiPath = match[1].replace(/\\/g, "/");
    fse.copyFileSync(signedXpiPath, cachedXpiPath);
    console.log(`✅ Cached signed XPI: ${cachedXpiPath}`);
  } 
  else {
    console.log(`✅ Using cached signed XPI: ${cachedXpiPath}`);
  }

  // Clean profile
  fse.removeSync(profilePath);
  fse.ensureDirSync(extensionsDir);
    
  const destXpiPath = path.join(extensionsDir, `${extensionId}.xpi`);
  fse.copyFileSync(cachedXpiPath, destXpiPath);

  // 1. Write Firefox preferences
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
  
  // 2. Write Firefox extensions.json
  const extensionsJsonPath = path.join(profilePath, "extensions.json");

  const extensionsJson = {
    schemaVersion: 36,
    addons: [
      {
        id: extensionId,
        version: "1.0.0",
        type: "extension",
        manifestVersion: 3,
        defaultLocale: {
          name: "Dev Extension",
          description: "Loaded manually for testing",
          creator: "Dev"
        },
        visible: true,
        active: true,
        userDisabled: false,
        appDisabled: false,
        installDate: Date.now(),
        updateDate: Date.now(),
        applyBackgroundUpdates: 1,
        path: path.join("extensions", `${extensionId}.xpi`),
        skinnable: false,
        signedState: 0,
        seen: true,
        dependencies: [],
        incognito: "spanning",
        icons: {},
        blocklistState: 0,
        location: "app-profile",
        rootURI: `jar:file://${path.join(profilePath, "extensions", `${extensionId}.xpi`)}!/`,

        // 🔐 Permissions
        userPermissions: {
          permissions: ["storage", "tabs"],
          origins: []
        },
        optionalPermissions: {
          permissions: [],
          origins: ["*://*.youtube.com/*"]
        },
        requestedPermissions: {
          permissions: [],
          origins: ["*://*.youtube.com/*"]
        }
      }
    ]
  };

  fs.writeFileSync(extensionsJsonPath, JSON.stringify(extensionsJson, null, 2));
  console.log(`✅ Created extensions.json at ${extensionsJsonPath}`);

  // Log file structure
  console.log("\n🗂 Firefox profile contents before launch:");
  logDirectoryContents(profilePath);

  // 3. Launch Firefox
  process.env.MOZ_DISABLE_EXTENSION_SIGNING = "1";
  const context = await firefox.launchPersistentContext(profilePath, {
    headless: false,
    firefoxUserPrefs: {
      "xpinstall.signatures.required": false,
      "devtools.chrome.enabled": true,
      "devtools.debugger.remote-enabled": true,
    },
    locale: "ru-RU",
  });

  return context;
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

// Generate a hash of the extension directory contents
function getCacheKey(dir: string): string {
  const hash = crypto.createHash("sha256");
  const walk = (d: string) => {
    const entries = fs.readdirSync(d).sort();
    for (const entry of entries) {
      const fullPath = path.join(d, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else {
        hash.update(fs.readFileSync(fullPath));
      }
    }
  };
  walk(dir);
  return hash.digest("hex").slice(0, 16);
}