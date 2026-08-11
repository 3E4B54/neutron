import type { FsNode, FsService, NodeId } from "../contracts/index.ts";

export interface DeleteResult {
  deletedIds: readonly NodeId[];
}

/**
 * Gate 3 still performs permanent removal. Keeping this operation behind one
 * boundary lets a future Recycle Bin redirect deletion without changing every
 * FileManager command surface.
 */
export async function deleteFilesystemNodes(
  fs: FsService,
  nodes: readonly FsNode[],
): Promise<DeleteResult> {
  const deletedIds: NodeId[] = [];
  for (const node of nodes) {
    await fs.remove(node.id, node.kind === "directory" ? { recursive: true } : undefined);
    deletedIds.push(node.id);
  }
  return { deletedIds };
}
