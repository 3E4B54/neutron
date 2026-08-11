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

When `apps.describe` provides an icon declaration, the bridge accepts only a bounded package-local relative path. External/scheme-relative URLs, URI schemes, absolute paths, traversal, backslashes, query/fragment suffixes and encoded path tricks are rejected. A safe declared path is resolved through Neutron's existing `appIndexUrl` helper for the prefixed and resident/unprefixed app-origin forms. Those at-most-two candidates are browser-image probed with a finite timeout, and only a successfully loaded URL is exposed.

There is no extension-guessing or Cartesian SVG/PNG/WebP/JPEG probing. Missing or unsafe descriptor icon metadata produces `icon: undefined` immediately and lets the Shell use its initials fallback with zero icon network probes. Failed declared-icon probing is also cached, so an unchanged Element performs zero steady-state icon probes.

The underlying Neutron package registry already retains normalized tile/tray icon paths (for example Kitchen Sink declares `static/icon.svg` and `static/tray-demo.svg`). However the current Kernel `apps.describe` projection on this repository base strips tile/tray `icon` and `path` fields and exposes only tile id/title/description, tray title, app version and related display metadata. The bridge is ready to consume safe icon fields if that existing API projection supplies them, but it does not modify Kernel or infer missing paths by 404 probing.

## MTN boundary

There is intentionally no `ResourceAuthorizationService` implementation here yet. Vanilla Neutron remains functional without authorization. The production authorization adapter must be implemented only after the MTN 0.2 authorization API is frozen; this directory must not invent grant/token/tool schemas in advance.
