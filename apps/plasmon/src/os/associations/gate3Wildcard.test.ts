import { expect, test } from "bun:test";
import type {
  AssociationRegistry,
  FsNode,
  FsService,
  HandlerDefinition,
  JsonValue,
  NodeId,
  Revision,
} from "../contracts/index.ts";
import type { AssociationDefaultStore } from "./defaults.ts";
import { MemoryAssociationDefaultStore } from "./defaults.ts";
import { FsServiceAssociationDefaultStore, FS_ASSOCIATION_DEFAULTS_METADATA_KEY } from "./fsDefaults.ts";
import { OpenWithServiceModel } from "./openWith.ts";
import { HandlerAssociationRegistry } from "./registry.ts";

function handler(id: string): HandlerDefinition {
  return { id, kind: "native", name: id, icon: "system:test", capabilities: ["read"] };
}

function node(name: string, mime: string, metadata: Record<string, JsonValue> = {}): FsNode {
  return {
    id: `node:${name}`,
    parentId: "root",
    name,
    kind: "file",
    mime,
    size: 0,
    createdAt: 1,
    modifiedAt: 1,
    metadata,
  };
}

function registerSpecificAndWildcard(
  registry: HandlerAssociationRegistry,
  specificId: string,
  mime: string,
): void {
  registry.registerHandler(handler(specificId));
  registry.registerHandler(handler("native:text"));
  registry.registerRule({ id: `specific:${mime}`, handlerId: specificId, mimeTypes: [mime], priority: 100 });
  registry.registerRule({ id: "text:wildcard", handlerId: "native:text", mimeTypes: ["*/*"], priority: -1_000_000 });
}

const noopOpenService = { async open() {} };

test("specific MIME handler precedes a low-priority */* alternate and both are returned", async () => {
  const registry = new HandlerAssociationRegistry();
  registerSpecificAndWildcard(registry, "native:photos", "image/png");
  expect((await registry.resolve(node("photo.png", "image/png"))).map(({ id }) => id)).toEqual([
    "native:photos",
    "native:text",
  ]);
});

test("text/plain specific handler precedes the */* alternate", async () => {
  const registry = new HandlerAssociationRegistry();
  registerSpecificAndWildcard(registry, "native:text-editor", "text/plain");
  expect((await registry.resolve(node("notes.txt", "text/plain"))).map(({ id }) => id)).toEqual([
    "native:text-editor",
    "native:text",
  ]);
});

test("application/octet-stream exposes the */* alternate after its specific handler", async () => {
  const registry = new HandlerAssociationRegistry();
  registerSpecificAndWildcard(registry, "native:binary", "application/octet-stream");
  expect((await registry.resolve(node("blob.bin", "application/octet-stream"))).map(({ id }) => id)).toEqual([
    "native:binary",
    "native:text",
  ]);
});

test("public OpenWith model can persist a wildcard-backed MIME default without a consumer downcast", async () => {
  const defaults = new MemoryAssociationDefaultStore();
  const concrete = new HandlerAssociationRegistry({ defaults });
  registerSpecificAndWildcard(concrete, "native:photos", "image/png");

  const registry: AssociationRegistry = concrete;
  const openWith = new OpenWithServiceModel(registry, noopOpenService);
  const image = node("photo.png", "image/png");

  expect((await openWith.model(image)).candidates.map(({ handler: candidate }) => candidate.id)).toEqual([
    "native:photos",
    "native:text",
  ]);
  expect(await openWith.setDefault(image, "native:text")).toBe("mime:image/png");
  expect((await registry.resolve(image)).map(({ id }) => id)).toEqual(["native:text", "native:photos"]);

  await defaults.delete("mime:image/png");
  expect((await registry.resolve(image)).map(({ id }) => id)).toEqual(["native:photos", "native:text"]);
});

test("public OpenWith model performs one-off opening without persisting a default", async () => {
  const concrete = new HandlerAssociationRegistry();
  registerSpecificAndWildcard(concrete, "native:photos", "image/png");
  const registry: AssociationRegistry = concrete;
  const calls: string[] = [];
  const openWith = new OpenWithServiceModel(registry, {
    async open(handlerId) { calls.push(handlerId); },
  });
  const image = node("photo.png", "image/png");

  await openWith.open(image, "native:text");
  expect(calls).toEqual(["native:text"]);
  expect((await registry.resolve(image))[0]?.id).toBe("native:photos");
});

class PersistentFakeFs implements FsService {
  private root: FsNode;

  constructor(metadata: Record<string, JsonValue> = {}) {
    this.root = {
      id: "root", parentId: null, name: "", kind: "directory", size: 0,
      createdAt: 1, modifiedAt: 1, metadata: structuredClone(metadata),
    };
  }

