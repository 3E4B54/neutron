# Agent 5 integration dependencies

No external npm dependency is required. The implementation uses the existing React/browser stack.

Coordinator A integration requirements:

1. Register `explorerAppDefinition` with `createExplorerNativeLoader(...)` and `propertiesAppDefinition` with `createPropertiesNativeLoader(...)` on the existing `NativeApplicationRegistry`; do not create another registry/controller/window manager.
2. Supply the accepted Wave 1 `AssociationRegistry`, `OpenService`, and `FsEventSource` to those loader factories. `createPlasmonServices()` currently does not expose/compose the association/open services, so that wiring belongs in Agent 0's integration-owned path.
3. Mount `Desktop` from `src/os/desktop/index.ts` in the integration-owned Plasmon OS composition root with the real `FsService`, `FsEventSource`, `ProcessController`, association/open services, and preferably one explicit shared `FileOperationClipboard` if clipboard continuity is desired between Desktop and Explorer windows.
4. Gate 3 shared-shortcut launch dispatch remains an Agent 6/Shell dependency. FileManager recognizes `plasmon.shortcut` metadata for coherent presentation and preserves the shortcut NodeId, but deliberately does not dereference or dispatch the shortcut target itself.
5. Agent 2's association audit confirms that both one-off Open With and persistent `Always use this app` must go only through the exported `OpenWithServiceModel`. The existing FileManager/Properties implementation already does this: `model(...)` supplies candidates, `open(...)` performs one-off launch, and `setDefault(...)` performs matcher-aware persistence. Do not cast `AssociationRegistry`, call concrete `defaultTypeKeyFor()` logic, or guess a type key. Coordinator A will integrate Agent 2 separately; no cherry-pick is required here.
6. No frozen contract change is required for any of the above.
