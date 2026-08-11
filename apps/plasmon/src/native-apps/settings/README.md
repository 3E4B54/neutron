# Settings

Settings is the Plasmon-native settings surface.

The current model computes storage information by walking the existing
filesystem; it does not introduce a second storage backend. Feature seams are
passed as callbacks/services so Settings does not import Shell implementation
internals.

Unavailable features such as backup/sharing must be shown as unavailable rather
than simulated.

Future filesystem presentation preferences such as “Show hidden files” should
persist through the appropriate shared FsService/shell preference boundary, not
localStorage or a Settings-private database.

Tests: `model.test.ts` plus packaged settings interactions.
