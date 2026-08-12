import type { FsNode, NodeId } from "../contracts/index.ts";
import type { OpenFilesystemNodeOptions } from "../fs/index.ts";

/** Public opening authority consumed by FileManager without owning resource semantics. */
export interface FileManagerOpenAuthority {
  openNode(nodeId: NodeId, options?: OpenFilesystemNodeOptions): Promise<void>;
}

export interface FileManagerActivationOptions {
  onOpenDirectory?: (node: FsNode) => void | Promise<void>;
}

/**
 * Thin production adapter from FileManager activation to the canonical
 * filesystem open authority. React callers may supply presentation-owned
 * directory navigation, but resource-kind policy remains in the dispatcher.
 */
export function activateFileManagerNode(
  authority: FileManagerOpenAuthority,
  node: FsNode,
  options: FileManagerActivationOptions = {},
): Promise<void> {
  return authority.openNode(
    node.id,
    options.onOpenDirectory ? { onOpenDirectory: options.onOpenDirectory } : {},
  );
}
