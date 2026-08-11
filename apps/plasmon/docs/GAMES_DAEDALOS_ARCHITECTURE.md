# Plasmon Games / daedalOS Architecture

Status: design-first hackathon MVP recommendation  
Research date: 2026-08-11  
Plasmon starting point: `3dc25e00511c9070165560e324aba3cc31235a8e`  
daedalOS source inspected: `DustinBrett/daedalOS@0df82d75e6114727ad035f6fce93842a96682355`

This document is a research/design handoff. It deliberately does **not** implement the game subsystem, change frozen OS contracts, or import game/ROM binaries.

## 1. Executive summary

Plasmon should make games ordinary filesystem resources opened through the existing association/OpenService path, not a separate hard-coded games launcher.

Recommended conceptual launch path:

```text
game file
  -> ordinary AssociationRegistry resolution
  -> built-in native handler
  -> lazily loaded runtime assets under /System/Program Files
  -> game window/session
```

For the hackathon, use **two built-in handlers/applications**, not one monolithic `Games.sys` and not one handler per console:

- a DOS handler (working name `DOS.sys`) for `.jsdos`, backed by js-dos;
- an emulator handler (working name `Emulator.sys`) for selected ROM extensions, backed by EmulatorJS and a small curated set of cores.

The names are recommendations, not frozen filesystem names.

Two handlers are worth keeping because js-dos and EmulatorJS have materially different package formats, persistence APIs, runtime assets, input behavior, and save semantics. One Emulator handler should still cover all supported cartridge/ROM systems by selecting the core from the resolved format/system. Per-console `.sys` applications would add complexity without adding a useful user concept.

The most important architectural requirement is persistence: **browser IndexedDB/OPFS/localStorage must not become authoritative game storage.** Both runtime families have browser-local persistence behaviors. Plasmon should use those only as temporary runtime caches, or disable/override them, while authoritative save bytes live through Plasmon's persistent `FsService` model.

The correct lesson from daedalOS "Snapshots" is not to copy its folder literally. daedalOS stores runtime-specific save artifacts as ordinary files under `/Users/Public/Snapshots`, with a generated screenshot used as the saved file's icon. For js-dos those artifacts are filesystem-change bundles. For EmulatorJS they are emulator save-state bytes. They are **not filesystem snapshots**. daedalOS keys them by source basename, which is convenient but wrong for Plasmon because a rename breaks the relationship. Plasmon should attach saves to stable game `NodeId` instead.

Recommended visible save model:

```text
/Games/Saves/
  Native/
    <friendly game folder>/native.sav
  States/
    <friendly game folder>/autosave.state
  DOS/
    <friendly game folder>/current.changes
```

The visible names are for people; metadata contains the stable source `NodeId`, runtime/system/core identifiers, and compatibility metadata. Native saves, emulator states, and DOS filesystem changes should remain distinct because they have different portability and compatibility properties.

For bundled demo content, the licensing review is intentionally conservative. `Anguna.gba` v0.95 has explicit binary redistribution permission in its accompanying readme provided that readme remains available with it. The other requested ROMs do not have sufficiently clear redistribution grants for a public hackathon bundle based on the evidence found. The proposed Doom/Duke/Wolfenstein `.jsdos` bundles are also **BLOCKED** unless the exact redistribution/repackaging terms for the exact shareware package are preserved and approved; engine source licenses do not grant rights to game data. The safest demo is a tiny Plasmon-authored DOS `.jsdos` plus Anguna and, ideally, a small Plasmon-authored/permissively licensed NES demo.

No proof code was necessary for this research pass.

---

## 2. Exact daedalOS architecture studied

Primary upstream:

- Repository: https://github.com/DustinBrett/daedalOS
- Commit inspected: https://github.com/DustinBrett/daedalOS/tree/0df82d75e6114727ad035f6fce93842a96682355
- daedalOS license: MIT

Important paths inspected:

| Area | daedalOS path | What it establishes |
| --- | --- | --- |
| js-dos process config | `components/apps/JSDOS/config.ts` | js-dos path prefix, save extension, DOS config files, captured keys |
| js-dos session | `components/apps/JSDOS/useDosCI.ts` | bundle loading, `ci.persist()`, save restore, snapshot creation |
| js-dos UI/runtime | `components/apps/JSDOS/useJSDOS.ts` | lazy runtime setup, player creation, canvas/session lifecycle |
| Emulator config | `components/apps/Emulator/config.ts` | extension-to-system mapping |
| Emulator session | `components/apps/Emulator/useEmulator.ts` | ROM Blob URL, core selection, auto-save-state, restore, screenshot |
| Snapshot helper | `hooks/useSnapshots.ts` | `/Users/Public/Snapshots`, ordinary file writes, icon cache |
| Isolated content | `hooks/useIsolatedContentWindow.ts` | same-origin iframe used as isolated runtime/content window |
| Process definitions | `contexts/process/directory.ts` | dependent Program Files assets, app identity/icons |
| File extensions | `components/system/Files/FileEntry/extensions.ts` | `.jsdos` and ROM association behavior |
| Constants | `utils/constants.ts` | snapshot path and dynamic save extensions |
| Runtime assets | `public/Program Files/EmulatorJs/*` | vendored EmulatorJS loader/runtime assets |
| Version lock | `package.json`, `yarn.lock` | js-dos packages and exact lock versions |
| User-facing behavior | `README.md` | IndexedDB FS, save-state-on-close, Open With/Properties behavior |
| Credits | `public/CREDITS.md` | upstream references but not a game-content licensing audit |

Exact js-dos package versions in the inspected daedalOS lockfile:

- `emulators` 8.3.9
- `emulators-ui` 0.73.9

The current daedalOS `public/Program Files/EmulatorJs/loader.js` contains a loader `VERSION = 23.5`, while the vendored `emulator.min.js` identifies its player implementation as version 2.3.5. In other words, daedalOS' proven EmulatorJS wrapper is useful architectural reference, but its vendored EmulatorJS runtime is old and should not be copied as Plasmon's new dependency.

### Existing Plasmon mechanisms inspected

At the Plasmon starting SHA, the association stack already represents the required launch model:

- `apps/plasmon/src/os/associations/registry.ts`
- `apps/plasmon/src/os/associations/openWith.ts`
- `apps/plasmon/src/os/associations/fsDefaults.ts`
- `apps/plasmon/src/os/contracts/associations.ts`
- `apps/plasmon/src/os/contracts/fs.ts`

The contracts already provide:

- stable `FsNode.id` / `NodeId`;
- extension and MIME association rules;
- multiple candidate handlers;
- user defaults;
- native handler kind;
- `OpenService.open(handlerId, OpenTarget)` where `OpenTarget` can carry `nodeId`;
- defaults persisted through the Plasmon filesystem metadata path rather than browser-local application storage.

**Design conclusion:** game launching does not require a new association contract. Register normal native handlers/rules and let existing Open With/default resolution do its job.

---

## 3. js-dos integration

Primary current upstream references:

- https://js-dos.com/
- https://js-dos.com/emulators.html
- https://js-dos.com/player-api.html
- https://js-dos.com/save-load-game-progress.html
- https://www.npmjs.com/package/emulators
- https://www.npmjs.com/package/js-dos

### What a `.jsdos` file is

A `.jsdos` file is a ZIP-format js-dos bundle containing the DOS program/game files plus js-dos configuration. The bundle contains a `.jsdos` configuration directory, including `dosbox.conf`; js-dos tooling also uses `jsdos.json` metadata. The current `emulators` API can build a bundle and returns the final `.jsdos` bytes as `Uint8Array`.

