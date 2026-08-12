# Explorer

Explorer is the native application wrapper around the shared FileManager UI. It owns window-level filesystem navigation and view chrome while file operations and entry interaction remain in `os/file-manager/**`.

`history.ts` and `navigation.ts` provide production navigation models. `ExplorerApp.tsx` composes Back/Forward/Up, breadcrumbs/address entry, favorites, current-folder filtering, view/sort controls, the persisted `Show hidden files` presentation toggle, status, and the shared FileManager.

The hidden-files toggle changes only FileManager presentation. Its durable value is stored by the FileManager preference store through `FsService`, and the FileManager visibility facade asks the canonical filesystem list contract whether hidden entries should be included. Explorer does not classify hidden resources itself. Address/navigation continues through the underlying filesystem service, so an explicitly navigated hidden directory remains addressable regardless of whether hidden children are currently shown.

Explorer does not implement a second filesystem, file-operation stack, association registry, hidden-resource policy, or browser-local preference store.

## Refactor direction

Keep FileManager responsible for common entry/file actions and keep Explorer-specific code focused on navigation/view state. As Explorer grows, extract navigation/favorites/view-state controllers below React instead of turning `ExplorerApp.tsx` into a second FileManager implementation.

## Testing

Use fast tests for history/address/navigation and other deterministic view models, including FileManager-backed visibility preference persistence and directory presentation. Use real-browser tests for address-bar focus/keyboard behavior, Back/Forward interaction, layout/view controls, and packaged opening flows that depend on the rendered window.
