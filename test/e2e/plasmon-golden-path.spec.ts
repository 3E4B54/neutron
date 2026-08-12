import { expect, test } from "@playwright/test";
import { localCanisterOrigin } from "neutron-tools/src/runtime.js";
import { resolveLocalNeutronRuntime } from "../../packages/neutron-provision/src/local_session.ts";

const APP_ID = "plasmon";
const TILE_ID = "main";

type BrowserPageError = {
  name: string;
  message: string;
  stack?: string;
};

test("packaged Plasmon boots its real tile and protects native desktop workflows", async ({ page, request }) => {
  const runtime = resolveLocalNeutronRuntime();
  const kernelUrl = localCanisterOrigin(runtime.canisterId, runtime.gatewayUrl);
  const pageErrors: string[] = [];
  const issue67PageErrors: BrowserPageError[] = [];
  let monacoLifecycleActive = false;
  let issue67Active = false;
  page.on("pageerror", (error) => {
    if (issue67Active) {
      issue67PageErrors.push({ name: error.name, message: error.message, stack: error.stack });
    }
    // Existing #42 acceptance scopes Monaco's cancellation sentinel to that
    // already-integrated lifecycle. #67 disables this before its journeys and
    // uses the strict collector above, except at a proven disposal boundary.
    if (monacoLifecycleActive && error.message === "Canceled") return;
    pageErrors.push(error.message);
  });

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
  const dialog = nativeWindows.last();
  await expect(dialog).toBeVisible();
  const titlebar = dialog.locator(".plasmon-window__titlebar");
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
  await expect(dialog).toHaveAttribute("data-window-snap", "left");

  await dragTitlebarTo(workspace.x + workspace.width - 1);
  await expect(dialog).toHaveAttribute("data-window-snap", "right");

  // Issue #42 visible boundary: preserve the already-integrated dirty-close
  // browser journey. #67 starts its own strict error collection after this.
  await dialog.getByRole("button", { name: "New Text Document" }).click();
  const renameDocument = dialog.getByRole("textbox", { name: "Rename New Text Document.txt" });
  await expect(renameDocument).toBeVisible();
  await renameDocument.press("Escape");

  const textEntry = dialog.locator("[data-fm-node-id]", { hasText: "New Text Document.txt" }).first();
  await expect(textEntry).toBeVisible();
  monacoLifecycleActive = true;
  await textEntry.dblclick();

  const editorWindow = app.getByRole("dialog", { name: "New Text Document.txt" }).last();
  await expect(editorWindow).toBeVisible({ timeout: 20_000 });
  const editorSurface = editorWindow.locator('[data-editor-engine="monaco"][aria-label="Text content"]');
  await expect(editorSurface).toHaveAttribute("data-editor-ready", "true", { timeout: 30_000 });

  await editorSurface.click({ position: { x: 120, y: 80 } });
  await page.keyboard.type("dirty close proof");
  await expect(editorWindow.getByText("Modified", { exact: true })).toBeVisible();

  const closeEditor = editorWindow.locator(".plasmon-window__controls").getByRole("button", { name: "Close" });
  await closeEditor.click();
  const closePrompt = editorWindow.getByRole("alertdialog", { name: "Save changes to New Text Document.txt?" });
  await expect(closePrompt).toBeVisible({ timeout: 5_000 });
  await expect(closePrompt.getByRole("button", { name: "Save" })).toBeVisible();
  await expect(closePrompt.getByRole("button", { name: "Discard" })).toBeVisible();
  await closePrompt.getByRole("button", { name: "Cancel" }).click();
  await expect(closePrompt).not.toBeVisible();
  await expect(editorWindow).toBeVisible();

  // Dirty it again so the second close remains deterministic even if autosave
  // had time to run after Cancel.
  await editorSurface.click({ position: { x: 120, y: 80 } });
  await page.keyboard.type(" again");
  await expect(editorWindow.getByText("Modified", { exact: true })).toBeVisible();
  await closeEditor.click();
  await expect(closePrompt).toBeVisible({ timeout: 5_000 });
  await closePrompt.getByRole("button", { name: "Discard" }).click();
  await expect(app.getByRole("dialog", { name: "New Text Document.txt" })).toHaveCount(0, { timeout: 10_000 });
  expect(pageErrors).toEqual([]);

  // Issue #67 starts here. No lifecycle-wide cancellation suppression applies
  // to edit/save/reopen. A cancellation may be consumed only while an actual
  // Monaco window is being disposed, and only when its stack proves that path.
  monacoLifecycleActive = false;
  pageErrors.length = 0;
  issue67Active = true;

  const expectNoIssue67PageErrors = (label: string): void => {
    expect(issue67PageErrors, label).toEqual([]);
    expect(pageErrors, label).toEqual([]);
  };

  const explorerWindowId = await dialog.getAttribute("data-window-id");
  if (!explorerWindowId) throw new Error("Explorer window has no stable data-window-id");
  const explorerWindow = app.locator(
    `.plasmon-window-layer [data-window-id="${explorerWindowId}"]`,
  );
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
    const openedWindow = nativeWindows.last();
    await expect(openedWindow.getByLabel(appLabel, { exact: true })).toBeVisible();
    return { before, editorWindow: openedWindow };
  };

  const waitForUsableMonaco = async (openedWindow: ReturnType<typeof nativeWindows.last>, label: string) => {
    const surface = openedWindow.locator('[data-editor-engine="monaco"]').first();
    await expect(surface).toBeVisible();
    try {
      await expect(surface, `${label} should reach packaged Monaco readiness`).toHaveAttribute(
        "data-editor-ready",
        "true",
        { timeout: 30_000 },
      );
    } catch (cause: unknown) {
      const alert = openedWindow.getByRole("alert").filter({ hasText: "Monaco failed to load" }).first();
      const details = await alert.textContent({ timeout: 500 }).catch(() => null);
      throw new Error(
        `${label} packaged Monaco did not become usable${details ? `: ${details}` : `: ${cause instanceof Error ? cause.message : String(cause)}`}`,
      );
    }
  };

  const closeDocument = async (
    before: number,
    openedWindow: ReturnType<typeof nativeWindows.last>,
    label: string,
  ) => {
    expectNoIssue67PageErrors(`${label} must begin without browser errors`);
    monacoLifecycleActive = true;
    try {
      await openedWindow.getByRole("button", { name: "Close", exact: true }).click();
      await expect(nativeWindows).toHaveCount(before, { timeout: 10_000 });
      await page.waitForTimeout(0);
    } finally {
      monacoLifecycleActive = false;
    }

    // Non-cancellation errors were never suppressed by the inherited collector.
    expect(pageErrors, `${label} must not emit non-cancellation browser errors`).toEqual([]);
    const disposalErrors = issue67PageErrors.splice(0);
    expect(disposalErrors.length, `${label} may emit at most one proven Monaco disposal cancellation`).toBeLessThanOrEqual(1);
    if (disposalErrors.length === 1) {
      const [error] = disposalErrors;
      expect(error).toMatchObject({ name: "Canceled", message: "Canceled" });
      const stack = error?.stack ?? "";
      const cancelIndex = stack.indexOf(".cancel (");
      const disposeIndex = stack.indexOf(".dispose (");
      expect(cancelIndex, `${label} cancellation must originate from cancel()`).toBeGreaterThanOrEqual(0);
      expect(disposeIndex, `${label} cancellation must flow into dispose()`).toBeGreaterThan(cancelIndex);
    }
  };

  const typeMonacoText = async (line: ReturnType<typeof nativeWindows.last>, text: string) => {
    let expected = "";
    for (const character of text) {
      await page.keyboard.type(character);
      expected += character;
      await expect(line, "Monaco must render each real key before the next key is sent").toHaveText(expected);
    }
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
    const surface = opened.editorWindow.locator('[data-editor-engine="monaco"]').first();
    await expect(surface).toHaveAttribute("aria-label", options.sourceLabel);

    const editContext = opened.editorWindow.getByRole("textbox", {
      name: options.sourceLabel,
      exact: true,
      includeHidden: true,
    }).first();
    const firstLine = opened.editorWindow.locator(".monaco-editor .view-line").first();
    await expect(firstLine).toBeVisible();
    await firstLine.click({ position: { x: 8, y: 10 } });
    await expect(editContext).toBeFocused();
    await typeMonacoText(firstLine, options.persistedText);
    await expect(opened.editorWindow.getByText("Modified", { exact: true })).toBeVisible();
    await expect(firstLine).toHaveText(options.persistedText);
    expectNoIssue67PageErrors(`${options.appLabel} edit must not emit browser errors`);

    const save = opened.editorWindow.getByRole("button", { name: "Save", exact: true });
    await save.click();
    await expect(opened.editorWindow.getByText("Saved", { exact: true })).toBeVisible();
    await expect(save).toBeDisabled();
    expectNoIssue67PageErrors(`${options.appLabel} save must not emit browser errors`);
    await closeDocument(opened.before, opened.editorWindow, `${options.appLabel} saved close`);

    const reopened = await openDocument(entry, options.appLabel);
    await waitForUsableMonaco(reopened.editorWindow, `${options.appLabel} after reopen`);
    await expect(reopened.editorWindow.locator(".monaco-editor .view-line").first()).toHaveText(options.persistedText);
    expectNoIssue67PageErrors(`${options.appLabel} reopen must preserve exact content without browser errors`);
    await closeDocument(reopened.before, reopened.editorWindow, `${options.appLabel} reopened close`);
  };

  // Issue #67 browser/package boundary: create real filesystem documents through
  // Explorer, open through canonical associations/process/windowing, edit the
  // actual packaged Monaco surface with real pointer/keyboard input, save through
  // the production document session, then close/reopen and prove exact persistence.
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

  expectNoIssue67PageErrors("packaged Monaco acceptance must finish without unexplained browser errors");
  issue67Active = false;
});

declare global {
  interface Window {
    __NEUTRON_PLAYWRIGHT_LOGIN_AS__?: (seed: number) => Promise<string>;
  }
}
