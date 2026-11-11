import { describe, expect, test } from "vitest";
import "../app/src/global.js";

describe("YoutubeAntiTranslate.createFormattedContent", () => {
  test("links YouTube channel URLs without a scheme in the original description", () => {
    const channel = "www.youtube.com/@UC4-79UOlP48-QNGgCko5p2g";
    const handle = "www.youtube.com/@MrBeast";
    const merch = "https://mrbeast.store";
    const content = window.YoutubeAntiTranslate.createFormattedContent(
      `SUB TO ALL CHANNELS\n${channel} \n${handle}\nNew Merch - ${merch}`,
    );

    expect(
      Array.from(content.querySelectorAll("a"), (link) => [
        link.textContent,
        link.getAttribute("href"),
      ]),
    ).toEqual([
      [channel, "https://www.youtube.com/channel/UC4-79UOlP48-QNGgCko5p2g"],
      [handle, `https://${handle}`],
      [merch, merch],
    ]);
    expect(content.querySelectorAll("br")).toHaveLength(3);
  });
});
