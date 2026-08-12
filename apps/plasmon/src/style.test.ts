import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const ROOT_STYLESHEET = new URL("./style.scss", import.meta.url);
const STALE_LAUNCHER_MARKERS = [
  ".plasmon-app",
  ".plasmon-shell",
  ".sidebar",
  ".app-card",
  ".install-dialog",
  ".concept-page",
  ".share-placeholder",
  "--pl-",
] as const;

test("root stylesheet contains only shared/global Plasmon foundation", async () => {
  const stylesheet = await readFile(ROOT_STYLESHEET, "utf8");

  expect(stylesheet).toContain('@use "neutron-design-system/styles.scss";');
  expect(stylesheet).toContain("@layer nt.tokens, nt.base, nt.layout, nt.components, nt.utilities, app;");
  expect(stylesheet).toContain("color-scheme: dark;");
  expect(stylesheet).toContain("box-sizing: border-box;");

  for (const marker of STALE_LAUNCHER_MARKERS) {
    expect(stylesheet).not.toContain(marker);
  }
});
