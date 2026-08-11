import type { FsNode, FsService, HandlerId, JsonValue, NodeId } from "../contracts/index.ts";
import { OWNERSHIP_METADATA_KEY, type ResourceOwnership } from "./resourcePolicy.ts";

export const SHORTCUT_METADATA_KEY = "plasmon.shortcut";

export type SharedShortcutTarget =
  | { kind: "native"; handlerId: HandlerId }
  | { kind: "element"; elementId: string; tileId?: string; view?: string }
  | { kind: "node"; nodeId: NodeId }
  | { kind: "url"; url: string };

export interface SharedShortcut {
  format: "plasmon.shortcut";
  version: 1;
  target: SharedShortcutTarget;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function parseSharedShortcut(value: unknown): SharedShortcut | null {
  const root = record(value);
  if (!root || root.format !== "plasmon.shortcut" || root.version !== 1) return null;
  const target = record(root.target);
  if (!target) return null;
  switch (target.kind) {
    case "native": {
      const handlerId = text(target.handlerId);
      return handlerId
        ? { format: "plasmon.shortcut", version: 1, target: { kind: "native", handlerId } }
        : null;
    }
    case "element": {
      const elementId = text(target.elementId);
      if (!elementId) return null;
      const tileId = text(target.tileId) ?? undefined;
      const view = text(target.view) ?? undefined;
      return {
        format: "plasmon.shortcut",
        version: 1,
        target: {
          kind: "element",
          elementId,
          ...(tileId ? { tileId } : {}),
          ...(view ? { view } : {}),
        },
      };
    }
    case "node": {
      const nodeId = text(target.nodeId);
      return nodeId
        ? { format: "plasmon.shortcut", version: 1, target: { kind: "node", nodeId } }
        : null;
    }
    case "url": {
      const url = text(target.url);
      return url
        ? { format: "plasmon.shortcut", version: 1, target: { kind: "url", url } }
        : null;
    }
    default:
      return null;
  }
}

export function readSharedShortcut(node: FsNode): SharedShortcut | null {
  return node.kind === "shortcut" ? parseSharedShortcut(node.metadata[SHORTCUT_METADATA_KEY]) : null;
}

export function shortcutMetadata(
  target: SharedShortcutTarget,
  ownership: ResourceOwnership = "user",
): Record<string, JsonValue> {
  return {
    [SHORTCUT_METADATA_KEY]: {
      format: "plasmon.shortcut",
      version: 1,
      target: { ...target },
    },
    [OWNERSHIP_METADATA_KEY]: ownership,
  };
}

export async function uniqueChildName(fs: FsService, parentId: NodeId, preferred: string): Promise<string> {
  const children = await fs.list(parentId, { includeHidden: true, sort: "name" });
  const used = new Set(children.map((node) => node.name.toLocaleLowerCase()));
  if (!used.has(preferred.toLocaleLowerCase())) return preferred;
  for (let index = 1; index < 10_000; index += 1) {
    const candidate = `${preferred} (${index})`;
    if (!used.has(candidate.toLocaleLowerCase())) return candidate;
  }
  throw new Error(`Could not allocate a unique name for ${preferred}`);
}

export interface CreateShortcutOptions {
  name?: string;
  ownership?: ResourceOwnership;
}

export async function createShortcut(
  fs: FsService,
  parentId: NodeId,
  target: SharedShortcutTarget,
  options: CreateShortcutOptions = {},
): Promise<FsNode> {
  let preferred = options.name?.trim();
  if (!preferred) {
    if (target.kind === "node") {
      preferred = (await fs.stat(target.nodeId)).name || "Shortcut";
    } else if (target.kind === "element") {
      preferred = target.elementId;
    } else if (target.kind === "native") {
      preferred = target.handlerId.replace(/^native:/u, "") || "Shortcut";
    } else {
      preferred = "Internet Shortcut";
    }
  }
  const name = await uniqueChildName(fs, parentId, preferred);
  return fs.createFile(parentId, name, {
    kind: "shortcut",
    metadata: shortcutMetadata(target, options.ownership ?? "user"),
  });
}

export function shortcutTypeLabel(node: FsNode): string {
  const shortcut = readSharedShortcut(node);
  if (!shortcut) return "Shortcut";
  if (shortcut.target.kind === "native") return "Application shortcut";
  if (shortcut.target.kind === "element") return "Application shortcut";
  if (shortcut.target.kind === "node") return "File shortcut";
  return "Internet shortcut";
}
