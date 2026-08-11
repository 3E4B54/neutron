import type { ExternalElement, FsNode, FsService, JsonValue } from "../contracts/index.ts";
import { APPS_PATH, NeutronProjectionService } from "./managed.ts";
import {
  NEUTRON_APP_METADATA_KEY,
  NEUTRON_APP_MIME,
  OWNERSHIP_METADATA_KEY,
  readNeutronAppMetadata,
} from "./resourcePolicy.ts";

export interface NeutronProjectionReconcileResult {
  created: number;
  updated: number;
  removed: number;
}

function jsonEqual(left: JsonValue | undefined, right: JsonValue | undefined): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function projectionMatchesElement(node: FsNode, element: ExternalElement): boolean {
  const metadata = readNeutronAppMetadata(node);
  if (!metadata || metadata.elementId !== element.id) return false;
  if (node.mime !== NEUTRON_APP_MIME || node.metadata[OWNERSHIP_METADATA_KEY] !== "installed-app-projection") return false;
  const actual = node.metadata[NEUTRON_APP_METADATA_KEY];
  const expected: JsonValue = {
    format: "plasmon-neutron-app",
    version: 1,
    elementId: element.id,
    name: element.name,
    description: element.description,
    ...(element.version === undefined ? {} : { appVersion: element.version }),
    ...(element.icon ? { icon: element.icon } : {}),
  };
  return jsonEqual(actual, expected);
}

/**
 * Guards the mutating projection reconciler with a stable-state comparison.
 * Repeated successful Kernel discovery of the same installed app state is a
 * filesystem no-op: no modified timestamps, revisions, or change events churn.
 */
export class StableNeutronProjectionService {
  private readonly delegate: NeutronProjectionService;

  constructor(private readonly fs: FsService) {
    this.delegate = new NeutronProjectionService(fs);
  }

  async reconcile(elements: readonly ExternalElement[]): Promise<NeutronProjectionReconcileResult> {
    const apps = await this.fs.resolvePath(APPS_PATH);
    if (apps?.kind === "directory") {
      const children = await this.fs.list(apps.id, { includeHidden: true, sort: "name" });
      const projections = children.filter((node) => readNeutronAppMetadata(node));
      if (projections.length === elements.length) {
        const byId = new Map(
          projections.flatMap((node) => {
            const metadata = readNeutronAppMetadata(node);
            return metadata ? [[metadata.elementId, node] as const] : [];
          }),
        );
        if (elements.every((element) => {
          const node = byId.get(element.id);
          return node ? projectionMatchesElement(node, element) : false;
        })) {
          return { created: 0, updated: 0, removed: 0 };
        }
      }
    }
    return this.delegate.reconcile(elements);
  }
}