It should be treated by Plasmon as an ordinary immutable-ish game asset file. The game may be moved or renamed without invalidating its identity because the `FsNode.id`, not its pathname, should be the canonical runtime-state attachment key.

### How daedalOS launches `.jsdos`

The inspected daedalOS flow is:

1. File association resolves `.jsdos` to the JSDOS process.
2. `useDosCI.ts` reads the file bytes from the daedalOS filesystem.
3. For a `.jsdos` input it creates a `Blob`/Object URL for the bundle. Other executable/archive inputs can be dynamically wrapped with config.
4. It looks for a companion save artifact in `/Users/Public/Snapshots` using `<bundle basename>.zip.save`.
5. It launches the bundle through js-dos, optionally passing the saved change bundle.
6. On close/switch it calls `ci.persist()` to obtain changed filesystem data and stores that data plus a screenshot through `createSnapshot()`.

This is a good lifecycle pattern, but Plasmon should not copy the basename-based save key.

### Recommended js-dos version strategy

The current npm `emulators` line is newer than daedalOS' 8.3.9 pin. For the implementation pass:

1. start with exact `emulators@8.3.9` / `emulators-ui@0.73.9` if the objective is lowest-risk parity with daedalOS' wrapper behavior;
2. run the one-bundle smoke gate against the then-current 8.4.x line before deciding whether to upgrade;
3. pin the selected exact versions and runtime assets; do not use a floating `latest` URL.

The js-dos packages are GPL-2.0. Runtime redistribution must include the required license/source-offer compliance appropriate to how Plasmon ships the compiled assets.

### Browser/runtime requirements

Current js-dos supports browser worker and render-thread execution. The worker backend is the preferred path because it avoids blocking the Plasmon UI thread. Required/likely runtime capabilities for the MVP:

- WebAssembly;
- Web Worker execution;
- same-origin packaged JS/WASM/worker assets under the selected `pathPrefix`;
- canvas rendering, with optional OffscreenCanvas;
- audio, with optional AudioWorklet path;
- Blob/Object URLs if Plasmon bridges `FsService` bytes through URLs;
- user-gesture-safe audio/fullscreen behavior;
- optional mouse capture/pointer-lock behavior;
- no network requirement for local single-player bundles.

IPX/WebRTC networking exists upstream but should be disabled/out of scope for the hackathon. There is no reason for Plasmon to enable cloud save services or multiplayer networking merely to run a local bundle.

### js-dos persistence

Current js-dos save/load is a filesystem-change bundle layered on top of the original game bundle. The current player exposes `fsChanges` hooks (`pull`, `push`, `delete`, `urlToKey`) and documents IndexedDB as the default browser persistence. Current js-dos also describes modern local persistence work involving OPFS.

Plasmon must not leave that default as authoritative.

Recommended adapter:

```text
js-dos session
  original bundle bytes <- FsService(gameNodeId)
  prior changes bytes   <- FsService(saveNodeId)
  runtime worker/canvas
  updated changes bytes -> FsService(saveNodeId)
```

Implementation rules:

- use a key derived from stable game `NodeId`, never the Blob URL or filename;
- configure custom `fsChanges.pull/push/delete` backed by Plasmon persistence, or explicitly call `ci.persist()` and write the resulting bytes through `FsService`;
- disable js-dos cloud persistence;
- ensure default IndexedDB/OPFS data cannot silently win over Plasmon data after a browser/profile restore;
- temporary browser cache is acceptable only if it can be discarded and reconstructed from Plasmon state;
- force a final change flush during clean application close before worker teardown;
- a close failure must not report success if the authoritative save write did not complete.

### DOS save semantics

For the MVP, the authoritative Plasmon DOS save artifact should represent the js-dos filesystem changes bundle (`current.changes`). The user's actual in-game save files live inside those changed DOS filesystem bytes.

This is **not** a general emulator machine-state snapshot. DOSBox-X may expose fuller state features, but that is not needed for the initial architecture.

---

## 4. EmulatorJS integration

Primary current upstream:

- Repository: https://github.com/EmulatorJS/EmulatorJS
- Releases: https://github.com/EmulatorJS/EmulatorJS/releases
- Documentation: https://emulatorjs.org/docs/
- Current stable release selected for design: 4.2.3
- Upstream license: GPL-3.0

Current `main` was also inspected for architecture, including:

- `data/src/GameManager.js`
- `data/src/storage.js`
- `data/src/emulator.js`
- `data/src/consts.js`

At research time, upstream also has a 4.3.0 pre-release. The MVP should pin stable 4.2.3 rather than track the pre-release.

### How daedalOS launches ROMs

The inspected daedalOS flow is:

1. extension maps to an EmulatorJS system/core family;
2. the ROM is read from the daedalOS filesystem;
3. ROM bytes are exposed as a Blob/Object URL (and some inputs may be ZIP-wrapped);
4. daedalOS creates an isolated content window using a same-origin iframe so EmulatorJS' global `EJS_*` configuration and runtime state do not leak into the parent desktop;
5. `EJS_gameUrl`, `EJS_core`, `EJS_pathtodata`, etc. are configured in that isolated window;
6. EmulatorJS loads its core/assets from `/Program Files/EmulatorJs/`;
7. on close, daedalOS triggers EmulatorJS save-state behavior and stores the state bytes plus screenshot in `/Users/Public/Snapshots/<rom basename>.sav`;
8. on next launch that `.sav` is loaded as an emulator state.

The iframe is an isolation container for a game canvas/runtime. It is **not** a second daedalOS kernel. Plasmon may use the same isolation concept if needed for global runtime variables and lifecycle containment.

### Recommended runtime architecture

Use one built-in Emulator application/handler and a core mapping table. It should receive the `nodeId`, inspect the already-associated extension/system metadata, read bytes via `FsService`, lazy-load the required selected core, and start one isolated runtime session.

Do not create one native application per console.

### EmulatorJS persistence behavior

Current EmulatorJS has three important persistence channels:

1. **Native game save files** (SRAM/EEPROM/etc.) are located under `/data/saves` in the Emscripten filesystem. `GameManager.mountFileSystems()` mounts that directory using Emscripten `IDBFS` with `autoPersist: true` and performs a sync.
2. **Save states** are serialized emulator/core state and are distinct from native save files. Current `GameManager` exposes state get/load paths.
3. **Settings/controller options** use browser `localStorage` unless disabled. EmulatorJS added `EJS_disableLocalStorage` support before the selected stable line.

Stable 4.2.2 (included in 4.2.3) added `saveDatabaseLoaded` and `saveSaveFiles` events. Current `GameManager.saveSaveFiles()` emits native save bytes through `saveSaveFiles`, and `getSaveFile()` returns the core save file bytes.

This is the key integration opportunity: Plasmon can bridge the runtime's native-save bytes to/from `FsService` instead of treating IDBFS as durable truth.

Recommended startup/close sequence:

```text
OPEN
  read ROM bytes from FsService
  find save metadata by source NodeId
  create isolated runtime session
  wait for saveDatabaseLoaded
  seed native save bytes from Plasmon into runtime save FS
  load optional Plasmon autosave state
  start/focus game

DURING PLAY
  runtime may use IDBFS as a cache
  saveSaveFiles events copy native save bytes -> Plasmon FsService

CLOSE
  request core-native save flush
  copy native save bytes -> Plasmon FsService
  optionally capture autosave state -> Plasmon FsService
  await writes
  terminate core/worker/audio
  revoke Blob URLs / dispose isolated window
```

