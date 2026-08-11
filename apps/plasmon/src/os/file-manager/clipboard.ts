import type { FsNode, FsService, NodeId } from "../contracts/index.ts";
import { FileOperationClipboard } from "./model.ts";
import {
  collisionFreeName,
  normalizedSiblingName,
  parseNameFamily,
  splitNameExtension,
} from "./naming.ts";

export const normalizedCollisionName = normalizedSiblingName;
export const splitCopyName = splitNameExtension;
export { parseNameFamily };

export function collisionFreeCopyName(
  originalName: string,
  isDirectory: boolean,
  occupiedNames: ReadonlySet<string>,
): string {
  return collisionFreeName(originalName, isDirectory, occupiedNames);
}

export async function pasteClipboardCollisionAware(
  fs: FsService,
  destinationId: NodeId,
  clipboard: FileOperationClipboard,
): Promise<readonly FsNode[]> {
  const snapshot = clipboard.snapshot();
  if (!snapshot) return [];

  if (snapshot.mode === "cut") {
    const moved: FsNode[] = [];
    for (const id of snapshot.ids) {
      const result = await fs.move(id, destinationId);
      moved.push(result);
      clipboard.remove([id]);
    }
    return moved;
  }

  const occupied = new Set((await fs.list(destinationId)).map((node) => normalizedCollisionName(node.name)));
  const copied: FsNode[] = [];
  for (const id of snapshot.ids) {
    const source = await fs.stat(id);
    const name = collisionFreeCopyName(source.name, source.kind === "directory", occupied);
    const result = name === source.name
      ? await fs.copy(id, destinationId)
      : await fs.copy(id, destinationId, name);
    copied.push(result);
    occupied.add(normalizedCollisionName(result.name));
    occupied.add(normalizedCollisionName(name));
  }
  return copied;
}
