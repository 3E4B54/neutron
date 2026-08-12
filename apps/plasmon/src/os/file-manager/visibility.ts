import type {
  CreateFileOptions,
  FsListOptions,
  FsNode,
  FsReadRange,
  FsService,
  JsonValue,
  NodeId,
  Revision,
  WriteOptions,
} from "../contracts/index.ts";

export interface FileManagerDirectoryListOptions {
  sort?: FsListOptions["sort"];
  showHiddenFiles?: boolean;
}

/**
 * FileManager chooses whether hidden resources are presented, while FsService
 * remains authoritative for what counts as hidden. This helper never infers
 * visibility from names or metadata; it only requests the canonical list mode.
 */
export async function listFileManagerDirectory(
  fs: FsService,
  directoryId: NodeId,
  options: FileManagerDirectoryListOptions = {},
): Promise<FsNode[]> {
  const directory = await fs.stat(directoryId);
  if (directory.kind !== "directory") throw new Error(`${directory.name} is not a directory`);
  return fs.list(directoryId, {
    ...(options.sort ? { sort: options.sort } : {}),
    includeHidden: options.showHiddenFiles === true,
  });
}

/**
 * Presentation-only FsService view for the shared FileManager. Every operation
 * delegates unchanged except list(), which selects the canonical includeHidden
 * mode. Hidden classification remains entirely owned by the delegate FsService.
 */
export class FileManagerVisibilityFsService implements FsService {
  constructor(
    private readonly delegate: FsService,
    readonly showHiddenFiles: boolean,
  ) {}

  stat(id: NodeId): Promise<FsNode> { return this.delegate.stat(id); }
  resolvePath(path: string): Promise<FsNode | null> { return this.delegate.resolvePath(path); }
  pathOf(id: NodeId): Promise<string> { return this.delegate.pathOf(id); }
  list(parentId: NodeId, options: FsListOptions = {}): Promise<FsNode[]> {
    return listFileManagerDirectory(this.delegate, parentId, {
      ...(options.sort ? { sort: options.sort } : {}),
      showHiddenFiles: this.showHiddenFiles,
    });
  }
  mkdir(parentId: NodeId, name: string): Promise<FsNode> { return this.delegate.mkdir(parentId, name); }
  createFile(parentId: NodeId, name: string, options?: CreateFileOptions): Promise<FsNode> {
    return this.delegate.createFile(parentId, name, options);
  }
  read(id: NodeId, range?: FsReadRange): Promise<Uint8Array> { return this.delegate.read(id, range); }
  write(id: NodeId, bytes: Uint8Array, options?: WriteOptions): Promise<FsNode> {
    return this.delegate.write(id, bytes, options);
  }
  rename(id: NodeId, newName: string): Promise<FsNode> { return this.delegate.rename(id, newName); }
  move(id: NodeId, newParentId: NodeId): Promise<FsNode> { return this.delegate.move(id, newParentId); }
  copy(id: NodeId, newParentId: NodeId, name?: string): Promise<FsNode> {
    return this.delegate.copy(id, newParentId, name);
  }
  remove(id: NodeId, options?: { recursive?: boolean }): Promise<void> { return this.delegate.remove(id, options); }
  setMetadata(id: NodeId, patch: Record<string, JsonValue | null>): Promise<FsNode> {
    return this.delegate.setMetadata(id, patch);
  }
  revision(): Promise<Revision> { return this.delegate.revision(); }
}