Settings/controller mapping should eventually use a Plasmon application settings/persistence mechanism. For the MVP, disable runtime localStorage where possible and keep only a small explicit default mapping rather than creating a second settings authority.

---

## 5. What daedalOS "snapshots" actually are

This was the critical research question.

**daedalOS snapshots are not filesystem snapshots.** `hooks/useSnapshots.ts` defines `SAVE_PATH` as `/Users/Public/Snapshots` and writes ordinary files there through the normal daedalOS filesystem. The helper optionally caches a screenshot/icon for the saved file.

The folder mixes different runtime payload types:

### js-dos snapshot

- Runtime owner: js-dos/JSDOS process.
- File name: `<source basename>.zip.save`.
- Payload: bytes returned by `CommandInterface.persist()`, i.e. a change bundle containing the DOS filesystem changes relative to the base `.jsdos` bundle.
- Creation: on close/switch daedalOS captures a screenshot and calls `ci.persist()`.
- Restore: on launch it finds the same basename-derived save and passes the change bundle together with the original game bundle.
- Portability: conditional. It depends on the compatible original game bundle/config/runtime. It is not a universal standalone game image.

### EmulatorJS snapshot

- Runtime owner: EmulatorJS process.
- File name: `<source basename>.sav`.
- Payload in daedalOS: serialized emulator **save-state** bytes supplied through `EJS_onSaveState`.
- Creation: daedalOS triggers the EmulatorJS save-state action on close and stores the state plus screenshot.
- Restore: on next launch it loads the saved bytes as emulator state.
- Portability: weak. Emulator save states are generally core/runtime/version-sensitive and should not be treated like portable cartridge SRAM.

### Why Plasmon should not copy the exact model

What is worth preserving:

- users can see/export save artifacts as normal files;
- automatic close-save makes demos resilient;
- saved state can have a screenshot/thumbnail;
- save data remains in the user's filesystem rather than being trapped in a runtime UI.

What should change:

- do not use filename/basename as canonical identity;
- do not mix native SRAM, save states, and DOS change bundles under one ambiguous extension;
- do not let browser IndexedDB become the only backing store;
- attach artifacts to stable source `NodeId` plus runtime compatibility metadata.

`/Games/Saves` is therefore a good Plasmon concept, but it should be structured semantically rather than cloning `/Users/Public/Snapshots`.

---

## 6. Save/persistence model

Recommended visible model:

```text
/Games/Saves/
  Native/
    Anguna/
      native.sav
  States/
    Anguna/
      autosave.state
  DOS/
    Plasmon DOS Demo/
      current.changes
```

The friendly folder name is presentation only. Each save node/folder should carry metadata equivalent to:

```text
sourceNodeId       stable FsNode.id of source game
runtimeId          e.g. plasmon.dos / plasmon.emulator
systemId           e.g. gba / nes / dos
coreId             e.g. mgba (when relevant)
runtimeVersion     pinned runtime version used to create state
sourceContentHash  optional integrity/reassociation hint
saveKind           native | state | dos-changes
slot               optional; MVP can use autosave only
```

### Native save versus save state

They must be separate:

- **native save**: cartridge/disk-native persistent data such as SRAM/EEPROM. Usually more portable between emulator implementations and versions.
- **save state**: serialized full emulator/core execution state. Convenient, but compatibility is narrower.
- **DOS changes**: changed files relative to a `.jsdos` base bundle. Different semantics again.

### Rename and move

The source game's stable `NodeId` remains the link. Renaming or moving the source changes only presentation; save attachment remains valid.

### Copy

A copied game file receives a new `NodeId`; by default it should start with independent save state. A future explicit "copy with save data" operation can clone save lineage, but that is outside MVP.

### Delete

Deleting a game should not silently delete save data during the hackathon MVP. Saves become orphaned but remain user-visible/exportable until explicitly removed. A later cleanup UX may detect orphaned `sourceNodeId` references.

### Slots

MVP: one `autosave.state` per game plus one native save channel. Do not build a save-slot manager unless the selected runtime needs it for correctness.

### Export/import

Because saves are ordinary files, export can use normal filesystem export/download. Import UX can come later; the metadata model should make reassociation possible.

### Search

Save files can participate in normal Search, though the FileManager may choose a type/category filter. Do not hide all save truth in runtime-private metadata.

---

## 7. Proposed Plasmon filesystem model

Recommended hackathon layout:

```text
/Games/
  DOS Bundles/
    plasmon-demo.jsdos
  Roms/
    Anguna.gba
    <optional Plasmon-owned NES demo>.nes
  Saves/
    Native/
    States/
    DOS/

/System/
  <DOS application>.sys
  <Emulator application>.sys
  Program Files/
    js-dos/
      runtime.json
      LICENSES/
      <curated js-dos runtime assets>
      defaults/
        dosbox.conf
        jsdos.json
    EmulatorJs/
      runtime.json
      LICENSES/
      loader.js
      <curated UI/runtime assets>
      cores/
        <only shipped/tested cores>
```

This is conceptual and must be reconciled with Agent 10's final `.sys`, system-path, hidden/read-only, and shortcut semantics.

Game files are ordinary files. Saves are ordinary user files. Runtime/library assets are curated, read-only system resources. Applications/handlers are distinct from runtime/library directories.

---

## 8. Associations and handlers

The existing Plasmon `AssociationRegistry` is already sufficient.

Conceptual rules:

```text
handler: native:dos
  extension: .jsdos
  priority: built-in default

handler: native:emulator
  extensions: selected tested ROM extensions
  priority: built-in default
```

When a user double-clicks a game:

1. FileManager asks normal association resolution.
2. Registry returns ordered candidates.
3. The existing default/user-default logic chooses the handler.
4. `OpenService` launches the native handler with `OpenTarget.nodeId`.
5. The handler reads the source through `FsService` and launches the lazy runtime.

No `switch(gameName)` and no Games-specific launcher table should exist in the Shell.

Open With remains useful: if a future `.neutron` Element advertises compatible ROM support, it can appear as another candidate using normal association semantics. Games should not be hard-locked to the built-in emulator.

---

## 9. Proposed `.sys` applications/handlers

Recommended conceptual split:

### DOS application (`DOS.sys`, working name)

- user-visible built-in Plasmon application;
- default handler for `.jsdos`;
- owns window/input/lifecycle adapter for js-dos;
- reads source/save bytes only through Plasmon services;
- runtime/library implementation is under `/System/Program Files/js-dos`.

### Emulator application (`Emulator.sys`, working name)

- user-visible built-in Plasmon application;
- default handler for selected ROM types;
- maps file type/system to one of the curated EmulatorJS cores;
- owns native-save/state bridge and runtime lifecycle;
- runtime/library implementation is under `/System/Program Files/EmulatorJs`.

### Why not one `Games.sys`

A single Games app is superficially simpler, but it obscures two distinct execution/persistence stacks and makes Open With/Properties less clear. It also encourages a central game-name dispatcher.

### Why not one `.sys` per console

All selected consoles share the same EmulatorJS host and lifecycle. Separate apps would duplicate window/persistence code and create noisy application identities for no MVP benefit.

Final names/paths belong to the filesystem/system-app owners.

---

## 10. `/System/Program Files` requirements

`/System/Program Files` should be an inspectable **curated runtime projection**, not a mirror of `node_modules`, build caches, or every release artifact.

Each runtime directory should contain:

