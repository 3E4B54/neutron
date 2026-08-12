import { expect, test } from "bun:test";
import { NeutronFilesPort } from "../src/neutron_files_port.ts";

const ETAG = "980d24410f2cf3ee29cdf95f32adcb462fbe01be1d46817c7d74fec5b7bd5bde";

test("write validation preserves byte length after attachment transfer detaches payload", async () => {
  const port = new NeutronFilesPort(async (call, attachments) => {
    expect(call.name).toBe("writeBinary");
    const attachment = attachments[0];
    expect(attachment).toBeDefined();
    expect(attachment!.byteLength).toBe(12);
    expect(attachment!.data.byteLength).toBe(12);

    structuredClone(attachment!.data, { transfer: [attachment!.data] });
    expect(attachment!.data.byteLength).toBe(0);

    return {
      value: {
        path: "/e2e/review.md",
        mediaType: "text/markdown",
        byteLength: 12,
        etag: ETAG,
      },
      attachments: [],
    };
  });

  const bytes = new TextEncoder().encode("hello review");
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const metadata = await port.writeBinary(
    "/e2e/review.md",
    "text/markdown",
    data,
    { ifNoneMatch: "*" },
  );

  expect(metadata.byteLength).toBe(12);
  expect(metadata.etag).toBe(ETAG);
  expect(data.byteLength).toBe(12);
});
