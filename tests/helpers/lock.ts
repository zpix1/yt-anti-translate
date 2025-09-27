import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCK_DIR = path.resolve(__dirname, ".locks");

export async function acquireLock(
  name: string,
  timeoutMs = 300000,
): Promise<() => void> {
  const file = path.join(LOCK_DIR, `${name}.lock`);
  fs.mkdirSync(LOCK_DIR, { recursive: true });
  const start = Date.now();

  while (true) {
    try {
      const pid = process.pid;
      const content = JSON.stringify({ pid, createdAt: Date.now() });
      fs.writeFileSync(file, content, { flag: "wx" }); // atomic create
      // success
      const release = () => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      };

      // cleanup on exit
      process.once("exit", release);
      process.once("SIGINT", () => {
        release();
        process.exit(1);
      });
      process.once("SIGTERM", () => {
        release();
        process.exit(1);
      });

      return release;
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== "EEXIST") {
        throw e;
      }

      // check if stale
      try {
        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        const pid: number = data.pid;
        const age = Date.now() - data.createdAt;
        if (!isProcessAlive(pid) || age > timeoutMs) {
          fs.unlinkSync(file);
          continue; // retry immediately
        }
      } catch {
        // corrupted lock file, remove
        fs.unlinkSync(file);
        continue;
      }

      // wait before retry
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Timeout waiting for lock: ${name}`);
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
