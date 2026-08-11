# Plasmon Shell

Wave 2 presentation/navigation around the central Desktop + WindowLayer region.

## Invariants

- The shell never owns authenticated Neutron application or tray frames. External Elements are opened only through `NeutronBridge.openElement()` and remain Kernel-owned sibling tiles.
- Native task state is derived from `ProcessController` + `WindowManager`; process/window truth is never persisted by the shell.
- Taskbar membership is pinned native handlers + open native process records + pinned Elements + Elements explicitly reported `running: "yes"`. Installed applications are not taskbar entries merely because they are installed.
- Taskbar pins are Shell preferences, not filesystem shortcuts.
- Neutron `running` remains `yes | no | unknown`; the shell never converts `unknown` to `no`.
- Pins/theme/wallpaper are persisted through `FsService` as validated namespaced metadata on the filesystem root under `plasmon.shell.preferences.v1`. Hosted foreground Shell never owns `window.localStorage` or another IndexedDB database.
- Preference writes are independent of filesystem invalidation observation: a preference metadata write may emit an FsEvent, but it does not trigger preference reload/save feedback.
- Corrupt preference metadata falls back to deterministic defaults. Filesystem load/save failures are nonfatal and do not erase the current in-memory user selection.
- Start is a thin filesystem-backed view rooted at `/Start Menu`. Its entries are folders and `kind: "shortcut"` nodes using the existing `plasmon.shortcut` metadata shape.
- Start reconciliation identifies shortcuts by stable target identity. Existing shortcuts anywhere under Start are preserved, so Explorer-driven renames and folder moves survive. A seeded identity that later disappears is treated as intentionally deleted and is not recreated; newly discovered native apps/Elements are seeded once.
- Direct Explorer-style rename/drag/move UI is not duplicated in Shell. Those file operations remain FileManager/Explorer-owned; Start observes the resulting filesystem state.
- Search begins at `FsService.resolvePath("/")`, traverses asynchronously, maintains no persistent index, is bounded to 5,000 scanned nodes, and caps visible results per category and overall.
- Empty Search queries are useful: native apps and Elements are included, while recent filesystem documents/media/Atoms and Start shortcuts are collected from the bounded scan.
- Search observes `FsEventSource`; create/import/rename/delete events invalidate the current view and trigger a bounded rescan. Cancellation + request ordering prevent stale async results from winning.
- File search results dispatch through the public Open With model backed by `AssociationRegistry` + `OpenService`. No extension-to-app switch exists in Shell.
- Start shortcut targets dispatch through existing services: native via OpenService/process, Elements via NeutronBridge, nodes via filesystem/Open With, and URLs via the registered Browser/external URL handler.
- Shell click-away dismissal is scoped to Shell flyouts/toggles. Shell-owned context menus suppress the browser menu only on Shell-owned surfaces; application workspace content keeps its own browser/text-editing context behavior.
- Tray presentation reads only the frozen `element.tray?.title` declaration and opens/focuses the owning Element through NeutronBridge.
- External app icons use one fixed-size Shell renderer. Failed image resources fall back to initials/symbolic icons without removing labels or changing button semantics.
- Shell CSS publishes `--plasmon-*` tokens on the Shell root so integration can place Desktop and native windows inside the same theme boundary.

## Start seeding policy

The root path is centralized as `START_MENU_PATH = "/Start Menu"`. New installations are seeded into sensible folders when their stable target identity has never been seen before:

```text
/Start Menu
    Accessories/
    System/
    Neutron/
```

The root stores the Shell-owned seed identity manifest under `plasmon.shell.start.seeded.v1`. This is reconciliation metadata, not a second shortcut format. If a user renames or moves a shortcut, the target identity is still found recursively and the node is left untouched. If a previously seeded shortcut is missing, Shell assumes deletion was intentional and does not recreate it. Deleting the entire Start root also deletes that manifest, so recreating the root will reseed currently discovered applications.

## Search limits

- filesystem scan: 5,000 nodes per query by default;
- Apps: 14 results;
- Documents: 12 results;
- Media: 12 results;
- Atoms: 10 results;
- total: 48 results.

This is deliberately a bounded rescan model for Gate 3, not a persistent indexing subsystem.

## Composition

`Shell` is deliberately dependency-injected and leaves its `children` in the central workspace region:

```tsx
<Shell
  process={services.process}
  windows={services.windows}
  fs={services.fs}
  fsEvents={services.fsEvents}
  neutron={services.neutron}
  nativeApps={nativeApps}
  associations={associations}
  openService={openService}
>
  <Desktop ... />
  <WindowLayer ... />
</Shell>
```

Coordinator/integration owns the real composition. Shell does not import integration singletons or construct service implementations.

## Keyboard/accessibility

- Start is a normal taskbar button and also toggles with `Ctrl+Escape`.
- Search opens with its taskbar button or `Ctrl+Space`.
- `Escape` dismisses Shell flyouts and context menus.
- Pointer-down outside a Shell flyout dismisses it; interactions inside the flyout and on its toggle are preserved.
- Start and Search lists support Tab plus Up/Down/Home/End movement.
- Running/focused/unknown state is represented in accessible labels/text, not color alone.
- Taskbar Pin/Unpin actions expose `Pin to taskbar` / `Unpin from taskbar` labels and persist through the FsService-backed preference store.
- All icon-only taskbar controls have accessible labels and visible focus styling.
