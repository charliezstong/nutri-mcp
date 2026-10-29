/**
 * Slug in the style of Open Food Facts tags: lowercase, no accents,
 * non-alphanumerics collapsed to "-".
 */
export function toTagSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Human-readable label from an OFF taxonomy tag ("en:breakfast-cereals" -> "breakfast cereals").
 */
export function tagToLabel(tag: string): string {
  return tag.replace(/^[a-z]{2,3}:/, '').replace(/-/g, ' ').trim();
}

/**
 * Whole-word, case-insensitive keyword search. Avoids false positives such as
 * "egg" in "eggplant" or "ham" in "hamburger bun".
 */
export function containsWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'iu').test(text);
}

/**
 * Round to a fixed number of decimals, removing floating point noise.
 */
export function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
