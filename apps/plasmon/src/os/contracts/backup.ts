export interface BackupManifest {
  format: "plasmon.backup";
  version: 1;
  createdAt: number;
  nodeCount: number;
  totalBytes: number;
}

export interface BackupService {
  exportPortable(): Promise<Blob>;
  exportRawDatabase?(): Promise<Blob>;
  inspect(file: File): Promise<BackupManifest>;
  importPortable(file: File, mode: "replace" | "merge"): Promise<void>;
}
