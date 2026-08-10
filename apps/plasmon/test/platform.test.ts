import { expect, test } from "bun:test";
import {
  modeFromTools,
  parseAppDescription,
  parseInstalledAppIds,
  toolNames,
} from "../src/platform/parse.ts";

test("parses vanilla Neutron installed app discovery", () => {
  expect(
    parseInstalledAppIds({
      apps: [
        { id: "files", description: "File manager" },
        { id: "chess", description: "Chess" },
      ],
    }),
  ).toEqual([
    { id: "files", description: "File manager" },
    { id: "chess", description: "Chess" },
  ]);
});

test("parses safe apps.describe metadata without assuming asset paths", () => {
  expect(
    parseAppDescription(
      {
        id: "files",
        name: "Files",
        version: 403,
        tiles: [
          { id: "main", title: "Files", description: "Browse files" },
        ],
      },
      "fallback",
    ),
  ).toEqual({
    id: "files",
    name: "Files",
    description: "fallback",
    version: 403,
    tiles: [
      { id: "main", title: "Files", description: "Browse files" },
    ],
  });
});

test("detects tenant extensions by capabilities rather than product name", () => {
  const vanilla = toolNames([
    { name: "apps.list" },
    { name: "apps.describe" },
    { name: "workspace.open_tile" },
  ]);
  expect(modeFromTools(vanilla)).toBe("neutron");

  const extended = new Set([...vanilla, "apps.catalog", "apps.allocate"]);
  expect(modeFromTools(extended)).toBe("tenant-capable");
});

test("rejects malformed discovery payloads", () => {
  expect(() => parseInstalledAppIds({ apps: [{ id: "files" }] })).toThrow();
  expect(() =>
    parseAppDescription({ id: "files", name: "Files" }, "fallback"),
  ).toThrow();
});
