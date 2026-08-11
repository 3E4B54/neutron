import type { FsService, HandlerId, NodeId } from "../contracts/index.ts";
import { OpenWithServiceModel } from "../associations/index.ts";
import { readAssociationProbe } from "./model.ts";

export type OpenWithDialogAction = "open" | "default";

export interface OpenWithDialogActionOptions {
  fs: FsService;
  nodeId: NodeId;
  service: OpenWithServiceModel;
  handlerId: HandlerId;
  action: OpenWithDialogAction;
  onClose: () => void;
  onChanged?: () => void;
}

export interface OpenWithPointerBoundaryEvent {
  target: EventTarget | null;
  currentTarget: EventTarget;
  stopPropagation(): void;
}

export function selectOpenWithHandler(
  handlerId: HandlerId,
  onSelect: (handlerId: HandlerId) => void,
): void {
  onSelect(handlerId);
}

export function handleOpenWithDialogPointerDown(
  event: OpenWithPointerBoundaryEvent,
  onClose: () => void,
): void {
  event.stopPropagation();
  if (event.target === event.currentTarget) onClose();
}

export function openWithErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export async function runOpenWithDialogAction({
  fs,
  nodeId,
  service,
  handlerId,
  action,
  onClose,
  onChanged,
}: OpenWithDialogActionOptions): Promise<string | null> {
  const current = await fs.stat(nodeId);
  const probe = await readAssociationProbe(fs, current);

  if (action === "open") {
    await service.open(current, handlerId, probe);
    onClose();
    return null;
  }

  const typeKey = await service.setDefault(current, handlerId, probe);
  onClose();
  onChanged?.();
  return typeKey;
}