- `runtime.json`: product name, exact pinned version, upstream, license, selected build/core list, asset hashes if practical;
- `LICENSES/`: upstream license texts and notices;
- only runtime files actually needed by the shipped handler/cores;
- small meaningful defaults/config files.

The visible filesystem can be a projection even if the bundler stores compiled assets elsewhere. The contract needed from Agent 10 is that system runtime resources can be read-only and inspectable without implying they are normal mutable user packages.

Saves must never be written under Program Files.

---

## 11. Game identity

Canonical identity for save attachment: **source `FsNode.id` / `NodeId`.**

Secondary identifiers:

- `contentHash`: integrity/duplicate/reassociation hint;
- runtime/system ID: determines interpretation;
- optional curated game metadata ID: useful for known bundled content/artwork, but not required for user files.

Do not use display filename or absolute path as the only identity. This is the main architectural correction over the daedalOS basename save model.

---

## 12. Shortcut behavior

Game shortcuts should use the normal Plasmon shortcut model owned by Agent 10/FileManager:

```text
/Desktop/Doom
  -> target NodeId for /Games/DOS Bundles/doom.jsdos
  -> resolve target
  -> normal association resolution
  -> DOS handler
```

A shortcut must not encode a second game-launch mechanism.

Game-specific visual requirement: use the target game's legal artwork/thumbnail or generic game icon, then apply Agent 11's ordinary shortcut overlay treatment.

---

## 13. Properties behavior

Useful ROM properties:

- Type (`NES ROM`, `Game Boy Advance ROM`, etc.);
- System;
- Size;
- Runtime/application;
- Save data present/size;
- Modified;
- Associated application.

Useful `.jsdos` properties:

- Type (`DOS Bundle`);
- Size;
- Runtime/application (`js-dos` through the DOS handler);
- Save data present/size;
- Modified;
- Associated application.

Do not expose internal Emscripten mount paths, worker filenames, core debugging flags, or browser database keys in normal Properties.

---

## 14. Thumbnails and artwork

Research conclusion: daedalOS makes game save-state presentation visually useful by capturing a runtime screenshot and caching it as the snapshot file icon. Plasmon should preserve the idea without depending on live third-party image fetching.

MVP hierarchy:

1. local curated artwork/thumbnail that has explicit redistribution rights;
2. last locally generated game screenshot where available;
3. platform-specific generic ROM icon if Agent 11 wants variants;
4. generic ROM/game icon;
5. generic DOS bundle icon for `.jsdos`.

For save files:

- save state: the captured frame is appropriate because it represents a moment in execution;
- native save: prefer the source game's artwork/icon plus a save indicator, not an arbitrary execution screenshot;
- DOS changes: source game artwork/icon plus a DOS-save indicator.

Artwork must be packaged/local or generated locally. FileManager rendering must not depend on fetching game art from a third-party website.

Agent 11 owns final icon language, border/size treatment, and shortcut overlay.

---

## 15. Window, fullscreen, and input behavior

Games need tighter lifecycle rules than document viewers, but should still behave as normal native windows.

### Window states

- normal and maximized: canvas resizes to available client area;
- minimize: emulator remains owned by the same process; audio should pause/mute if feasible and input must release;
- restore/focus: runtime receives focus again without reinitializing the game;
- close: save barrier first, then runtime teardown.

### Fullscreen

Two concepts may exist:

- maximized Plasmon window;
- browser-level Fullscreen API requested by the game application from a user gesture.

Browser fullscreen must be optional. Escape must always provide a path out of browser fullscreen/pointer lock and back to Plasmon.

### Keyboard

- capture game keys only while the game content is foreground/focused;
- do not attach permanent global listeners that steal Shell shortcuts;
- daedalOS' JSDOS captured function/Alt/context keys are a useful warning that game-specific capture must be scoped to the active game;
- on blur/minimize/close, release capture.

### Pointer/mouse

- pointer lock only after an explicit game click/user gesture where required;
- release on Escape, blur, minimize, or close;
- mouse capture is a runtime option, not a global OS mode.

### Controllers

Gamepad API input should be treated as belonging to the foreground game session. Controller remapping UI is post-MVP.

### Cleanup

On close dispose/revoke:

- worker(s);
- Blob/Object URLs;
- iframe/content window if used;
- audio nodes/contexts owned by the runtime;
- pointer lock/fullscreen;
- event listeners;
- temporary runtime mounts/caches.

---

## 16. Firefox and Chromium/Edge constraints

Acceptance target: current desktop Firefox and Chromium/Edge in the packaged Neutron/Plasmon environment.

| Capability | js-dos | EmulatorJS selected cores | MVP requirement |
| --- | --- | --- | --- |
| WebAssembly | Yes | Yes | MUST |
| Worker | Preferred/normal backend | runtime/core dependent | MUST for js-dos path |
| SharedArrayBuffer / threaded WASM | Avoid for selected DOS path unless chosen build requires it | not required by the proposed low-end core set | Do not make cross-origin isolation an MVP dependency |
| Canvas/WebGL | Canvas; optional OffscreenCanvas | Canvas/WebGL depending core | MUST |
| AudioContext/AudioWorklet | audio path | audio path | user-gesture/autoplay test |
| Fullscreen API | supported option | supported | HIGH |
| Pointer Lock | optional mouse capture | core/system dependent | HIGH for mouse games |
| Gamepad API | UI/runtime support | built in | HIGH |
| IndexedDB | upstream default save/cache | IDBFS/native save cache | available but non-authoritative |
| OPFS | current js-dos local-persistence work | not primary | non-authoritative |
| localStorage | avoid for authority | runtime settings unless disabled | disable/adapt |
| Blob/Object URL | convenient FS byte bridge | convenient ROM bridge | CSP must permit if used |

CSP/package requirements should be tested rather than guessed. Likely allowances include self-hosted WASM/worker/script assets and `blob:` for Object URLs/worker paths if the selected integration uses them. Do not open broad remote script origins; all runtime/core assets should be packaged locally for the MVP.

Selected EmulatorJS systems (`nes`, `gba`, `segaMD`, `snes`, `atari2600`) do not need the threaded cores that current EmulatorJS marks for PSP/DOSBox-Pure/Azahar. This keeps SharedArrayBuffer/cross-origin-isolation out of the baseline.

NDS is excluded from the initial recommendation for broader scope reasons, not because its extension is unsupported.

---

## 17. Persistence integration with Plasmon

### Rule

**The authoritative byte representation of user progress must be reachable through Plasmon persistent services.** Clearing browser-site storage must not be equivalent to deleting the user's game progress.

### js-dos

Preferred order:

1. read `current.changes` by stable source NodeId;
2. seed the runtime through custom `fsChanges` or initial bundle layering;
3. on save/close receive current change bytes;
4. write through `FsService`;
5. only then consider close complete.

### EmulatorJS native saves

1. wait until EmulatorJS' save filesystem is mounted;
2. write Plasmon's native save bytes into the runtime expected save path;
3. instruct/allow core to refresh native save files;
4. on `saveSaveFiles` and clean close, copy returned native save bytes into `/Games/Saves/Native/...` through `FsService`.

### EmulatorJS states

Use serialized state APIs separately. Store `autosave.state` with runtime/core/version metadata. If a later runtime cannot safely load an old state, the user should still retain the file and native save rather than losing progress.

### IDBFS/IndexedDB

It may remain a performance/session cache if eliminating it would require a deep fork, but it must be seeded from Plasmon and flushed to Plasmon. A stale browser cache must never override newer Plasmon save metadata silently.

### Settings

