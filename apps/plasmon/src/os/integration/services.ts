import type {
  FsEventSource,
  FsService,
  NeutronBridge,
  ProcessController,
  ResourceAuthorizationService,
  WindowManager,
} from "../contracts/index.ts";
import {
  IndexedDbFsRepository,
  MemoryFsRepository,
  PersistentFsService,
  type FsRepository,
} from "../fs/index.ts";
import { createNeutronBridge } from "../neutron/index.ts";
import { NativeApplicationRegistry, NativeProcessController } from "../process/index.ts";
import { NativeWindowManager } from "../windowing/index.ts";
import {
  FakeResourceAuthorizationService,
  UnavailableResourceAuthorizationService,
} from "./authorizationFakes.ts";

export interface PlasmonServices {
  fs: FsService;
  fsEvents: FsEventSource;
  process: ProcessController;
  windows: WindowManager;
  neutron: NeutronBridge;
  authorization: ResourceAuthorizationService;
}

function createAuthorizationService(): ResourceAuthorizationService {
  const preview = typeof window === "undefined" || window.parent === window;
  return preview
    ? new FakeResourceAuthorizationService()
    : new UnavailableResourceAuthorizationService();
}

function createFilesystemRepository(): FsRepository {
  if (typeof globalThis.indexedDB !== "undefined") {
    return new IndexedDbFsRepository();
  }
  return new MemoryFsRepository();
}

/**
 * Wave 1 composition root. Browser-local filesystem state uses IndexedDB for
 * the first functional gate, with memory reserved for non-browser/test hosts.
 * Native process/window implementations are real but the native registry is
 * intentionally empty until Wave 2 registers built-in applications.
 * Embedded vanilla Neutron intentionally reports resource authorization as
 * unavailable until the MTN authorization API is frozen and integrated.
 */
export function createPlasmonServices(): PlasmonServices {
  const fs = new PersistentFsService(createFilesystemRepository());
  const windows = new NativeWindowManager();
  const nativeApps = new NativeApplicationRegistry();
  const process = new NativeProcessController(nativeApps, windows);
  return {
    fs,
    fsEvents: fs,
    process,
    windows,
    neutron: createNeutronBridge(),
    authorization: createAuthorizationService(),
  };
}
