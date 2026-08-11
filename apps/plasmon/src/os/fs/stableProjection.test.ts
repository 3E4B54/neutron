// @ts-ignore -- bun:test is available to the repository test runner but excluded from browser tsconfig globals.
import { expect, test } from "bun:test";
import type { ExternalElement } from "../contracts/index.ts";
import { MemoryFsRepository } from "./repository.ts";
import { PersistentFsService } from "./service.ts";
import { bootstrapFilesystem } from "./managed.ts";
import { StableNeutronProjectionService } from "./stableProjection.ts";

const mail: ExternalElement = {
  id: "mail",
  name: "Mail",
  description: "Mail application",
  version: 1,
  icon: "icon:mail",
  tiles: [{ id: "main", title: "Main" }],
  running: "no",
};

test("identical successful Neutron reconciliation does not churn filesystem revision", async () => {
  const fs = new PersistentFsService(new MemoryFsRepository());
  await bootstrapFilesystem(fs);
  const projections = new StableNeutronProjectionService(fs);
  expect(await projections.reconcile([mail])).toEqual({ created: 1, updated: 0, removed: 0 });
  const first = await fs.resolvePath("/Apps/Mail.neutron");
  const revision = await fs.revision();

  expect(await projections.reconcile([mail])).toEqual({ created: 0, updated: 0, removed: 0 });
  expect(await fs.revision()).toBe(revision);
  expect((await fs.resolvePath("/Apps/Mail.neutron"))?.id).toBe(first?.id);
});
