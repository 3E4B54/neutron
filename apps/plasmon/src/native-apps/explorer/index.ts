import { createElement } from "react";
import type {
  AssociationRegistry,
  FsEventSource,
  NativeAppDefinition,
  OpenService,
} from "../../os/contracts/index.ts";
import type { NativeAppComponent, NativeAppLoader } from "../../os/process/index.ts";
import type {
  FileManagerOpenAuthority,
  FileOperationClipboard,
} from "../../os/file-manager/index.ts";

export type { ExplorerAppProps } from "./ExplorerApp.tsx";
export * from "./history.ts";

export const explorerAppDefinition: NativeAppDefinition = {
  id: "native:explorer",
  handlerId: "native:explorer",
  name: "Files",
  icon: "system:folder",
  singleton: false,
  defaultWindow: { width: 960, height: 650, minWidth: 640, minHeight: 420 },
  associations: [],
};

export interface ExplorerNativeDependencies {
  fsEvents?: FsEventSource;
  associations: AssociationRegistry;
  openService: OpenService;
  openAuthority: FileManagerOpenAuthority;
  clipboard?: FileOperationClipboard;
}

export function createExplorerNativeLoader(dependencies: ExplorerNativeDependencies): NativeAppLoader {
  return async () => {
    const { ExplorerApp } = await import("./ExplorerApp.tsx");
    const Component: NativeAppComponent = (props) => createElement(ExplorerApp, {
      ...props,
      associations: dependencies.associations,
      openService: dependencies.openService,
      openAuthority: dependencies.openAuthority,
      ...(dependencies.fsEvents ? { fsEvents: dependencies.fsEvents } : {}),
      ...(dependencies.clipboard ? { clipboard: dependencies.clipboard } : {}),
    });
    return { default: Component };
  };
}
