import type { Motoko } from "neutron-motoko-wasm";
import {
  getDependencies,
  walkReplace,
  type DependencyCache,
  type HashFiles,
  type PackageMap,
} from "./walk.ts";

export type MotokoProgramPreparationCache = {
  hashfiles: HashFiles;
  writtenHashes: Set<string>;
};

export function createMotokoProgramPreparationCache(): MotokoProgramPreparationCache {
  return {
    hashfiles: {},
    writtenHashes: new Set<string>(),
  };
}

export type PrepareMotokoProgramOptions = {
  compiler: Pick<Motoko, "write">;
  sourcePath: string;
  packages?: PackageMap;
  allowDangerous?: boolean;
  cache?: MotokoProgramPreparationCache;
};

export type PreparedMotokoProgram = {
  entryPath: string;
  sourceCount: number;
};

export async function prepareMotokoProgram({
  compiler,
  sourcePath,
  packages = {},
  allowDangerous = false,
  cache,
}: PrepareMotokoProgramOptions): Promise<PreparedMotokoProgram> {
  const preparationCache =
    cache ?? createMotokoProgramPreparationCache();
  // Dependency nodes contain parent-specific import-edge metadata,
  // so each entrypoint needs its own dependency graph.
  const dependencyCache: DependencyCache = {};
  const dependencies = await getDependencies(
    null,
    sourcePath,
    packages,
    preparationCache.hashfiles,
    dependencyCache,
  );
  const used: string[] = [];
  const [, entry] = walkReplace(
    dependencies,
    preparationCache.hashfiles,
    used,
    { allowDangerous },
  );
  const sourceHashes = [...new Set(used)];
  for (const hash of sourceHashes) {
    if (preparationCache.writtenHashes.has(hash)) continue;
    await compiler.write(
      `${hash}.mo`,
      preparationCache.hashfiles[hash]!.content,
    );
    preparationCache.writtenHashes.add(hash);
  }
  return {
    entryPath: `${entry}.mo`,
    sourceCount: sourceHashes.length,
  };
}
