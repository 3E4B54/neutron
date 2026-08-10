import type {
  FsEventSource,
  FsService,
  NeutronBridge,
  ProcessController,
  WindowManager,
} from "../contracts/index.ts";
import { MemoryFs, MemoryProcessController, MemoryWindowManager } from "./fakes.ts";
import { LegacyNeutronBridge } from "./legacyNeutronBridge.ts";

export interface PlasmonServices {
  fs: FsService;
  fsEvents: FsEventSource;
  process: ProcessController;
  windows: WindowManager;
  neutron: NeutronBridge;
}

/**
 * Development composition only. Specialized agents replace individual fakes
 * behind these contracts; consumers never import those implementations.
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
  };
}
