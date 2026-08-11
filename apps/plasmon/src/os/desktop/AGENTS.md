# Desktop agent instructions

- Treat `/Desktop` as an FsService directory; do not add parallel persistence.
- Preserve NodeId-keyed placement across rename/move.
- Delegate generic opening to filesystem core/open dispatcher.
- Never reintroduce Shell-owned shortcut execution.
- Use shared visual presentation/shortcut overlays from `os/visual`.
- Reuse FileManager selection/interaction semantics where applicable rather than
  creating incompatible Desktop-only rules.
- Protect modal pointer boundaries from Desktop marquee handling.
- Add packaged browser regressions for user-visible Desktop failures.

Desktop is a presentation layer. Filesystem policy, associations, process
lifecycle and Kernel opening remain owned by their respective subsystems.
