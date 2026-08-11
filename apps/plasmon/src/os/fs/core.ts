import type {
  AssociationRegistry,
  FsEventSource,
  FsService,
  NativeAppRegistry,
  NeutronBridge,
  OpenService,
  ProcessController,
} from "../contracts/index.ts";
import {
  NeutronProjectionService,
  TrashService,
  bootstrapFilesystem,
  type BootstrapFilesystemResult,
  type FilesystemSeedSpec,
} from "./managed.ts";
import { FilesystemOpenDispatcher } from "./openDispatcher.ts";
import { ProtectedManagedFsService } from "./protectedService.ts";

export interface FilesystemCoreOptions {
  fs: FsService & FsEventSource;
  nativeApps: NativeAppRegistry;
  neutron: NeutronBridge;
  associations: AssociationRegistry;
  openService: OpenService;
  process: ProcessController;
  durableSeeds?: readonly FilesystemSeedSpec[];
  demoSeeds?: readonly FilesystemSeedSpec[];
}

export interface FilesystemCoreInitialization extends BootstrapFilesystemResult {
  neutronProjectionError: string | null;
}

export interface FilesystemCoreServices {
  fs: ProtectedManagedFsService;
  ready: Promise<FilesystemCoreInitialization>;
  trash: TrashService;
  open: FilesystemOpenDispatcher;
  projections: NeutronProjectionService;
  reconcileNeutron(): Promise<void>;
  dispose(): void;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Composes filesystem policy without changing FsService persistence contracts.
 * Bootstrap uses the raw service; public consumers receive a gated/protected
 * facade so no Desktop/FileManager/Search call observes a half-migrated tree or
 * can mutate protected system/application resources with generic FsService ops.
 */
export function createFilesystemCore(options: FilesystemCoreOptions): FilesystemCoreServices {
  const managed = new ProtectedManagedFsService(options.fs);
  const projections = new NeutronProjectionService(options.fs);
  let disposed = false;
  let stopNeutron = () => undefined;
  let reconcileTail: Promise<void> = Promise.resolve();

  const reconcileNeutron = async (): Promise<void> => {
    const elements = await options.neutron.loadElements();
    await projections.reconcile(elements);
  };

  const initialize = async (): Promise<FilesystemCoreInitialization> => {
    const bootstrap = await bootstrapFilesystem(options.fs, {
      nativeApps: options.nativeApps.list(),
      ...(options.durableSeeds ? { durableSeeds: options.durableSeeds } : {}),
      ...(options.demoSeeds ? { demoSeeds: options.demoSeeds } : {}),
    });
    let neutronProjectionError: string | null = null;
    try {
      await reconcileNeutron();
    } catch (error) {
      // Failure/unknown Kernel state must never delete existing projections or
      // block the filesystem. Later bridge invalidation can reconcile again.
      neutronProjectionError = message(error);
    }
    return { ...bootstrap, neutronProjectionError };
  };

  const ready = initialize();
  managed.setInitialization(ready);

  stopNeutron = options.neutron.subscribe(() => {
    if (disposed) return;
    reconcileTail = reconcileTail
      .then(async () => {
        await ready;
        await reconcileNeutron();
      })
      .catch(() => undefined);
  });

  const trash = new TrashService(managed);
  const open = new FilesystemOpenDispatcher({
    fs: managed,
    associations: options.associations,
    openService: options.openService,
    process: options.process,
    neutron: options.neutron,
  });

  return {
    fs: managed,
    ready,
    trash,
    open,
    projections,
    reconcileNeutron: async () => {
      await ready;
      await reconcileNeutron();
    },
    dispose: () => {
      disposed = true;
      stopNeutron();
      stopNeutron = () => undefined;
    },
  };
}
