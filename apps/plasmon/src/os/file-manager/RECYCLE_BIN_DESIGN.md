# Recycle Bin design spike

Gate 3 keeps Delete as permanent `FsService.remove()` behind `deleteFilesystemNodes()`. This note records the smallest Trash model that fits the frozen filesystem contract without introducing a second filesystem abstraction.

## Proposed shape

- Canonical location: `/.Trash` as one normal FsService directory owned by Plasmon.
- The folder should be hidden/system-presentational by convention rather than by a new FsNode kind or contract field.
- A soft delete would move the existing NodeId into `/.Trash`, preserving filesystem identity and directory descendants.
- Before moving, Plasmon would attach JSON-safe metadata such as:

  - original parent NodeId;
  - original name;
  - deletion timestamp;
  - format/version marker for future migration.

- Restore would use the stored parent NodeId, not a historical path string, because NodeId is the stable identity contract.

## Policy that still needs a decision

### Canonical Trash naming

`FsService.move()` does not accept a destination name. Two deleted siblings can therefore collide inside one Trash directory. A complete design must choose whether to:

1. rename the node to a unique internal Trash name before moving, then restore its recorded original name; or
2. create per-deletion/per-parent containers under `/.Trash` and keep the visible node name unchanged.

The second option avoids exposing an internal renamed filename as user state, but adds container cleanup policy.

### Deleting inside Trash

Deletion from `/.Trash` should be permanent and should bypass another soft-delete pass. Empty Trash would permanently remove all children. This requires an explicit Trash-aware delete policy rather than recursive interception of every `remove()` call.

### Missing original parent

If the stored parent NodeId no longer exists, restore needs an explicit product rule. Reasonable choices are:

- fail and ask the user to choose a destination; or
- restore to a defined fallback such as `/Desktop` or `/`.

Silently reconstructing an old path would violate NodeId-first identity and could recreate directories the user intentionally deleted.

### Restore name collisions

If the original parent contains the original name again, restore should use the same deterministic `name (N).ext` family allocator used by FileManager copy/generated names. The restored node keeps its NodeId; only its presentation name changes.

### Directory restoration

Moving a directory node back through FsService should preserve its descendants and their NodeIds. No recursive copy model is needed.

### Metadata lifecycle

Trash metadata should be removed after a successful restore. The original parent NodeId/name and deletion timestamp should not remain as ordinary file metadata once restored unless product history explicitly requires it.

### Desktop representation

A special Recycle Bin Desktop icon should be a presentation/system entry backed by the canonical `/.Trash` directory, not a duplicate filesystem or a fake shortcut format. Its empty/full visual state can be derived from `fs.list(trashId)` and FsEvents.

## Gate 3 conclusion

The frozen FsService is sufficient for a Recycle Bin, but collision policy inside the canonical Trash and missing-parent restore UX are not yet frozen. Implementing it in this correction round would therefore create policy accidentally. Gate 3 keeps permanent deletion factored behind one operation boundary so it can be redirected later.
