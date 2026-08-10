import { expect, test } from "bun:test";
import { MemoryFs, MemoryProcessController, MemoryWindowManager, fakeText } from "../src/os/integration/fakes.ts";
import {
  FakeResourceAuthorizationService,
  UnavailableResourceAuthorizationService,
} from "../src/os/integration/authorizationFakes.ts";

test("filesystem fake preserves node identity across rename and move", async () => {
  const fs = new MemoryFs();
  const desktop = await fs.mkdir(fs.rootId, "Desktop");
  const archive = await fs.mkdir(fs.rootId, "Archive");
  const file = await fs.createFile(desktop.id, "notes.txt", { mime: "text/plain" });
  await fs.write(file.id, fakeText("hello"), { truncate: true });

  const renamed = await fs.rename(file.id, "thoughts.txt");
  const moved = await fs.move(file.id, archive.id);

  expect(renamed.id).toBe(file.id);
  expect(moved.id).toBe(file.id);
  expect(await fs.pathOf(file.id)).toBe("/Archive/thoughts.txt");
  expect(new TextDecoder().decode(await fs.read(file.id))).toBe("hello");
});

test("filesystem fake supports range reads and offset writes", async () => {
  const fs = new MemoryFs();
  const file = await fs.createFile(fs.rootId, "large.bin");
  await fs.write(file.id, new Uint8Array([1, 2, 3, 4]), { truncate: true });
  await fs.write(file.id, new Uint8Array([9, 8]), { offset: 1 });

  expect([...await fs.read(file.id)]).toEqual([1, 9, 8, 4]);
  expect([...await fs.read(file.id, { offset: 1, length: 2 })]).toEqual([9, 8]);
});

test("process and window fakes communicate only through public contracts", async () => {
  const windows = new MemoryWindowManager();
  const process = new MemoryProcessController(windows);
  const processId = await process.open("native:text", { nodeId: "node:1" });

  expect(process.list()).toHaveLength(1);
  expect(windows.list()).toHaveLength(1);
  expect(windows.list()[0]?.processId).toBe(processId);

  process.close(processId);
  expect(process.list()).toHaveLength(0);
  expect(windows.list()).toHaveLength(0);
});

test("authorization fake owns bearer grant lifecycle independently of sharing", async () => {
  const authorization = new FakeResourceAuthorizationService();
  const grant = await authorization.issue({
    resource: {
      providerId: "plasmon-sharing",
      resourceId: "resource:1",
      revision: "7",
    },
    rights: ["read"],
  });

  const redeemed = await authorization.redeem({ token: grant.token });
  expect(redeemed.resource.resourceId).toBe("resource:1");
  expect(redeemed.rights).toEqual(["read"]);

  await authorization.revoke(grant.grantId);
  expect((await authorization.inspect(grant.grantId)).revoked).toBe(true);
  await expect(authorization.redeem({ token: grant.token })).rejects.toThrow("revoked");
});

test("vanilla authorization placeholder fails closed", async () => {
  const authorization = new UnavailableResourceAuthorizationService();
  expect(authorization.available).toBe(false);
  await expect(authorization.issue({
    resource: {
      providerId: "plasmon-sharing",
      resourceId: "resource:1",
      revision: "1",
    },
    rights: ["read"],
  })).rejects.toThrow("unavailable");
});
