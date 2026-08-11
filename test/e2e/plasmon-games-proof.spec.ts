import { expect, test } from "@playwright/test";

test("packaged Doom .jsdos opens through js-dos and closes cleanly", async ({ page }) => {
  const runtimeRequests: string[] = [];
  const externalRuntimeRequests: string[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("request", (request) => {
    const url = new URL(request.url());
    const path = decodeURIComponent(url.pathname);
    if (path.includes("/System/Program Files/js-dos/")) runtimeRequests.push(path);
    if (["v8.js-dos.com", "github.com", "raw.githubusercontent.com"].includes(url.hostname)) {
      externalRuntimeRequests.push(request.url());
    }
  });
  page.on("requestfailed", (request) => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText ?? "failed"}`));
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });

  const doom = page.locator("[data-fm-node-id]", { hasText: "Doom.jsdos" }).first();
  await expect(doom).toBeVisible({ timeout: 30_000 });
  await doom.dblclick();

  const dialog = page.getByRole("dialog", { name: "js-dos" });
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  const player = dialog.getByLabel("DOS game");
  await page.waitForTimeout(5_000);
  if ((await player.count()) === 0) {
    throw new Error(JSON.stringify({
      dialogText: await dialog.innerText(),
      dialogHtml: (await dialog.innerHTML()).slice(0, 4000),
      pageErrors,
      consoleErrors,
      failedRequests,
      runtimeRequests,
      externalRuntimeRequests,
    }, null, 2));
  }
  await expect(player).toHaveAttribute("data-jsdos-ready", "true", { timeout: 90_000 });

  const canvas = dialog.locator("canvas").first();
  await expect(canvas).toBeVisible();
  await expect.poll(
    () => canvas.evaluate((node) => {
      const element = node as HTMLCanvasElement;
      return element.width > 0 && element.height > 0;
    }),
    { timeout: 30_000 },
  ).toBe(true);

  await player.click({ position: { x: 80, y: 80 } });
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Control");
  await page.waitForTimeout(500);
  await expect(canvas).toBeVisible();

  expect(runtimeRequests.some((path) => path.endsWith("/js-dos.js"))).toBe(true);
  expect(runtimeRequests.some((path) => path.endsWith("/emulators/wdosbox.wasm"))).toBe(true);
  expect(externalRuntimeRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);

  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden({ timeout: 5_000 });
  await expect(doom).toBeVisible();
  expect(pageErrors).toEqual([]);
});
