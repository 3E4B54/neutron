# Text / Monaco Editor

Text is the Plasmon native text/code editor. `MonacoEditorSurface.tsx` creates a
real Monaco editor and reports readiness only after `monaco.editor.create`
succeeds. Monaco workers are routed to packaged local worker entrypoints.

`document.ts`/`useDocumentSession.ts` own FsService-backed loading, save,
autosave, Save As, dirty/error/conflict behavior and reopen persistence.

## Product acceptance

- Window title: `<filename> - Monaco Editor`.
- Expose line/column and useful document status in desktop chrome.
- Enable the Monaco minimap/text preview where product UX calls for it.
- Make built-in capabilities such as Find discoverable through menu/UI as well
  as keyboard shortcuts.
- Language mode follows the file type/extension. Shared MIME metadata should be
  expanded so known source files (for example `.js`) agree across Monaco,
  Properties, Search and Open With.
- User-customizable Monaco setup/preferences and runtime assets should have a
  real `/System/Program Files/MonacoEditor` representation.

A source import is not acceptance; packaged UI must show the expected Monaco
behavior and persistence.

Tests include document, model/adapter, engine-readiness and packaged browser
coverage.
