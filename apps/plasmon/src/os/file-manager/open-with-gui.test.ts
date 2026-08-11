import { expect, test } from "bun:test";
import type {
  FsNode,
  FsService,
  HandlerDefinition,
  JsonValue,
  NodeId,
  Revision,
} from "../contracts/index.ts";
import {
  FsServiceAssociationDefaultStore,
  HandlerAssociationRegistry,
  OpenWithServiceModel,
} from "../associations/index.ts";
import { openNodeWithAssociations } from "./model.ts";
import {
  handleOpenWithDialogPointerDown,
  openWithErrorMessage,
  runOpenWithDialogAction,
  selectOpenWithHandler,
} from "./openWithDialog.ts";

function handler(id: string): HandlerDefinition {
  return { id, kind: "native", name: id, icon: "system:test", capabilities: ["read"] };
}

function photoNode(): FsNode {
  return {
    id: "photo",
    parentId: "root",
    name: "photo.png",
    kind: "file",
    mime: "image/png",
    size: 0,
    createdAt: 1,
    modifiedAt: 1,
    metadata: {},
  };
}

class OpenWithGuiFs implements FsService {
  private readonly nodes = new Map<NodeId, FsNode>();
  failMetadataWrites = false;

  constructor() {
    this.nodes.set("root", {
      id: "root",
      parentId: null,
      name: "",
      kind: "directory",
      size: 0,
      createdAt: 1,
      modifiedAt: 1,
      metadata: {},
    });
    this.nodes.set("photo", photoNode());
  }

  rootMetadata(): Record<string, JsonValue> {
    return structuredClone(this.nodes.get("root")?.metadata ?? {});
  }

