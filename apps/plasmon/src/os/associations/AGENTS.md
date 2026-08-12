# Associations agent instructions

## Authority

This subsystem owns handler registration, deterministic matching, persisted user defaults, logical-resource/file-type matching, compatibility parsers used by matching, and the public Open With model.

## Rules

- `HandlerAssociationRegistry` is the matching authority; consumers must not duplicate matcher precedence or inspect private registry state.
- Association resolution chooses candidates; actual native/Neutron/external execution is delegated through public opening services.
- One-off Open must not silently change a persisted default.
- Persisted defaults must use the matcher/type identity produced by association logic rather than a UI-guessed key.
- Shared content/type metadata should be coherent across consumers; do not scatter extension/MIME conditionals through UI components.
- Malformed optional metadata or preference-store failures should degrade predictably without making built-in resolution nondeterministic.
- Preserve logical Atom/resource identity independently of filename/path and physical runtime identity.

Do not freeze a one-off file type, MIME correction, suffix exception, or compatibility bug into this generic file. Put it in the responsible Issue/test unless it is a lasting association rule.

## Refactor direction

Keep matching, defaults persistence, resource parsing, and Open With presentation models separable. Prefer production helpers/models reusable by Search, Properties, FileManager, and native apps.

## Validation

Test deterministic matching/defaults, persistence/reconstruction, malformed/corrupt inputs, logical resources, compatibility parsers, and fallback behavior. Use browser tests for real dialog/focus/persistence integration only when browser behavior is part of the claim.
