import { expect, test } from "@playwright/test";

test("native titlebar drag snaps at the left and right workspace edges", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });

  const rootShortcut = page.locator("[data-fm-node-id]", { hasText: "Root" }).first();
  await expect(rootShortcut).toBeVisible({ timeout: 30_000 });
  await rootShortcut.dblclick();

  const dialog = page.getByRole("dialog", { name: "Files" }).last();
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  const titlebar = dialog.locator(".plasmon-window__titlebar");

  const workspace = await dialog.evaluate((element) => {
    const parent = element.parentElement;
    if (!parent) throw new Error("Native window has no WindowLayer parent");
    const bounds = parent.getBoundingClientRect();
    return { left: bounds.left, right: bounds.right, width: bounds.width };
  });

  const dragTitlebarTo = async (clientX: number): Promise<void> => {
    const box = await titlebar.boundingBox();
    if (!box) throw new Error("Native window titlebar has no bounding box");
    const titlebarY = box.y + Math.min(16, box.height / 2);
    await page.mouse.move(box.x + Math.min(120, box.width / 2), titlebarY);
    await page.mouse.down();
    await page.mouse.move(clientX, titlebarY, { steps: 5 });
    await page.mouse.up();
  };

  await dragTitlebarTo(workspace.left + 1);
  await expect(dialog).toHaveAttribute("data-window-snap", "left");
  await expect.poll(async () => {
    const box = await dialog.boundingBox();
    return box ? { x: Math.round(box.x), width: Math.round(box.width) } : null;
  }).toEqual({
    x: Math.round(workspace.left),
    width: Math.max(1, Math.floor(workspace.width / 2)),
  });

  await dragTitlebarTo(workspace.right - 1);
  await expect(dialog).toHaveAttribute("data-window-snap", "right");
  await expect.poll(async () => {
    const box = await dialog.boundingBox();
    return box ? { right: Math.round(box.x + box.width), width: Math.round(box.width) } : null;
  }).toEqual({
    right: Math.round(workspace.right),
    width: Math.max(1, workspace.width - Math.floor(workspace.width / 2)),
  });
});
