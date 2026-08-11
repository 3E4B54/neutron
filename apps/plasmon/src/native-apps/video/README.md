# Video

Video is the native browser-media player.

`media.ts` normalizes MIME/extension hints, manages object URL lifetime, and
distinguishes browser support from load/decode failure. MKV may be recognized
as a video resource while still being unplayable in the user's browser codec
stack; the UI should explain that limitation instead of claiming generic file
corruption.

YouTube normalization is intentionally narrow and unsafe URL schemes are
rejected. Object URL leases must be revoked exactly once.

Video handling remains association-driven; this app does not own generic file
opening or URL-shortcut parsing.

Tests: `media.test.ts` plus packaged codec/error-path checks where practical.
