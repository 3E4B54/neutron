# FileManager agent instructions

## Authority

This directory owns reusable filesystem presentation and user file interaction: selection, rename, clipboard, drag/drop, create/import/download, context command UI, Properties/Open With presentation, and visible errors.

## Rules

- Consume filesystem/core services; never reach into repository/storage internals.
- Generic resource opening delegates to the shared filesystem/association/open path. Do not add filename/type-specific launch switches in React.
- File mutations must respect filesystem resource capabilities/protection rather than bypassing them.
- Keep navigation/history keyed to stable filesystem identity where identity is the intended invariant.
- Shared file-operation state must be explicit and injectable where multiple surfaces share it; avoid hidden module-global UI authority.
- Error states must remain visible/reportable and failed async actions must not silently mutate local shadow state.
- Context-menu/keyboard behavior must respect editable targets and the capabilities of the selected resources.

Specific suffixes, rename-width defects, current shortcut bugs, or individual menu omissions belong in Issues/tests, not this generic file.

## Refactor direction

Reduce orchestration in `FileManager.tsx` by extracting production command/action models and deterministic gesture/state logic. Reuse those models across Desktop/Explorer rather than creating surface-specific copies.

## Validation

Use fast tests for models/actions and filesystem effects. Use browser tests for DOM pointer/keyboard/focus/dialog/file-input/download behavior and packaged workflows where browser mechanics are material.
