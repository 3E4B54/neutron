import { readFile } from "node:fs/promises";
import { assemble } from "neutron-compiler/src/assemble.js";
import type { AssemblyManifest } from "neutron-compiler/src/assemble.js";

/**
 * Assemble the kernel wrapper directly from the source manifest.
 *
 * Tests that inspect generated Motoko should not depend on the current contents
 * of backend/_neutron.mo. That file is a build artifact and may be stale when
 * tests are run without first running the full package pipeline.
 *
 * Keep this deliberately equivalent to apps/kernel/moassemble.ts, except that
 * it returns the generated source in memory instead of writing or compiling it.
 */
export async function assembleKernelWrapper(): Promise<string> {
  const manifest = JSON.parse(
    await readFile(new URL("../../neutron.json", import.meta.url), "utf8"),
  ) as AssemblyManifest;

  if (!manifest.src) {
    throw new Error("neutron.json must include src");
  }

  manifest.entry = manifest.src.replace(".mo", "");

  return assemble([manifest]);
}
