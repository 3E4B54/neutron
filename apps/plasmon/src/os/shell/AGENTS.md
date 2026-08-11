# Shell agent instructions

## Authority

Shell owns Start, Search presentation, taskbar/tray, calendar, flyouts, pinning
and shell preferences. It does not own generic filesystem opening.

## Start

- `/System/Start Menu` is the single filesystem-backed Start inventory.
- Do not add a parallel hard-coded application list.
- User rename/move/delete of Start entries must be respected by reconciliation.
- System implementation folders must not leak into Start simply because they
  exist under `/System`.
- Runtime-only handlers such as js-dos must not appear as standalone Start apps.

## Search

- Classify results with shared semantic resource policy.
- `.neutron` projections are Applications, not Documents.
- Hide implementation suffixes such as `.neutron` in application display names.
- Do not expose internal yes/no runtime state labels as user-facing app chrome.
- Opening results delegates to filesystem/association services; directories open
  Explorer.

## Taskbar/preferences

- Process/window/Neutron subscriptions must invalidate taskbar state promptly;
  users must not need to click the desktop to make closed-app icons disappear.
- Preferences persist through FsService metadata, not localStorage.
- Use shared visual assets; do not reintroduce deprecated red pin/icon language.

## Validation

Add packaged Playwright coverage for Start contents, Search classification/open,
pin/unpin, close invalidation and click-away behavior.
