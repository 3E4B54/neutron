# Native applications agent instructions

## Rules

- Register application metadata/handlers through the shared native-app and
  association registries; do not create hidden parallel registries.
- `.sys` is only for actual Plasmon-native system applications.
- Runtime handlers such as js-dos/EmulatorJS are not `.sys` apps and must not
  appear as standalone Start applications unless product semantics explicitly
  make them user-launchable apps.
- Use `FsService` document sessions for persistent file content.
- Keep one-off Open vs persisted default behavior in association services.
- Reuse shared window/process/visual infrastructure.
- Expose built-in editor/runtime capabilities through coherent UI/menu affordances
  when the product expects discoverability; keyboard shortcuts alone are not
  sufficient for mature desktop UX.
- User-visible titles should identify the actual application/engine where
  specified by product acceptance (for Monaco editors: `<filename> - Monaco Editor`).
- Configurable runtime/editor assets and preferences that are part of the user
  environment should project under `/System/Program Files` rather than empty
  placeholder directories.

## MIME/language consistency

Extension/MIME/language detection must agree with shared association metadata.
Do not let an editor highlight JavaScript while Properties/Search still report
an unrelated generic MIME if the type is known.

## Validation

Keep focused component/model tests, but add packaged browser regressions for
visible editor menus, persistence/reopen, app title, native `.sys` launch, and
runtime-handler behavior.

Do not change the owner-frozen Plasmon manifest version.
