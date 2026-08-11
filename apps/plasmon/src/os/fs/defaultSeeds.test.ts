// @ts-ignore -- bun:test is available to the repository test runner but excluded from browser tsconfig globals.
import { expect, test } from "bun:test";
import { MemoryFsRepository } from "./repository.ts";
import { PersistentFsService } from "./service.ts";
import { reconcileCoreDesktopSeeds } from "./defaultSeeds.ts";
import { bootstrapFilesystem } from "./managed.ts";
import { readSharedShortcut } from "./shortcut.ts";

test("durable Root and Apps shortcuts seed once and preserve user deletion", async () => {
  const fs = new PersistentFsService(new MemoryFsRepository());
  await bootstrapFilesystem(fs);
  await reconcileCoreDesktopSeeds(fs);

  const rootShortcut = await fs.resolvePath("/Desktop/Root");
  const appsShortcut = await fs.resolvePath("/Desktop/Apps");
  const root = await fs.resolvePath("/");
  const apps = await fs.resolvePath("/Apps");
  expect(rootShortcut).not.toBeNull();
  expect(appsShortcut).not.toBeNull();
  expect(readSharedShortcut(rootShortcut!)?.target).toEqual({ kind: "node", nodeId: root!.id });
  expect(readSharedShortcut(appsShortcut!)?.target).toEqual({ kind: "node", nodeId: apps!.id });

  const appsShortcutId = appsShortcut!.id;
  await reconcileCoreDesktopSeeds(fs);
  expect((await fs.resolvePath("/Desktop/Apps"))?.id).toBe(appsShortcutId);

  await fs.remove(appsShortcutId);
  await reconcileCoreDesktopSeeds(fs);
  expect(await fs.resolvePath("/Desktop/Apps")).toBeNull();
});

test("Recycle Bin shortcut waits for an actual native RecycleBin.sys", async () => {
  const fs = new PersistentFsService(new MemoryFsRepository());
  await bootstrapFilesystem(fs);
  await reconcileCoreDesktopSeeds(fs);
  expect(await fs.resolvePath("/Desktop/Recycle Bin")).toBeNull();
});
