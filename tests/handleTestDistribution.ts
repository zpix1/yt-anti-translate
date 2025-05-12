import fs from 'fs';
import path from 'path';

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
      console.log('start.js modified successfully!');
    } else {
      console.log('start.js not found!');
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
    const startJsPath = path.join(destDir, 'src', 'start.js');
    modifyStartJs(startJsPath, configObject);
  }
}