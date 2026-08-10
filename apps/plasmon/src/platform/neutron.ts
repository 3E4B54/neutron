import {
  describeApp,
  listApps,
  listTools,
  offerAppInstall,
  openAppTile,
} from "neutron-tools/app";
import {
  modeFromTools,
  parseAppDescription,
  parseInstalledAppIds,
  toolNames,
} from "./parse.ts";
import type {
  PlasmonApp,
  PlasmonPlatform,
  PlatformMode,
  PlatformSnapshot,
} from "./types.ts";

export class NeutronPlatform implements PlasmonPlatform {
  mode: PlatformMode = "neutron";

  async load(): Promise<PlatformSnapshot> {
    const [listed, descriptors] = await Promise.all([
      listApps(),
      listTools("kernel"),
    ]);
    const installed = parseInstalledAppIds(listed);
    const tools = toolNames(descriptors);
    this.mode = modeFromTools(tools);

    const apps = await Promise.all(
      installed
        .filter(({ id }) => id !== "plasmon")
        .map(async ({ id, description }) =>
          parseAppDescription(await describeApp(id), description),
        ),
    );

    apps.sort((left, right) => left.name.localeCompare(right.name));
    return { mode: this.mode, apps, tools };
  }

  async open(app: PlasmonApp): Promise<void> {
    const tile = app.tiles[0];
    if (!tile) throw new Error(`${app.name} does not expose a launchable tile`);
    await openAppTile({
      appId: app.id,
      tileId: tile.id,
      reuseExisting: true,
    });
  }

  async install(url: string): Promise<void> {
    await offerAppInstall({ kind: "package_url", url });
  }
}
