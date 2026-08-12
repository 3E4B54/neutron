import { expect, test } from "bun:test";
import type {
  CreateFileOptions,
  FsListOptions,
  FsNode,
  FsReadRange,
  FsService,
  JsonValue,
  NodeId,
  Revision,
  WriteOptions,
} from "../contracts/index.ts";
import {
  ManagedFsService,
  MemoryFsRepository,
  PersistentFsService,
} from "../fs/index.ts";
import {
  DEFAULT_FILE_MANAGER_PREFERENCES,
  FILE_MANAGER_PREFERENCES_KEY,
  FileManagerPreferenceStore,
} from "./preferences.ts";
import { FileManagerVisibilityFsService } from "./visibility.ts";

function requireDirectory(node: FsNode | null, path: string): FsNode {
  if (!node || node.kind !== "directory") throw new Error(`${path} directory is unavailable`);
  return node;
}

test("Show Hidden Files defaults off and persists through filesystem reconstruction", async () => {
  const repository = new MemoryFsRepository();
  const firstFs = new PersistentFsService(repository);
  const firstStore = new FileManagerPreferenceStore(firstFs);

  expect(await firstStore.load()).toEqual(DEFAULT_FILE_MANAGER_PREFERENCES);
  await firstStore.save({ version: 1, showHiddenFiles: true });

  const storedRoot = requireDirectory(await firstFs.resolvePath("/"), "/");
  expect(storedRoot.metadata[FILE_MANAGER_PREFERENCES_KEY]).toEqual({
    version: 1,
    showHiddenFiles: true,
  });

  const secondFs = new PersistentFsService(repository);
  const secondStore = new FileManagerPreferenceStore(secondFs);
  expect(await secondStore.load()).toEqual({ version: 1, showHiddenFiles: true });

  await secondStore.save({ version: 1, showHiddenFiles: false });
  const thirdFs = new PersistentFsService(repository);
  expect(await new FileManagerPreferenceStore(thirdFs).load()).toEqual({
    version: 1,
    showHiddenFiles: false,
  });
});

test("FileManager directory presentation consumes canonical filesystem hidden semantics", async () => {
  const rawFs = new PersistentFsService(new MemoryFsRepository());
  const documents = requireDirectory(await rawFs.resolvePath("/Documents"), "/Documents");
  await rawFs.createFile(documents.id, "visible.txt", { mime: "text/plain" });
  await rawFs.createFile(documents.id, ".canonical-hidden.txt", { mime: "text/plain" });
  const fs = new ManagedFsService(rawFs);

  const hiddenOff = await new FileManagerVisibilityFsService(fs, false).list(documents.id, { sort: "name" });
  expect(hiddenOff.map((node) => node.name)).toContain("visible.txt");
  expect(hiddenOff.map((node) => node.name)).not.toContain(".canonical-hidden.txt");

  const hiddenOn = await new FileManagerVisibilityFsService(fs, true).list(documents.id, { sort: "name" });
  expect(hiddenOn.map((node) => node.name)).toContain("visible.txt");
  expect(hiddenOn.map((node) => node.name)).toContain(".canonical-hidden.txt");
});

class ListingContractFs implements FsService {
  readonly calls: FsListOptions[] = [];
  readonly root: FsNode = {
    id: "root",
    parentId: null,
    name: "",
    kind: "directory",
    size: 0,
    createdAt: 0,
    modifiedAt: 0,
    metadata: {},
  };
  readonly child: FsNode = {
    id: "child",
    parentId: "root",
    name: ".returned-by-authority",
    kind: "file",
    size: 0,
    createdAt: 0,
    modifiedAt: 0,
    metadata: { hidden: false },
  };

  async stat(id: NodeId): Promise<FsNode> {
    if (id === this.root.id) return structuredClone(this.root);
    if (id === this.child.id) return structuredClone(this.child);
    throw new Error(`Unknown node: ${id}`);
  }

  async resolvePath(path: string): Promise<FsNode | null> {
    return path === "/" ? structuredClone(this.root) : null;
  }

  async pathOf(id: NodeId): Promise<string> {
    if (id === this.root.id) return "/";
    if (id === this.child.id) return `/${this.child.name}`;
    throw new Error(`Unknown node: ${id}`);
  }

  async list(_parentId: NodeId, options: FsListOptions = {}): Promise<FsNode[]> {
    this.calls.push({ ...options });
    return [structuredClone(this.child)];
  }

  async mkdir(_parentId: NodeId, _name: string): Promise<FsNode> { throw new Error("not used"); }
  async createFile(_parentId: NodeId, _name: string, _options?: CreateFileOptions): Promise<FsNode> { throw new Error("not used"); }
  async read(_id: NodeId, _range?: FsReadRange): Promise<Uint8Array> { throw new Error("not used"); }
  async write(_id: NodeId, _bytes: Uint8Array, _options?: WriteOptions): Promise<FsNode> { throw new Error("not used"); }
  async rename(_id: NodeId, _newName: string): Promise<FsNode> { throw new Error("not used"); }
  async move(_id: NodeId, _newParentId: NodeId): Promise<FsNode> { throw new Error("not used"); }
  async copy(_id: NodeId, _newParentId: NodeId, _name?: string): Promise<FsNode> { throw new Error("not used"); }
  async remove(_id: NodeId, _options?: { recursive?: boolean }): Promise<void> { throw new Error("not used"); }
  async setMetadata(_id: NodeId, _patch: Record<string, JsonValue | null>): Promise<FsNode> { throw new Error("not used"); }
  async revision(): Promise<Revision> { return 0n; }
}

test("FileManager does not create a second filename-based hidden policy", async () => {
  const fs = new ListingContractFs();

  const hiddenOff = await new FileManagerVisibilityFsService(fs, false).list(fs.root.id);
  expect(hiddenOff.map((node) => node.name)).toEqual([".returned-by-authority"]);
  expect(fs.calls.at(-1)?.includeHidden).toBe(false);

  const hiddenOn = await new FileManagerVisibilityFsService(fs, true).list(fs.root.id);
  expect(hiddenOn.map((node) => node.name)).toEqual([".returned-by-authority"]);
  expect(fs.calls.at(-1)?.includeHidden).toBe(true);
});
