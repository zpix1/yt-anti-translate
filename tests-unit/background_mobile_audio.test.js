import { describe, test, expect } from "vitest";
import {
  sync,
  globalJsCopy,
} from "../app/src/mobile-audio/background_mobile_audio.js";

describe("sync.sha1", () => {
  test("Check that sync.sha1 is identical to globalJsCopy.sha1Hash", async () => {
    let sapisid = "test_sapisid_1";
    let timestamp = Math.floor(Date.now() / 1000);
    let origin = "https://m.youtube.com";
    const message1 = `${timestamp} ${sapisid} ${origin}`;

    const expectedHash1_1 = await globalJsCopy.sha1Hash(message1);
    const expectedHash1_2 = await globalJsCopy.sha1Hash(message1);
    expect(expectedHash1_1).toBe(expectedHash1_2); //sanity check

    expect(sync.sha1(message1)).toBe(expectedHash1_1);

    sapisid = "test_sapisid_2";
    timestamp = Math.floor(Date.now() / 1000);
    origin = "https://www.youtube.com";
    const message2 = `${timestamp} ${sapisid} ${origin}`;

    const expectedHash2_1 = await globalJsCopy.sha1Hash(message2);
    const expectedHash2_2 = await globalJsCopy.sha1Hash(message2);
    expect(expectedHash2_1).toBe(expectedHash2_2); //sanity check

    expect(sync.sha1(message2)).toBe(expectedHash2_1);
  });
});
