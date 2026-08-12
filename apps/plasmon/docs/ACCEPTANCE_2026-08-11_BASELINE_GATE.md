# Integrated packaged acceptance gate — 2026-08-11 review baseline

**Canonical Issue:** #107  
**Gate date:** 2026-08-12  
**Integration basis:** current `version-0.1.0-os`; the Issue branch is reconciled with integration changes that materially affect this baseline before handoff.

This report re-checks the still-relevant findings from the 2026-08-11 packaged/manual Plasmon review. It is acceptance evidence, not a feature implementation plan.

## Evidence rules

The project testing order is:

```text
pure/model/service
  -> headless cross-subsystem production composition
  -> small packaged/browser journeys
  -> human/manual acceptance
```

A lower layer is never promoted into a stronger claim. A deterministic Bun/headless PASS does not prove browser download behavior, Monaco readiness, fullscreen/media behavior, or visual presentation. A package that boots does not close unrelated product Issues.

Result meanings:

- **PASS** — evidence exists at the layer required for the stated finding.
- **FAIL** — a still-current canonical user-visible defect remains.
- **SUPERSEDED** — the old expectation is intentionally no longer the product contract.
- **NOT-YET-TESTABLE** — the required acceptance layer or accepted fixture/path is not available in the current integrated gate; the blocker is named.

## Required gate execution

Before this report is handed to review, the #107 PR must pass:

- `npm --workspace neutron-plasmon test`
- `npm --workspace neutron-plasmon run test:package`
- the existing installed-package Playwright golden path in the supported Neutron/PocketIC browser environment

The browser lane remains intentionally small. This Issue does not create broad UI scripting merely to replace human acceptance.

## Finding matrix

