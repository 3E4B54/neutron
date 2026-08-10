import type { NodeId, ShareId } from "./common.ts";
import type { FsNode } from "./fs.ts";
import type {
  IssuedResourceGrant,
  ResourceRef,
  ResourceRight,
} from "./authorization.ts";

export interface PublishResourceOptions {
  mode: "snapshot";
}

export interface PublishedResource {
  nodeId: NodeId;
  resource: ResourceRef;
  createdAt: number;
}

/**
 * Stable-memory/resource publication boundary. This provider owns snapshotting,
 * chunking, dedupe, integrity and resource revisions. It does not issue bearer
 * grants or implement authorization/revocation policy.
 */
export interface SharedResourceProvider {
  publish(nodeId: NodeId, options?: PublishResourceOptions): Promise<PublishedResource>;
  importResource(resource: ResourceRef, destination: NodeId): Promise<FsNode>;
}

export interface ShareOptions {
  mode: "snapshot";
  rights?: readonly ResourceRight[];
  audience?: string;
  expiresAt?: number;
}

/** Persistable share metadata. Bearer tokens are intentionally not stored here. */
export interface ShareRecord {
  id: ShareId;
  nodeId: NodeId;
  resource: ResourceRef;
  grantId: string;
  url: string;
  createdAt: number;
}

/** Public descriptor name used by shell/properties consumers. */
export type ShareDescriptor = ShareRecord;

/** One-time share creation result containing the authorization provider output. */
export interface CreatedShare {
  record: ShareRecord;
  grant: IssuedResourceGrant;
}

/**
 * High-level orchestration. Implementations compose FsService,
 * SharedResourceProvider and ResourceAuthorizationService. Authorization
 * semantics remain owned by the authorization service (MTN in production).
 */
export interface ShareService {
  share(nodeId: NodeId, options?: ShareOptions): Promise<CreatedShare>;
  revoke(id: ShareId): Promise<void>;
  importShare(token: string, destination: NodeId): Promise<FsNode>;
}
