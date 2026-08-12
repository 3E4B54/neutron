import { expect, test } from "bun:test";
import {
  DEMO_GAME_FIXTURE_PATH,
  loadPackagedDemoGameSeeds,
  packagedDemoGameRequested,
} from "./demoFixture.ts";

const pageUrl = "https://example.test/app/plasmon/index.html";

test("normal boot does not load or seed the packaged demo game", async () => {
  let fetches = 0;
  const seeds = await loadPackagedDemoGameSeeds(pageUrl, async () => {
    fetches += 1;
    return new Response(new Uint8Array([1]));
  });

  expect(packagedDemoGameRequested(pageUrl)).toBe(false);
  expect(fetches).toBe(0);
  expect(seeds).toEqual([]);
});

test("the explicit demo-game flag resolves one package asset into the demo-seed authority", async () => {
  let fetched: string | null = null;
  const flagged = `${pageUrl}?plasmon-fixture=demo-game`;
  const seeds = await loadPackagedDemoGameSeeds(flagged, async (input) => {
    fetched = input.toString();
    return new Response(Uint8Array.from([0x50, 0x4b, 0x03, 0x04]));
  });

  expect(packagedDemoGameRequested(flagged)).toBe(true);
  expect(fetched).toBe("https://example.test/app/plasmon/fixtures/PlasmonDemo.jsdos");
  expect(DEMO_GAME_FIXTURE_PATH).toBe("/Games/Plasmon Demo.jsdos");
  expect(seeds).toHaveLength(1);
  expect(seeds[0]).toMatchObject({
    key: "games.demo.plasmon-v1",
    seedClass: "demo-temporary",
    parentPath: "/Games",
    name: "Plasmon Demo.jsdos",
    kind: "file",
    mime: "application/x-jsdos",
  });
  expect(Array.from(seeds[0]?.bytes ?? [])).toEqual([0x50, 0x4b, 0x03, 0x04]);
});
