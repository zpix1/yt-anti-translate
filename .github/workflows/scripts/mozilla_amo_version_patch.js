import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import "dotenv/config";

async function getLatestCommitShaFromMain() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;

  const url = `https://api.github.com/repos/${repo}/commits/main`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    throw new Error(
      `GitHub API (commits/main) error: HTTP ${res.status} ${await res.text()}`,
    );
  }

  const json = await res.json();
  return json.sha;
}

async function getGitHubReleaseNotes(commitSha) {
  const repo = process.env.GITHUB_REPOSITORY;
  const version = process.env.VERSION;
  const tag = `v${version}`;
  const token = process.env.GITHUB_TOKEN;

  const url = `https://api.github.com/repos/${repo}/releases/generate-notes`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({
      tag_name: tag,
      target_commitish: commitSha,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `GitHub API (generate-notes) error: HTTP ${res.status} ${await res.text()}`,
    );
  }

  const json = await res.json();
  return json.body; // Auto-generated release notes text
}

function extractChangelogSection() {
  const changelogPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "../../../CHANGELOG.md",
  );
  const version = process.env.VERSION;

  console.log(`📦 Extracting release notes for version: ${version}`);

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

console.log(`[INFO] Getting latest commit SHA from main...`);
const commitSha = await getLatestCommitShaFromMain();

console.log(`[INFO] Generating notes for approvers for commit ${commitSha}...`);
const notesForApprovers = await getGitHubReleaseNotes(commitSha);

console.log(
  `[INFO] Extracting release notes section for version ${process.env.VERSION}...`,
);
const versionReleaseNotes = extractChangelogSection();

const issuedAt = Math.floor(Date.now() / 1000);
const payload = {
  iss: `${process.env.AMO_JWT_ISSUER}`,
  jti: Math.random().toString(),
  iat: issuedAt,
  exp: issuedAt + 60,
};
const secret = `${process.env.AMO_JWT_SECRET}`;
const token = jwt.sign(payload, secret, { algorithm: "HS256" });

const version = `${process.env.VERSION}`;
const slug = `${process.env.EXTENSION_SLUG}`;

const data = {
  compatibility: {
    firefox: { min: "109.0", max: "*" },
    android: { min: "120.0", max: "*" },
  },
  approval_notes: `${notesForApprovers}`,
  release_notes: {
    en_US: `${versionReleaseNotes}`,
  },
};

(async () => {
  try {
    console.log(`[INFO] Sending PATCH request to AMO API...`);

    const res = await fetch(
      `https://addons.mozilla.org/api/v5/addons/addon/${slug}/versions/${version}/`,
      {
        method: "PATCH",
        headers: {
          Authorization: `JWT ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();
    console.log("[SUCCESS]", json);
  } catch (err) {
    console.error("[ERROR]", err.message);
  }
})();
