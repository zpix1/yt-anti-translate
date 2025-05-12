import fs from 'fs';
import path from 'path';
import https from 'https';
import unzipper from 'unzipper';

// Define the source and destination directories
const srcDir = path.join(__dirname, '../app');
const destDir = path.join(__dirname, 'testDist');

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
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir);
    console.log('Created testDist directory');
  }

  // Copy all files from ../app to testDist
  copyFiles(srcDir, destDir);
  console.log('Files copied successfully!');

  // Modify the start.js file after copying
  if (configObject) {
    const startJsPath = path.join(destDir, 'src', 'content_start.js');
    modifyStartJs(startJsPath, configObject);
  }
}

/**
 * Downloads and extracts the uBlock Origin extension from Mozilla Add-ons,
 * unless the correct version is already present.
 */
export function downloadAndExtractUBlock() {
  const xpiUrl = 'https://addons.mozilla.org/firefox/downloads/file/4458450/ublock_origin-1.63.2.xpi';
  const expectedVersion = '1.63.2';
  const destDir = path.join(__dirname, 'testUBlockOrigin');
  const manifestPath = path.join(destDir, 'manifest.json');

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
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log('Created testUBlockOrigin directory');
  }

  console.log('Downloading uBlock Origin XPI...');

  https.get(xpiUrl, (response) => {
    if (response.statusCode !== 200) {
      console.error(`Download failed with status code: ${response.statusCode}`);
      return;
    }

    response
      .pipe(unzipper.Extract({ path: destDir }))
      .on('close', () => {
        console.log('uBlock Origin extracted successfully!');
      })
      .on('error', (err) => {
        console.error('Extraction failed:', err);
      });
  }).on('error', (err) => {
    console.error('Download failed:', err);
  });

  wait(7000);
}

function wait(ms) {
  var start = new Date().getTime();
  var end = start;
  while (end < start + ms) {
    end = new Date().getTime();
  }
}