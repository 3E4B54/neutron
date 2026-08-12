import { expect, test } from "@playwright/test";
import { localCanisterOrigin } from "neutron-tools/src/runtime.js";
import { resolveLocalNeutronRuntime } from "../../packages/neutron-provision/src/local_session.ts";

const APP_ID = "plasmon";
const TILE_ID = "main";

test("packaged Plasmon is registered, serves browser assets, and boots its real tile", async ({ page, request }) => {
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

  await expect(page.locator('[data-tid="launcher-open"]')).toBeVisible();

  const registryResponse = await request.get(new URL("/system/apps.json", kernelUrl).href);
  expect(registryResponse.ok()).toBe(true);
  const registry = await registryResponse.json() as Record<string, { tiles?: Array<{ id?: string; path?: string }> }>;
  expect(registry[APP_ID]?.tiles).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: TILE_ID, path: "index.html" })]),
  );

  for (const path of [
    `/app/${APP_ID}/index.html`,
    `/app/${APP_ID}/monaco-workers/editor.worker.js`,
  ]) {
    const response = await request.get(new URL(path, kernelUrl).href);
    expect(response.ok(), `${path} should be served from the installed package`).toBe(true);
  }

  await page.locator('[data-tid="launcher-open"]').click();
  await expect(page.locator('[data-tid="launcher"]')).toBeVisible();
  await page.locator(`[data-tid="launcher-tile-${APP_ID}-${TILE_ID}"]`).click();

  const frame = page.locator(`iframe[data-app-id="${APP_ID}"][data-tile-id="${TILE_ID}"]`).first();
  await expect(frame).toBeVisible();
  const source = await frame.getAttribute("src");
  expect(source).not.toBeNull();
  expect(new URL(source!).pathname.startsWith(`/app/${APP_ID}/`)).toBe(true);

  const app = page.frameLocator(`iframe[data-app-id="${APP_ID}"][data-tile-id="${TILE_ID}"]`).first();
  await expect(app.getByRole("navigation", { name: "Taskbar" })).toBeVisible({ timeout: 30_000 });
  await expect(app.getByRole("button", { name: "Start" })).toBeVisible();
  await expect(app.getByRole("button", { name: "Search" })).toBeVisible();

  // Issue #45 visible boundary: use the real packaged Shell/native process path
  // to launch Recycle Bin and prove its first-class native surface renders.
  await app.getByRole("button", { name: "Search" }).click();
  const search = app.getByLabel("Search Plasmon");
  await expect(search).toBeVisible();
  await search.fill("Recycle Bin");
  const recycleResult = app.locator("[data-search-result]", { hasText: "Recycle Bin" }).first();
  await expect(recycleResult).toBeVisible({ timeout: 15_000 });
  await recycleResult.click();

  const recycleBin = app.getByRole("dialog", { name: "Recycle Bin" });
  await expect(recycleBin).toBeVisible({ timeout: 10_000 });
  await expect(recycleBin.getByText("Recycle Bin is empty.")).toBeVisible();
  await expect(recycleBin.getByRole("button", { name: "Empty Recycle Bin" })).toBeDisabled();
  expect(pageErrors).toEqual([]);
});

declare global {
  interface Window {
    __NEUTRON_PLAYWRIGHT_LOGIN_AS__?: (seed: number) => Promise<string>;
  }
}
