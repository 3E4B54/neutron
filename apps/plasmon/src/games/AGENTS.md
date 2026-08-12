# Games agent instructions

## Scope and authority

These rules apply to `src/games/**`. Also follow the parent `src/AGENTS.md` and OS/filesystem/association instructions for any cross-boundary work.

Games owns game-specific content/bootstrap concerns. It does not own generic resource opening, filesystem persistence, application installation, or emulator/system-app facades.

## Required rules

- Keep game launch data-driven through the shared open dispatcher and `AssociationRegistry`.
- Never add game-name or filename-specific launch behavior to Shell, Desktop, FileManager, integration, or the open dispatcher.
- `.jsdos` resolves to the js-dos runtime. js-dos is not `.sys` and must not be exposed as `DOS.sys`, `Games.sys`, or a fake native application.
- Temporary proof/demo seeds must stay clearly marked and separable from durable product defaults.
- Do not treat an asset existing in build output as proof that packaged Neutron serves it correctly.
- Preserve licensing/redistribution status for bundled game content. Do not silently convert unverified proof content into a permanent shipped asset.
- Game saves and user state must use the intended Plasmon filesystem/runtime persistence model rather than browser-local storage becoming an undocumented authority.

## Acceptance and tests

The packaged acceptance path must prove the complete user workflow:

```text
game visible/reachable
-> double-click
-> generic open dispatch
-> association selects runtime
-> runtime window starts
-> game loads
-> user input works / game is playable
```

Add Playwright/browser coverage for this path where possible. A build test that only sees `Doom.jsdos` on disk is insufficient.

The known packaged `Doom.jsdos` HTTP 503 is required regression work until explicitly deferred.

## Escalate

Escalate redistribution/licensing uncertainty, a required Kernel serving capability that vanilla Neutron does not provide, or any proposal that would require a game-specific dispatch exception.
