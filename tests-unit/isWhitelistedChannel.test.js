import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Side-effect import that registers the util object on window
import "../app/src/global.js";

const isWhitelistedChannel =
  window.YoutubeAntiTranslate.isWhitelistedChannel.bind(
    window.YoutubeAntiTranslate,
  );

describe("YoutubeAntiTranslate.isWhitelistedChannel", () => {
  let origGetSettings;
  let origGetChannelBrandingWithYoutubeI;
  let origLookupChannelId;
  let origLogInfo;
  let origLogDebug;
  let origLogWarning;

  beforeEach(() => {
    origGetSettings = window.YoutubeAntiTranslate.getSettings;
    origGetChannelBrandingWithYoutubeI =
      window.YoutubeAntiTranslate.getChannelBrandingWithYoutubeI;
    origLookupChannelId = window.YoutubeAntiTranslate.lookupChannelId;
    origLogInfo = window.YoutubeAntiTranslate.logInfo;
    origLogDebug = window.YoutubeAntiTranslate.logDebug;
    origLogWarning = window.YoutubeAntiTranslate.logWarning;
    // Silence logs
    window.YoutubeAntiTranslate.logInfo = vi.fn();
    window.YoutubeAntiTranslate.logDebug = vi.fn();
    window.YoutubeAntiTranslate.logWarning = vi.fn();
  });

  afterEach(() => {
    window.YoutubeAntiTranslate.getSettings = origGetSettings;
    window.YoutubeAntiTranslate.getChannelBrandingWithYoutubeI =
      origGetChannelBrandingWithYoutubeI;
    window.YoutubeAntiTranslate.lookupChannelId = origLookupChannelId;
    window.YoutubeAntiTranslate.logInfo = origLogInfo;
    window.YoutubeAntiTranslate.logDebug = origLogDebug;
    window.YoutubeAntiTranslate.logWarning = origLogWarning;
    vi.restoreAllMocks();
  });

  it("returns false if whitelist is empty", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({ testWhitelist: [] });
    const result = await isWhitelistedChannel("testWhitelist", "@foo");
    expect(result).toBe(false);
  });

  it("returns true if handle is in whitelist", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    const result = await isWhitelistedChannel("testWhitelist", "@foo");
    expect(result).toBe(true);
  });

  it("returns false if handle is not in whitelist", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    const result = await isWhitelistedChannel("testWhitelist", "@bar");
    expect(result).toBe(false);
  });

  it("returns true if handle extracted from channelUrl is in whitelist", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    // channelUrl: https://www.youtube.com/@foo
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      "https://www.youtube.com/@foo",
    );
    expect(result).toBe(true);
  });

  it("returns true if handle extracted from channelId is in whitelist", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    window.YoutubeAntiTranslate.getChannelBrandingWithYoutubeI = vi
      .fn()
      .mockResolvedValue({ channelHandle: "@foo" });
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      null,
      "UC123",
    );
    expect(result).toBe(true);
  });

  it("returns false if handle extracted from channelId is not in whitelist", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    window.YoutubeAntiTranslate.getChannelBrandingWithYoutubeI = vi
      .fn()
      .mockResolvedValue({ channelHandle: "@bar" });
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      null,
      "UC123",
    );
    expect(result).toBe(false);
  });

  it("returns true if channelName as handle is in whitelist (no spaces)", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      null,
      null,
      "foo",
    );
    expect(result).toBe(true);
  });

  it("returns true if handle from lookupChannelId(channelName) is in whitelist", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    window.YoutubeAntiTranslate.lookupChannelId = vi
      .fn()
      .mockResolvedValue({ channelHandle: "@foo" });
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      null,
      null,
      "Foo Bar",
    );
    expect(result).toBe(true);
  });

  it("returns false if handle from lookupChannelId(channelName) is not in whitelist", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    window.YoutubeAntiTranslate.lookupChannelId = vi
      .fn()
      .mockResolvedValue({ channelHandle: "@bar" });
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      null,
      null,
      "Foo Bar",
    );
    expect(result).toBe(false);
  });

  it("throws if whitelist type is not supported", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    await expect(
      isWhitelistedChannel("notAWhitelist", "@foo"),
    ).rejects.toThrow();
  });

  it("returns true if handle has leading/trailing spaces and is in whitelist", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    const result = await isWhitelistedChannel("testWhitelist", "  @foo  ");
    expect(result).toBe(true);
  });

  it("returns false if handle is invalid (does not start with @)", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    const result = await isWhitelistedChannel("testWhitelist", "foo");
    expect(result).toBe(false);
  });

  it("returns true if handle extracted from /channel/UCID url is in whitelist", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    window.YoutubeAntiTranslate.getChannelBrandingWithYoutubeI = vi
      .fn()
      .mockResolvedValue({ channelHandle: "@foo" });
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      "https://www.youtube.com/channel/UC123",
    );
    expect(result).toBe(true);
  });

  it("returns false if channelUrl is invalid", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      "not-a-valid-url",
    );
    expect(result).toBe(false);
  });

  it("returns false if getChannelBrandingWithYoutubeI returns null for channelId", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    window.YoutubeAntiTranslate.getChannelBrandingWithYoutubeI = vi
      .fn()
      .mockResolvedValue(null);
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      null,
      "UC123",
    );
    expect(result).toBe(false);
  });

  it("returns false if channelName has spaces and is not in whitelist, and lookupChannelId returns handle not in whitelist", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    window.YoutubeAntiTranslate.lookupChannelId = vi
      .fn()
      .mockResolvedValue({ channelHandle: "@bar" });
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      null,
      null,
      "Foo Bar",
    );
    expect(result).toBe(false);
  });

  it("returns false if lookupChannelId returns null for channelName", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    window.YoutubeAntiTranslate.lookupChannelId = vi
      .fn()
      .mockResolvedValue(null);
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      null,
      null,
      "Foo Bar",
    );
    expect(result).toBe(false);
  });

  it("returns true if channelName with no spaces is in whitelist as @channelName", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      null,
      null,
      "foo",
    );
    expect(result).toBe(true);
  });

  it("returns true if channelId is invalid but channelName is in whitelist as @channelName", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      null,
      "   ", // invalid channelId
      "foo",
    );
    expect(result).toBe(true);
  });

  it("returns true if channelId is invalid, channelName not in whitelist, but lookupChannelId returns handle in whitelist", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    window.YoutubeAntiTranslate.lookupChannelId = vi
      .fn()
      .mockResolvedValue({ channelHandle: "@foo" });
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      null,
      "", // invalid channelId
      "Foo Bar",
    );
    expect(result).toBe(true);
  });

  it("returns false if channelId is invalid, channelName not in whitelist, and lookupChannelId returns handle not in whitelist", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    window.YoutubeAntiTranslate.lookupChannelId = vi
      .fn()
      .mockResolvedValue({ channelHandle: "@bar" });
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      null,
      "", // invalid channelId
      "Foo Bar",
    );
    expect(result).toBe(false);
  });

  it("returns true if getChannelBrandingWithYoutubeI returns handle with spaces that matches whitelist", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    window.YoutubeAntiTranslate.getChannelBrandingWithYoutubeI = vi
      .fn()
      .mockResolvedValue({ channelHandle: "  @foo  " });
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      null,
      "UC123",
    );
    expect(result).toBe(true);
  });

  it("returns true if channelUrl is a relative /@foo path and handle is in whitelist", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    const result = await isWhitelistedChannel("testWhitelist", null, "/@foo");
    expect(result).toBe(true);
  });

  it("returns true if channelUrl is a relative /channel/UC123 path and getChannelBrandingWithYoutubeI returns handle in whitelist", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    window.YoutubeAntiTranslate.getChannelBrandingWithYoutubeI = vi
      .fn()
      .mockResolvedValue({ channelHandle: "@foo" });
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      "/channel/UC123",
    );
    expect(result).toBe(true);
  });

  it("returns false if channelUrl is /user/ or /c/ path (unsupported)", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    // /user/ path
    let result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      "/user/SomeUser",
    );
    expect(result).toBe(false);
    // /c/ path
    result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      "/c/SomeChannel",
    );
    expect(result).toBe(false);
  });

  it("returns false if channelName is only spaces", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    const result = await isWhitelistedChannel(
      "testWhitelist",
      null,
      null,
      null,
      "   ",
    );
    expect(result).toBe(false);
  });

  it("returns false if all identifying info is present but all are invalid/empty", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    const result = await isWhitelistedChannel(
      "testWhitelist",
      "   ",
      "   ",
      "   ",
      "   ",
    );
    expect(result).toBe(false);
  });

  it("returns false if all identifying info is missing", async () => {
    window.YoutubeAntiTranslate.getSettings = () => ({
      testWhitelist: ["@foo"],
    });
    const result = await isWhitelistedChannel("testWhitelist");
    expect(result).toBe(false);
  });
});
