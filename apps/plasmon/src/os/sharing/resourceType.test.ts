import { expect, test } from "bun:test";
import {
  MemorySharedResourceStore,
  PLASMON_FILE_NAMESPACE,
  ResourceIntegrityError,
  computeContentRoot,
} from "./index.ts";

test("provider resource type is immutable for a stable resource identity", async () => {
  const store = new MemorySharedResourceStore();
  const identity = {
    namespace: PLASMON_FILE_NAMESPACE,
    resourceId: "node:stable-resource",
  };
  const contentRootHash = await computeContentRoot(0, []);

  const first = await store.commitRevision({
    identity,
    resourceType: "text/plain",
    expectedRevision: null,
    byteLength: 0,
    contentRootHash,
    chunks: [],
    snapshot: {
      displayName: "stable.txt",
      kind: "file",
      mime: "text/plain",
    },
    createdAt: 1000,
  });

  expect(first.revision).toBe("1");

  await expect(store.commitRevision({
    identity,
    resourceType: "application/json",
    expectedRevision: "1",
    byteLength: 0,
    contentRootHash,
    chunks: [],
    snapshot: {
      displayName: "stable.txt",
      kind: "file",
      mime: "application/json",
    },
    createdAt: 2000,
  })).rejects.toBeInstanceOf(ResourceIntegrityError);

  expect((await store.describe(identity))?.resourceType).toBe("text/plain");
  expect((await store.getRevision(identity, "1"))?.resourceType).toBe("text/plain");
  expect(store.stats()).toEqual({
    resourceCount: 1,
    revisionCount: 1,
    chunkCount: 0,
    totalChunkBytes: 0,
  });
});
