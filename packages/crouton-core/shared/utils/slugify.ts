/**
 * URL-safe slug transformation.
 * Converts text to lowercase, replaces spaces/underscores with hyphens,
 * removes special characters, and trims leading/trailing hyphens.
 *
 * Shared between app and server — canonical implementation.
 *
 * @example slugify("Start Here!") // "start-here"
 * @example slugify("  Hello  World  ") // "hello-world"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
