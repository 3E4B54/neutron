import { expect, test } from "@playwright/test";
import { localCanisterOrigin } from "neutron-tools/src/runtime.js";
import { resolveLocalNeutronRuntime } from "../../packages/neutron-provision/src/local_session.ts";

const APP_ID = "plasmon";
const TILE_ID = "main";

test("explicit packaged demo fixture opens through the normal js-dos desktop path", async ({ page, request }) => {
  const runtime = resolveLocalNeutronRuntime();
  const kernelUrl = localCanisterOrigin(runtime.canisterId, runtime.gatewayUrl);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(kernelUrl);
  await page.waitForFunction(
    () => typeof window.__NEUTRON_PLAYWRIGHT_LOGIN_AS__ === "function",
  );
  const principal = await page.evaluate(
    (seed) => window.__NEUTRON_PLAYWRIGHT_LOGIN_AS__!(seed),
    runtime.developerIdentitySeed,
  );
  expect(principal).toBe(runtime.developerIdentityPrincipal);

  const fixtureResponse = await request.get(
    new URL(`/app/${APP_ID}/fixtures/PlasmonDemo.jsdos`, kernelUrl).href,
  );
  expect(fixtureResponse.ok(), "demo fixture should be served from the installed Plasmon package").toBe(true);
  expect((await fixtureResponse.body()).length).toBeGreaterThan(0);

  await page.locator('[data-tid="launcher-open"]').click();
  await expect(page.locator('[data-tid="launcher"]')).toBeVisible();
  await page.locator(`[data-tid="launcher-tile-${APP_ID}-${TILE_ID}"]`).click();

  const frame = page.locator(`iframe[data-app-id="${APP_ID}"][data-tile-id="${TILE_ID}"]`).first();
  await expect(frame).toBeVisible();
  const source = await frame.getAttribute("src");
  if (!source) throw new Error("Installed Plasmon tile has no iframe source");

  const fixtureUrl = new URL(source, kernelUrl);
  fixtureUrl.searchParams.set("plasmon-fixture", "demo-game");
  await frame.evaluate((element, href) => {
    (element as HTMLIFrameElement).src = href;
  }, fixtureUrl.href);

  const app = page.frameLocator(`iframe[data-app-id="${APP_ID}"][data-tile-id="${TILE_ID}"]`).first();
  await expect(app.getByRole("navigation", { name: "Taskbar" })).toBeVisible({ timeout: 30_000 });

  // Enter the fixture through ordinary filesystem UI. Directory navigation is
  // FileManager-owned; the .jsdos activation itself delegates to the canonical
  // filesystem dispatcher -> AssociationRegistry/OpenService -> Process/Windowing.
  const rootShortcut = app.locator("[data-fm-node-id]", { hasText: "Root" }).first();
  await expect(rootShortcut).toBeVisible({ timeout: 30_000 });
  await rootShortcut.dblclick();

  const explorer = app.getByRole("dialog", { name: "This Plasmon" }).last();
  await expect(explorer).toBeVisible({ timeout: 20_000 });
  const games = explorer.locator("[data-fm-node-id]", { hasText: "Games" }).first();
  await expect(games).toBeVisible();
  await games.dblclick();

  const demo = explorer.locator("[data-fm-node-id]", { hasText: "Plasmon Demo.jsdos" }).first();
  await expect(demo).toBeVisible({ timeout: 20_000 });
  await demo.dblclick();

  // The runtime window stays generic by design; target filenames never become
  // game-title-specific product/runtime behavior.
  const gameWindow = app.getByRole("dialog", { name: "js-dos" }).last();
  await expect(gameWindow).toBeVisible({ timeout: 20_000 });
  const player = gameWindow.getByLabel("DOS game");
  await expect(player).toHaveAttribute("data-jsdos-ready", "true", { timeout: 60_000 });
  await expect(player.locator("canvas").first()).toBeVisible({ timeout: 30_000 });

  // The self-authored demo accepts SPACE as gameplay input. Browser automation
  // does not OCR the emulator canvas; runtime readiness + rendered canvas + real
  // keyboard delivery are the package/browser boundary this lane can prove.
  await player.click();
  await page.keyboard.press("Space");

  expect(pageErrors).toEqual([]);
});

declare global {
  interface Window {
    __NEUTRON_PLAYWRIGHT_LOGIN_AS__?: (seed: number) => Promise<string>;
  }
}
