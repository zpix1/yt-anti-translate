import { afterEach, expect, test, vi } from "vitest";
import "../app/src/global.js";

function searchResponse(handle, channelId) {
  return {
    ok: true,
    json: async () => ({
      contents: {
        twoColumnSearchResultsRenderer: {
          primaryContents: {
            sectionListRenderer: {
              contents: [
                {
                  itemSectionRenderer: {
                    contents: [
                      {
                        channelRenderer: {
                          subscriberCountText: { simpleText: handle },
                          channelId,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    }),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

test("a slow channel lookup neither delays the next request nor duplicates cache writes", async () => {
  vi.useFakeTimers();
  const api = window.YoutubeAntiTranslate;
  const local = {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(),
  };
  vi.stubGlobal("chrome", { storage: { local } });
  vi.spyOn(api, "getYoutubeIHeadersWithCredentials").mockResolvedValue({});

  let finishSlowRequest;
  const slowResponse = new Promise((resolve) => {
    finishSlowRequest = resolve;
  });
  const fetch = vi
    .fn()
    .mockReturnValueOnce(slowResponse)
    .mockResolvedValueOnce(searchResponse("@fast", "UCfast"));
  vi.stubGlobal("fetch", fetch);

  const first = api.lookupChannelId("%40slow");
  const repeated = api.lookupChannelId("@slow");
  const second = api.lookupChannelId("@fast");

  await vi.advanceTimersByTimeAsync(999);
  expect(fetch).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(fetch).toHaveBeenCalledTimes(2);
  await expect(second).resolves.toEqual({
    channelUcid: "UCfast",
    channelHandle: "@fast",
  });

  finishSlowRequest(searchResponse("@slow", "UCslow"));
  const slowChannel = { channelUcid: "UCslow", channelHandle: "@slow" };
  await expect(Promise.all([first, repeated])).resolves.toEqual([
    slowChannel,
    slowChannel,
  ]);
  await expect(api.lookupChannelId("@slow")).resolves.toEqual(slowChannel);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(local.get).toHaveBeenCalledTimes(2);
  expect(local.set).toHaveBeenCalledTimes(2);
});
