import { expect, test } from "bun:test";
import { HandlerAssociationRegistry } from "../../os/associations/index.ts";
import type { FsNode } from "../../os/contracts/index.ts";
import { jsDosAssociationRules, jsDosHandler, jsDosRuntimeDefinition } from "./index.ts";

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
