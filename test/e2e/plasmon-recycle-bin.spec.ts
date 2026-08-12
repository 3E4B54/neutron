import { expect, test } from "@playwright/test";

test("native Recycle Bin opens from Search and renders the canonical empty surface", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByLabel("Search Plasmon").fill("Recycle Bin");

  const result = page.locator("[data-search-result]", { hasText: "Recycle Bin" }).first();
  await expect(result).toBeVisible({ timeout: 15_000 });
  await result.click();

  const dialog = page.getByRole("dialog", { name: "Recycle Bin" });
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(dialog.getByText("Recycle Bin is empty.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Empty Recycle Bin" })).toBeDisabled();
  expect(pageErrors).toEqual([]);
});