Disable EmulatorJS localStorage where practical (`EJS_disableLocalStorage`) and keep MVP settings fixed/minimal. A later settings bridge belongs to normal Plasmon app persistence, not a game-specific browser database.

---

## 18. Performance and package-size analysis

Do not make the initial Plasmon bundle pay for every emulator core.

### Runtime table

| Runtime | Purpose | Size/cost finding | Browser requirements | Persistence default/behavior | MVP? |
| --- | --- | --- | --- | --- | --- |
| js-dos `emulators` + UI | DOS `.jsdos` | JS/UI + WASM/worker assets; exact shipped size must be measured from pinned build | WASM, Worker preferred, canvas/audio, Blob if used | IndexedDB by default; current custom `fsChanges`; current local persistence also references OPFS | YES |
| EmulatorJS 4.2.3 host | Multi-console ROM host | small host compared with all-core release; package only host + selected cores | WASM, canvas/WebGL, audio, Gamepad, Blob if used | IDBFS for native saves; localStorage settings | YES |
| EmulatorJS all-core release | every supported core | release archive is hundreds of MB; unacceptable as default Plasmon payload | varies by core | varies | NO |
| Individual selected EJS cores | NES/GBA/etc. | typically low-single-MB class assets per core; verify exact release files before integration | core dependent | shares EJS save bridge | YES, lazy |

The stable EmulatorJS 4.2.3 prebuilt all-core release is roughly 300 MB. That is evidence for a curated-core strategy, not a reason to reject EmulatorJS.

### Packaging strategy

- initial desktop load: no game runtime/core payload executed or fetched;
- opening first `.jsdos`: lazy-load pinned js-dos assets;
- opening first ROM: lazy-load EmulatorJS host plus only the mapped core;
- cache immutable runtime assets normally after first load;
- package/hash runtime assets locally rather than depend on CDN availability;
- keep game/ROM bytes in the filesystem and stream/read only when launched;
- do not package NDS BIOS/firmware.

Exact compressed/brotli sizes and memory peaks are an implementation gate. The implementing agent should record bundle analyzer output for the pinned assets and one representative game per runtime.

---

## 19. Game/ROM licensing audit

This table is a technical redistribution audit, not legal advice. "BLOCKED" means the evidence found is insufficient for bundling in a public hackathon artifact.

### Requested ROMs

| Game | Format | Upstream/source evidence | License/status found | Redistribution evidence | Ship? |
| --- | --- | --- | --- | --- | --- |
| Alter Ego | `.nes` | Shiru/Retrosouls NES homebrew; NESdev author discussion | no exact formal license negotiated for the NES version | Shiru explicitly stated no exact license was negotiated; personal repro/ports discussed, but this is not a clean public redistribution grant | **BLOCKED** |
| Anguna v0.95 | `.gba` | Nathan Tolbert/Gauauu readme, mirrored with the homebrew binary | custom freeware distribution permission | readme explicitly permits free binary distribution provided the readme text is made available with it | **YES, conditional** |
| Mega Q*bert | `.gen` | Jaklub itch.io / SpritesMind | free downloadable homebrew/fan adaptation | download availability but no redistribution license located; also derivative Q*bert IP | **BLOCKED** |
| Bilou: School Rush | `.nds` | PypeBros itch.io | free NDS homebrew; engine described as open source | no explicit binary redistribution grant located; third-party catalog labels license "Mixed" | **BLOCKED** |
| Halo 2600 | `.a26` | Ed Fries; Smithsonian catalog | copyrighted work; Halo derivative | Smithsonian marks `© 2010, Ed Fries`; historical permission to create/distribute was limited/context-specific, not a general grant to Plasmon | **BLOCKED** |
| Classic Kong Complete | `.smc` | BubbleZap homebrew; community catalogs | often tagged `(PD)` | NESdev documents that GoodTools `(PD)` can mean "freely distributed", not legal public domain; game is a Donkey Kong fangame/remake | **BLOCKED** |

Anguna evidence:

- https://github.com/retrobrews/gba-games/blob/add86969f1a7a3b9534822a9a015d05ed20a0dcf/anguna.txt

The readme states that Anguna may be distributed freely in binary form if that text is made available with it. If shipped, pin the exact v0.95 binary/hash and include the complete readme/notice. The art/music resources may not be extracted and reused separately.

Alter Ego evidence:

- https://forums.nesdev.org/viewtopic.php?t=10404

Mega Q*bert evidence:

- https://jaklub.itch.io/mega-qbert

School Rush evidence:

- https://pypebros.itch.io/bilou-school-rush

Halo 2600 evidence:

- https://americanart.si.edu/artwork/halo-2600-82224

Classic Kong caution:

- https://www.nesdev.org/wiki/Public_domain

### Requested DOS bundles

| Game | Format | Source/status | Redistribution concern | Ship? |
| --- | --- | --- | --- | --- |
| Doom | `.jsdos` | likely Doom shareware content in analogous daedalOS demos | Doom engine source is GPL, but game data is separate. Doom shareware license permits giving copies, while prohibiting modification/derivative works; repacking extracted game files into a new `.jsdos` container is not clearly the unmodified distribution form | **BLOCKED pending exact package/legal approval** |
| Duke Nukem 3D | `.jsdos` | historical shareware episode exists | open-source engine release explicitly says original game data remains separately copyrighted; exact shareware redistribution/repack terms for the intended files were not established from a primary license | **BLOCKED** |
| Wolfenstein 3-D | `.jsdos` | historical Episode 1 shareware | shareware was intended for redistribution, but exact permission for repackaging the installed files into a `.jsdos` derivative bundle was not established in this pass | **BLOCKED pending exact archive terms** |

Important Doom references:

- https://github.com/id-Software/DOOM
- https://sources.debian.org/src/doom-wad-shareware/1.9.fixed-2/debian/copyright/

The GPL source release explicitly says real Doom data is still required; the engine license is not a WAD/data license.

Duke source/data distinction:

- https://github.com/videogamepreservation/dukenukem3d

### Why daedalOS chose these games

The inspected daedalOS source and credits do **not** document a formal rationale for this exact catalog. The selection appears to be a system-diverse set weighted toward homebrew/free-download content, but that is an inference, not source-backed licensing policy. Plasmon should not assume daedalOS inclusion equals redistribution permission.

### Safe replacement recommendation

For the public MVP:

1. Create a tiny **Plasmon-authored DOS demo** and package it as `.jsdos`. This proves the DOS handler/runtime/save path with no commercial game-data ambiguity.
2. Ship **Anguna v0.95** only if the exact readme/notice is included and the binary/version is verified.
3. Prefer a **Plasmon-authored or clearly permissively licensed NES demo** for a second ROM. A starter/reference codebase may be used only under its own clear license; the final bundled ROM/art should have explicit Plasmon-compatible rights.
4. Allow users to open their own legally obtained ROMs for other supported extensions without Plasmon redistributing them.

Do not download or commit questionable ROM/game binaries as part of this design branch.

---

## 20. daedalOS reuse-vs-rewrite analysis

