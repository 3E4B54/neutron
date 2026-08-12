# FileManager

`file-manager/**` is the reusable filesystem presentation and interaction layer used by Desktop and Explorer-style applications. It renders authoritative `FsService` state and coordinates selection, rename, clipboard operations, drag/drop, create/import/download, context commands, Properties/Open With presentation, and error reporting.

## Architecture

Deterministic behavior already lives in production helper modules such as:

- `model.ts` — selection, marquee geometry, refresh gating, rename/open helpers, and file-operation state;
- `clipboard.ts` — collision-aware copy/cut/paste behavior;
- `create-import.ts`, `delete.ts`, `download.ts` — filesystem action helpers;
- `keyboard.ts`, `drag.ts`, `drop-target.ts`, `rename.ts` — interaction decisions;
- `properties.tsx` — Properties/Open With presentation.

`FileManager.tsx` connects those models/actions to React state, DOM pointer/keyboard events, dialogs, and rendering.

FileManager is not a filesystem repository and must not grow private application-opening rules. Resource mutations go through filesystem/core services; generic opening goes through shared filesystem/association/opening services.

## Refactor direction

`FileManager.tsx` is a broad orchestration component. Continue extracting action availability/execution, async refresh coordination, context command models, and reusable interaction state into production modules where doing so makes behavior cheaper to test and shared by Desktop/Explorer.

Do not split by historical feature wave or create separate Desktop/Explorer operation stacks. Preserve one set of filesystem actions and capability-aware commands, with React responsible mainly for rendering and translating browser events.

## Testing

Use fast tests for selection/range/marquee math, clipboard/collision naming, refresh ordering, command eligibility, rename/create/import/delete helpers, drag/drop decisions, and filesystem action outcomes. Use real-browser tests for pointer capture/drag, keyboard routing/editable targets, file chooser/import, object-URL download behavior, focus/dialog/context-menu interaction, and packaged visible workflows.

When a UI bug is fundamentally a shared command/model bug, add the regression below React first instead of relying only on click-path coverage.
