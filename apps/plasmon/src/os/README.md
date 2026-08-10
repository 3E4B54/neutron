# Plasmon OS architecture boundary

`src/os/contracts/**` is the public interface freeze. Subsystem agents import shared concepts from there and must not redefine them locally or edit contracts without an explicit integration change request.

## Agent ownership

| Agent | Exclusive implementation ownership |
|---|---|
| 1 Filesystem | `src/os/fs/**` plus explicitly assigned filesystem background/build entry changes |
| 2 Associations/Atoms | `src/os/associations/**` |
| 3 Native process runtime | `src/os/process/**` |
| 4 Window manager | `src/os/windowing/**` |
| 5 Desktop/File Manager | `src/os/file-manager/**`, `src/os/desktop/**`, `src/native-apps/explorer/**`, `src/native-apps/properties/**` |
| 6 Shell | `src/os/shell/**` |
| 7 Native apps | `src/native-apps/text/**`, `markdown/**`, `video/**`, `browser/**`, `settings/**` |
| 8 Neutron bridge | `src/os/neutron/**` |
| 9 Sharing | `src/os/sharing/**` plus explicitly assigned Plasmon backend stable-memory methods |
| 10 Backup | `src/os/backup/**` |
| Integration | `src/os/integration/**`, `src/os/PlasmonOS.tsx`, `src/index.tsx`, shared build/package integration |

`src/gui2/**` remains a behavioral/reference implementation and is not the new architecture.

## Isolation rules

Consumers depend on contracts, never another subsystem's repository/store/reducer internals. Examples: Desktop may import `FsService`; it may not import a SQLite repository. Shell may import `ProcessController`/`WindowManager`; it may not import an internal process reducer.

The Desktop is a filesystem presentation (eventually a File Manager view rooted at `/Desktop`), not the filesystem service and not the OS composition root. Atoms are typed filesystem resources with immutable `atomId`; they are not a second object hierarchy.

## Integration notes

`integration/fakes.ts` exists only to let downstream agents build and test before real services land. `integration/legacyNeutronBridge.ts` delegates to the pre-existing `src/platform/**` adapter so vanilla-Neutron behavior survives the architecture split. Agent 8 should replace that compatibility adapter behind the same `NeutronBridge` contract; it must not delete working platform behavior merely to move files.

After Agent 0, only the integration agent modifies `PlasmonOS.tsx`, `src/index.tsx`, or shared package/build entrypoints unless a task explicitly grants ownership.
