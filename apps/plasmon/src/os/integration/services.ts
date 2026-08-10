import type {
  AssociationRegistry,
  FsEventSource,
  FsService,
  NeutronBridge,
  OpenService,
  ProcessController,
  ResourceAuthorizationService,
  WindowManager,
} from "../contracts/index.ts";
import {
  HandlerAssociationRegistry,
  LocalStorageAssociationDefaultStore,
  MemoryAssociationDefaultStore,
  type AssociationDefaultStore,
} from "../associations/index.ts";
import { FileOperationClipboard } from "../file-manager/index.ts";
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
  contentAppDefinitions,
  contentAssociationRules,
  contentHandlerDefinitions,
  createContentAppLoaders,
} from "../../native-apps/content-apps.ts";
import {
  createExplorerNativeLoader,
  explorerAppDefinition,
} from "../../native-apps/explorer/index.ts";
import {
  createPropertiesNativeLoader,
  propertiesAppDefinition,
} from "../../native-apps/properties/index.ts";
import {
  FakeResourceAuthorizationService,
  UnavailableResourceAuthorizationService,
} from "./authorizationFakes.ts";
import { IntegratedOpenService } from "./openService.ts";

export interface PlasmonServices {
  fs: FsService;
  fsEvents: FsEventSource;
  process: ProcessController;
  windows: WindowManager;
  neutron: NeutronBridge;
  authorization: ResourceAuthorizationService;
  nativeApps: NativeApplicationRegistry;
  associations: AssociationRegistry;
  openService: OpenService;
  fileClipboard: FileOperationClipboard;
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

function createAssociationDefaultStore(): AssociationDefaultStore {
  if (typeof window !== "undefined") {
    try {
      const storage = window.localStorage;
      void storage.length;
      return new LocalStorageAssociationDefaultStore(storage);
    } catch {
      // Sandboxed/private browser contexts may deny localStorage access.
    }
  }
  return new MemoryAssociationDefaultStore();
}

function registerWave2Applications(
  nativeApps: NativeApplicationRegistry,
  associations: HandlerAssociationRegistry,
  fsEvents: FsEventSource,
  openService: OpenService,
  clipboard: FileOperationClipboard,
): void {
  for (const handler of contentHandlerDefinitions) associations.registerHandler(handler);
  for (const rule of contentAssociationRules) associations.registerRule(rule);

  const contentLoaders = createContentAppLoaders();
  for (const definition of contentAppDefinitions) {
    const loader = contentLoaders.get(definition.id);
    if (!loader) throw new Error(`Missing native application loader: ${definition.id}`);
    nativeApps.registerWithLoader(definition, loader);
  }

  nativeApps.registerWithLoader(
    explorerAppDefinition,
    createExplorerNativeLoader({
      fsEvents,
      associations,
      openService,
      clipboard,
    }),
  );
  nativeApps.registerWithLoader(
    propertiesAppDefinition,
    createPropertiesNativeLoader({ fsEvents, associations, openService }),
  );
}

/**
 * Wave 2 composition root. Browser-local filesystem data uses IndexedDB for
 * the current functional gate, associations use safe browser-local defaults
 * when available, and all built-in applications share the real filesystem,
 * process, window, association, and OpenService implementations.
 *
 * Authenticated Neutron application surfaces remain Kernel-owned sibling
 * tiles. Plasmon only discovers and opens them through NeutronBridge.
 */
export function createPlasmonServices(): PlasmonServices {
  const fs = new PersistentFsService(createFilesystemRepository());
  const windows = new NativeWindowManager();
  const neutron = createNeutronBridge();
  const nativeApps = new NativeApplicationRegistry();
  const associations = new HandlerAssociationRegistry({ defaults: createAssociationDefaultStore() });
  const process = new NativeProcessController(nativeApps, windows);
  const openService = new IntegratedOpenService({ nativeApps, associations, process, neutron });
  const fileClipboard = new FileOperationClipboard();

  registerWave2Applications(nativeApps, associations, fs, openService, fileClipboard);

  return {
    fs,
    fsEvents: fs,
    process,
    windows,
    neutron,
    authorization: createAuthorizationService(),
    nativeApps,
    associations,
    openService,
    fileClipboard,
  };
}
