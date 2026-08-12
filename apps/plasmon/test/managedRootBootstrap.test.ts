import { expect, test } from "bun:test";
import type { ExternalElement, FsNode, FsService } from "../src/os/contracts/index.ts";
import {
  MemoryFsRepository,
  OWNERSHIP_METADATA_KEY,
  PersistentFsService,
  PROGRAM_FILES_METADATA_KEY,
  PROGRAM_FILES_RECONCILIATION_VERSION,
  readNeutronAppMetadata,
} from "../src/os/fs/index.ts";
import { createHeadlessPlasmonEnvironment } from "./headlessEnvironment.ts";

const MANAGED_ROOT_ELEMENT: ExternalElement = {
  id: "managed-root-demo",
  name: "Managed Root Demo",
  description: "Headless managed-root reconciliation fixture.",
  version: 1,
  tiles: [{ id: "main", title: "Managed Root Demo" }],
  running: "no",
};

function requireDirectory(node: FsNode | null, path: string): FsNode {
  if (!node || node.kind !== "directory") throw new Error(`${path} directory is unavailable`);
  return node;
}

function requireNode(node: FsNode | null, path: string): FsNode {
  if (!node) throw new Error(`${path} is unavailable`);
  return node;
}

async function expectSingleNamedChild(fs: FsService, parent: FsNode, name: string): Promise<void> {
  const children = await fs.list(parent.id, { includeHidden: true, sort: "name" });
  expect(children.filter((child) => child.name === name)).toHaveLength(1);
}

async function expectManagedRootOwnership(node: FsNode): Promise<void> {
  expect(node.metadata[OWNERSHIP_METADATA_KEY]).toBe("system-required");
}

