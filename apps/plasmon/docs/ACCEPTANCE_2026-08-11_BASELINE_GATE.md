# Integrated packaged acceptance gate — 2026-08-11 review baseline

**Canonical Issue:** #107  
**Gate date:** 2026-08-12  
**Integration branch:** `version-0.1.0-os`  
**Branch-start integration commit:** `072afe6ba8f48a36c6b1bcb0c222caa017596346`

This report re-checks the still-relevant findings from the 2026-08-11 packaged/manual Plasmon review against the current integrated product. It is acceptance evidence, not a feature implementation plan.

## Evidence rules

The project testing order is:

```text
pure/model/service
  -> headless cross-subsystem production composition
  -> small packaged/browser journeys
  -> human/manual acceptance
```

A lower layer is not promoted into a stronger claim. In particular, a focused Bun test can establish deterministic semantics, but it cannot prove browser download behavior, Monaco readiness, media/fullscreen behavior, or visual presentation. Likewise, successful package boot does not close unrelated product Issues.

Result meanings:

- **PASS** — the behavior has evidence at the layer required for this finding.
- **FAIL** — current integrated code still has a canonical, user-visible defect relevant to the finding.
- **SUPERSEDED** — the old expectation is intentionally no longer the product contract.
- **NOT-YET-TESTABLE** — the required acceptance layer or accepted fixture/path is not currently available on this integration head; the concrete blocker is recorded.

## Gate execution

The #107 PR must pass the normal current-head lanes before this report is handed to review:

- `npm --workspace neutron-plasmon test`
- `npm --workspace neutron-plasmon run test:package`
- the existing installed-package Playwright golden path through the supported Neutron/PocketIC browser environment

The browser lane is intentionally not expanded into broad FileManager/Start/Search scripting here. Feature-specific browser journeys remain with their owning Issues where a true browser boundary requires them.

## Finding matrix

