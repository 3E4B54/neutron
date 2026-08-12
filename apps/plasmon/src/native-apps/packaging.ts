export interface BuildMetafileLike {
  outputs: Record<string, { inputs?: Record<string, unknown> }>;
}

const REQUIRED_MAIN_INPUT_SUFFIXES = [
  "/src/native-apps/content-apps.ts",
  "/src/native-apps/text/TextEditor.tsx",
  "/src/native-apps/text/MonacoEditorSurface.tsx",
  "/src/native-apps/markdown/MarkdownEditor.tsx",
  "/src/native-apps/markdown/MarkdownPreview.tsx",
] as const;

const REQUIRED_ENGINE_INPUT_FRAGMENTS = [
  "/node_modules/monaco-editor/",
  "/node_modules/marked/",
  "/node_modules/dompurify/",
] as const;

const REQUIRED_OUTPUT_SUFFIXES = [
  "/dist/web/main.js",
  "/dist/web/main.bundle.css",
  "/dist/web/monaco-workers/editor.worker.js",
  "/dist/web/monaco-workers/json.worker.js",
  "/dist/web/monaco-workers/css.worker.js",
  "/dist/web/monaco-workers/html.worker.js",
  "/dist/web/monaco-workers/ts.worker.js",
] as const;

function normalized(value: string): string {
  return `/${value.replaceAll("\\", "/").replace(/^\.?\//u, "")}`;
}

function hasSuffix(values: readonly string[], suffix: string): boolean {
  return values.some((value) => normalized(value).endsWith(suffix));
}

export function assertMatureNativeAppBundle(metafile: BuildMetafileLike): void {
  const outputs = Object.entries(metafile.outputs);
  const outputPaths = outputs.map(([path]) => path);
  const main = outputs.find(([path]) => normalized(path).endsWith("/dist/web/main.js"));
  if (!main) throw new Error("Native app package build did not emit dist/web/main.js");

  const mainInputs = Object.keys(main[1].inputs ?? {});
  for (const suffix of REQUIRED_MAIN_INPUT_SUFFIXES) {
    if (!hasSuffix(mainInputs, suffix)) {
      throw new Error(`Native app package main bundle is missing ${suffix}`);
    }
  }

  const css = outputs.find(([path]) => normalized(path).endsWith("/dist/web/main.bundle.css"));
  if (!css) throw new Error("Native app package build did not emit dist/web/main.bundle.css");
  const cssInputs = Object.keys(css[1].inputs ?? {});
  if (!cssInputs.some((path) => normalized(path).includes("/node_modules/monaco-editor/"))) {
    throw new Error("Native app package stylesheet is missing Monaco editor CSS");
  }

  const allInputs = outputs.flatMap(([, output]) => Object.keys(output.inputs ?? {}));
  for (const fragment of REQUIRED_ENGINE_INPUT_FRAGMENTS) {
    if (!allInputs.some((path) => normalized(path).includes(fragment))) {
      throw new Error(`Native app package build is missing mature engine input ${fragment}`);
    }
  }

  for (const suffix of REQUIRED_OUTPUT_SUFFIXES) {
    if (!hasSuffix(outputPaths, suffix)) {
      throw new Error(`Native app package build is missing required output ${suffix}`);
    }
  }
}

function replaceEntryAsset(html: string, asset: "main.js" | "main.css", fingerprint: string): string {
  const pattern = new RegExp(`(\\./${asset.replace(".", "\\.")})(?:\\?v=[A-Za-z0-9_-]+)?`, "gu");
  const replaced = html.replace(pattern, `$1?v=${fingerprint}`);
  if (replaced === html) throw new Error(`Packaged index.html does not reference ./${asset}`);
  return replaced;
}

/**
 * Keep stable package filenames while making each built frontend point at the
 * exact JS/CSS bytes that were produced with it. This prevents a hosted browser
 * cache from mixing an older application engine with a newly installed package.
 */
export function cacheBustEntryAssets(html: string, fingerprint: string): string {
  if (!/^[a-f0-9]{12,64}$/u.test(fingerprint)) throw new Error("Invalid frontend build fingerprint");
  return replaceEntryAsset(replaceEntryAsset(html, "main.js", fingerprint), "main.css", fingerprint);
}
