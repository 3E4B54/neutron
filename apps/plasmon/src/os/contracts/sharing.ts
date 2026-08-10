import type { NodeId, ShareId } from "./common.ts";
import type { FsNode } from "./fs.ts";

export interface ShareOptions {
  mode: "snapshot";
  expiresAt?: number;
}

export interface ShareRecord {
  id: ShareId;
  nodeId: NodeId;
  capabilityToken: string;
  url: string;
  createdAt: number;
}

export interface ShareService {
  share(nodeId: NodeId, options?: ShareOptions): Promise<ShareRecord>;
  revoke(id: ShareId): Promise<void>;
  importShare(token: string, destination: NodeId): Promise<FsNode>;
}
