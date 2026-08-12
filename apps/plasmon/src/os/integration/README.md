# OS integration

`integration/**` is the Plasmon OS composition boundary. It wires subsystem implementations together through their public contracts; it should not become a second home for subsystem policy.

## Current composition

`services.ts` constructs the filesystem frontend transport, filesystem core, association/default store, native application registry, process/window managers, Neutron bridge, OpenService, authorization seam, and shared file-operation clipboard. It registers built-in native applications/runtime handlers and returns the public service graph consumed by `PlasmonOS.tsx`.

Hosted Plasmon routes filesystem persistence through the persistent background/RPC boundary; standalone preview uses a browser-selected local repository. These modes should expose the same public filesystem semantics even though their persistence transport differs.

`openService.ts` executes resolved handlers through the relevant public runtime/Kernel services. Fakes under this directory are test/preview seams and are never evidence that a production Kernel/security capability exists.

The essential runtime boundary remains:

```text
Plasmon native app -> Plasmon process/window host
Neutron application -> Kernel-owned surface
```

## Refactor direction

Keep the service graph explicit and composition small. When integration code accumulates filename/app-specific policy, move that policy to the owning subsystem and keep only dependency wiring here.

Retire legacy adapters only after current consumers are migrated and verified. Avoid wholesale replacement of composition files with stale branch versions; integration must preserve compatible subsystem behavior from all merged work.

Shared dependency/build/package changes that affect multiple subsystems should be applied centrally and tested as package composition rather than hidden inside one feature directory.

## Testing

Use composition tests to prove the real public implementations are wired together and fakes remain confined to their intended modes. Add package/browser coverage when hosted-vs-standalone transport, built assets, workers/runtime files, or the active packaged entrypoint are part of the claim.

A fake service proves caller behavior, not existence of a production Kernel/authorization capability.
