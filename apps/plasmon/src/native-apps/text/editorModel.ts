export interface EditorValueModel { getValue(): string; setValue(value: string): void; }
export function syncEditorModelValue(model: EditorValueModel, nextValue: string): boolean { if (model.getValue() === nextValue) return false; model.setValue(nextValue); return true; }

/**
 * Monaco's model registry is global to the application realm. A semantic
 * document key therefore cannot also be the ownership identity for a live
 * editor surface: two surfaces with the same document key must never dispose
 * or mutate each other's models. The caller supplies a stable per-surface
 * instance id and owns the resulting model for that surface's lifetime.
 */
export function editorModelUri(modelKey: string, instanceId: number): string {
  return `inmemory://plasmon/${encodeURIComponent(modelKey)}?surface=${instanceId}`;
}

export interface DisposableEditorModel {
  dispose(): void;
}

export interface OwnedEditorModel<Model extends DisposableEditorModel> {
  readonly uri: string;
  readonly model: Model;
  dispose(): void;
}

/**
 * Bind one concrete editor model to one live surface. Cleanup is deliberately
 * by exact model instance rather than by looking the semantic document key up
 * in Monaco's global model registry.
 */
export function createOwnedEditorModel<Model extends DisposableEditorModel>(
  modelKey: string,
  instanceId: number,
  createModel: (uri: string) => Model,
): OwnedEditorModel<Model> {
  const uri = editorModelUri(modelKey, instanceId);
  const model = createModel(uri);
  let disposed = false;
  return {
    uri,
    model,
    dispose() {
      if (disposed) return;
      disposed = true;
      model.dispose();
    },
  };
}

const LANGUAGE_BY_EXTENSION: Readonly<Record<string, string>> = Object.freeze({ ".c": "c", ".cc": "cpp", ".cpp": "cpp", ".cxx": "cpp", ".css": "css", ".go": "go", ".h": "cpp", ".hpp": "cpp", ".htm": "html", ".html": "html", ".ini": "ini", ".java": "java", ".js": "javascript", ".cjs": "javascript", ".mjs": "javascript", ".jsx": "javascript", ".json": "json", ".md": "markdown", ".markdown": "markdown", ".py": "python", ".rs": "rust", ".scss": "scss", ".sh": "shell", ".svg": "xml", ".toml": "ini", ".ts": "typescript", ".cts": "typescript", ".mts": "typescript", ".tsx": "typescript", ".txt": "plaintext", ".xml": "xml", ".yaml": "yaml", ".yml": "yaml" });
export function editorLanguageForName(name: string): string { const lower = name.trim().toLowerCase(); const dot = lower.lastIndexOf("."); if (dot < 0) return "plaintext"; return LANGUAGE_BY_EXTENSION[lower.slice(dot)] ?? "plaintext"; }
