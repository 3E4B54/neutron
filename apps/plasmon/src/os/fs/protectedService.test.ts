// @ts-ignore -- bun:test is available to the repository test runner but excluded from browser tsconfig globals.
import { expect, test } from "bun:test";
import { MemoryFsRepository } from "./repository.ts";
import { PersistentFsService } from "./service.ts";
import { bootstrapFilesystem } from "./managed.ts";
import { ProtectedManagedFsService } from "./protectedService.ts";

test("generic writes cannot populate Apps, System, Program Files, or Trash", async () => {
  const raw = new PersistentFsService(new MemoryFsRepository());
  await bootstrapFilesystem(raw);
  const fs = new ProtectedManagedFsService(raw);
  const apps = await fs.resolvePath("/Apps");
  const system = await fs.resolvePath("/System");
  const programFiles = await fs.resolvePath("/System/Program Files");
  const trash = await fs.resolvePath("/System/.Trash");
  if (!apps || !system || !programFiles || !trash) throw new Error("bootstrap roots are missing");

  await expect(fs.createFile(apps.id, "Fake.neutron")).rejects.toThrow(/system-managed/u);
  await expect(fs.createFile(system.id, "Fake.sys")).rejects.toThrow(/system-managed/u);
  await expect(fs.mkdir(programFiles.id, "FakeRuntime")).rejects.toThrow(/system-managed/u);
  await expect(fs.createFile(trash.id, "not-trash.txt")).rejects.toThrow(/system-managed/u);
});

test("Start Menu remains user-customizable despite living under System", async () => {
  const raw = new PersistentFsService(new MemoryFsRepository());
  await bootstrapFilesystem(raw);
  const fs = new ProtectedManagedFsService(raw);
  const start = await fs.resolvePath("/System/Start Menu");
  if (!start) throw new Error("Start Menu is missing");
  const folder = await fs.mkdir(start.id, "My Folder");
  expect(await fs.pathOf(folder.id)).toBe("/System/Start Menu/My Folder");
});