| Piece | Classification | Recommendation |
| --- | --- | --- |
| Extension -> process association idea | **COPY/ADAPT** | map extensions to ordinary Plasmon handlers through existing AssociationRegistry |
| One Emulator app for many systems | **COPY/ADAPT** | keep one handler and core map |
| Read game bytes from virtual FS then Blob URL | **COPY/ADAPT** | use `FsService`; prefer direct byte API if stable, Blob only as adapter |
| Lazy runtime dependencies | **COPY/ADAPT** | critical for package cost |
| Save-on-close lifecycle | **COPY/ADAPT** | preserve, but await Plasmon persistence barrier |
| Screenshot-backed save-state icon | **COPY/ADAPT** | good UX; integrate with Agent 11 thumbnail rules |
| Same-origin iframe content isolation for EJS globals | **CONCEPT ONLY** | useful if needed; implement a small Plasmon-owned isolation wrapper |
| `/Users/Public/Snapshots` user-visible concept | **CONCEPT ONLY** | replace with typed `/Games/Saves` structure |
| Emscripten filesystem exposure in FileManager | **CONCEPT ONLY / POST-MVP** | interesting inspectability, not required to prove launch/save |
| daedalOS basename save keys | **DO NOT USE** | breaks on rename and collides |
| daedalOS old vendored EmulatorJS 2.3.5 | **DO NOT USE** | pin current stable 4.2.3 instead |
| browser IndexedDB as durable game truth | **DO NOT USE** | Plasmon `FsService` must be authoritative |
| hard-coded game catalog/switch statements | **DO NOT USE** | associations drive launch |
| all EmulatorJS cores/assets | **DO NOT USE** | curated lazy core set only |
| daedalOS game binaries without independent license review | **DO NOT USE** | license each bundled content file independently |

If any daedalOS wrapper code is copied substantially, preserve its MIT attribution. js-dos and EmulatorJS runtime licenses remain separate obligations.

---

## 21. Bounded hackathon MVP proposal

Two runtimes are justified because they prove that Plasmon's filesystem/application abstraction is not specific to one emulator format.

### MUST demo flow A: DOS

```text
/Games/DOS Bundles/plasmon-demo.jsdos
  -> AssociationRegistry
  -> DOS native handler
  -> lazy js-dos runtime
  -> play/change DOS files
  -> close
  -> /Games/Saves/DOS/.../current.changes
  -> reopen and restore
```

Use a tiny Plasmon-owned DOS program/game, not Doom/Duke/Wolfenstein unless licensing is separately cleared.

### MUST demo flow B: ROM

```text
/Games/Roms/Anguna.gba
  -> AssociationRegistry
  -> Emulator native handler
  -> lazy EmulatorJS + mgba core
  -> play/save
  -> close
  -> native save and/or autosave state under /Games/Saves
  -> reopen and restore
```

A small legally owned NES ROM is the ideal second ROM because NES is lightweight and demonstrates a second extension/core without the NDS BIOS burden.

### MVP supported formats

Hard gate: **only advertise formats whose core is packaged and smoke-tested.**

Recommended first gate:

- `.jsdos`;
- `.gba` (`mgba`);
- `.nes` (`fceumm`).

If the first gate is stable and package cost remains small, add in this order:

- `.a26` (`stella2014`);
- `.smc`/`.sfc` (`snes9x`);
- `.gen`/`.md` (`genesis_plus_gx`).

Do not include `.nds` in the hackathon baseline.

### Convincing demo acceptance

- double-click launches via normal associations;
- Open With shows normal candidates/default behavior;
- a desktop shortcut opens the same target through normal resolution;
- Properties shows system/runtime/save information;
- runtime is lazy-loaded;
- save progress survives close/reopen from Plasmon persistence;
- renaming/moving the source file does not lose its save because `NodeId` is stable;
- current Firefox and Edge/Chromium pass launch/audio/input/close/reopen smoke tests.

---

## 22. Post-MVP features

- more EmulatorJS systems/cores;
- NDS with an explicit BIOS ownership/import story or a core choice that does not require bundled proprietary firmware;
- multiple save-state slots;
- save import/reassociation UX;
- controller remapping UI;
- generated screenshot gallery;
- per-game launch options;
- Emscripten runtime filesystem inspection/mounting;
- optional shaders;
- rewind;
- netplay/multiplayer;
- game catalog/discovery/store UX;
- Atom-like shareable game-session/save resources after the Atom design is complete.

No Atom/MTN/Sharing dependency is required for the hackathon game subsystem.

---

## 23. Exact dependencies on Agent 10 and Agent 11

### Agent 10 — filesystem semantics

Need final decisions/guarantees for:

1. `.sys` built-in application representation and canonical system paths;
2. stable `NodeId` preservation across rename/move in the actual implementation;
3. shortcut target representation/resolution so a shortcut reaches the target node before normal association resolution;
4. read-only/system semantics for `/System/Program Files`;
5. hidden metadata conventions, especially whether typed save metadata belongs directly on `FsNode.metadata`;
6. whether `/Games/Saves` is seeded or created on first use;
7. search/index behavior for save files;
8. copy semantics for NodeId so copied games naturally receive a new save identity.

Agent 12 does not need Agent 10 to implement runtime launch; these are integration contracts to consume after Agent 10 freezes them.

### Agent 11 — visual system

Need assets/rules for:

1. built-in DOS application icon;
2. built-in Emulator application icon;
3. generic `.jsdos` bundle icon;
4. generic ROM icon, optionally with small platform variants if consistent with the new visual system;
5. native-save icon/presentation;
6. save-state icon/presentation;
7. shortcut overlay composition over game art/icon;
8. thumbnail dimensions/cropping/fallback behavior;
9. whether platform/system badges are allowed without making icons visually noisy.

Agent 12 supplies the semantic states; Agent 11 owns final art and icon language.

---

## 24. Work later needed from native-app, Shell, and FileManager owners

### Native-app/game runtime owner

- implement DOS and Emulator native application shells;
- implement lazy runtime asset loading;
- implement `FsService` byte bridge;
- implement js-dos change persistence adapter;
- implement EmulatorJS native-save and state bridge;
- implement worker/iframe/objectURL/audio teardown;
- implement focused input/pointer/fullscreen handling.

### Shell/window owner

- ensure focused game window receives input without stealing global shell behavior;
- expose safe maximize/minimize/restore behavior to runtime canvas;
- provide close lifecycle that can await a short persistence barrier rather than destroying the runtime before save flush;
- guarantee Escape can recover from pointer lock/browser fullscreen according to browser APIs.

No WindowManager redesign is requested.

### FileManager/Open With owner

- register built-in handler definitions/rules at integration composition point;
- preserve normal Open With/default semantics;
- surface game-specific Properties data using provider/metadata extension points;
- render legal artwork/generated thumbnails through the normal icon/thumbnail path;
- make shortcuts visually resolve to target game artwork plus normal overlay.

### Build/package owner

- package exact pinned runtime assets;
- exclude unused EmulatorJS cores;
- include required GPL notices/source compliance artifacts;
- collect exact compressed sizes and bundle analyzer output;
- configure CSP for local WASM/worker/Blob use only as needed.

---

## 25. Implementation sequence

1. **Freeze integration names only after Agent 10 review.** Keep internal handler IDs stable even if display filenames change.
2. Register two native handlers with existing AssociationRegistry; add only `.jsdos`, `.gba`, `.nes` at the first gate.
3. Implement a shared small `GameSession` lifecycle helper only if it reduces duplicated focus/close/resource cleanup; do not create a second game framework.
4. Implement DOS handler with a Plasmon-authored `.jsdos` fixture and no browser-authoritative persistence.
5. Implement Emulator handler with one permissive/test ROM, `mgba` or `fceumm`, and Plasmon-authoritative save bridge.
6. Add typed `/Games/Saves` creation/metadata using Agent 10's final FS semantics.
7. Add close autosave state after native-save correctness is proven.
8. Add Properties and shortcut behavior through existing FileManager surfaces.
9. Add Agent 11 icons/thumbnail hierarchy.
10. Run Firefox + Edge/Chromium packaged-environment acceptance.
11. Record actual runtime/core compressed sizes and memory observations.
12. Only then add `.a26`, `.smc/.sfc`, `.gen/.md` if schedule/package budget allows.
13. Keep `.nds` post-MVP unless the BIOS/firmware and UX scope is explicitly accepted.

