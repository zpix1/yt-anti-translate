import fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';
import https from 'https';
import { pipeline } from 'stream';
import { promisify } from 'util';

const crx = require("crx-util");
const streamPipeline = promisify(pipeline);

// Define the source and destination directories
const srcDirExtension = path.join(__dirname, '../app');
const destDirExtension = path.join(__dirname, 'testDist');

/** Function to copy files and directories recursively
 * @param {JSON} configObject - The object to be passed and inserted into the start.js file to set the chome.storage settings
 **/
export function handleTestDistribution(configObject) {
  //Function to copy files and directories recursively
  function copyFiles(src: string, dest: string) {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
      // If it's a directory, create the directory in the destination
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }

      // Copy all files inside the current directory
      const files = fs.readdirSync(src);
      for (const file of files) {
        copyFiles(path.join(src, file), path.join(dest, file));
      }
    } else if (stats.isFile()) {
      // If it's a file, copy it to the destination
      fs.copyFileSync(src, dest);
    }
  }

  // Function to modify the start.js file in testDist/src
  const modifyStartJs = (filePath: string, storageObject: object) => {
    // Ensure the file exists before modifying
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');

      // Convert the object to a string that can be used in the JavaScript code
      const storageObjectString = JSON.stringify(storageObject);

      // Create the line to be inserted at the beginning of the file
      const newLine = `chrome.storage.sync.set(${storageObjectString});\n`;

      // Add the line to the beginning of the file
      const modifiedData = newLine + data;

      // Write the modified content back to the file
      fs.writeFileSync(filePath, modifiedData, 'utf-8');
      console.log('content_start modified successfully!');
    } else {
      console.log('content_start not found!');
    }
  };

  // Create the testDist directory if it doesn't exist
  if (!fs.existsSync(destDirExtension)) {
    fs.mkdirSync(destDirExtension);
    console.log('Created testDist directory');
  }

  // Copy all files from ../app to testDist
  copyFiles(srcDirExtension, destDirExtension);
  console.log('Files copied successfully!');

  // Modify the start.js file after copying
  if (configObject) {
    const startJsPath = path.join(destDirExtension, 'src', 'content_start.js');
    modifyStartJs(startJsPath, configObject);
  }
}

/**
 * Downloads and extracts the uBlock Origin extension from Mozilla Add-ons,
 * unless the correct version is already present.
 */
export async function downloadAndExtractUBlock(browserName) {
  let uBlockUri, expectedVersion, destDirUBlock;
  switch (browserName) {
    case "chromium":
      //To get the following url if it changes you can do a `curl 'https://clients2.google.com/service/update2/crx?response=redirect&os=win&arch=x86-64&os_arch=x86-64&nacl_arch=x86-64&prod=chromiumcrx&prodchannel=unknown&prodversion=9999.0.9999.0&acceptformat=crx2,crx3&x=id%3Dddkjiahejlhfcafbddmgiahcphecmpfh%26uc'`
      //and copy the redirect URL to the file
      uBlockUri = `https://clients2.googleusercontent.com/crx/blobs/AR5vvToUznjd4HPtq2Qf2ofykf5cygX6Wm7Q7cmg2zGc61WE49beD-vBuuew0okjXIj8lJ8TJMfGenI2Dg8DAJT_dNWWaFrSeW5UApwk5Nxh05G5vVNqQYKOcrQeYkJ2fxBgAMZSmuWEL6hqLeWkBX6RZY0yRQi9IjkaXg/DDKJIAHEJLHFCAFBDDMGIAHCPHECMPFH_2025_512_1008_0.crx`
      expectedVersion = '2025.512.1008'
      destDirUBlock = path.join(__dirname, 'testUBlockOriginLite');
      break
    case "firefox":
      uBlockUri = 'https://addons.mozilla.org/firefox/downloads/file/4458450/ublock_origin-1.63.2.xpi';
      expectedVersion = '1.63.2';
      destDirUBlock = path.join(__dirname, 'testUBlockOrigin');
      break;
    default:
      throw "Unsupported browserName"
  }

  const manifestPath = path.join(destDirUBlock, 'manifest.json');

  // Check if manifest.json exists and has the expected version
  if (fs.existsSync(manifestPath)) {
    try {
      const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (manifestData.version === expectedVersion) {
        console.log(`uBlock Origin version ${expectedVersion} already extracted.`);
        return;
      } else {
        console.log(`Version mismatch. Expected ${expectedVersion}, found ${manifestData.version}. Re-downloading...`);
      }
    } catch (err) {
      console.warn('Failed to parse existing manifest.json. Re-downloading...', err);
    }
  } else {
    console.log('No manifest.json found. Proceeding with download.');
  }

  // Ensure destination directory exists
  if (!fs.existsSync(destDirUBlock)) {
    fs.mkdirSync(destDirUBlock, { recursive: true });
    console.log('Created testUBlockOrigin directory');
  }

  console.log('Downloading uBlock...');

  try {
    await new Promise<void>((resolve, reject) => {
      https.get(uBlockUri, async (response) => {
        if (response.statusCode !== 200) {
          console.error(`Download failed with status code: ${response.statusCode}`);
          return;
        }

        try {
          switch (browserName) {
            case "chromium":
              const crxPath = path.join(destDirUBlock, 'ublock.crx');
              const crxfile = fs.createWriteStream(crxPath);

              await streamPipeline(response, crxfile);
              console.log('Download finished, extracting CRX...');

              await crx.parser.extract(crxPath, destDirUBlock);
              console.log('uBlock Origin extracted successfully!');

              const backgroundJsPath = path.join(destDirUBlock, 'js', 'background.js');
              const appendCode = `
              setDefaultFilteringMode(3).then(() => {
                updateDynamicRules()
                registerInjectables()
              })
              `;

              if (fs.existsSync(backgroundJsPath)) {
                try {
                  fs.appendFileSync(backgroundJsPath, appendCode, 'utf-8');
                  console.log('Appended custom init code to background.js');
                } catch (err) {
                  console.warn('Failed to append to background.js:', err);
                }
              } else {
                console.warn('background.js not found — skipping injection');
              }
              break;
            case "firefox":
              await streamPipeline(
                response,
                unzipper.Extract({ path: destDirUBlock })
              );
              console.log('uBlock Origin extracted successfully!');
              break;
            default:
              throw "Unsupported browserName"
          }

          resolve();
        }
        catch (err) {
          reject(err);
        }


      }).on('error', (err) => {
        console.error('Download failed:', err);
      });
    });
  }
  catch (err) {
    console.error('Download or extraction failed:', err);
  }
}