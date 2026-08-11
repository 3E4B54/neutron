import type { FsNode, FsService, NodeId, WriteOptions } from "../contracts/index.ts";
import { ManagedFsService } from "./managed.ts";
import { classifyResource, resourceCapabilities } from "./resourcePolicy.ts";

function protectedOperationError(node: FsNode, operation: string): Error {
  const classification = classifyResource(node);
  if (classification.kind === "neutron-app" && operation === "deleted") {
    return new Error(`${node.name} is an installed application; use Uninstall instead`);
  }
  return new Error(`${node.name || "This resource"} is protected and cannot be ${operation}`);
}

/**
 * User-facing FsService facade. Raw FsService remains available only to core
 * reconciliation/Trash internals that intentionally perform privileged system
 * mutations.
 */
export class ProtectedManagedFsService extends ManagedFsService {
  constructor(delegate: FsService) {
    super(delegate);
  }

  override async rename(id: NodeId, newName: string): Promise<FsNode> {
    const node = await this.stat(id);
    if (!resourceCapabilities(node).rename) throw protectedOperationError(node, "renamed");
    return super.rename(id, newName);
  }

  override async move(id: NodeId, newParentId: NodeId): Promise<FsNode> {
    const node = await this.stat(id);
    if (!resourceCapabilities(node).move) throw protectedOperationError(node, "moved");
    return super.move(id, newParentId);
  }

  override async copy(id: NodeId, newParentId: NodeId, name?: string): Promise<FsNode> {
    const node = await this.stat(id);
    if (!resourceCapabilities(node).copy) throw protectedOperationError(node, "copied");
    return super.copy(id, newParentId, name);
  }

  override async remove(id: NodeId, options?: { recursive?: boolean }): Promise<void> {
    const node = await this.stat(id);
    if (!resourceCapabilities(node).delete) throw protectedOperationError(node, "deleted");
    return super.remove(id, options);
  }

  override async write(id: NodeId, bytes: Uint8Array, options?: WriteOptions): Promise<FsNode> {
    const node = await this.stat(id);
    const classification = classifyResource(node);
    if (
      classification.kind === "system-app"
      || classification.kind === "neutron-app"
      || classification.ownership === "system-required"
    ) {
      throw protectedOperationError(node, "modified");
    }
    return super.write(id, bytes, options);
  }
}
