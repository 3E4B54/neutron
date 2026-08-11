import type { FsService } from "../contracts/index.ts";
import { reconcileSeedManifest, type FilesystemSeedSpec } from "./managed.ts";

export interface NodeShortcutSeedInput {
  key: string;
  seedClass: "durable" | "demo-temporary";
  parentPath: string;
  name: string;
  targetPath: string;
}

/**
 * Resolves a path only at seed-reconciliation time and stores the resulting
 * stable NodeId in the actual shortcut. Paths never become shortcut identity.
 */
export async function nodeShortcutSeedSpec(
  fs: FsService,
  input: NodeShortcutSeedInput,
): Promise<FilesystemSeedSpec | null> {
  const target = await fs.resolvePath(input.targetPath);
  if (!target) return null;
  return {
    key: input.key,
    seedClass: input.seedClass,
    parentPath: input.parentPath,
    name: input.name,
    kind: "shortcut",
    shortcutTarget: { kind: "node", nodeId: target.id },
  };
}

/**
 * Durable Desktop conveniences are seeded once. If a user later removes one,
 * the normal durable seed ledger prevents upgrades from recreating it.
 * Recycle Bin is introduced only after an actual native RecycleBin.sys exists.
 */
export async function reconcileCoreDesktopSeeds(fs: FsService): Promise<void> {
  const inputs: readonly NodeShortcutSeedInput[] = [
    {
      key: "desktop.root",
      seedClass: "durable",
      parentPath: "/Desktop",
      name: "Root",
      targetPath: "/",
    },
    {
      key: "desktop.apps",
      seedClass: "durable",
      parentPath: "/Desktop",
      name: "Apps",
      targetPath: "/Apps",
    },
    {
      key: "desktop.recycle-bin",
      seedClass: "durable",
      parentPath: "/Desktop",
      name: "Recycle Bin",
      targetPath: "/System/RecycleBin.sys",
    },
  ];
  const specs = (await Promise.all(inputs.map((input) => nodeShortcutSeedSpec(fs, input))))
    .filter((spec): spec is FilesystemSeedSpec => spec !== null);
  await reconcileSeedManifest(fs, specs);
}
