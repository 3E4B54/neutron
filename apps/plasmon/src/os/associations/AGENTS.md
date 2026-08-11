# Associations agent instructions

## Authority

This subsystem owns handler registration, matching precedence, persistent user
defaults, Atom/file-type matching, and the public Open With model.

## Rules

- `HandlerAssociationRegistry` is the matching authority. Consumers must not
  duplicate matcher rules or downcast the public registry to inspect internals.
- `OpenWithServiceModel` is the consumer API for candidates, one-off Open, and
  Set Default.
- One-off Open never persists a default.
- Set Default must persist the matcher-aware type key returned by the model;
  callers must not guess it.
- User defaults remain FsService-backed; no foreground `localStorage`.
- Preserve precedence and deterministic tie-breaking covered by tests.
- MIME/extension detection belongs in shared association/content metadata, not
  scattered UI conditionals.
- Canonical `.neutron` representation must not invent Plasmon-specific MIME
  names. If a MIME is exposed for a Neutron package/projection, use the
  owner-approved `application/x-neutron`.
- Extend source/language MIME coverage coherently (for example JavaScript) so
  Properties, Search and Open With agree.

## Validation

Test persistence/reconstruction, wildcard defaults, compound extensions, Atom
matching, corrupt/unavailable stores, and the packaged Open With dialog path.
