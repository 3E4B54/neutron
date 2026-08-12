import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import {
  generateAppMethodSchemaArtifact,
  validateAppMethodArgs,
} from "neutron-scripts/src/method_schema.js";
import { type NeutronManifest } from "neutron-tools/src/schema.js";
import { validate_neutron_conf } from "neutron-tools/src/validate_schema.js";

const manifestUrl = new URL("../neutron.json", import.meta.url);
const backendUrl = new URL("../backend/main.mo", import.meta.url);
const htmlUrl = new URL("../dist/web/index.html", import.meta.url);
const cssUrl = new URL("../dist/web/main.css", import.meta.url);
const emulatorRuntimeUrl = new URL("../dist/web/System/Program Files/EmulatorJS/runtime.json", import.meta.url);
const emulatorLoaderUrl = new URL("../dist/web/System/Program Files/EmulatorJS/data/loader.js", import.meta.url);
const emulatorScriptUrl = new URL("../dist/web/System/Program Files/EmulatorJS/data/emulator.min.js", import.meta.url);
const emulatorStyleUrl = new URL("../dist/web/System/Program Files/EmulatorJS/data/emulator.min.css", import.meta.url);
const emulatorCoreUrl = new URL("../dist/web/System/Program Files/EmulatorJS/data/cores/fceumm-wasm.data", import.meta.url);
const emulatorLegacyCoreUrl = new URL("../dist/web/System/Program Files/EmulatorJS/data/cores/fceumm-legacy-wasm.data", import.meta.url);
const emulatorFixtureUrl = new URL("../dist/web/Games/Test ROMs/PlasmonTest.nes", import.meta.url);

async function readManifest(): Promise<NeutronManifest> {
  return JSON.parse(await readFile(manifestUrl, "utf8")) as NeutronManifest;
}

async function readBackend(): Promise<string> {
  return readFile(backendUrl, "utf8");
}

test("plasmon manifest validates and declares the shipped method", async () => {
  const manifest = await readManifest();
  const result = validate_neutron_conf(manifest);

  expect(result.valid).toBe(true);
  expect(manifest).toMatchObject({
    id: "plasmon",
    name: "Plasmon",
    version: 101,
    src: "main.mo",
    tiles: [
      {
        id: "main",
        title: "Plasmon",
        path: "index.html",
        icon: "static/icon.svg",
      },
    ],
    func: {
      hello_world: {
        type: "update",
        async: false,
      },
    },
  });
  expect(manifest).not.toHaveProperty("init_arg");
  expect(manifest).not.toHaveProperty("update_source");
});

test("plasmon emits a build-time app method schema", async () => {
  const manifest = await readManifest();
  const backend = await readBackend();
  const artifact = generateAppMethodSchemaArtifact(manifest, backend);

  expect(artifact.methods.hello_world).toMatchObject({
    type: "update",
    input: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "array",
      minItems: 1,
      maxItems: 1,
      prefixItems: [{ type: "string" }],
    },
    output: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "string",
    },
  });
  expect(validateAppMethodArgs(artifact, "hello_world", ["Plasmon"]).valid).toBe(true);
  expect(validateAppMethodArgs(artifact, "hello_world", []).valid).toBe(false);
});

test("plasmon bundles the shared design system stylesheet", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");

  expect(html).toContain("./main.css");
  expect(css).toContain(".nt-app");
  expect(css).toContain(".nt-button");
  expect(css).toContain("--nt-bg-panel");
});

test("plasmon packages EmulatorJS, its NES core, and the generated legal proof ROM", async () => {
  const [runtime, loader, script, style, core, legacyCore, fixture] = await Promise.all([
    readFile(emulatorRuntimeUrl, "utf8"),
    readFile(emulatorLoaderUrl, "utf8"),
    readFile(emulatorScriptUrl),
    readFile(emulatorStyleUrl),
    readFile(emulatorCoreUrl),
    readFile(emulatorLegacyCoreUrl),
    readFile(emulatorFixtureUrl),
  ]);

  expect(JSON.parse(runtime)).toMatchObject({
    runtime: "EmulatorJS",
    version: "4.2.3",
    core: "fceumm",
    resourceType: ".nes",
  });
  expect(loader).toContain("EJS_emulator");
  expect(loader).toContain("EJS_onGameStart");
  expect(script.length).toBeGreaterThan(10_000);
  expect(style.length).toBeGreaterThan(1_000);
  expect(core.length).toBeGreaterThan(100_000);
  expect(legacyCore.length).toBeGreaterThan(100_000);
  expect(fixture.length).toBe(16 + 16_384 + 8_192);
  expect([...fixture.subarray(0, 8)]).toEqual([0x4e, 0x45, 0x53, 0x1a, 0x01, 0x01, 0x00, 0x00]);
});
