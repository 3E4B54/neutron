import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { localCanisterOrigin } from "neutron-tools/src/runtime.js";
import { resolveLocalNeutronRuntime } from "../../packages/neutron-provision/src/local_session.ts";

const APP_ID = "plasmon";
const TILE_ID = "main";
const NES_FIXTURE = resolve("apps/plasmon/dist/web/Games/Test ROMs/PlasmonTest.nes");

test("packaged Plasmon imports a legal NES fixture and initializes EmulatorJS from local assets", async ({ page }) => {
  const runtime = resolveLocalNeutronRuntime();
  const kernelUrl = localCanisterOrigin(runtime.canisterId, runtime.gatewayUrl);
  const runtimeRequests: string[] = [];
  const runtimeHttpErrors: string[] = [];
  const failedRuntimeRequests: string[] = [];
  const externalRuntimeRequests: string[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("request", (request) => {
    const url = new URL(request.url());
    const path = decodeURIComponent(url.pathname);
    if (path.includes("/System/Program Files/EmulatorJS/")) runtimeRequests.push(path);
    if (["cdn.emulatorjs.org", "emulatorjs.org"].includes(url.hostname)) {
      externalRuntimeRequests.push(request.url());
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    const path = decodeURIComponent(url.pathname);
    if (response.status() >= 400 && path.includes("/System/Program Files/EmulatorJS/")) {
      runtimeHttpErrors.push(`${response.status()} ${path}`);
    }
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    const path = decodeURIComponent(url.pathname);
    if (path.includes("/System/Program Files/EmulatorJS/")) {
      failedRuntimeRequests.push(`${request.url()} :: ${request.failure()?.errorText ?? "failed"}`);
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(kernelUrl);
  await page.waitForFunction(() => typeof window.__NEUTRON_PLAYWRIGHT_LOGIN_AS__ === "function");
  const principal = await page.evaluate(
    (seed) => window.__NEUTRON_PLAYWRIGHT_LOGIN_AS__!(seed),
    runtime.developerIdentitySeed,
  );
  expect(principal).toBe(runtime.developerIdentityPrincipal);

  await page.locator('[data-tid="launcher-open"]').click();
  await expect(page.locator('[data-tid="launcher"]')).toBeVisible();
  await page.locator(`[data-tid="launcher-tile-${APP_ID}-${TILE_ID}"]`).click();

  const appFrameSelector = `iframe[data-app-id="${APP_ID}"][data-tile-id="${TILE_ID}"]`;
  await expect(page.locator(appFrameSelector).first()).toBeVisible();
  const app = page.frameLocator(appFrameSelector).first();
  await expect(app.getByRole("navigation", { name: "Taskbar" })).toBeVisible({ timeout: 30_000 });

  const files = app.getByRole("listbox", { name: "Files" }).first();
  await expect(files).toBeVisible({ timeout: 30_000 });
  await files.locator('input[type="file"]').setInputFiles(NES_FIXTURE);

  const fixture = app.locator("[data-fm-node-id]", { hasText: "PlasmonTest.nes" }).first();
  await expect(fixture).toBeVisible({ timeout: 30_000 });
  await expect(fixture).toHaveAttribute("aria-selected", "true", { timeout: 30_000 });
  await fixture.dblclick();

  const dialog = app.getByRole("dialog", { name: "EmulatorJS" });
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  const host = dialog.locator('iframe[title="NES game"]');
  const emulator = app.frameLocator('iframe[title="NES game"]');

  const runtimeState = async () => {
    const [init, bootstrap, loaded, ready, bodyText, bodyHtml, alertText, statusText] = await Promise.all([
      host.getAttribute("data-emulatorjs-init"),
      host.getAttribute("data-emulatorjs-bootstrap"),
      host.getAttribute("data-emulatorjs-loaded"),
      host.getAttribute("data-emulatorjs-ready"),
      emulator.locator("body").innerText().catch(() => "<body unavailable>"),
      emulator.locator("body").innerHTML().catch(() => "<body unavailable>"),
      dialog.getByRole("alert").textContent().catch(() => null),
      dialog.getByRole("status").textContent().catch(() => null),
    ]);
    return JSON.stringify({
      init,
      bootstrap,
      loaded,
      ready,
      body: bodyText.replace(/\s+/gu, " ").trim().slice(0, 600),
      bodyHtml: bodyHtml.replace(/\s+/gu, " ").trim().slice(0, 900),
      alert: alertText?.replace(/\s+/gu, " ").trim().slice(0, 600) ?? null,
      status: statusText?.replace(/\s+/gu, " ").trim().slice(0, 600) ?? null,
      requests: runtimeRequests.slice(-12),
      httpErrors: runtimeHttpErrors.slice(-8),
      failedRequests: failedRuntimeRequests.slice(-8),
      externalRequests: externalRuntimeRequests.slice(-8),
      pageErrors: pageErrors.slice(-8),
      consoleErrors: consoleErrors.slice(-8),
    });
  };

  try {
    await expect.poll(
      async () => await host.getAttribute("data-emulatorjs-loaded") === "true"
        ? "loaded"
        : await runtimeState(),
      { timeout: 30_000, message: "EmulatorJS loader should initialize from packaged assets" },
    ).toBe("loaded");
  } catch (error) {
    const state = await runtimeState();
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(`EmulatorJS loader should initialize from packaged assets\nRuntime state: ${state}\n${cause}`);
  }

  try {
    await expect.poll(
      async () => await host.getAttribute("data-emulatorjs-ready") === "true"
        ? "ready"
        : await runtimeState(),
      { timeout: 90_000, message: "EmulatorJS core and NES fixture should start" },
    ).toBe("ready");
  } catch (error) {
    const state = await runtimeState();
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(`EmulatorJS core and NES fixture should start\nRuntime state: ${state}\n${cause}`);
  }

  await expect(emulator.locator("canvas").first()).toBeVisible({ timeout: 30_000 });

  expect(runtimeRequests.some((path) => path.endsWith("/data/loader.js"))).toBe(true);
  expect(runtimeRequests.some((path) => path.endsWith("/data/emulator.min.js"))).toBe(true);
  expect(runtimeRequests.some((path) => path.endsWith("/data/emulator.min.css"))).toBe(true);
  expect(runtimeRequests.some((path) => /\/data\/cores\/fceumm(?:-legacy)?-wasm\.data$/u.test(path))).toBe(true);
  expect(externalRuntimeRequests).toEqual([]);
  expect(runtimeHttpErrors).toEqual([]);
  expect(failedRuntimeRequests).toEqual([]);
  expect(pageErrors).toEqual([]);

  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden({ timeout: 5_000 });
  await expect(app.locator('iframe[title="NES game"]')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

declare global {
  interface Window {
    __NEUTRON_PLAYWRIGHT_LOGIN_AS__?: (seed: number) => Promise<string>;
  }
}
