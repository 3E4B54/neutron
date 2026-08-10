import type {
  FsEventSource,
  FsService,
  NeutronBridge,
  ProcessController,
  ResourceAuthorizationService,
  WindowManager,
} from "../contracts/index.ts";
import { MemoryFs, MemoryProcessController, MemoryWindowManager } from "./fakes.ts";
import {
  FakeResourceAuthorizationService,
  UnavailableResourceAuthorizationService,
} from "./authorizationFakes.ts";
import { LegacyNeutronBridge } from "./legacyNeutronBridge.ts";

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

/**
 * Development composition only. Specialized agents replace individual fakes
 * behind these contracts; consumers never import those implementations.
 * Embedded vanilla Neutron intentionally reports resource authorization as
 * unavailable until Agent 8 can bind the frozen MTN authorization API.
 */
export function createPlasmonServices(): PlasmonServices {
  const fs = new MemoryFs();
  const windows = new MemoryWindowManager();
  const process = new MemoryProcessController(windows);
  return {
    fs,
    fsEvents: fs,
    process,
    windows,
    neutron: new LegacyNeutronBridge(),
    authorization: createAuthorizationService(),
  };
}
