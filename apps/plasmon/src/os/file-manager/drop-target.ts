import type { FsNode, NodeId } from "../contracts/index.ts";

export function directoryDropTargetId(
  nodes: readonly FsNode[],
  draggedIds: readonly NodeId[],
  candidateId: NodeId | null | undefined,
): NodeId | null {
  if (!candidateId || draggedIds.includes(candidateId)) return null;
  const target = nodes.find((node) => node.id === candidateId);
  return target?.kind === "directory" ? target.id : null;
}
