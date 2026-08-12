import type {
  AssociationRegistry,
  HandlerId,
  NativeAppRegistry,
  NeutronBridge,
  OpenService,
  OpenTarget,
  ProcessController,
} from "../contracts/index.ts";

export type ExternalUrlOpener = (url: string, target: string, features: string) => unknown;

export interface IntegratedOpenServiceOptions {
  nativeApps: NativeAppRegistry;
  associations: AssociationRegistry;
  process: ProcessController;
  neutron: NeutronBridge;
  externalOpener?: ExternalUrlOpener | null;
}

export function normalizeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function defaultExternalOpener(): ExternalUrlOpener | null {
  if (typeof window === "undefined") return null;
  return (url, target, features) => window.open(url, target, features);
}

function neutronAppId(handlerId: HandlerId): string | null {
  if (!handlerId.startsWith("neutron:")) return null;
  const appId = handlerId.slice("neutron:".length).trim();
  return appId || null;
}

/**
 * Integration-owned execution router. Handler definitions remain metadata;
 * execution stays behind ProcessController, NeutronBridge, or browser APIs.
 */
export class IntegratedOpenService implements OpenService {
  private readonly nativeApps: NativeAppRegistry;
  private readonly associations: AssociationRegistry;
  private readonly process: ProcessController;
  private readonly neutron: NeutronBridge;
  private readonly externalOpener: ExternalUrlOpener | null;

  constructor(options: IntegratedOpenServiceOptions) {
    this.nativeApps = options.nativeApps;
    this.associations = options.associations;
    this.process = options.process;
    this.neutron = options.neutron;
    this.externalOpener = options.externalOpener === undefined
      ? defaultExternalOpener()
      : options.externalOpener;
  }

  async open(handlerId: HandlerId, target: OpenTarget): Promise<void> {
    const nativeApp = this.nativeApps.getByHandler(handlerId);
    if (nativeApp) {
      const processId = await this.process.open(handlerId, target);
      if (processId === null) {
        throw new Error(`Native handler is registered but could not be launched: ${handlerId}`);
      }
      return;
    }

    const handler = this.associations.getHandler(handlerId);
    if (!handler) throw new Error(`Unknown handler: ${handlerId}`);

    if (handler.kind === "native") {
      throw new Error(`Native handler has no registered application: ${handlerId}`);
    }

    if (handler.kind === "external") {
      if (!target.url) throw new Error(`${handler.name} requires a URL target`);
      const url = normalizeExternalUrl(target.url);
      if (!url) throw new Error("External URLs must use http:// or https://");
      if (!this.externalOpener) throw new Error("Opening an external browser tab is unavailable in this environment");
      this.externalOpener(url, "_blank", "noopener,noreferrer");
      return;
    }

    const appId = neutronAppId(handlerId);
    if (!appId) throw new Error(`Neutron handler must use a neutron:<appId> identifier: ${handlerId}`);

    if (target.nodeId || target.atom) {
      throw new Error(
        "Opening a Plasmon-local resource in a Neutron Element requires the future cooperative resource adapter",
      );
    }

    await this.neutron.openElement(appId);
  }
}
