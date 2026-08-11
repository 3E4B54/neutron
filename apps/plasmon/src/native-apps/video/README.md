# Native Video Player

Local videos are read once through `FsService` into a `Blob`; object URLs are revoked on target change/unmount and bytes are never base64 encoded into React state. HTTP(S) media is used directly. YouTube handling parses a validated public URL to a video ID and uses the privacy-enhanced embed domain. There is no authenticated Neutron surface handling.

The association intentionally keeps broad `video/*` routing. Container/codec support is browser-dependent, so routing only a hand-maintained extension allowlist would incorrectly hide Video from valid browser-supported media. For MIME-bearing files, the player asks the browser's native media engine whether the declared type is playable before attaching a source where practical, and it converts unsupported/decode failures into an in-app explanation. In particular, MKV (`video/x-matroska`) may route to Video and then be reported as unsupported when the host browser has no decoder.

Gate 3 does not add transcoding, codec packs, Video.js, or a WASM decoder stack.
