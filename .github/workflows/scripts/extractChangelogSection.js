import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

function extractChangelogSection() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const changelogPath = path.resolve(__dirname, "../../../CHANGELOG.md");
  const version = process.env.VERSION;

  if (!version) {
    throw new Error("❌ VERSION environment variable is not set.");
  }

  if (!fs.existsSync(changelogPath)) {
    throw new Error(`❌ CHANGELOG.md not found at ${changelogPath}`);
  }

  const changelog = fs.readFileSync(changelogPath, "utf-8");
  const lines = changelog.split("\n");

  const startLineIndex = lines.findIndex((line) =>
    line.startsWith(`## [${version}]`),
  );
  if (startLineIndex === -1) {
    throw new Error(
      `❌ Could not find changelog section for version ${version}`,
    );
  }

  let endLineIndex = lines
    .slice(startLineIndex + 1)
    .findIndex((line) => line.startsWith("## ["));
  if (endLineIndex === -1) {
    endLineIndex = lines.length;
  } else {
    endLineIndex = startLineIndex + 1 + endLineIndex;
  }

  const extracted = lines
    .slice(startLineIndex + 1, endLineIndex)
    .join("\n")
    .trim();

  return extracted;
}

const /** @type {string} */ changelogSection = extractChangelogSection();
console.log(changelogSection);
