export const ICON_IMAGE_OBJECT_FIT = "contain" as const;
export const THUMBNAIL_OBJECT_FIT = "contain" as const;

export type ResolvedImagePresentation =
  | { kind: "image"; src: string }
  | { kind: "fallback" };

export function resolveImagePresentation(
  src: string | null | undefined,
  failedSrc: string | null,
): ResolvedImagePresentation {
  if (src && src !== failedSrc) return { kind: "image", src };
  return { kind: "fallback" };
}

export interface ShortcutComposition<T> {
  target: T;
  shortcut: true;
}

/**
 * Presentation-only composition. The visual layer does not resolve or execute
 * shortcut targets; callers hand it an already-resolved target presentation.
 */
export function composeShortcutPresentation<T>(target: T): ShortcutComposition<T> {
  return { target, shortcut: true };
}
