import type { FsNode, FsService, JsonValue, NodeId } from "../contracts/index.ts";

export const FILE_MANAGER_PREFERENCES_KEY = "plasmon.fileManager.preferences.v1";

export interface FileManagerPreferences {
  version: 1;
  showHiddenFiles: boolean;
}

export const DEFAULT_FILE_MANAGER_PREFERENCES: FileManagerPreferences = Object.freeze({
  version: 1,
  showHiddenFiles: false,
});

export function cloneFileManagerPreferences(
  preferences: FileManagerPreferences = DEFAULT_FILE_MANAGER_PREFERENCES,
): FileManagerPreferences {
  return {
    version: 1,
    showHiddenFiles: preferences.showHiddenFiles,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateFileManagerPreferences(value: unknown): FileManagerPreferences | null {
  if (!isRecord(value) || value.version !== 1 || typeof value.showHiddenFiles !== "boolean") return null;
  return { version: 1, showHiddenFiles: value.showHiddenFiles };
}

function preferenceMetadataValue(preferences: FileManagerPreferences): JsonValue {
  return {
    version: 1,
    showHiddenFiles: preferences.showHiddenFiles,
  };
}

function requireFilesystemRoot(root: FsNode | null): FsNode {
  if (!root) throw new Error("Filesystem root is unavailable");
  if (root.kind !== "directory") throw new Error("Filesystem root is not a directory");
  return root;
}

/**
 * Durable FileManager presentation preferences stored through FsService.
 * Hosted Plasmon therefore uses the same filesystem/background persistence
 * boundary as the rest of durable user filesystem state; no browser-local
 * preference authority is introduced here.
 */
export class FileManagerPreferenceStore {
  private rootId: NodeId | null = null;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(private readonly fs: FsService) {}

  async load(): Promise<FileManagerPreferences> {
    const root = requireFilesystemRoot(await this.fs.resolvePath("/"));
    this.rootId = root.id;
    const stored = validateFileManagerPreferences(root.metadata[FILE_MANAGER_PREFERENCES_KEY]);
    return stored ?? cloneFileManagerPreferences();
  }

  save(preferences: FileManagerPreferences): Promise<void> {
    const checked = validateFileManagerPreferences(preferences);
    if (!checked) return Promise.reject(new Error("FileManager preferences are invalid"));

    const write = async (): Promise<void> => {
      const rootId = await this.resolveRootId();
      await this.fs.setMetadata(rootId, {
        [FILE_MANAGER_PREFERENCES_KEY]: preferenceMetadataValue(checked),
      });
    };

    const operation = this.writeChain.then(write);
    this.writeChain = operation.catch(() => undefined);
    return operation;
  }

  private async resolveRootId(): Promise<NodeId> {
    if (this.rootId) return this.rootId;
    const root = requireFilesystemRoot(await this.fs.resolvePath("/"));
    this.rootId = root.id;
    return root.id;
  }
}