  async stat(id: NodeId): Promise<FsNode> {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Unknown node: ${id}`);
    return structuredClone(node);
  }

  async resolvePath(path: string): Promise<FsNode | null> {
    return path === "/" ? this.stat("root") : null;
  }

  async setMetadata(id: NodeId, patch: Record<string, JsonValue | null>): Promise<FsNode> {
    if (this.failMetadataWrites) throw new Error("synthetic default persistence failure");
    const node = await this.stat(id);
    const metadata = { ...node.metadata };
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) delete metadata[key];
      else metadata[key] = structuredClone(value);
    }
    const changed = { ...node, metadata, modifiedAt: node.modifiedAt + 1 };
    this.nodes.set(id, changed);
    return structuredClone(changed);
  }

  async pathOf(): Promise<string> { throw new Error("unused"); }
  async list(): Promise<FsNode[]> { throw new Error("unused"); }
  async mkdir(): Promise<FsNode> { throw new Error("unused"); }
  async createFile(): Promise<FsNode> { throw new Error("unused"); }
  async read(): Promise<Uint8Array> { return new Uint8Array(); }
  async write(): Promise<FsNode> { throw new Error("unused"); }
  async rename(): Promise<FsNode> { throw new Error("unused"); }
  async move(): Promise<FsNode> { throw new Error("unused"); }
  async copy(): Promise<FsNode> { throw new Error("unused"); }
  async remove(): Promise<void> { throw new Error("unused"); }
  async revision(): Promise<Revision> { return 1n; }
}

function registerOpenWithHandlers(registry: HandlerAssociationRegistry): void {
  registry.registerHandler(handler("native:photos"));
  registry.registerHandler(handler("native:text"));
  registry.registerRule({
    id: "photos:image-png",
    handlerId: "native:photos",
    mimeTypes: ["image/png"],
    priority: 100,
  });
  registry.registerRule({
    id: "text:any-mime",
    handlerId: "native:text",
    mimeTypes: ["*/*"],
    priority: -1_000_000,
  });
}

test("handler-row selection and modal pointer boundary behave like the packaged dialog", () => {
  let selected = "native:photos";
  selectOpenWithHandler("native:text", (handlerId) => { selected = handlerId; });
  expect(selected).toBe("native:text");

  const backdrop = {} as EventTarget;
  const row = {} as EventTarget;
  let stopped = 0;
  let closed = 0;

  handleOpenWithDialogPointerDown({
    target: row,
    currentTarget: backdrop,
    stopPropagation() { stopped += 1; },
  }, () => { closed += 1; });
  expect(stopped).toBe(1);
  expect(closed).toBe(0);

  handleOpenWithDialogPointerDown({
    target: backdrop,
    currentTarget: backdrop,
    stopPropagation() { stopped += 1; },
  }, () => { closed += 1; });
  expect(stopped).toBe(2);
  expect(closed).toBe(1);
});

test("one-off Open uses the selected handler, closes, and does not change the default", async () => {
  const fs = new OpenWithGuiFs();
  const registry = new HandlerAssociationRegistry({ defaults: new FsServiceAssociationDefaultStore(fs) });
  registerOpenWithHandlers(registry);
  const opened: string[] = [];
  const service = new OpenWithServiceModel(registry, {
    async open(handlerId) { opened.push(handlerId); },
  });
  let closed = 0;

  expect((await registry.resolve(photoNode()))[0]?.id).toBe("native:photos");
  expect(await runOpenWithDialogAction({
    fs,
    nodeId: "photo",
    service,
    handlerId: "native:text",
    action: "open",
    onClose: () => { closed += 1; },
  })).toBeNull();

  expect(opened).toEqual(["native:text"]);
  expect(closed).toBe(1);
  expect((await registry.resolve(photoNode()))[0]?.id).toBe("native:photos");
});

test("Set default persists, closes, and reopening dispatches through the persisted handler", async () => {
  const fs = new OpenWithGuiFs();
  const first = new HandlerAssociationRegistry({ defaults: new FsServiceAssociationDefaultStore(fs) });
  registerOpenWithHandlers(first);
  const firstService = new OpenWithServiceModel(first, { async open() {} });
  const callbacks: string[] = [];

  expect(await runOpenWithDialogAction({
    fs,
    nodeId: "photo",
    service: firstService,
    handlerId: "native:text",
    action: "default",
    onClose: () => { callbacks.push("close"); },
    onChanged: () => { callbacks.push("changed"); },
  })).toBe("mime:image/png");
  expect(callbacks).toEqual(["close", "changed"]);
  expect(fs.rootMetadata()["plasmon.association.defaults.v1"]).toEqual({
    version: 1,
    defaults: { "mime:image/png": "native:text" },
  });

  const reconstructed = new HandlerAssociationRegistry({ defaults: new FsServiceAssociationDefaultStore(fs) });
  registerOpenWithHandlers(reconstructed);
  expect((await reconstructed.resolve(photoNode())).map(({ id }) => id)).toEqual([
    "native:text",
    "native:photos",
  ]);

  const reopened: string[] = [];
  await openNodeWithAssociations(fs, reconstructed, {
    async open(handlerId) { reopened.push(handlerId); },
  }, "photo");
  expect(reopened).toEqual(["native:text"]);
});

test("Open With action errors propagate for the dialog to surface and do not close it", async () => {
  const fs = new OpenWithGuiFs();
  const registry = new HandlerAssociationRegistry({ defaults: new FsServiceAssociationDefaultStore(fs) });
  registerOpenWithHandlers(registry);
  const service = new OpenWithServiceModel(registry, {
    async open() { throw new Error("synthetic open failure"); },
  });
  let closed = 0;

  let openError: unknown;
  try {
    await runOpenWithDialogAction({
      fs,
      nodeId: "photo",
      service,
      handlerId: "native:text",
      action: "open",
      onClose: () => { closed += 1; },
    });
  } catch (cause: unknown) {
    openError = cause;
  }
  expect(openWithErrorMessage(openError)).toBe("synthetic open failure");
  expect(closed).toBe(0);

  fs.failMetadataWrites = true;
  let defaultError: unknown;
  try {
    await runOpenWithDialogAction({
      fs,
      nodeId: "photo",
      service,
      handlerId: "native:text",
      action: "default",
      onClose: () => { closed += 1; },
    });
  } catch (cause: unknown) {
    defaultError = cause;
  }
  expect(openWithErrorMessage(defaultError)).toBe("synthetic default persistence failure");
  expect(closed).toBe(0);
});
