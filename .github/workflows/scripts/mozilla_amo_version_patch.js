import jwt from "jsonwebtoken";
import fetch from "node-fetch";
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

console.log(`[INFO] Getting latest commit SHA from main...`);
const commitSha = await getLatestCommitShaFromMain();

console.log(`[INFO] Generating release notes for commit ${commitSha}...`);
const releaseNotes = await getGitHubReleaseNotes(commitSha);

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
  approval_notes: `${releaseNotes}`,
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
