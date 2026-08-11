# FileManager agent instructions

## Authority

This directory owns Explorer/FileManager presentation and file interaction:
selection, rename, clipboard, drag/drop, import/download, context menus,
Properties/Open With UI, and error presentation.

## Rules

- Consume filesystem/core services; do not call repository/storage internals.
- Generic Open must delegate to the shared filesystem-aware dispatcher.
  Shortcuts, `.sys` and `.neutron` resources must execute/dereference correctly,
  never fall through to Text.
- User Delete should follow filesystem Trash/resource-capability policy rather
  than bypassing protected resources.
- “Create shortcut” must be available where resource capabilities allow and use
  stable target identity.
- Explorer Back/Forward/address history must operate by directory identity and
  actual filesystem navigation.
- Error text must be selectable/copyable so users can report failures.
- Rename affordances must preserve extension editing and provide enough baseline
  width to display `New Folder (1)` without unnecessary ellipsis.
- Download must read FsService bytes, preserve filename/MIME, and revoke object URLs.
- Context menus/keyboard commands must respect editable targets and specialized
  resource capabilities.

## Validation

Keep unit tests for naming/selection/clipboard/drag and add packaged Playwright
coverage for navigation, shortcut opening, `.sys`, `.neutron`, context-menu
shortcut creation and visible error flows.
