# Desktop

`desktop/**` is the Plasmon Desktop presentation over filesystem state. `Desktop.tsx` reuses the shared FileManager interaction surface and adds desktop-specific layout persistence from `layout.ts`.

The Desktop is not a separate file database, application registry, or launch authority. Filesystem contents come from `FsService`; opening and file operations route through the shared OS services used by other filesystem surfaces.

## State and layout

Desktop placement is keyed by stable filesystem node identity rather than path/name. That lets a rename preserve placement. Layout helpers are deliberately separable from React so allocation/repositioning can be tested deterministically.

`Desktop.tsx` should remain a relatively thin composition layer. Selection, file operations, context menus, generic opening, and common entry behavior belong in reusable FileManager/shared services rather than Desktop-only forks.

## Refactor direction

When Desktop and FileManager diverge, prefer improving their shared presentation/model layer. Keep desktop-only concerns limited to desktop workspace layout, background behavior, and desktop-specific interaction conventions.

If pointer/marquee/drag behavior becomes complex, extract reusable production interaction helpers rather than burying geometry/state decisions in component handlers.

## Testing

Use fast tests for layout allocation, identity-based placement, and other deterministic helpers. Use real-browser tests for marquee/pointer drag, modal event boundaries, focus/keyboard behavior, and packaged workflows where the DOM is material. Manual review remains appropriate for icon spacing, density, and desktop interaction feel.
