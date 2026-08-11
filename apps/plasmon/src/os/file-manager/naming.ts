export function normalizedSiblingName(name: string): string {
  return name.normalize("NFC").toLocaleLowerCase();
}

export interface NameParts {
  stem: string;
  extension: string;
}

export interface NameFamily extends NameParts {
  familyStem: string;
  suffix: number | null;
}

export function splitNameExtension(name: string, isDirectory: boolean): NameParts {
  if (isDirectory) return { stem: name, extension: "" };
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === name.length - 1) return { stem: name, extension: "" };
  return { stem: name.slice(0, lastDot), extension: name.slice(lastDot) };
}

export function parseNameFamily(name: string, isDirectory: boolean): NameFamily {
  const { stem, extension } = splitNameExtension(name, isDirectory);
  const match = /^(.*) \((\d+)\)$/.exec(stem);
  if (!match) return { stem, extension, familyStem: stem, suffix: null };
  const suffix = Number(match[2]);
  const familyStem = match[1] ?? stem;
  if (!familyStem || !Number.isSafeInteger(suffix) || suffix < 1) {
    return { stem, extension, familyStem: stem, suffix: null };
  }
  return { stem, extension, familyStem, suffix };
}

/**
 * Allocates the familiar `name (N).ext` family without recursively stacking
 * suffixes. `occupiedNames` must contain normalized sibling names.
 */
export function collisionFreeName(
  requestedName: string,
  isDirectory: boolean,
  occupiedNames: ReadonlySet<string>,
): string {
  if (!occupiedNames.has(normalizedSiblingName(requestedName))) return requestedName;

  const family = parseNameFamily(requestedName, isDirectory);
  let suffix = (family.suffix ?? 0) + 1;
  for (; suffix < Number.MAX_SAFE_INTEGER; suffix += 1) {
    const candidate = `${family.familyStem} (${suffix})${family.extension}`;
    if (!occupiedNames.has(normalizedSiblingName(candidate))) return candidate;
  }
  throw new Error(`Unable to allocate a sibling name for ${requestedName}`);
}
