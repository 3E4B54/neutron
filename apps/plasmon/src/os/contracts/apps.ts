import type { HandlerId, IconRef } from "./common.ts";
import type { AssociationRule } from "./associations.ts";

/** Framework-neutral public metadata for a Plasmon-native application. */
export interface NativeAppDefinition {
  id: string;
  handlerId: HandlerId;
  name: string;
  icon: IconRef;
  singleton?: boolean;
  defaultWindow: {
    width: number;
    height: number;
    minWidth?: number;
    minHeight?: number;
  };
  associations: AssociationRule[];
}

export interface NativeAppRegistry {
  register(definition: NativeAppDefinition): void;
  get(id: string): NativeAppDefinition | null;
  getByHandler(handlerId: HandlerId): NativeAppDefinition | null;
  list(): readonly NativeAppDefinition[];
}