| Finding | Result | Evidence layer | Evidence / disposition | Canonical Issue(s) |
| --- | --- | --- | --- | --- |
| Desktop/FileManager shortcut activation | **PASS** | headless + packaged/browser | FileManager delegates activation to the canonical filesystem opener, including shortcut dereference. The packaged golden path double-clicks the durable NodeId-backed Desktop `Root` shortcut and reaches the native window path. | #31, #107 |
| `.sys` activation | **PASS** | packaged/browser | The installed golden path finds and opens Recycle Bin through real Shell/process/window behavior. Recycle Bin is the real `/System/RecycleBin.sys` native system application. | #32, #45, #107 |
| Neutron projection classification/de-duplication in Search | **PASS** | deterministic model | #49 is integrated: canonical `.neutron` projections classify as Apps and de-duplicate against direct Element discovery without becoming installation authority. | #49, #107 |
| Neutron projection Search presentation | **FAIL** | current canonical presentation defect | #90 remains open: Search still needs application-grade projection naming/icon/state rather than raw `.neutron`/runtime presentation. | #90, #107 |
| `.neutron` filesystem-projection activation | **NOT-YET-TESTABLE** | real installed Neutron boundary missing | Deterministic opening reaches `NeutronBridge`, but the packaged journey launches Plasmon from the Kernel tile rather than activating an `/Apps/*.neutron` projection inside Plasmon. #120 explicitly leaves the real installed Element launch proof to packaged acceptance. | #31, #32, #120, #107 |
| Delete -> Recycle Bin -> restore / permanent delete / empty | **NOT-YET-TESTABLE** | composed headless PASS; visible packaged lifecycle outstanding | The integrated headless Trash regression composes FileManager, `TrashService`, and Recycle Bin and proves identity/metadata, restore, and permanent-delete/empty semantics. The packaged golden path proves Recycle Bin launches and renders empty state, but does not execute the full visible lifecycle. | #40, #45, #77, #107 |
| FileManager Download | **NOT-YET-TESTABLE** | deterministic helper PASS; browser boundary outstanding | Focused tests prove FsService bytes, MIME/name preservation, anchor setup, and object-URL cleanup. Actual installed-browser download remains a browser-owned acceptance item. | #107 |
| FileManager collision naming | **PASS** | deterministic fast/headless | Tests cover generated-name collisions, copy suffix progression, extensions, directories, dotfiles, no-extension files, and case folding. | #107 |
| FileManager rename selection semantics | **PASS** | deterministic model/component | Tests cover basename-only file selection, full-name directory selection, selection stability, extension changes, and Enter/Escape commit/cancel. | #107 |
| Selected filename/rename label presentation | **NOT-YET-TESTABLE** | human/visual | CSS/component state is covered, but visible readability/overflow is not. #95 remains the canonical selected-label presentation defect. | #95, #107 |
| Folder-drop target semantics | **PASS** | deterministic model/component | Tests prove only a valid non-source directory becomes the drop target and receives drop-target state. | #107 |
| Folder-drop visible feedback | **NOT-YET-TESTABLE** | human/visual | A deterministic drop-target class is not proof that the feedback is visually clear in the packaged desktop. | #107 |
| Start/Search filesystem result semantics | **PASS** | deterministic fast/headless | Search covers matching folders/file categories; #32 routes filesystem-backed Start/Search activation through the canonical opener; #49 adds canonical Neutron-projection app classification/de-duplication. | #32, #49, #107 |
| Packaged Search -> native application launch | **PASS** | packaged/browser | The installed golden path searches for Recycle Bin, launches it, and observes the real native Recycle Bin window. | #32, #45, #107 |
| Start/Search click-away interaction | **NOT-YET-TESTABLE** | packaged/manual interaction | Production has click-away handling, but this gate does not broaden the golden path into generic overlay scripting. Human/manual packaged acceptance remains required. | #107 |
| Managed default `System` Start category retirement | **PASS** | deterministic filesystem/Start reconciliation | #87 is integrated: fresh reconciliation no longer creates the managed default `System` category for Settings/Explorer/Properties, and focused migration tests preserve user moves/renames/deletions/custom folders while remaining idempotent. | #87, #107 |
| Visible packaged Start layout after `System` retirement | **NOT-YET-TESTABLE** | packaged/manual visual | #87 explicitly permits packaged/manual confirmation of the resulting visible Start layout. This gate does not promote deterministic reconciliation tests into human visual acceptance. | #87, #107 |
| Runtime-only hosts in normal Start inventory | **FAIL** | current canonical inventory defect | #88 remains open: runtime-only hosts such as js-dos still need to be excluded from normal user-launchable Start inventory without breaking direct association/runtime launch. | #88, #107 |
| Start pinning semantics | **PASS** | deterministic model/service | Pin state remains filesystem-backed and semantic pin/unpin behavior is covered below React. | #107 |
| Shared Start/Shell pin-control implementation | **PASS** | component/presentation | #109 is integrated: literal platform emoji pin controls were replaced by shared Plasmon pin iconography while preserving accessible labels and FsService-backed pin semantics. | #109, #107 |
| Shared Start/Shell pin-control visual acceptance | **NOT-YET-TESTABLE** | packaged/manual visual | #109 remains open with `needs-verification` for its bounded packaged/manual visual check. Component evidence is not promoted into human visual acceptance. | #109, #107 |
| Taskbar state derivation | **PASS** | deterministic model | #72's merged implementation derives pinned-only, launching, running, active, and uncertain states from canonical Process/Windowing/Neutron/Shell observations. Focused tests preserve genuine `unknown` uncertainty without raw runtime tokens in accessibility labels. | #72, #107 |
| Taskbar cross-authority lifecycle | **NOT-YET-TESTABLE** | composed headless regression not integrated | #81 still owns the shared-headless Process/Windowing/Shell lifecycle regression: pinned-only -> running -> active/inactive -> minimized/restored -> stopped. | #81, #107 |
| Taskbar visible wording/accessibility | **NOT-YET-TESTABLE** | packaged/manual | #72 remains open with `needs-verification` specifically for the visible packaged/manual wording/accessibility check after its implementation merged. | #72, #107 |
| Text Monaco open/edit/save/reopen | **NOT-YET-TESTABLE** | packaged Monaco boundary blocked | Worker HTTP serving is not a usable-editor proof. #67 remains open and owns the compact installed-package Text journey. | #67, #107 |
| Markdown Monaco open/edit/save/reopen | **NOT-YET-TESTABLE** | packaged Monaco boundary blocked | Same boundary as Text; #67 owns real Monaco readiness/edit/save/reopen acceptance. | #67, #107 |
| Photos fullscreen rejection/fallback | **NOT-YET-TESTABLE** | deterministic PASS; browser boundary outstanding | Focused tests prove disabled/rejected fullscreen falls back cleanly to expanded view. Actual hosted-browser fallback remains browser/manual acceptance. | #107 |
| Video unsupported-codec behavior | **NOT-YET-TESTABLE** | deterministic PASS; browser media boundary outstanding | Focused tests prove MIME/support classification and actionable unsupported/load/decode messages. Actual installed-browser unsupported-codec presentation is not exercised by the current golden path. | #107 |
| `/System/Program Files` managed root + packaged js-dos assets | **PASS** | filesystem/headless + build/package structural | #57 established the managed root. The build installs pinned js-dos under `System/Program Files/js-dos`, verifies required JS/WASM assets, and writes runtime metadata before packaging. | #57, #107 |
| Program Files visible Explorer/runtime presentation | **NOT-YET-TESTABLE** | human/manual | Structural/filesystem evidence does not prove the visible Explorer presentation is understandable or polished. | #57, #107 |
| Old boot-time Doom seed expectation | **SUPERSEDED** | accepted product contract | #29 intentionally retired unconditional demo-game boot seeding. Restoring it would regress the accepted architecture. | #29, #121, #107 |
| Explicit installed-package `.jsdos` fixture -> playable js-dos | **NOT-YET-TESTABLE** | accepted packaged fixture path missing | The build contains pinned runtime/proof assets and the standalone games proof can exercise a dist fixture, but #121 remains open to establish the reusable explicit fixture path through the final installed package. #48/EmulatorJS is a separate second-runtime Issue and does not block this js-dos proof. | #121, #107 |
| EmulatorJS second-runtime acceptance | **NOT-YET-TESTABLE** | implementation absent | #48 remains open. This does not block current js-dos acceptance, but no EmulatorJS package/runtime claim is made by this gate. | #48, #107 |

