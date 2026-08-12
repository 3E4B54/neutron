# Explorer

Explorer is the native application wrapper around the shared FileManager UI. It owns window-level filesystem navigation and view chrome while file operations and entry interaction remain in `os/file-manager/**`.

`history.ts` and `navigation.ts` provide production navigation models. `ExplorerApp.tsx` composes Back/Forward/Up, breadcrumbs/address entry, favorites, current-folder filtering, view/sort controls, status, and the shared FileManager.

Explorer does not implement a second filesystem, file-operation stack, or association registry.

## Refactor direction

Keep FileManager responsible for common entry/file actions and keep Explorer-specific code focused on navigation/view state. As Explorer grows, extract navigation/favorites/view-state controllers below React instead of turning `ExplorerApp.tsx` into a second FileManager implementation.

## Testing

Use fast tests for history/address/navigation and other deterministic view models. Use real-browser tests for address-bar focus/keyboard behavior, Back/Forward interaction, layout/view controls, and packaged opening flows that depend on the rendered window.