| Finding | Result | Evidence layer | Evidence / disposition | Canonical Issue(s) |
| --- | --- | --- | --- | --- |
| Desktop/FileManager shortcut activation | **PASS** | headless + packaged/browser | FileManager now delegates activation to the canonical filesystem opener, including shortcut dereference. The packaged golden path double-clicks the durable `Root` Desktop shortcut (a stable NodeId shortcut seeded by filesystem bootstrap) and reaches the native window path. | #31, #107 |
| `.sys` activation | **PASS** | packaged/browser | The installed-package golden path searches for and opens Recycle Bin through the real Shell/process/window path. Recycle Bin is the real `/System/RecycleBin.sys` native system application, so this is an actual packaged `.sys` activation proof rather than source inspection. | #32, #45, #107 |
| `.neutron` filesystem-projection activation | **NOT-YET-TESTABLE** | required packaged/Neutron boundary missing | Current deterministic opening contracts route Neutron projections to `NeutronBridge`, but the existing packaged journey launches Plasmon from the Kernel tile, not by activating an `/Apps/*.neutron` projection inside Plasmon. #120 explicitly assigns the real installed Element launch boundary to #107; this gate cannot claim it without that path. | #31, #32, #120, #107 |
| Delete -> Recycle Bin -> restore / explicit permanent delete / empty | **NOT-YET-TESTABLE** | headless PASS; visible packaged lifecycle outstanding | The integrated headless Trash lifecycle regression composes FileManager, `TrashService`, and Recycle Bin and proves stable identity/metadata plus restore and permanent-delete/empty semantics. The packaged golden path currently proves only that Recycle Bin launches and renders its empty state. No packaged/manual evidence in this gate performs the full delete/restore/empty interaction, so visible lifecycle acceptance remains open. | #40, #45, #77, #107 |
| FileManager Download | **NOT-YET-TESTABLE** | deterministic helper PASS; browser boundary outstanding | Focused tests prove FsService bytes, MIME/name preservation, browser anchor setup, and object-URL cleanup. Actual installed-browser download behavior is a browser-owned boundary and is not exercised by the small packaged lane. It therefore remains a packaged/manual acceptance item rather than being promoted from Bun evidence. | #107 |
| FileManager collision naming | **PASS** | deterministic fast/headless | Existing focused tests cover generated folder/document collisions, copy suffix progression, extensions, directories, dotfiles, files without extensions, and case folding. This is deterministic naming policy and does not require Playwright. | #107 |
| FileManager rename selection semantics | **PASS** | deterministic component/model | Existing tests prove basename-only selection for normal files, full-name selection where appropriate, initial selection stability, extension changes, and Enter/Escape commit/cancel behavior. | #107 |
| FileManager selected filename/rename label presentation | **NOT-YET-TESTABLE** | human/visual acceptance required | Source/component coverage proves selected/renaming CSS state, but actual readability/overflow/edge presentation is visual behavior. #95 separately tracks the known selected-label width/readability gap, so this gate does not claim visual acceptance. | #95, #107 |
| FileManager folder-drop target semantics | **PASS** | deterministic model/component | Existing tests prove only a non-source directory is selected as a drop target and that the entry receives the drop-target state. The move policy remains below React. | #107 |
| FileManager folder-drop visible feedback | **NOT-YET-TESTABLE** | human/visual acceptance required | The presence of an `is-drop-target` class is not proof that the feedback is visually clear in the packaged desktop. This remains a manual visual check; no new functional failure was observed from source/fast evidence. | #107 |
| Start/Search filesystem result semantics | **PASS** | deterministic fast/headless | Search tests cover matching folders and file categories, and #32 routes filesystem-backed Start/Search activation through the canonical opener. Deterministic result/open policy belongs below Playwright. | #32, #107 |
| Packaged Search -> native application launch | **PASS** | packaged/browser | The installed golden path opens Search, enters `Recycle Bin`, launches the result, and observes the real native Recycle Bin window. | #32, #45, #107 |
| Start/Search click-away interaction | **NOT-YET-TESTABLE** | packaged/manual interaction | This gate does not broaden the golden path into general overlay scripting. A human/manual packaged pass is still required to accept click-away behavior as experienced in the integrated desktop. | #107 |
| Current Start inventory | **FAIL** | current code / canonical defect | The current Start model still has two independently tracked inventory defects: #87 retains a managed `System` category for Settings/Explorer/Properties, and #88 permits runtime-only hosts such as js-dos to be seeded as user-launchable applications. These are product defects, not acceptance-harness gaps. | #87, #88, #107 |
| Start pinning semantics | **PASS** | deterministic model/service | Pin state is filesystem-backed and the semantic pin/unpin behavior is already covered below React. | #107 |
| Start/Shell pin control presentation | **FAIL** | current code / canonical visual defect | #109 records that Start and Shell pin controls still render the literal `📌` emoji rather than the accepted shared icon treatment. Package boot does not supersede that defect. | #109, #107 |
| Taskbar lifecycle/presentation | **FAIL** | current code / canonical defect | #72 records that raw Neutron `yes` / `no` / `unknown` runtime tokens and ad-hoc native/Element states are still exposed instead of coherent pinned/running/active/launching presentation. Cross-authority lifecycle backfill #81 follows that correction. | #72, #81, #107 |
| Text Monaco open/edit/save/reopen | **NOT-YET-TESTABLE** | packaged Monaco boundary blocked | Current package checks prove Monaco worker assets are served, not that the real editor is usable. #67 owns the compact installed-package Text journey and is not part of this integration head yet. | #67, #107 |
| Markdown Monaco open/edit/save/reopen | **NOT-YET-TESTABLE** | packaged Monaco boundary blocked | Same boundary as Text: deterministic document/session behavior remains below the browser, while real Monaco readiness/edit/save/reopen belongs to #67. | #67, #107 |
| Photos fullscreen rejection/fallback | **NOT-YET-TESTABLE** | deterministic PASS; browser fullscreen boundary outstanding | Focused tests prove disabled fullscreen and rejected `requestFullscreen()` fall back to expanded view without an uncaught promise. Actual hosted-browser fullscreen rejection/fallback remains a real browser/manual acceptance boundary and is not exercised by the current golden path. | #107 |
| Video unsupported-codec behavior | **NOT-YET-TESTABLE** | deterministic PASS; browser media boundary outstanding | Focused tests prove MIME inference, native capability classification, and actionable unsupported/decode/load messages. The installed browser has not been driven through an actual unsupported-codec media event in this gate, so user-visible playback error acceptance remains outstanding. | #107 |
| `/System/Program Files` managed root and packaged js-dos runtime assets | **PASS** | filesystem/headless + package/build structural | #57 established the canonical managed Program Files root. The current build installs the pinned js-dos runtime beneath `System/Program Files/js-dos`, verifies required JS/WASM assets, and writes runtime metadata before package creation. This proves managed/package structure, not the final Explorer visual presentation. | #57, #107 |
| Program Files visible Explorer/runtime presentation | **NOT-YET-TESTABLE** | human/manual presentation | Structural and filesystem evidence does not prove that the integrated Explorer presentation is understandable or polished. That remains a packaged manual review item. | #57, #107 |
| Old boot-time Doom seed expectation | **SUPERSEDED** | accepted product contract | #29 intentionally removed the temporary hackathon/demo game seed from normal OS boot. Reintroducing Doom at startup would regress the accepted architecture. | #29, #121, #107 |
| Explicit installed-package `.jsdos` fixture -> js-dos playable launch | **NOT-YET-TESTABLE** | accepted packaged fixture path missing | The build currently contains pinned js-dos runtime/game proof assets and the existing games browser proof can import a dist fixture in the standalone/dev path, but #121 exists to establish the reusable explicit fixture path through the final installed package without restoring boot seeding. Until that path is accepted, #107 cannot honestly claim the requested installed-package game launch. #48/EmulatorJS is not a blocker for this js-dos item. | #121, #107 |

