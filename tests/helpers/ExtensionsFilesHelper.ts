/* eslint-disable  @typescript-eslint/no-explicit-any */
import fs from "node:fs";
import path, { dirname } from "node:path";
import unzipper from "unzipper";
import https from "https";
import { pipeline } from "node:stream";
import { promisify } from "node:util";

import { fileURLToPath } from "node:url";

const streamPipeline = promisify(pipeline);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the source and destination directories
const srcDirExtension = path.join(__dirname, "../../app");
const destDirExtension = path.join(__dirname, "../testDist");

/** Function to copy files and directories recursively
 * @param {JSON} configObject - The object to be passed and inserted into the start.js file to set the chome.storage settings
 **/
export function handleTestDistribution(configObject: any) {
  //Function to copy files and directories recursively
  function copyFiles(src: string, dest: string) {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }

      const files = fs.readdirSync(src);
      for (const file of files) {
        copyFiles(path.join(src, file), path.join(dest, file));
      }
    } else if (stats.isFile()) {
      fs.copyFileSync(src, dest);
    }
  }

  // Function to modify the start.js file in testDist/src
  const modifyStartJs = (filePath: string, storageObject: object) => {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");

      const storageObjectString = JSON.stringify(storageObject);

      // Create the line to be inserted at the beginning of the file that will set the user options
      const newLine = `chrome.storage.sync.set(${storageObjectString});\n`;

      const modifiedData = newLine + data;
      fs.writeFileSync(filePath, modifiedData, "utf-8");
      console.log("content_start modified successfully!");
    } else {
      console.log("content_start not found!");
    }
  };

  if (!fs.existsSync(destDirExtension)) {
    fs.mkdirSync(destDirExtension);
    console.log("Created testDist directory");
  }

  copyFiles(srcDirExtension, destDirExtension);
  console.log("Files copied successfully!");

  // Modify the start.js file after copying
  if (configObject) {
    const startJsPath = path.join(destDirExtension, "src", "content_start.js");
    modifyStartJs(startJsPath, configObject);
  }
}

/**
 * Downloads and extracts the uBlock Origin extension from Mozilla Add-ons,
 * unless the correct version is already present.
 */
export async function downloadAndExtractUBlock(browserName: string) {
  let uBlockUri, expectedVersion, destDirUBlock;
  switch (browserName) {
    case "chromium":
      //To get the following url if it changes you can do a `curl 'https://clients2.google.com/service/update2/crx?response=redirect&os=win&arch=x86-64&os_arch=x86-64&nacl_arch=x86-64&prod=chromiumcrx&prodchannel=unknown&prodversion=9999.0.9999.0&acceptformat=crx2,crx3&x=id%3Dddkjiahejlhfcafbddmgiahcphecmpfh%26uc'`
      //and copy the redirect URL to the file
      uBlockUri = `https://clients2.googleusercontent.com/crx/blobs/AcLY-yTwGVsujPgeyaunSeAvdClIxMVRVx02e2MoF2O4ilPjLPJh1fv59Iz_8b0RSn0xY64R5swJVM3eYSWuV38pVy4d1sVAOHNc7hPbphjhEV-GQ8CI30vlyU93h7-yiiaGAMZSmuXJ8MiIWRYgzDrCdWjAYSuyGQHc1Q/DDKJIAHEJLHFCAFBDDMGIAHCPHECMPFH_2025_921_2008_0.crx`;
      expectedVersion = "2025.921.2008";
      destDirUBlock = path.join(__dirname, "../testUBlockOriginLite");
      break;
    case "firefox":
      uBlockUri =
        "https://addons.mozilla.org/firefox/downloads/file/4578681/ublock_origin-1.66.4.xpi";
      expectedVersion = "1.66.4";
      destDirUBlock = path.join(__dirname, "../testUBlockOrigin");
      break;
    default:
      throw "Unsupported browserName";
  }

  const manifestPath = path.join(destDirUBlock, "manifest.json");

  // Check if manifest.json exists and has the expected version
  if (fs.existsSync(manifestPath)) {
    try {
      const manifestData = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (manifestData.version === expectedVersion) {
        console.log(
          `uBlock Origin version ${expectedVersion} already extracted.`,
        );
        return;
      } else {
        console.log(
          `Version mismatch. Expected ${expectedVersion}, found ${manifestData.version}. Re-downloading...`,
        );
      }
    } catch (err) {
      console.warn(
        "Failed to parse existing manifest.json. Re-downloading...",
        err,
      );
    }
  } else {
    console.log("No manifest.json found. Proceeding with download.");
  }

  if (!fs.existsSync(destDirUBlock)) {
    fs.mkdirSync(destDirUBlock, { recursive: true });
    console.log("Created testUBlockOrigin directory");
  }

  console.log("Downloading uBlock...");

  try {
    await new Promise<void>((resolve, reject) => {
      https
        .get(uBlockUri, async (response) => {
          if (response.statusCode !== 200) {
            console.error(
              `Download failed with status code: ${response.statusCode}`,
            );
            return;
          }

          try {
            switch (browserName) {
              case "chromium": {
                const crxPath = path.join(destDirUBlock, "ublock.crx");
                const crxfile = fs.createWriteStream(crxPath);

                await streamPipeline(response, crxfile);
                console.log("Download finished, extracting CRX...");

                // Read .crx file and strip header
                // .crx v3 header: 4 bytes magic, 4 bytes version, 4 bytes header size, then header
                const crxBuffer = fs.readFileSync(crxPath);

                const magic = crxBuffer.subarray(0, 4).toString();
                if (magic !== "Cr24") {
                  throw new Error("Not a valid CRX file");
                }
                const version = crxBuffer.readUInt32LE(4);
                if (version !== 3) {
                  throw new Error("Only CRX3 is supported by this script");
                }
                const headerSize = crxBuffer.readUInt32LE(8);
                const zipStartOffset = 12 + headerSize;
                const zipBuffer = crxBuffer.subarray(zipStartOffset);
                const zipPath = path.join(destDirUBlock, "ublock_clean.zip");
                fs.writeFileSync(zipPath, zipBuffer);
                console.log("uBlock Origin converted to ZIP...");

                const crxFileStream = await unzipper.Open.file(zipPath);
                await crxFileStream.extract({ path: destDirUBlock });
                console.log("uBlock Origin extracted successfully!");

                // Clean up temp zip
                fs.unlinkSync(zipPath);

                const backgroundJsPath = path.join(
                  destDirUBlock,
                  "js",
                  "background.js",
                );
                const appendCode = `
              setDefaultFilteringMode(3).then(() => {
                updateDynamicRules()
                registerInjectables()
              })
              `;

                if (fs.existsSync(backgroundJsPath)) {
                  try {
                    fs.appendFileSync(backgroundJsPath, appendCode, "utf-8");
                    console.log("Appended custom init code to background.js");
                  } catch (err) {
                    console.warn("Failed to append to background.js:", err);
                  }
                } else {
                  console.warn("background.js not found — skipping injection");
                }
                break;
              }
              case "firefox": {
                await streamPipeline(
                  response,
                  unzipper.Extract({ path: destDirUBlock }),
                );
                console.log("uBlock Origin extracted successfully!");
                break;
              }
              default:
                throw "Unsupported browserName";
            }

            resolve();
          } catch (err) {
            reject(err);
          }
        })
        .on("error", (err) => {
          console.error("Download failed:", err);
        });
    });
  } catch (err) {
    console.error("Download or extraction failed:", err);
  }
}
