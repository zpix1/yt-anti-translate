import path from "node:path";
import { dirname } from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const authFileLocationBase = path.join(__dirname, "../../playwright/.auth/");
const cryptAuthFileLocationBase = path.join(
  __dirname,
  "../../playwright/.crypt.auth/",
);

function getEncryptionPassword() {
  const user = process.env.GOOGLE_USER || "";
  const pwd = process.env.GOOGLE_PWD || "";
  const otp = process.env.GOOGLE_OTP_SECRET || "";
  return `${user}${pwd}${otp}`;
}

function encryptBuffer(buffer: Buffer, password: string): Buffer {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  // Store salt and iv with encrypted data
  return Buffer.concat([salt, iv, encrypted]);
}

function decryptBuffer(encryptedBuffer: Buffer, password: string): Buffer {
  const salt = encryptedBuffer.subarray(0, 16);
  const iv = encryptedBuffer.subarray(16, 32);
  const encrypted = encryptedBuffer.subarray(32);
  const key = crypto.scryptSync(password, salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export function encryptAuthFile(browserName: string, filename: string): void {
  const password = getEncryptionPassword();
  if (!password || password.length === 0) {
    console.error(`[AuthStorage] Encryption password is not set`);
    return;
  }

  if (!fs.existsSync(authFileLocationBase)) {
    console.error(
      `[AuthStorage] .auth directory does not exist: ${authFileLocationBase}`,
    );
    return;
  }

  // Read the original file
  const filePath = path.join(authFileLocationBase, browserName, filename);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    console.warn(
      `[AuthStorage] File does not exist or is not a file: ${filePath}`,
    );
    return;
  }
  const buffer = fs.readFileSync(filePath);

  // Encrypt and write to .crypt.auth
  const cryptAuthBrowserDir = path.join(cryptAuthFileLocationBase, browserName);
  if (!fs.existsSync(cryptAuthBrowserDir)) {
    fs.mkdirSync(cryptAuthBrowserDir, { recursive: true });
  }
  const encrypted = encryptBuffer(buffer, password);
  const cryptFilePath = path.join(cryptAuthBrowserDir, filename + ".enc");
  fs.writeFileSync(cryptFilePath, encrypted);

  console.log(`[AuthStorage] Encrypted ${filename} -> ${cryptFilePath}`);
}

export function decryptAuthFile(browserName: string, filename: string): void {
  const password = getEncryptionPassword();
  if (!password || password.length === 0) {
    console.error(`[AuthStorage] Encryption password is not set`);
    return;
  }

  const cryptFilePath = path.join(
    cryptAuthFileLocationBase,
    browserName,
    filename + ".enc",
  );
  if (!fs.existsSync(cryptFilePath)) {
    console.warn(
      `[AuthStorage] File does not exist or is not a file: ${cryptFilePath}`,
    );
    return;
  }
  const stats = fs.statSync(cryptFilePath);
  const modifiedTime = new Date(stats.mtime);
  const now = new Date();
  const ageInMonths =
    (now.getTime() - modifiedTime.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (ageInMonths > 3) {
    console.warn(`[AuthStorage] File is older than 3 months: ${cryptFilePath}`);
    return;
  }
  const decryptedFilePath = path.join(
    authFileLocationBase,
    browserName,
    filename,
  );
  if (fs.existsSync(decryptedFilePath)) {
    console.log(
      `[AuthStorage] Decrypted file already exists: ${decryptedFilePath}`,
    );
    return;
  }
  const encryptedBuffer = fs.readFileSync(cryptFilePath);
  const decryptedBuffer = decryptBuffer(encryptedBuffer, password);
  const decryptedDir = path.dirname(decryptedFilePath);
  if (!fs.existsSync(decryptedDir)) {
    fs.mkdirSync(decryptedDir, { recursive: true });
  }
  fs.writeFileSync(decryptedFilePath, decryptedBuffer);
  console.log(`[AuthStorage] Decrypted file created: ${decryptedFilePath}`);
}
