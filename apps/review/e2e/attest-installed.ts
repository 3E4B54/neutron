import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "fflate";
import { unpackNeutronPackage } from "../../../packages/neutron-compiler/src/install.ts";
import { resolveLocalNeutronRuntime } from "neutron-provision/src/local_session.ts";
import { packageArchiveFilename } from "neutron-tools/src/package_archive.js";
import { localCanisterOrigin } from "neutron-tools/src/runtime.js";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const deploymentConfig = process.env.NEUTRON_NDEPLOY_CONFIG ?? fileURLToPath(new URL("../../../review-local.ndeploy.json", import.meta.url));
const expectedAssets = ["main.js", "service.js"] as const;

async function main(): Promise<void> {
  const sourceManifest = JSON.parse(await readFile(resolve(appRoot, "neutron.json"), "utf8")) as { id?: unknown; version?: unknown };
  if (sourceManifest.id !== "review" || !Number.isInteger(sourceManifest.version)) throw new Error("Review neutron.json must declare id review and an integer version");
  const archivePath = process.env.NEUTRON_REVIEW_PACKAGE
    ? resolve(process.cwd(), process.env.NEUTRON_REVIEW_PACKAGE)
    : resolve(appRoot, packageArchiveFilename("review", sourceManifest.version as number));
  const archive = new Uint8Array(await readFile(archivePath));
  const unpacked = unpackNeutronPackage(archive);
  const packagedManifestBytes = unpacked["neutron.json"];
  if (!packagedManifestBytes) throw new Error(`${archivePath} does not contain neutron.json`);
  const packagedManifest = JSON.parse(new TextDecoder().decode(packagedManifestBytes)) as { id?: unknown; version?: unknown };
  if (packagedManifest.id !== sourceManifest.id || packagedManifest.version !== sourceManifest.version) throw new Error("Packaged Review manifest does not match source manifest");

  const origin = installedOrigin();
  for (const asset of expectedAssets) {
    const expected = unpacked[`web/${asset}`];
    if (!expected) throw new Error(`${basename(archivePath)} does not contain web/${asset}`);
    const response = await fetch(new URL(`/app/review/${asset}`, `${origin}/`), { cache: "no-store", headers: { "cache-control": "no-cache" } });
    if (!response.ok) throw new Error(`Installed ${asset} returned HTTP ${response.status}`);
    const receivedBody = new Uint8Array(await response.arrayBuffer());
    const received = isGzip(receivedBody) ? gunzipSync(receivedBody) : receivedBody;
    if (received.byteLength !== expected.byteLength || sha256(received) !== sha256(expected)) throw new Error(`Installed ${asset} does not match packaged bytes`);
    console.log(`${asset} ${received.byteLength} bytes sha256 ${sha256(received)}`);
  }
  console.log(`Attested installed Review at ${origin}`);
  console.log(`Package ${basename(archivePath)} sha256 ${sha256(archive)}`);
}

function installedOrigin(): string {
  const runtime = resolveLocalNeutronRuntime({ configPath: deploymentConfig });
  return localCanisterOrigin(runtime.canisterId, runtime.gatewayUrl);
}
function isGzip(bytes: Uint8Array): boolean { return bytes.byteLength >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b; }
function sha256(bytes: Uint8Array): string { return createHash("sha256").update(bytes).digest("hex"); }

await main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