test("production filesystem composition reconciles managed roots idempotently while preserving user state", async () => {
  const repository = new MemoryFsRepository();

  const first = createHeadlessPlasmonEnvironment({
    repository,
    elements: [MANAGED_ROOT_ELEMENT],
  });

  let systemId = "";
  let startMenuId = "";
  let trashId = "";
  let programFilesId = "";
  let appsId = "";
  let projectionId = "";
  let userDocumentId = "";
  let customStartFolderId = "";
  let stableRevision = 0n;

  try {
    await first.ready;

    const system = requireDirectory(await first.node("/System"), "/System");
    const startMenu = requireDirectory(await first.node("/System/Start Menu"), "/System/Start Menu");
    const trash = requireDirectory(await first.node("/System/.Trash"), "/System/.Trash");
    const programFiles = requireDirectory(await first.node("/System/Program Files"), "/System/Program Files");
    const apps = requireDirectory(await first.node("/Apps"), "/Apps");
    const projection = requireNode(
      await first.node("/Apps/Managed Root Demo.neutron"),
      "/Apps/Managed Root Demo.neutron",
    );

    await expectManagedRootOwnership(system);
    await expectManagedRootOwnership(startMenu);
    await expectManagedRootOwnership(trash);
    await expectManagedRootOwnership(programFiles);
    await expectManagedRootOwnership(apps);
    expect(programFiles.metadata[PROGRAM_FILES_METADATA_KEY]).toEqual({
      format: "plasmon.program-files",
      version: PROGRAM_FILES_RECONCILIATION_VERSION,
    });
    expect(projection.metadata[OWNERSHIP_METADATA_KEY]).toBe("installed-app-projection");
    expect(readNeutronAppMetadata(projection)?.elementId).toBe(MANAGED_ROOT_ELEMENT.id);

    systemId = system.id;
    startMenuId = startMenu.id;
    trashId = trash.id;
    programFilesId = programFiles.id;
    appsId = apps.id;
    projectionId = projection.id;

    const documents = requireDirectory(await first.node("/Documents"), "/Documents");
    const userDocument = await first.services.fs.createFile(documents.id, "preserve-me.txt", {
      mime: "text/plain",
    });
    await first.services.fs.write(
      userDocument.id,
      new TextEncoder().encode("user state survives managed reconciliation"),
      { truncate: true },
    );
    userDocumentId = userDocument.id;

    const customStartFolder = await first.services.fs.mkdir(startMenu.id, "User Tools");
    customStartFolderId = customStartFolder.id;

    stableRevision = await first.services.fs.revision();
  } finally {
    first.dispose();
  }

  const second = createHeadlessPlasmonEnvironment({
    repository,
    elements: [MANAGED_ROOT_ELEMENT],
  });

  try {
    await second.ready;

    expect((await second.node("/System"))?.id).toBe(systemId);
    expect((await second.node("/System/Start Menu"))?.id).toBe(startMenuId);
    expect((await second.node("/System/.Trash"))?.id).toBe(trashId);
    expect((await second.node("/System/Program Files"))?.id).toBe(programFilesId);
    expect((await second.node("/Apps"))?.id).toBe(appsId);
    expect((await second.node("/Apps/Managed Root Demo.neutron"))?.id).toBe(projectionId);
    expect((await second.node("/Documents/preserve-me.txt"))?.id).toBe(userDocumentId);
    expect((await second.node("/System/Start Menu/User Tools"))?.id).toBe(customStartFolderId);
    expect(await second.services.fs.revision()).toBe(stableRevision);

    const system = requireDirectory(await second.node("/System"), "/System");
    const root = requireDirectory(await second.node("/"), "/");
    const apps = requireDirectory(await second.node("/Apps"), "/Apps");
    await expectSingleNamedChild(second.services.fs, root, "System");
    await expectSingleNamedChild(second.services.fs, root, "Apps");
    await expectSingleNamedChild(second.services.fs, system, "Start Menu");
    await expectSingleNamedChild(second.services.fs, system, ".Trash");
    await expectSingleNamedChild(second.services.fs, system, "Program Files");
    const projections = (await second.services.fs.list(apps.id, { includeHidden: true }))
      .filter((node) => readNeutronAppMetadata(node)?.elementId === MANAGED_ROOT_ELEMENT.id);
    expect(projections).toHaveLength(1);
  } finally {
    second.dispose();
  }

  // Simulate repairable persisted-state damage through the real raw filesystem
  // service beneath managed policy. Reinitialization below still goes through
  // the shared production composition; this does not implement reconciliation
  // behavior in the test harness. Start Menu remains part of the identity and
  // preservation proof without asserting a repair contract it does not own.
  const damaged = new PersistentFsService(repository);
  await damaged.setMetadata(systemId, { [OWNERSHIP_METADATA_KEY]: "user" });
  await damaged.setMetadata(trashId, { [OWNERSHIP_METADATA_KEY]: "user" });
  await damaged.setMetadata(programFilesId, {
    [OWNERSHIP_METADATA_KEY]: "user",
    [PROGRAM_FILES_METADATA_KEY]: null,
  });
  await damaged.setMetadata(appsId, { [OWNERSHIP_METADATA_KEY]: null });
  await damaged.rename(projectionId, "Damaged Projection.neutron");
  await damaged.setMetadata(projectionId, { [OWNERSHIP_METADATA_KEY]: "user" });

  const repaired = createHeadlessPlasmonEnvironment({
    repository,
    elements: [MANAGED_ROOT_ELEMENT],
  });

  try {
    await repaired.ready;

    const system = requireDirectory(await repaired.node("/System"), "/System");
    const startMenu = requireDirectory(await repaired.node("/System/Start Menu"), "/System/Start Menu");
    const trash = requireDirectory(await repaired.node("/System/.Trash"), "/System/.Trash");
    const programFiles = requireDirectory(await repaired.node("/System/Program Files"), "/System/Program Files");
    const apps = requireDirectory(await repaired.node("/Apps"), "/Apps");
    const projection = requireNode(
      await repaired.node("/Apps/Managed Root Demo.neutron"),
      "/Apps/Managed Root Demo.neutron",
    );

    expect(system.id).toBe(systemId);
    expect(startMenu.id).toBe(startMenuId);
    expect(trash.id).toBe(trashId);
    expect(programFiles.id).toBe(programFilesId);
    expect(apps.id).toBe(appsId);
    expect(projection.id).toBe(projectionId);

    await expectManagedRootOwnership(system);
    await expectManagedRootOwnership(startMenu);
    await expectManagedRootOwnership(trash);
    await expectManagedRootOwnership(programFiles);
    await expectManagedRootOwnership(apps);
    expect(programFiles.metadata[PROGRAM_FILES_METADATA_KEY]).toEqual({
      format: "plasmon.program-files",
      version: PROGRAM_FILES_RECONCILIATION_VERSION,
    });
    expect(projection.metadata[OWNERSHIP_METADATA_KEY]).toBe("installed-app-projection");
    expect(readNeutronAppMetadata(projection)?.elementId).toBe(MANAGED_ROOT_ELEMENT.id);
    expect(await repaired.node("/Apps/Damaged Projection.neutron")).toBeNull();

    const preservedDocument = requireNode(
      await repaired.node("/Documents/preserve-me.txt"),
      "/Documents/preserve-me.txt",
    );
    expect(preservedDocument.id).toBe(userDocumentId);
    expect(new TextDecoder().decode(await repaired.services.fs.read(preservedDocument.id))).toBe(
      "user state survives managed reconciliation",
    );
    expect((await repaired.node("/System/Start Menu/User Tools"))?.id).toBe(customStartFolderId);

    const root = requireDirectory(await repaired.node("/"), "/");
    await expectSingleNamedChild(repaired.services.fs, root, "System");
    await expectSingleNamedChild(repaired.services.fs, root, "Apps");
    await expectSingleNamedChild(repaired.services.fs, system, "Start Menu");
    await expectSingleNamedChild(repaired.services.fs, system, ".Trash");
    await expectSingleNamedChild(repaired.services.fs, system, "Program Files");
    const projections = (await repaired.services.fs.list(apps.id, { includeHidden: true }))
      .filter((node) => readNeutronAppMetadata(node)?.elementId === MANAGED_ROOT_ELEMENT.id);
    expect(projections).toHaveLength(1);
  } finally {
    repaired.dispose();
  }

  // A persisted projection cannot make itself installed. Reconstructing the
  // same production filesystem against authoritative Neutron discovery with no
  // Elements removes only the projection while retaining the /Apps root and
  // unrelated filesystem state.
  const withoutInstalledElement = createHeadlessPlasmonEnvironment({
    repository,
    elements: [],
  });

  try {
    await withoutInstalledElement.ready;

    const apps = requireDirectory(await withoutInstalledElement.node("/Apps"), "/Apps");
    expect(apps.id).toBe(appsId);
    expect(await withoutInstalledElement.node("/Apps/Managed Root Demo.neutron")).toBeNull();
    const projectedChildren = (await withoutInstalledElement.services.fs.list(apps.id, { includeHidden: true }))
      .filter((node) => readNeutronAppMetadata(node));
    expect(projectedChildren).toHaveLength(0);

    expect((await withoutInstalledElement.node("/System"))?.id).toBe(systemId);
    expect((await withoutInstalledElement.node("/System/Start Menu"))?.id).toBe(startMenuId);
    expect((await withoutInstalledElement.node("/System/.Trash"))?.id).toBe(trashId);
    expect((await withoutInstalledElement.node("/System/Program Files"))?.id).toBe(programFilesId);
    expect((await withoutInstalledElement.node("/Documents/preserve-me.txt"))?.id).toBe(userDocumentId);
    expect((await withoutInstalledElement.node("/System/Start Menu/User Tools"))?.id).toBe(customStartFolderId);
  } finally {
    withoutInstalledElement.dispose();
  }
});
