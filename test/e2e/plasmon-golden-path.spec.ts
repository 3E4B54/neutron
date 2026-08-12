import { expect, test } from "@playwright/test";
import { localCanisterOrigin } from "neutron-tools/src/runtime.js";
import { resolveLocalNeutronRuntime } from "../../packages/neutron-provision/src/local_session.ts";

const APP_ID = "plasmon";
const TILE_ID = "main";

test("packaged Plasmon boots real native/browser boundaries", async ({ page, request }) => {
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

  const nativeWindows = app.locator(".plasmon-window-layer [data-window-id]");
  const initialWindowCount = await nativeWindows.count();
  const rootShortcut = app.locator("[data-fm-node-id]", { hasText: "Root" }).first();
  await expect(rootShortcut).toBeVisible({ timeout: 30_000 });
  await rootShortcut.dblclick();

  await expect(nativeWindows).toHaveCount(initialWindowCount + 1, { timeout: 20_000 });
  const explorerWindow = nativeWindows.last();
  await expect(explorerWindow.getByLabel("File Explorer", { exact: true })).toBeVisible();

  const createDocument = async (
    createButton: "New Text Document" | "New Markdown Document",
    generatedName: "New Text Document" | "New Markdown Document",
    fileName: string,
  ) => {
    await explorerWindow.getByRole("button", { name: createButton, exact: true }).click();
    const rename = explorerWindow.getByRole("textbox", { name: new RegExp(`^Rename ${generatedName}`) }).first();
    await expect(rename).toBeVisible();
    await rename.fill(fileName);
    await rename.press("Enter");
    const entry = explorerWindow.locator("[data-fm-node-id]", { hasText: fileName }).first();
    await expect(entry).toBeVisible();
    return entry;
  };

  const openDocument = async (entry: ReturnType<typeof explorerWindow.locator>, appLabel: string) => {
    const before = await nativeWindows.count();
    await entry.dblclick();
    await expect(nativeWindows).toHaveCount(before + 1, { timeout: 20_000 });
    const editorWindow = nativeWindows.last();
    await expect(editorWindow.getByLabel(appLabel, { exact: true })).toBeVisible();
    return { before, editorWindow };
  };

  const waitForUsableMonaco = async (editorWindow: ReturnType<typeof nativeWindows.last>, label: string) => {
    const surface = editorWindow.locator('[data-editor-engine="monaco"]').first();
    await expect(surface).toBeVisible();
    try {
      await expect(surface, `${label} should reach packaged Monaco readiness`).toHaveAttribute(
        "data-editor-ready",
        "true",
        { timeout: 30_000 },
      );
    } catch (cause: unknown) {
      const alert = editorWindow.getByRole("alert").filter({ hasText: "Monaco failed to load" }).first();
      const details = await alert.textContent({ timeout: 500 }).catch(() => null);
      throw new Error(
        `${label} packaged Monaco did not become usable${details ? `: ${details}` : `: ${cause instanceof Error ? cause.message : String(cause)}`}`,
      );
    }
    const monaco = editorWindow.locator(".monaco-editor").first();
    await expect(monaco).toBeVisible();
    return monaco;
  };

  const closeDocument = async (before: number, editorWindow: ReturnType<typeof nativeWindows.last>) => {
    await editorWindow.getByRole("button", { name: "Close", exact: true }).click();
    await expect(nativeWindows).toHaveCount(before, { timeout: 10_000 });
  };

  const exercisePackagedEditor = async (options: {
    createButton: "New Text Document" | "New Markdown Document";
    generatedName: "New Text Document" | "New Markdown Document";
    fileName: string;
    appLabel: "Text editor" | "Markdown editor";
    sourceLabel: "Text content" | "Markdown source";
    persistedText: string;
  }) => {
    const entry = await createDocument(options.createButton, options.generatedName, options.fileName);
    const opened = await openDocument(entry, options.appLabel);
    await waitForUsableMonaco(opened.editorWindow, options.appLabel);
    await expect(opened.editorWindow.locator('[data-editor-engine="monaco"]').first()).toHaveAttribute(
      "aria-label",
      options.sourceLabel,
    );

    const editContext = opened.editorWindow.getByRole("textbox", {
      name: options.sourceLabel,
      exact: true,
      includeHidden: true,
    }).first();
    await editContext.focus();
    await expect(editContext).toBeFocused();
    await editContext.pressSequentially(options.persistedText);
    await expect(opened.editorWindow.getByText("Modified", { exact: true })).toBeVisible();
    await opened.editorWindow.getByRole("button", { name: "Save", exact: true }).click();
    await expect(opened.editorWindow.getByText("Saved", { exact: true })).toBeVisible();
    await expect(opened.editorWindow.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
    await closeDocument(opened.before, opened.editorWindow);

    const reopened = await openDocument(entry, options.appLabel);
    await waitForUsableMonaco(reopened.editorWindow, `${options.appLabel} after reopen`);
    await expect(reopened.editorWindow.locator(".view-lines")).toContainText(options.persistedText);
    await closeDocument(reopened.before, reopened.editorWindow);
  };

  // Issue #67 browser/package boundary: create real filesystem documents through
  // Explorer, open through canonical associations/process/windowing, exercise the
  // real packaged Monaco surface, save through the production document session,
  // then close/reopen to prove filesystem persistence rather than component state.
  await exercisePackagedEditor({
    createButton: "New Text Document",
    generatedName: "New Text Document",
    fileName: "Packaged Monaco Text.txt",
    appLabel: "Text editor",
    sourceLabel: "Text content",
    persistedText: "packaged text persisted",
  });
  await exercisePackagedEditor({
    createButton: "New Markdown Document",
    generatedName: "New Markdown Document",
    fileName: "Packaged Monaco Markdown.md",
    appLabel: "Markdown editor",
    sourceLabel: "Markdown source",
    persistedText: "packaged markdown persisted",
  });

  const titlebar = explorerWindow.locator(".plasmon-window__titlebar");
  const workspace = await app.locator(".plasmon-window-layer").first().boundingBox();
  if (!workspace) throw new Error("Plasmon WindowLayer has no browser bounds");

  const dragTitlebarTo = async (clientX: number): Promise<void> => {
    const box = await titlebar.boundingBox();
    if (!box) throw new Error("Native window titlebar has no browser bounds");
    const titlebarY = box.y + Math.min(16, box.height / 2);
    await page.mouse.move(box.x + Math.min(120, box.width / 2), titlebarY);
    await page.mouse.down();
    await page.mouse.move(clientX, titlebarY, { steps: 5 });
    await page.mouse.up();
  };

  await dragTitlebarTo(workspace.x + 1);
  await expect(explorerWindow).toHaveAttribute("data-window-snap", "left");

  await dragTitlebarTo(workspace.x + workspace.width - 1);
  await expect(explorerWindow).toHaveAttribute("data-window-snap", "right");
  expect(pageErrors).toEqual([]);
});

declare global {
  interface Window {
    __NEUTRON_PLAYWRIGHT_LOGIN_AS__?: (seed: number) => Promise<string>;
  }
}
