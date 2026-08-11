import { appIndexUrl, canisterIdFromUrl } from "neutron-tools/src/runtime.js";

export const DEFAULT_ELEMENT_ICON_PROBE_TIMEOUT_MS = 1_500;

const ICON_PATH_MAX_LENGTH = 512;
const URI_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/u;

export type ElementIconProbe = (candidate: string) => boolean | Promise<boolean>;

export interface ElementIconResolveOptions {
  probe?: ElementIconProbe;
  timeoutMs?: number;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Descriptor icon metadata is untrusted. Accept only a bounded relative package
 * path and reject URL/scheme syntax, traversal, query/fragment suffixes and
 * encoded path tricks before it reaches Neutron's app URL helper.
 */
export function safePackageIconPath(value: unknown): string | undefined {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > ICON_PATH_MAX_LENGTH
    || value.trim() !== value
    || /[\u0000-\u001f\u007f]/u.test(value)
    || value.startsWith("/")
    || value.includes("\\")
    || value.includes("?")
    || value.includes("#")
    || value.includes("%")
    || URI_SCHEME.test(value)
  ) {
    return undefined;
  }

  const segments = value.split("/");
  if (
    segments.some(
      (segment) => segment.length === 0 || segment === "." || segment === "..",
    )
  ) {
    return undefined;
  }
  return value;
}

/**
 * Preserve descriptor icon metadata only inside the bridge. The frozen
 * ExternalElement/tile/tray contracts remain unchanged. Prefer an app-level
 * declaration when present, then the first safe tile declaration, then tray.
 */
export function declaredElementIconPath(
  value: unknown,
  expectedAppId?: string,
): string | undefined {
  const app = record(value);
  if (!app) return undefined;
  if (expectedAppId !== undefined && app.id !== expectedAppId) return undefined;

  const appIcon = safePackageIconPath(app.icon);
  if (appIcon) return appIcon;

  if (Array.isArray(app.tiles)) {
    for (const entry of app.tiles) {
      const tileIcon = safePackageIconPath(record(entry)?.icon);
      if (tileIcon) return tileIcon;
    }
  }

  return safePackageIconPath(record(app.tray)?.icon);
}

/**
 * Resolve one declared package-local path through the two Neutron app-origin
 * forms already supported by the runtime. This deliberately does not invent
 * alternate extensions or other asset paths.
 */
export function elementIconCandidates(
  appId: string,
  declaredPath: string | undefined,
  href?: string,
): string[] {
  const path = safePackageIconPath(declaredPath);
  if (!path) return [];

  const sourceHref = href ?? (typeof window === "undefined" ? undefined : window.location.href);
  if (!sourceHref) return [];

  const canisterId = canisterIdFromUrl(sourceHref);
  if (!canisterId) return [];

  let location: URL;
  try {
    location = new URL(sourceHref);
  } catch {
    return [];
  }

  const local = location.hostname.endsWith(".localhost");
  const localHost = local
    ? `${location.protocol}//localhost${location.port ? `:${location.port}` : ""}`
    : undefined;
  const candidates: string[] = [];

  for (const unprefixed of [false, true]) {
    try {
      candidates.push(
        appIndexUrl({
          canisterId,
          appId,
          path,
          unprefixed,
          local,
          ...(localHost ? { localHost } : {}),
        }),
      );
    } catch {
      // One app-origin form can fail without preventing the other safe form.
    }
  }

  return [...new Set(candidates)];
}

function normalizedTimeout(timeoutMs: number | undefined): number {
  return typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : DEFAULT_ELEMENT_ICON_PROBE_TIMEOUT_MS;
}

async function probeWithTimeout(
  candidate: string,
  probe: ElementIconProbe,
  timeoutMs: number,
): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (loaded: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(loaded);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);

    void Promise.resolve()
      .then(() => probe(candidate))
      .then((loaded) => finish(loaded === true), () => finish(false));
  });
}

/**
 * Start the at-most-two safe origin probes concurrently. Resolve as soon as
 * the highest-priority candidate that can still win is known.
 */
export async function firstLoadableIconCandidate(
  candidates: readonly string[],
  probe: ElementIconProbe,
  timeoutMs = DEFAULT_ELEMENT_ICON_PROBE_TIMEOUT_MS,
): Promise<string | undefined> {
  if (candidates.length === 0) return undefined;
  const timeout = normalizedTimeout(timeoutMs);

  return await new Promise<string | undefined>((resolve) => {
    const results: Array<boolean | undefined> = new Array(candidates.length).fill(undefined);
    let settled = false;

    const choose = (): void => {
      if (settled) return;
      for (let index = 0; index < results.length; index += 1) {
        const result = results[index];
        if (result === undefined) return;
        if (result) {
          settled = true;
          resolve(candidates[index]);
          return;
        }
      }
      settled = true;
      resolve(undefined);
    };

    candidates.forEach((candidate, index) => {
      void probeWithTimeout(candidate, probe, timeout).then((loaded) => {
        results[index] = loaded;
        choose();
      });
    });
  });
}

/**
 * Browser Image probing avoids fetch/CORS assumptions. No probe is created at
 * all when descriptor metadata supplies no safe package-local icon path.
 */
export function probeBrowserImage(
  candidate: string,
  timeoutMs = DEFAULT_ELEMENT_ICON_PROBE_TIMEOUT_MS,
): Promise<boolean> {
  if (typeof Image === "undefined") return Promise.resolve(false);
  const timeout = normalizedTimeout(timeoutMs);

  return new Promise<boolean>((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (loaded: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(loaded);
    };
    const timer = setTimeout(() => finish(false), timeout);
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = candidate;
  });
}

/** Resolve one verified descriptor-declared icon for ExternalElement.icon. */
export async function resolveElementIcon(
  appId: string,
  declaredPath?: string,
  href?: string,
  options: ElementIconResolveOptions = {},
): Promise<string | undefined> {
  const candidates = elementIconCandidates(appId, declaredPath, href);
  if (candidates.length === 0) return undefined;
  const timeout = normalizedTimeout(options.timeoutMs);
  const probe = options.probe
    ?? ((candidate: string) => probeBrowserImage(candidate, timeout));
  return await firstLoadableIconCandidate(candidates, probe, timeout);
}
