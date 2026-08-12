# Text / Monaco editor

Text is the Plasmon native text/code editor built around a packaged Monaco editor surface and an FsService-backed document session.

`document.ts` owns document loading, stable reads, dirty/save/autosave, conflict detection, reload/overwrite, Save As, and persistence semantics. `useDocumentSession.ts` adapts that production session to React. `MonacoEditorSurface.tsx` and the Monaco adapter/environment files own editor-engine initialization/workers and browser integration. `editorModel.ts`/`editorChrome.ts` hold reusable editor presentation/model helpers.

Filesystem persistence and document conflict semantics must remain independent of Monaco engine lifecycle so they can be tested without a browser.

## Refactor direction

Continue sharing document-session, command, status, and editor-chrome infrastructure with Markdown/other document apps. Keep Monaco-specific adapters isolated from generic document semantics and expose mature editor capabilities through reusable command models/UI rather than app-specific shortcuts only.

Shared language/type metadata should come from common association/content metadata rather than a Text-only extension table when other OS surfaces need the same answer.

## Testing

Use fast tests for document sessions, conflicts/save/reopen, editor models/commands, language/type mapping, and adapter configuration. Use real-browser/package tests for Monaco creation/readiness, workers/assets, focus/selection, keyboard commands, and rendered editor behavior.

The packaged golden-path acceptance creates a real `.txt` document through Explorer, opens it through normal filesystem association/process/window routing, waits for the semantic Monaco readiness contract (`data-editor-engine="monaco"`, `data-editor-ready="true"`, and the `Text content` editor label), edits and saves through the production document session, then closes/reopens and verifies the persisted text from the rendered Monaco model. Keep deterministic save/conflict/session cases in fast tests rather than expanding that browser journey.