  async resolvePath(path: string): Promise<FsNode | null> {
    return path === "/" ? structuredClone(this.root) : null;
  }

  async setMetadata(id: NodeId, patch: Record<string, JsonValue | null>): Promise<FsNode> {
    if (id !== this.root.id) throw new Error("unknown node");
    const metadata = { ...this.root.metadata };
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) delete metadata[key];
      else metadata[key] = structuredClone(value);
    }
    this.root = { ...this.root, metadata, modifiedAt: this.root.modifiedAt + 1 };
    return structuredClone(this.root);
  }

  async stat(): Promise<FsNode> { return structuredClone(this.root); }
  async pathOf(): Promise<string> { throw new Error("unused"); }
  async list(): Promise<FsNode[]> { throw new Error("unused"); }
  async mkdir(): Promise<FsNode> { throw new Error("unused"); }
  async createFile(): Promise<FsNode> { throw new Error("unused"); }
  async read(): Promise<Uint8Array> { throw new Error("unused"); }
  async write(): Promise<FsNode> { throw new Error("unused"); }
  async rename(): Promise<FsNode> { throw new Error("unused"); }
  async move(): Promise<FsNode> { throw new Error("unused"); }
  async copy(): Promise<FsNode> { throw new Error("unused"); }
  async remove(): Promise<void> { throw new Error("unused"); }
  async revision(): Promise<Revision> { return 0n; }
}

test("wildcard-backed user default survives FsService store and registry reconstruction", async () => {
  const fs = new PersistentFakeFs();
  const first = new HandlerAssociationRegistry({ defaults: new FsServiceAssociationDefaultStore(fs) });
  registerSpecificAndWildcard(first, "native:photos", "image/png");
  const image = node("photo.png", "image/png");
  await new OpenWithServiceModel(first, noopOpenService).setDefault(image, "native:text");

  const second = new HandlerAssociationRegistry({ defaults: new FsServiceAssociationDefaultStore(fs) });
  registerSpecificAndWildcard(second, "native:photos", "image/png");
  expect((await second.resolve(image)).map(({ id }) => id)).toEqual(["native:text", "native:photos"]);
});

test("corrupt persisted defaults fail safe and preserve normal candidate ordering", async () => {
  const fs = new PersistentFakeFs({
    [FS_ASSOCIATION_DEFAULTS_METADATA_KEY]: {
      version: 1,
      defaults: { "mime:image/png": 17 },
    } as unknown as JsonValue,
  });
  const registry = new HandlerAssociationRegistry({ defaults: new FsServiceAssociationDefaultStore(fs) });
  registerSpecificAndWildcard(registry, "native:photos", "image/png");
  expect((await registry.resolve(node("photo.png", "image/png"))).map(({ id }) => id)).toEqual([
    "native:photos",
    "native:text",
  ]);
});

test("unavailable default reads fail safe and preserve normal candidate ordering", async () => {
  const unavailable: AssociationDefaultStore = {
    async get() { throw new Error("preference storage unavailable"); },
    async set() { throw new Error("preference storage unavailable"); },
    async delete() { throw new Error("preference storage unavailable"); },
  };
  const registry = new HandlerAssociationRegistry({ defaults: unavailable });
  registerSpecificAndWildcard(registry, "native:photos", "image/png");
  expect((await registry.resolve(node("photo.png", "image/png"))).map(({ id }) => id)).toEqual([
    "native:photos",
    "native:text",
  ]);
});

test("specific image video and text MIME handlers beat the */* alternate", async () => {
  for (const [mime, specificId] of [
    ["image/png", "native:photos"],
    ["video/mp4", "native:video"],
    ["text/plain", "native:text-editor"],
  ] as const) {
    const registry = new HandlerAssociationRegistry();
    registerSpecificAndWildcard(registry, specificId, mime);
    expect((await registry.resolve(node(`resource-${specificId}`, mime))).map(({ id }) => id)).toEqual([
      specificId,
      "native:text",
    ]);
  }
});

test("per-node metadata.opensWith remains stronger than MIME rules and type-wide defaults", async () => {
  const defaults = new MemoryAssociationDefaultStore();
  const registry = new HandlerAssociationRegistry({ defaults });
  registerSpecificAndWildcard(registry, "native:photos", "image/png");
  await defaults.set("mime:image/png", "native:photos");

  const image = node("photo.png", "image/png", { opensWith: "native:text" });
  expect((await registry.resolve(image)).map(({ id }) => id)).toEqual(["native:text", "native:photos"]);
});
