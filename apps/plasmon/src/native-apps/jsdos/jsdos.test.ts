import { expect, test } from "bun:test";
import { HandlerAssociationRegistry } from "../../os/associations/index.ts";
import type { FsNode } from "../../os/contracts/index.ts";
import { jsDosAssociationRules, jsDosHandler, jsDosRuntimeDefinition } from "./index.ts";
import {
  JS_DOS_BROWSER_RUNTIME_ROOT,
  JS_DOS_RUNTIME_ROOT,
  jsDosPackageAssetUrl,
} from "./runtime.ts";

function bundleNode(name = "Doom.jsdos"): FsNode {
  return {
    id: "game:1",
    parentId: "desktop",
    name,
    kind: "file",
    mime: "application/x-jsdos",
    size: 1,
    createdAt: 1,
    modifiedAt: 1,
    metadata: {},
  };
}

test(".jsdos resolves through the generic js-dos association handler", async () => {
  const registry = new HandlerAssociationRegistry();
  registry.registerHandler(jsDosHandler);
  for (const rule of jsDosAssociationRules) registry.registerRule(rule);

  expect((await registry.resolve(bundleNode())).map(({ id }) => id)).toEqual(["runtime:js-dos"]);
  expect((await registry.resolve(bundleNode("RENAMED.JSDOS"))).map(({ id }) => id)).toEqual(["runtime:js-dos"]);
});

test("js-dos process-host metadata does not introduce a .sys application", () => {
  expect(jsDosRuntimeDefinition.handlerId).toBe(jsDosHandler.id);
  expect(jsDosRuntimeDefinition.id).toBe("runtime:js-dos");
  expect(jsDosRuntimeDefinition.name).toBe("js-dos");
  expect(JSON.stringify(jsDosRuntimeDefinition)).not.toContain(".sys");
});

test("installed js-dos keeps Program Files authority while browser assets use URL-safe transport", () => {
  expect(JS_DOS_RUNTIME_ROOT).toBe("/System/Program Files/js-dos");
  expect(JS_DOS_BROWSER_RUNTIME_ROOT).toBe("./runtime/jsdos/");
  expect(jsDosPackageAssetUrl("https://example.test/app/plasmon/index.html", "js-dos.js"))
    .toBe("https://example.test/app/plasmon/runtime/jsdos/js-dos.js");
  expect(jsDosPackageAssetUrl("https://example.test/app/plasmon/index.html", "emulators/"))
    .toBe("https://example.test/app/plasmon/runtime/jsdos/emulators/");
});
