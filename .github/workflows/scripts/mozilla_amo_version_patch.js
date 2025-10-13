import jwt from "jsonwebtoken";
import "dotenv/config";

async function getDraftReleaseBody(name) {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;

  const res = await fetch(`https://api.github.com/repos/${repo}/releases`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch releases: ${res.statusText}`);
  }

  const releases = await res.json();
  const versionRelease = releases.find((r) => r.name.includes(name));
  console.log(versionRelease);
  const draftRelease = releases.find((r) => r.draft);
  console.log(draftRelease);
  if (!draftRelease) {
    throw new Error("No draft release found for the specified version.");
  }
  return draftRelease.body;
}

const version = `${process.env.VERSION}`;

console.log(`[INFO] Getting latest draft release body...`);
const draftReleaseBody = await getDraftReleaseBody(version);

let [versionReleaseNotes, notesForApprovers] = draftReleaseBody.split(
  "\r\n---\r\n",
) || ["", ""];
if (!notesForApprovers || notesForApprovers === "") {
  [versionReleaseNotes, notesForApprovers] = draftReleaseBody.split(
    "\n---\n",
  ) || ["", ""];
}

const issuedAt = Math.floor(Date.now() / 1000);
const payload = {
  iss: `${process.env.AMO_JWT_ISSUER}`,
  jti: Math.random().toString(),
  iat: issuedAt,
  exp: issuedAt + 60,
};
const secret = `${process.env.AMO_JWT_SECRET}`;
const token = jwt.sign(payload, secret, { algorithm: "HS256" });

const slug = `${process.env.EXTENSION_SLUG}`;

const data = {
  compatibility: {
    firefox: { min: "109.0", max: "*" },
    android: { min: "120.0", max: "*" },
  },
  approval_notes: `${notesForApprovers}`,
  release_notes: {
    "en-US": `${versionReleaseNotes}`,
  },
};

(async () => {
  try {
    console.log(
      `[INFO] Sending PATCH request to AMO API... PATCH https://addons.mozilla.org/api/v5/addons/addon/${slug}/versions/${version}/`,
    );

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