## What the existing installed-package lane proves

On a green #107 head, the current packaged lane proves that Plasmon can be built, packaged, installed in the supported Neutron/PocketIC environment, served through `/app/plasmon/`, launched from the Kernel tile, and complete the narrow golden path without page errors. Within that journey it also proves Monaco worker HTTP serving, Search-driven Recycle Bin launch, the empty Recycle Bin surface, the durable Desktop `Root` shortcut, and native edge snapping.

It does **not** imply that every Start item, taskbar state, media app, editor, download path, Neutron projection, or game runtime has passed acceptance.

## Remaining user-visible blockers to the next acceptance milestone

The integrated desktop should not be described as clearing the 2026-08-11 baseline while these directly relevant blockers remain:

1. **Start inventory is not fully accepted** — #87's managed `System` category retirement is implemented but still lacks visible packaged/manual confirmation; #88 remains the actual runtime-only inventory FAIL.
2. **Neutron application Search presentation remains incomplete** — #90; real installed projection activation also lacks package proof under #120.
3. **Shared pin controls still require independent visual acceptance** — #109 is implemented but remains `needs-verification` for the bounded packaged/manual check.
4. **Taskbar still needs composed lifecycle and visible acceptance** — #81 plus #72's remaining `needs-verification` packaged/manual check.
5. **Text/Markdown real Monaco workflows lack integrated packaged proof** — #67.
6. **The explicit installed-package js-dos fixture/game path is not accepted** — #121; the old boot-time Doom seed remains intentionally retired.
7. **Human/browser acceptance remains** for Download, folder-drop feedback, selected filename/rename presentation, Photos fullscreen fallback, Video unsupported-codec presentation, and visible Program Files presentation.

No independently distinct new product failure was established by this evidence pass, so no duplicate Issue is created.

## Closure rule

#107 should remain open until its remaining packaged/manual evidence is recorded. Merging this durable report, or obtaining a green package boot, does not by itself accept unresolved rows or close their canonical Issues.
