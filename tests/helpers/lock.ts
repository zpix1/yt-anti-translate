import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCK_DIR = path.resolve(__dirname, ".locks");
if (!fs.existsSync(LOCK_DIR)) {
  fs.mkdirSync(LOCK_DIR, { recursive: true });
}

const ACTIVE_LOCKS = new Set<string>();

function lockFilePath(name: string): string {
  return path.join(LOCK_DIR, `${name}.lock`);
}

function isProcessAlive(pid: number): boolean {
  try {
    // signal=0 does not kill, just checks
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function acquireLock(
  name: string,
  pollMs = 100,
  timeoutMs = 60_000,
): Promise<void> {
  const start = Date.now();
  const filePath = lockFilePath(name);

  while (true) {
    try {
      // Try to create file exclusively
      const fd = fs.openSync(filePath, "wx");
      fs.writeSync(fd, process.pid.toString());
      fs.closeSync(fd);

      ACTIVE_LOCKS.add(filePath);
      return; // success
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;

      if (e.code !== "EEXIST") {
        throw e; // unexpected error
      }

      // File already exists: check if stale
      try {
        const content = fs.readFileSync(filePath, "utf-8").trim();
        const pid = parseInt(content, 10);

        if (!Number.isNaN(pid) && !isProcessAlive(pid)) {
          // Stale lock -> remove and retry immediately
          fs.unlinkSync(filePath);
          continue;
        }
      } catch {
        // If reading fails, assume stale and remove
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore unlink errors
        }
        continue;
      }

      // Still held by a live process, wait and retry
      if (Date.now() - start > timeoutMs) {
        throw new Error(
          `Timeout acquiring lock "${name}" after ${timeoutMs}ms`,
        );
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
  }
}

export function releaseLock(name: string): void {
  const filePath = lockFilePath(name);

  if (ACTIVE_LOCKS.has(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore (file may have been cleaned already)
    }
    ACTIVE_LOCKS.delete(filePath);
  }
}

// Auto-cleanup when the process exits
function cleanupAll(): void {
  for (const filePath of ACTIVE_LOCKS) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore
    }
  }
  ACTIVE_LOCKS.clear();
}

process.on("exit", cleanupAll);
process.on("SIGINT", () => {
  cleanupAll();
  process.exit(1);
});
process.on("SIGTERM", () => {
  cleanupAll();
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  cleanupAll();
  throw err;
});
