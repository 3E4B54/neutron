# Plasmon Neutron bridge

This directory owns the adapter between the frozen `NeutronBridge` contract and Neutron-specific APIs.

## Invariants

- Real Neutron Elements are launched only through Kernel `workspace.open_tile`. The bridge never embeds or returns an application iframe/window; authenticated Elements remain Kernel-created sibling surfaces.
- Vanilla discovery uses `apps.list` plus cached per-app `apps.describe`. A bad or temporarily unavailable descriptor degrades only that Element. Invalid individual list entries and tile entries are ignored rather than invalidating unrelated apps.
- Runtime state is a best-effort snapshot from `endpoints.list`: a live tile means `running: "yes"`, a valid snapshot without a live tile means `"no"`, and an unavailable/malformed snapshot means `"unknown"`.
- Runtime refresh is separate from metadata discovery. Once Elements are loaded, focus/pageshow/visibility refreshes call only `endpoints.list`; they do not redescribe unchanged Elements or redo icon resolution.
- The default launch uses the first valid tile. Callers may select another declared tile and may pass a `view`; both are forwarded to `workspace.open_tile` with `reuseExisting: true`.
- Install requests remain Kernel-mediated through `apps.install_offer`; this adapter does not install packages directly.
- Subscribers are notified by explicit runtime refreshes. While subscribed, vanilla mode also refreshes best-effort on browser focus/pageshow and when the document becomes visible because vanilla Neutron has no authoritative lifecycle subscription API.
- Standalone rendering uses a preview bridge and does not attempt Kernel calls.
- GUI2's existing `src/platform/**` implementation remains untouched as a reference/compatibility path. Integration should switch composition from `LegacyNeutronBridge` to `createNeutronBridge()` when Agent 8 is merged.

## Metadata and icon caching

Element descriptor/icon outcomes are cached by stable app id plus the short discovery description returned by `apps.list`. Successful icons, missing icons, failed icon probes and descriptor fallbacks are all retained so repeated `loadElements()` calls do not cause repeated descriptor or image requests. Cache entries are removed when an app disappears and are invalidated if its real `apps.list` description changes.

The current Kernel `apps.list` response exposes only `id` and `description`; it does not expose app version, registry generation or another revision token. `apps.describe` exposes `version`, but reading that value requires performing the metadata call that the cache is intended to avoid. Therefore a version-only update that preserves the same app id and discovery description cannot be detected cheaply by this API. Bridge recreation or an observable discovery change refreshes that metadata; no synthetic version field or polling loop is invented here.

## Icons

Icon resolution is descriptor-driven and remains internal to the bridge. The frozen `ExternalElement` contract still exposes only `icon?: string`; public tile/tray contracts are not expanded.

When `apps.describe` provides a safe icon declaration, the bridge uses only that declared bounded package-local relative path. External/scheme-relative URLs, URI schemes, absolute paths, traversal, backslashes, query/fragment suffixes and encoded path tricks are rejected. A safe declared path is resolved through Neutron's existing `appIndexUrl` helper and probed sequentially across the preferred and resident/unprefixed app-origin forms. The first success stops further requests, so a declared icon requires at most two probes.

The underlying Neutron package registry already retains normalized tile/tray icon paths (for example Kitchen Sink declares `static/icon.svg` and `static/tray-demo.svg`), but the current Kernel `apps.describe` projection strips those icon/path fields. To preserve package icons without restoring the old request storm, missing safe descriptor metadata uses only two justified compatibility paths: `static/icon.svg`, then `static/icon.png` (the normalized tile default). Each path tries the preferred origin and then the alternate origin sequentially, with immediate short-circuit on success. The worst case is therefore four first-load icon probes; WebP/JPEG and other extension guessing are not performed.

All icon outcomes are cached with the Element metadata, including complete compatibility failure. Repeated `loadElements()` calls for an unchanged Element and runtime-only focus/pageshow/visibility refreshes therefore perform zero additional icon probes.

## MTN boundary

There is intentionally no `ResourceAuthorizationService` implementation here yet. Vanilla Neutron remains functional without authorization. The production authorization adapter must be implemented only after the MTN 0.2 authorization API is frozen; this directory must not invent grant/token/tool schemas in advance.