---

## 26. Priority and size estimates

Definitions requested for this project:

- Priority: `MUST`, `HIGH`, `NORMAL`, `LATER`
- Size: `Tiny`, `Small`, `Medium`, `Big`, `Really Big`

| Work | Priority | Size | Owner note |
| --- | --- | --- | --- |
| Register DOS + Emulator handlers using existing associations | MUST | Small | integration/native app |
| `.jsdos` runtime launch from `FsService` | MUST | Medium | native app |
| js-dos Plasmon-authoritative changes persistence | MUST | Medium | native app/persistence |
| EmulatorJS one-core launch from `FsService` | MUST | Medium | native app |
| EmulatorJS native-save bridge | MUST | Big | native app/persistence |
| EmulatorJS autosave-state bridge | MUST | Medium | native app/persistence |
| `/Games/Saves` typed metadata/layout | MUST | Medium | coordinate Agent 10 |
| Runtime manifests/license notices | MUST | Small | build/package |
| Lazy runtime/core packaging | MUST | Medium | build/package |
| Plasmon-owned DOS demo `.jsdos` | MUST | Small | content/test |
| Anguna verification/readme packaging | HIGH | Small | content/legal gate |
| Current Firefox + Edge/Chromium smoke matrix | MUST | Medium | integration QA |
| Properties fields | HIGH | Small | FileManager |
| Game/save thumbnails | HIGH | Medium | native app + Agent 11 |
| Shortcut target game icon integration | HIGH | Small | FileManager + Agent 11 |
| Add Atari 2600 core/extension | NORMAL | Small | after generic loader |
| Add SNES core/extensions | NORMAL | Small | after generic loader |
| Add Genesis core/extensions | NORMAL | Small | after generic loader |
| Save import/reassociation UI | LATER | Medium | FileManager |
| Multi-slot save-state UI | LATER | Medium | native app |
| NDS support with BIOS/firmware story | LATER | Big | runtime/legal/UX |
| All-core emulator catalog | LATER | Really Big | explicitly out of hackathon scope |
| Netplay/store/achievements | LATER | Really Big | explicitly out of scope |

---

## 27. Unresolved decisions

1. Final visible names/paths: `DOS.sys`, `Emulator.sys`, or Agent 10 alternatives.
2. Exact js-dos pin for implementation: reproduce daedalOS-proven 8.3.9 first versus moving directly to current 8.4.x after a smoke test. Recommendation: start from 8.3.9 behavior and upgrade only with a measured test.
3. Whether `/System/Program Files` is physically materialized or a virtual read-only projection.
4. Exact save extensions. Recommendation is `.changes` for DOS delta, native/core-appropriate save extension for native bytes, and `.state` for emulator state; avoid globally hijacking generic `.sav` for all concepts.
5. Whether the MVP advertises only `.gba`/`.nes` initially or also the three low-scope extra core families after the first integration gate.
6. Whether every clean close creates `autosave.state` or only native save data is automatic. Recommendation: native save always; autosave state on clean close where core supports it, clearly labeled as state.
7. Exact EmulatorJS 4.2.3 method used to ensure IDBFS can never beat newer Plasmon bytes. The 4.2.2 events make the bridge feasible, but implementation should include a targeted smoke test of startup seed -> play -> save -> clear browser storage -> restore from Plasmon.
8. Exact CSP rules in the packaged Neutron context after runtime assets are pinned.
9. Legal approval for any commercial/shareware-derived DOS demo content. Until approved, ship only Plasmon-owned DOS content.

---

## Required format table

| Extension | System | Handler/runtime | Save support | BIOS? | MVP? | Confidence / browser note |
| --- | --- | --- | --- | --- | --- | --- |
| `.jsdos` | DOS | DOS handler / js-dos | filesystem-change bundle; in-game saves inside changes | No | **YES** | High; Worker/WASM/audio/pointer behavior must pass packaged-browser smoke |
| `.nes` | NES/Famicom cartridge | Emulator / EmulatorJS `fceumm` | native save where cartridge supports it + save state | No for ordinary NES carts; FDS BIOS only for FDS | **YES** | High |
| `.gba` | Game Boy Advance | Emulator / EmulatorJS `mgba` | native save + state | GBA BIOS optional | **YES** | High |
| `.gen`, `.md` | Sega Mega Drive/Genesis | Emulator / `genesis_plus_gx` | SRAM where game supports it + state | upstream documents TMSS `bios_MD.bin`; ordinary cart path should be tested without bundling BIOS | **NORMAL after first gate** | High for core; validate BIOS-free test ROM |
| `.a26` | Atari 2600 | Emulator / `stella2014` | state; native persistent save only for cartridges/peripherals that provide it | No normal console BIOS | **NORMAL after first gate** | High, small scope |
| `.smc`, `.sfc` | SNES/Super Famicom | Emulator / `snes9x` | SRAM + state | No ordinary-cart BIOS; BS-X/Sufami BIOS optional for those modes | **NORMAL after first gate** | High |
| `.nds` | Nintendo DS | Emulator / default `melonds` | native save + state | **Yes for melonDS:** `bios7.bin`, `bios9.bin`, `firmware.bin` | **NO / LATER** | Technically supported, but BIOS/firmware + dual-screen/touch + package/UX expand scope |

System documentation:

- NES: https://emulatorjs.org/docs/systems/nes-famicom/
- GBA: https://emulatorjs.org/docs/systems/nintendo-game-boy-advance/
- NDS: https://emulatorjs.org/docs/systems/nintendo-ds/
- Genesis: https://emulatorjs.org/docs/systems/sega-mega-drive/
- SNES: https://emulatorjs.org/docs/systems/snes/

---

## Explicit answers to the 22 required questions

### 1. What exactly is a `.jsdos` file?

A ZIP-format js-dos bundle containing DOS program/game files plus js-dos configuration under `.jsdos/` such as `dosbox.conf` and js-dos metadata/config.

### 2. How does daedalOS launch it?

It reads the filesystem bytes, makes a Blob/Object URL, restores an optional companion `.zip.save` changes bundle from `/Users/Public/Snapshots`, runs it through js-dos, and persists changes on close.

### 3. What exactly are daedalOS game snapshots?

Ordinary files in `/Users/Public/Snapshots` containing runtime save artifacts. JSDOS snapshots are filesystem-change bundles; EmulatorJS snapshots are serialized emulator save states. The folder is not a filesystem versioning/snapshot system.

### 4. How are DOS saves persisted?

In daedalOS, `ci.persist()` emits a js-dos changes bundle stored as `<bundle basename>.zip.save`. In Plasmon, store equivalent changes bytes through `FsService`, keyed by source `NodeId`.

### 5. How does EmulatorJS persist native saves/save states?

Current EmulatorJS mounts `/data/saves` with Emscripten IDBFS for native core saves and exposes events/APIs to obtain native save bytes. Save states are a separate serialized state path. daedalOS currently focuses on the state path for its auto-snapshot file.

### 6. Which browser storage mechanisms do the runtimes use?

js-dos defaults to browser local persistence including IndexedDB, with current custom `fsChanges` hooks and newer OPFS-related local persistence. EmulatorJS uses IDBFS/IndexedDB for `/data/saves` and localStorage for settings unless disabled.

