import { expect, test } from "bun:test";
import { assertMatureNativeAppBundle, cacheBustEntryAssets, type BuildMetafileLike } from "./packaging.ts";

function goodMetafile(): BuildMetafileLike {
  return {
    outputs: {
      "dist/web/main.js": {
        inputs: {
          "src/index.tsx": {},
          "src/native-apps/content-apps.ts": {},
          "src/native-apps/text/TextEditor.tsx": {},
          "src/native-apps/text/MonacoEditorSurface.tsx": {},
          "src/native-apps/markdown/MarkdownEditor.tsx": {},
          "src/native-apps/markdown/MarkdownPreview.tsx": {},
          "node_modules/monaco-editor/esm/vs/editor/editor.main.js": {},
          "node_modules/marked/lib/marked.esm.js": {},
          "node_modules/dompurify/dist/purify.es.mjs": {},
        },
      },
      "dist/web/main.bundle.css": { inputs: {} },
      "dist/web/monaco-workers/editor.worker.js": { inputs: {} },
      "dist/web/monaco-workers/json.worker.js": { inputs: {} },
      "dist/web/monaco-workers/css.worker.js": { inputs: {} },
      "dist/web/monaco-workers/html.worker.js": { inputs: {} },
      "dist/web/monaco-workers/ts.worker.js": { inputs: {} },
    },
  };
}

test("package guard requires mature Text/Markdown engines and Monaco workers", () => {
  expect(() => assertMatureNativeAppBundle(goodMetafile())).not.toThrow();
  const broken = goodMetafile();
  delete broken.outputs["dist/web/main.js"]!.inputs!["src/native-apps/text/MonacoEditorSurface.tsx"];
  expect(() => assertMatureNativeAppBundle(broken)).toThrow("MonacoEditorSurface");
});

test("package guard rejects missing Monaco worker output", () => {
  const broken = goodMetafile();
  delete broken.outputs["dist/web/monaco-workers/ts.worker.js"];
  expect(() => assertMatureNativeAppBundle(broken)).toThrow("ts.worker.js");
});

test("entry asset fingerprint replaces stale query values deterministically", () => {
  const html = '<link rel="stylesheet" href="./main.css?v=old"><script type="module" src="./main.js"></script>';
  const fingerprinted = cacheBustEntryAssets(html, "0123456789abcdef");
  expect(fingerprinted).toContain("./main.css?v=0123456789abcdef");
  expect(fingerprinted).toContain("./main.js?v=0123456789abcdef");
  expect(fingerprinted).not.toContain("?v=old");
});
