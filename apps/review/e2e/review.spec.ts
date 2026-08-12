import { expect, test } from "@playwright/test";
import { callReviewTool, login, openReview } from "./harness.ts";

test("packaged vanilla Neutron Review creates, mutates, and reopens a logical Atom", async ({ page }) => {
  await login(page);
  let harness = await openReview(page);

  const titleInput = harness.review.getByLabel("New review");
  await titleInput.fill("Packaged Review Gate");
  await harness.review.getByRole("button", { name: "Create Atom" }).click();
  await expect(harness.review.getByRole("heading", { name: "Packaged Review Gate" })).toBeVisible();

  const itemInput = harness.review.getByLabel("New review item");
  await itemInput.fill("Review launches in vanilla Neutron");
  await harness.review.getByRole("button", { name: "Add item" }).click();
  const card = harness.review.locator(".review-card").filter({ hasText: "Review launches in vanilla Neutron" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Working" }).click();
  await expect(card.getByRole("button", { name: "Working" })).toHaveClass(/active/);

  await card.getByLabel("Desired").selectOption("must");
  await card.getByLabel("Effort").selectOption("small");
  await card.getByLabel("Owner").fill("Agent 13");
  await card.getByLabel("Work state").selectOption("needs_retest");
  await card.getByRole("button", { name: "Save coordination" }).click();
  await card.getByLabel("Comment on Review launches in vanilla Neutron").fill("Packaged workflow verified.");
  await card.getByRole("button", { name: "Comment" }).click();
  await expect(card.getByText("Packaged workflow verified.")).toBeVisible();

  const beforeReload = await callReviewTool(page, "review_catalog", {});
  expect(beforeReload.atoms).toHaveLength(1);
  expect(beforeReload.atoms[0].title).toBe("Packaged Review Gate");
  expect(beforeReload.atoms[0].currentSequence).toBe(5);

  await page.reload({ waitUntil: "domcontentloaded" });
  await login(page);
  harness = await openReview(page);
  await expect(harness.review.getByRole("heading", { name: "Packaged Review Gate" })).toBeVisible();
  await expect(harness.review.getByText("Review launches in vanilla Neutron", { exact: true })).toBeVisible();
  const afterReload = await callReviewTool(page, "review_catalog", {});
  expect(afterReload.atoms[0].atomId).toBe(beforeReload.atoms[0].atomId);
  expect(afterReload.atoms[0].currentRevision).toBe(beforeReload.atoms[0].currentRevision);
});
