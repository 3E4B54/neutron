import type { FsNode, HandlerId, NodeId } from "../contracts/index.ts";

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

export function readSharedShortcut(node: FsNode): SharedShortcut | null {
  if (node.kind !== "shortcut") return null;
  const value = record(node.metadata["plasmon.shortcut"]);
  if (!value || value.format !== "plasmon.shortcut" || value.version !== 1) return null;
  const target = record(value.target);
  if (!target || typeof target.kind !== "string") return null;

  if (target.kind === "native" && typeof target.handlerId === "string") {
    return { format: "plasmon.shortcut", version: 1, target: { kind: "native", handlerId: target.handlerId } };
  }
  if (target.kind === "element" && typeof target.elementId === "string") {
    return {
      format: "plasmon.shortcut",
      version: 1,
      target: {
        kind: "element",
        elementId: target.elementId,
        ...(typeof target.tileId === "string" ? { tileId: target.tileId } : {}),
        ...(typeof target.view === "string" ? { view: target.view } : {}),
      },
    };
  }
  if (target.kind === "node" && typeof target.nodeId === "string") {
    return { format: "plasmon.shortcut", version: 1, target: { kind: "node", nodeId: target.nodeId } };
  }
  if (target.kind === "url" && typeof target.url === "string") {
    return { format: "plasmon.shortcut", version: 1, target: { kind: "url", url: target.url } };
  }
  return null;
}

export function shortcutTypeLabel(node: FsNode): string {
  const shortcut = readSharedShortcut(node);
  if (!shortcut) return "Shortcut";
  if (shortcut.target.kind === "native") return "Application shortcut";
  if (shortcut.target.kind === "element") return "Element shortcut";
  if (shortcut.target.kind === "node") return "File shortcut";
  return "Internet shortcut";
}
