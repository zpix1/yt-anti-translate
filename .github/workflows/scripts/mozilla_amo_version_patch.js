import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import "dotenv/config";

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
