/** Splits camelCase, PascalCase, kebab-case, snake_case, and spaced names into lowercase words. */
export function words(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function camelCase(name: string): string {
  const [first = "", ...rest] = words(name);
  return first + rest.map(capitalize).join("");
}

export function kebabCase(name: string): string {
  return words(name).join("-");
}

export function snakeCase(name: string): string {
  return words(name).join("_");
}

/** "publishedAt" → "Published at". */
export function sentenceCase(name: string): string {
  return capitalize(words(name).join(" "));
}

/** English plural of one lowercase word; good enough for table names. */
export function pluralize(word: string): string {
  if (/[^aeiou]y$/.test(word)) {
    return `${word.slice(0, -1)}ies`;
  }

  if (/(s|x|z|ch|sh)$/.test(word)) {
    // A name like "posts" is usually already plural.
    return /[^s]s$/.test(word) ? word : `${word}es`;
  }

  return `${word}s`;
}

function pluralWords(name: string): string[] {
  const parts = words(name);
  const last = parts.pop();
  return last === undefined ? [] : [...parts, pluralize(last)];
}

/** "blogPost" → "blogPosts". */
export function pluralCamelCase(name: string): string {
  return camelCase(pluralWords(name).join(" "));
}

/** "blogPost" → "blog_posts". */
export function pluralSnakeCase(name: string): string {
  return pluralWords(name).join("_");
}

const RESERVED = new Set(
  (
    "await break case catch class const continue debugger default delete do " +
    "else enum export extends false finally for function if implements import " +
    "in instanceof interface let new null package private protected public " +
    "return static super switch this throw true try typeof var void while " +
    "with yield"
  ).split(" "),
);

/**
 * Returns why `name` can't be a generated identifier, or `undefined` if it
 * can. `extraReserved` adds names the generated files already use.
 */
export function invalidIdentifier(
  name: string,
  extraReserved: readonly string[] = [],
): string | undefined {
  if (!/^[a-z][A-Za-z0-9]*$/.test(name)) {
    return `"${name}" must start with a letter and contain only letters and digits.`;
  }

  if (RESERVED.has(name) || extraReserved.includes(name)) {
    return `"${name}" is a reserved name.`;
  }

  return undefined;
}

/** A relative file path as an import specifier: "x.ts" becomes "./x.ts". */
export function importSpecifier(relativePath: string): string {
  const posix = relativePath.split("\\").join("/");
  return posix.startsWith(".") ? posix : `./${posix}`;
}
