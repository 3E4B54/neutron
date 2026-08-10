import type { JsonValue, NodeId, Revision } from "./common.ts";

export type FsNodeKind = "directory" | "file" | "shortcut" | "atom";

export interface FsNode {
  id: NodeId;
  parentId: NodeId | null;
  name: string;
  kind: FsNodeKind;
  mime?: string;
  size: number;
  contentHash?: string;
  createdAt: number;
  modifiedAt: number;
  metadata: Record<string, JsonValue>;
}

export interface FsListOptions {
  includeHidden?: boolean;
  sort?: "name" | "modified" | "size" | "type";
}

export interface FsReadRange {
  offset: number;
  length: number;
}

export interface CreateFileOptions {
  mime?: string;
  kind?: Exclude<FsNodeKind, "directory">;
  metadata?: Record<string, JsonValue>;
}

/** Supports chunked writes without exposing the backing transport/storage. */
export interface WriteOptions {
  offset?: number;
  truncate?: boolean;
}

export interface FsService {
  stat(id: NodeId): Promise<FsNode>;
  resolvePath(path: string): Promise<FsNode | null>;
  pathOf(id: NodeId): Promise<string>;
  list(parentId: NodeId, options?: FsListOptions): Promise<FsNode[]>;
  mkdir(parentId: NodeId, name: string): Promise<FsNode>;
  createFile(parentId: NodeId, name: string, options?: CreateFileOptions): Promise<FsNode>;
  read(id: NodeId, range?: FsReadRange): Promise<Uint8Array>;
  write(id: NodeId, bytes: Uint8Array, options?: WriteOptions): Promise<FsNode>;
  rename(id: NodeId, newName: string): Promise<FsNode>;
  move(id: NodeId, newParentId: NodeId): Promise<FsNode>;
  copy(id: NodeId, newParentId: NodeId, name?: string): Promise<FsNode>;
  remove(id: NodeId, options?: { recursive?: boolean }): Promise<void>;
  setMetadata(id: NodeId, patch: Record<string, JsonValue | null>): Promise<FsNode>;
  revision(): Promise<Revision>;
}

export type FsEvent =
  | { type: "created"; node: FsNode }
  | { type: "changed"; node: FsNode }
  | { type: "moved"; node: FsNode; oldParentId: NodeId }
  | { type: "removed"; id: NodeId; parentId: NodeId }
  | { type: "reset"; revision: Revision };

export interface FsEventSource {
  subscribe(listener: (event: FsEvent) => void): () => void;
}
