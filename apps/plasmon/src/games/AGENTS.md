# Games agent instructions

## Scope and authority

Applies to `src/games/**`. Also follow the parent `src/AGENTS.md` and the nearest filesystem, association, runtime, and testing instructions for cross-boundary work.

Games owns game-specific content/bootstrap concerns. It does not own generic resource opening, filesystem persistence, process/window policy, application installation, or emulator/system-app facades.

## Rules

- Keep launch behavior data-driven through shared resource-opening and association authorities.
- Do not add game-name or filename-specific behavior to Shell, Desktop, FileManager, integration, or generic opening code.
- Reuse canonical filesystem, process, windowing, visual, and runtime services instead of creating game-specific copies.
- Keep temporary/demo/bootstrap content clearly separable from durable product defaults.
- Preserve licensing and redistribution metadata for bundled content.
- Keep game saves and durable user state behind the intended Plasmon/runtime persistence authority.
- Do not treat build-output existence as installed-runtime acceptance.

## Testing

Test deterministic game-domain behavior with the fast Bun lane wherever practical:

```sh
npm --workspace neutron-plasmon test
```

Use focused tests while iterating. Add package/browser coverage only when the acceptance claim depends on installed asset serving, runtime initialization, real browser input/media/fullscreen behavior, or playability.

## Escalate

Escalate licensing uncertainty, missing Neutron serving/runtime capability, or any proposal that would require a game-specific exception in a generic OS authority.
