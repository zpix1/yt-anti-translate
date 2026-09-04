import { test } from "../playwright.config";
import { downloadAndExtractUBlock } from "./helpers/ExtensionsFilesHelper";

test("Download uBlock for each extension browser", async ({
  allBrowserNameWithExtensions,
}) => {
  for (const browserName of allBrowserNameWithExtensions) {
    await downloadAndExtractUBlock(browserName);
  }
});
