import { expect, test } from "bun:test";
import { FsRpcClient, createBrowserFsRepository } from "../src/os/fs/index.ts";
import { createFilesystemService } from "../src/os/integration/services.ts";

function insecureIndexedDbFactory(counter: { opens: number }): IDBFactory {
  return {
    open() {
      counter.opens += 1;
      const error = new Error("IDBFactory.open: The operation is insecure");
      error.name = "SecurityError";
      throw error;
    },
  } as unknown as IDBFactory;
}

test("browser repository contains Firefox-style IndexedDB SecurityError and falls back", async () => {
  const counter = { opens: 0 };
  const reasons: Error[] = [];
  const repository = await createBrowserFsRepository({
    indexedDB: insecureIndexedDbFactory(counter),
    onFallback: (reason) => reasons.push(reason),
  });

  expect(counter.opens).toBe(1);
  expect(repository.kind).toBe("memory");
  expect(reasons).toHaveLength(1);
  expect(reasons[0]?.name).toBe("SecurityError");
  expect(reasons[0]?.message).toContain("IDBFactory.open: The operation is insecure");
});

test("Kernel-hosted foreground never opens IndexedDB even when the exposed factory is insecure", () => {
  const counter = { opens: 0 };
  const insecureFactory = insecureIndexedDbFactory(counter);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");

  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    enumerable: true,
    value: insecureFactory,
  });

  try {
    const fs = createFilesystemService("hosted");
    expect(fs).toBeInstanceOf(FsRpcClient);
    expect(counter.opens).toBe(0);
  } finally {
    if (previous) Object.defineProperty(globalThis, "indexedDB", previous);
    else delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
  }
});