## What the current package lane does prove

The existing installed-package golden path is deliberately small. On a green #107 PR it proves that the current Plasmon package can be built, installed into the supported Neutron/PocketIC environment, served through the final `/app/plasmon/` route, launched from the Kernel tile, and rendered without page errors for the journey it exercises. It also proves representative browser-owned behavior already in that journey, including Monaco worker HTTP serving, Search-driven Recycle Bin launch, the empty Recycle Bin surface, and native edge snapping.

It does **not** imply that every Start item, taskbar state, media app, editor, download path, or game runtime has passed acceptance.

## Remaining user-visible blockers to the next acceptance milestone

The integrated desktop should not be described as clearing the 2026-08-11 baseline while these directly relevant blockers remain:

1. **Start inventory is still wrong** — #87 and #88.
2. **Taskbar user-facing state is still wrong** — #72; #81 remains the composed regression follow-up.
3. **Start/Shell pin presentation is still visibly provisional** — #109.
4. **Real `.neutron` projection activation lacks installed-package proof** — #120 delegates this boundary to packaged acceptance.
5. **Text/Markdown real Monaco workflows lack integrated packaged proof** — #67.
6. **The explicit installed-package js-dos fixture/game path is not accepted yet** — #121. The old boot-time Doom seed remains intentionally retired.
7. **Human/browser acceptance is still required** for Download, folder-drop visual feedback, selected filename/rename presentation, Photos fullscreen fallback, Video unsupported-codec presentation, and visible Program Files presentation. Their lower-layer tests are useful evidence but not substitutes for those visible boundaries.

No new independently distinct product defect was established by this evidence pass. Acceptance gaps are therefore recorded here and against their existing canonical Issues rather than duplicated into new Issues.

## Closure rule

#107 should remain open until its final packaged/manual evidence is recorded. Merging a documentation/evidence PR, or obtaining a green package boot, does not by itself accept the unresolved rows above or close their canonical Issues.
