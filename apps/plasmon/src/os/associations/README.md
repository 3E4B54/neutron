# Associations and Open With

`associations/**` implements Plasmon's shared handler catalog, deterministic resource matching, user defaults, Open With model, and logical resource/compatibility parsers used by the association system.

## Responsibilities

`HandlerAssociationRegistry` is the matching authority. It normalizes registered handlers/rules, resolves explicit/resource metadata plus extension/MIME/logical-resource matches, applies persisted defaults, and returns deterministic ordered candidates.

`OpenWithServiceModel` turns those candidates into a consumer-facing model for one-off opening and persisted default selection while delegating execution through the public `OpenService`. Association code chooses handlers; it does not become the native process manager or Neutron launcher.

Logical Atom/resource helpers keep immutable logical identity distinct from path/name and physical application/process identity. Package/shortcut parsers are compatibility/resource-description helpers, not alternate application authorities.

## Refactor direction

Keep matching, persisted defaults, resource metadata/parsing, and execution delegation as separable concerns. Centralize extension/MIME/logical type knowledge here or in shared content metadata so Properties, Search, FileManager, and native apps do not grow contradictory local mappings.

UI code should consume ordered candidates/default operations rather than downcasting registries or reproducing precedence. Concrete persistence should remain behind the approved default-store interface.

## Testing

Use fast tests for registration validation, deterministic ordering, specificity/default behavior, persistence/reconstruction, malformed input, compatibility parsers, and logical-resource matching. Browser tests are appropriate for the actual Open With dialog/persistence wiring, not for re-testing matching rules through clicks.
