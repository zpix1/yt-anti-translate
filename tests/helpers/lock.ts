/* eslint-disable  @typescript-eslint/no-explicit-any */

import fs from "fs/promises";
import path from "path";

export type LockOptions = {
  retryDelayMs?: number;
  timeoutMs?: number;
  staleThresholdMs?: number;
};

const DEFAULTS = {
  retryDelayMs: 500,
  timeoutMs: 5 * 60 * 1000, // 5 minutes
  staleThresholdMs: 30 * 60 * 1000, // 30 minutes
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Acquire a simple filesystem lock (atomic create of a lock file).
 * Returns a release function that removes the lock.
 */
export async function acquireLock(
  name: string,
  opts?: LockOptions,
): Promise<() => Promise<void>> {
  const { retryDelayMs, timeoutMs, staleThresholdMs } = {
    ...DEFAULTS,
    ...(opts ?? {}),
  };
  const lockDir = path.resolve(process.cwd(), "tmp", "locks");
  await fs.mkdir(lockDir, { recursive: true });
  const lockPath = path.join(lockDir, `${name}.lock`);

  const start = Date.now();
  while (true) {
    try {
      // 'wx' fails if file exists -> atomic creation
      const fh = await fs.open(lockPath, "wx");
      const content = JSON.stringify({ pid: process.pid, created: Date.now() });
      await fh.writeFile(content);
      await fh.close();

      // release function
      let released = false;
      return async () => {
        if (released) {
          return;
        }
        released = true;
        try {
          await fs.unlink(lockPath);
        } catch {
          /* ignore */
        }
      };
    } catch (err: any) {
      // someone else holds the lock
      if (err?.code !== "EEXIST") {
        throw err;
      }

      // if lock file looks stale (old mtime), remove it and retry
      try {
        const stat = await fs.stat(lockPath);
        const age = Date.now() - stat.mtimeMs;
        if (age > staleThresholdMs) {
          // try to remove stale lock and loop to acquire
          try {
            await fs.unlink(lockPath);
            continue;
          } catch {
            // can't remove it -> just wait
          }
        }
      } catch {
        // stat failed, just wait and retry
      }

      if (Date.now() - start > timeoutMs) {
        throw new Error(
          `Timeout acquiring lock "${name}" after ${timeoutMs} ms`,
        );
      }
      await sleep(retryDelayMs);
    }
  }
}
