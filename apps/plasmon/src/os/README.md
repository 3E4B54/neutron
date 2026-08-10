# Plasmon OS architecture boundary

`src/os/contracts/**` is the public interface freeze. Subsystem agents import shared concepts from there and must not redefine them locally or edit contracts without an explicit integration change request.

The final Agent 0 amendment separates shared-resource publication from authorization. Plasmon publishes/version resources; MTN (through `ResourceAuthorizationService`) owns grants, bearer secrets, secret hashing, audience/rights, lease issuance, revocation, reshare policy, authorization epochs, cross-AppScope routing, and trusted authorization context.

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
| Integration | `src/os/integration/**`, `src/os/PlasmonOS.tsx`, `src/index.tsx`, shared visual tokens, shared build/package integration |

`src/gui2/**` remains a behavioral/reference implementation and is not the new architecture.

## Isolation rules

Consumers depend on contracts, never another subsystem's repository/store/reducer internals. Examples: Desktop may import `FsService`; it may not import a SQLite repository. Shell may import `ProcessController`/`WindowManager`; it may not import an internal process reducer.

The Desktop is a filesystem presentation (eventually a File Manager view rooted at `/Desktop`), not the filesystem service and not the OS composition root. Atoms are typed filesystem resources with immutable `atomId`; they are not a second object hierarchy.

Sharing follows the same rule:

```text
ShareService
  ├── FsService
  ├── SharedResourceProvider
  └── ResourceAuthorizationService
```

`SharedResourceProvider` owns snapshot/version publication, stable-memory chunking, dedupe, integrity, resource revisions, provider-side resource storage/read/write, import/copy, and AtomId-to-ResourceRef mapping. It must not implement bearer-grant security.

`ResourceAuthorizationService` is generic and optional. Preview/tests may use `FakeResourceAuthorizationService`; vanilla Neutron fails closed with `UnavailableResourceAuthorizationService`; an MTN-capable bridge will provide the real adapter after the MTN 0.2 API is frozen.

## Parallelization gates

After the Agent 0 build/test gate succeeds, Agents 1-4 may begin in parallel. Agent 8 may implement the vanilla-Neutron bridge in parallel, but its MTN authorization adapter must wait for the MTN 0.2 API freeze.

Wave 2 Desktop/Shell/Native Apps should integrate after Wave 1 service contracts are green. Agent 9 may design stable-memory publication earlier, but final share orchestration waits for all three of:

1. filesystem behavior/representation stable enough for snapshotting;
2. MTN 0.2 authorization API freeze;
3. Agent 8 authorization adapter contract/implementation against that API.

Backup does not depend on sharing, but it should wait for the actual filesystem representation/import semantics to stabilize.

## daedalOS implementation reuse

Agents 4, 5, 6 and 7 are explicitly allowed and encouraged to adapt generic implementation code from `DustinBrett/daedalOS` where that improves polish. The supplied research notes identify useful source areas including `RndWindow`/`useRnd`, drag and marquee selection, FileManager interactions, Properties/Open With, Start/Search/taskbar/calendar behavior, text/Markdown/media applications and URL shortcuts.

Do **not** transplant daedalOS BrowserFS, its full process architecture, Next.js-specific structure, or assumptions that arbitrary apps can be same-origin embedded.

Any directly copied or substantially adapted daedalOS code must preserve MIT license/attribution requirements. The implementing agent must record the source repository/path and adaptation in its component README (or a local attribution file) so the integration agent can maintain project-level third-party notices.

## Shared dependency/build policy

Subsystem agents do not edit shared package/build files merely to add dependencies. Preferred workflow:

1. implement within the owned source paths;
2. add `DEPENDENCIES.md` inside the owned subsystem directory listing each required package, runtime/dev classification, reason, version constraint if material, and any build/manifest capability required;
3. the integration agent applies/reconciles `package.json`, lockfile and shared build changes centrally.

Agent 1 is the explicit exception when its filesystem background authority genuinely requires assigned background-service entry, `neutron.json`, storage capability, or build wiring. Such edits must be narrowly scoped and documented as integration-affecting changes.

## Shared visual language

Wave 2 agents consume the shared CSS custom properties defined by the integration layer rather than inventing separate typography/window/shell values. At minimum these include:

```text
--plasmon-font-ui
--plasmon-font-size-ui
--plasmon-radius-window
--plasmon-taskbar-height
--plasmon-titlebar-height
--plasmon-surface
--plasmon-surface-elevated
--plasmon-text
--plasmon-text-muted
--plasmon-accent
--plasmon-shadow-window
--plasmon-motion-fast
--plasmon-motion-window
```

Subsystem-specific styling is still owned locally; the tokens are the shared visual vocabulary.

## Integration notes

`integration/fakes.ts` exists only to let downstream agents build and test before real services land. `integration/legacyNeutronBridge.ts` delegates to the pre-existing `src/platform/**` adapter so vanilla-Neutron behavior survives the architecture split. Agent 8 should replace that compatibility adapter behind the same `NeutronBridge` contract; it must not delete working platform behavior merely to move files.

After Agent 0, only the integration agent modifies `PlasmonOS.tsx`, `src/index.tsx`, shared visual-token entrypoints, or shared package/build entrypoints unless a task explicitly grants ownership.
