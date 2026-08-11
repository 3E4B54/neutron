import { expect, test } from "bun:test";
import {
  createObjectUrlLease,
  inferVideoMime,
  nativeVideoSupportForMime,
  safeHttpUrl,
  videoPlaybackErrorMessage,
  youtubeEmbedUrl,
  youtubeVideoId,
} from "./media.ts";

test("video MIME helper selects declared or extension types including MKV", () => {
  expect(inferVideoMime("movie.webm")).toBe("video/webm");
  expect(inferVideoMime("movie.mkv")).toBe("video/x-matroska");
  expect(inferVideoMime("movie.MP4?token=x")).toBe("video/mp4");
  expect(inferVideoMime("movie.bin", "video/mp4")).toBe("video/mp4");
  expect(inferVideoMime("movie.bin")).toBe("application/octet-stream");
});

test("native media capability distinguishes unsupported from playable paths", () => {
  expect(nativeVideoSupportForMime("video/x-matroska", { canPlayType: () => "" })).toBe("unsupported");
  expect(nativeVideoSupportForMime("video/mp4", { canPlayType: () => "probably" })).toBe("supported");
  expect(nativeVideoSupportForMime("application/octet-stream", { canPlayType: () => "" })).toBe("unknown");
});

test("unsupported video gets an actionable native-codec explanation", () => {
  const message = videoPlaybackErrorMessage("movie.mkv", "video/x-matroska", 4);
  expect(message).toContain("cannot play");
  expect(message).toContain("video/x-matroska");
  expect(message).toContain("does not bundle a transcoder");
});

test("supported video error paths distinguish load from decode failures", () => {
  expect(videoPlaybackErrorMessage("clip.mp4", "video/mp4", 2)).toContain("could not load");
  expect(videoPlaybackErrorMessage("clip.mp4", "video/mp4", 3)).toContain("could not decode");
});

test("object URL lease revokes exactly once", () => {
  const revoked: string[] = [];
  const lease = createObjectUrlLease(new Blob([new Uint8Array([1])]), {
    createObjectURL: () => "blob:test",
    revokeObjectURL: (url) => revoked.push(url),
  });
  expect(lease.url).toBe("blob:test");
  lease.release();
  lease.release();
  expect(revoked).toEqual(["blob:test"]);
});

test("YouTube normalization is narrow and unsafe URL schemes are rejected", () => {
  expect(youtubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  expect(youtubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  expect(youtubeEmbedUrl("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  expect(youtubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
  expect(safeHttpUrl("data:video/mp4,boom")).toBeNull();
});