### 7. How should Plasmon replace/adapt that persistence?

Make `FsService` authoritative. Seed runtime caches from Plasmon on launch, flush bytes to Plasmon on save/close, disable cloud/local settings authority where possible, and ensure clearing browser storage does not destroy user progress.

### 8. Which ROM systems should the hackathon MVP support?

First gate: NES and GBA. Add Atari 2600, SNES, and Genesis only after the generic loader/save bridge passes and package cost remains acceptable. Do not make NDS a baseline.

### 9. Which requested sample games are legally redistributable?

Anguna v0.95 has explicit binary redistribution permission provided its readme text accompanies it. No other requested ROM received a sufficiently clear public-bundling approval from the evidence found in this pass.

### 10. Which require replacements?

Alter Ego, Mega Q*bert, School Rush, Halo 2600, and Classic Kong should be considered blocked until explicit rights evidence is obtained. For the hackathon, replace at least the NES example with a Plasmon-owned/permissively licensed demo. Doom/Duke/Wolf `.jsdos` examples are also blocked pending exact repackaging rights; use a Plasmon-owned DOS demo.

### 11. Should there be one `Games.sys`, separate `DOS.sys`/`Emulator.sys`, or something else?

Use two conceptual applications: DOS and Emulator. One Emulator app handles all selected ROM systems. Do not create one app per console and do not collapse the materially different DOS/emulator runtimes into a game-name launcher.

### 12. What belongs in `/System/Program Files`?

Pinned, read-only, curated runtime assets; version/upstream/license manifest; license notices; only selected EmulatorJS cores; meaningful defaults. Not node_modules/build cache, not saves, and not the user-facing application identity itself.

### 13. How should normal Open With/association resolution launch games?

Register normal native handler definitions/rules with existing AssociationRegistry. `OpenService` receives the chosen handler plus `OpenTarget.nodeId`; the handler reads the game from `FsService`.

### 14. How should game shortcuts work?

A shortcut resolves to the target game node and then follows the same normal association path. No shortcut-specific game launcher.

### 15. What stable identity links games to save data?

Primary: source `NodeId`. Secondary: content hash and runtime/system/core metadata.

### 16. What happens when the game file is renamed or moved?

Nothing to the save link because NodeId remains the key. Friendly save presentation can update lazily.

### 17. How should saves appear in `/Games/Saves`?

As ordinary user-visible/exportable files grouped by semantic kind (`Native`, `States`, `DOS`) with source/runtime metadata.

### 18. Should save states and native saves be separate?

Yes. Native saves are usually more portable; states are core/version-sensitive. DOS changes are a third separate kind.

### 19. How are game thumbnails generated/selected?

Known legal packaged art first, then locally generated last-session screenshot, then platform/generic game icon. Save-state screenshots can be thumbnails; no live web art dependency.

### 20. What is the minimum convincing hackathon implementation?

Two normal file types (`.jsdos` plus one/two ROM types), two native handlers, lazy runtimes, one legal DOS demo, one legal ROM, Plasmon-authoritative save/restore, normal shortcut/Open With/Properties, and Firefox/Edge smoke acceptance.

### 21. What can we directly adapt from daedalOS?

Association-driven launch concept, one Emulator app for many systems, FS-byte-to-runtime bridge, lazy dependencies, save-on-close lifecycle, generated screenshots, and optional iframe isolation pattern.

### 22. What should we deliberately not copy?

Basename save keys, old vendored EmulatorJS runtime, browser-local persistence authority, hard-coded game catalogs, all-core bundles, ambiguous mixed snapshot formats, or any bundled game data whose redistribution rights were not independently verified.

---

## Source index

### daedalOS exact source

- https://github.com/DustinBrett/daedalOS/tree/0df82d75e6114727ad035f6fce93842a96682355
- https://github.com/DustinBrett/daedalOS/blob/0df82d75e6114727ad035f6fce93842a96682355/components/apps/JSDOS/config.ts
- https://github.com/DustinBrett/daedalOS/blob/0df82d75e6114727ad035f6fce93842a96682355/components/apps/JSDOS/useDosCI.ts
- https://github.com/DustinBrett/daedalOS/blob/0df82d75e6114727ad035f6fce93842a96682355/components/apps/JSDOS/useJSDOS.ts
- https://github.com/DustinBrett/daedalOS/blob/0df82d75e6114727ad035f6fce93842a96682355/components/apps/Emulator/config.ts
- https://github.com/DustinBrett/daedalOS/blob/0df82d75e6114727ad035f6fce93842a96682355/components/apps/Emulator/useEmulator.ts
- https://github.com/DustinBrett/daedalOS/blob/0df82d75e6114727ad035f6fce93842a96682355/hooks/useSnapshots.ts
- https://github.com/DustinBrett/daedalOS/blob/0df82d75e6114727ad035f6fce93842a96682355/hooks/useIsolatedContentWindow.ts
- https://github.com/DustinBrett/daedalOS/blob/0df82d75e6114727ad035f6fce93842a96682355/contexts/process/directory.ts
- https://github.com/DustinBrett/daedalOS/blob/0df82d75e6114727ad035f6fce93842a96682355/components/system/Files/FileEntry/extensions.ts
- https://github.com/DustinBrett/daedalOS/blob/0df82d75e6114727ad035f6fce93842a96682355/public/CREDITS.md

### js-dos

- https://js-dos.com/emulators.html
- https://js-dos.com/player-api.html
- https://js-dos.com/save-load-game-progress.html
- https://js-dos.com/v7/build/docs/save-load/
- https://www.npmjs.com/package/emulators
- https://www.npmjs.com/package/js-dos

### EmulatorJS

- https://github.com/EmulatorJS/EmulatorJS
- https://github.com/EmulatorJS/EmulatorJS/releases
- https://github.com/EmulatorJS/EmulatorJS/blob/main/data/src/GameManager.js
- https://github.com/EmulatorJS/EmulatorJS/blob/main/data/src/storage.js
- https://github.com/EmulatorJS/EmulatorJS/blob/main/data/src/emulator.js
- https://github.com/EmulatorJS/EmulatorJS/blob/main/data/src/consts.js
- https://emulatorjs.org/docs/systems/

### Licensing/content evidence

- Anguna: https://github.com/retrobrews/gba-games/blob/add86969f1a7a3b9534822a9a015d05ed20a0dcf/anguna.txt
- Alter Ego: https://forums.nesdev.org/viewtopic.php?t=10404
- Mega Q*bert: https://jaklub.itch.io/mega-qbert
- School Rush: https://pypebros.itch.io/bilou-school-rush
- Halo 2600: https://americanart.si.edu/artwork/halo-2600-82224
- Classic Kong `(PD)` terminology caution: https://www.nesdev.org/wiki/Public_domain
- Doom engine/data distinction: https://github.com/id-Software/DOOM
- Doom shareware license copy: https://sources.debian.org/src/doom-wad-shareware/1.9.fixed-2/debian/copyright/
- Duke source/data distinction: https://github.com/videogamepreservation/dukenukem3d

---

## Design-phase confirmations

- No ROM binaries were downloaded or committed.
- No DOS commercial/shareware game data was committed.
- No proof code was added; source inspection was sufficient to answer the design questions.
- No Plasmon frozen OS contracts were changed.
- No MTN, Sharing, Atom, Kernel, Shell/Desktop production code, Agent 10 filesystem design, Agent 11 theme design, or package lock was changed.
- This document is the only intended branch change for the design phase.
- No pull request is required or intended for this Agent 12 handoff.
