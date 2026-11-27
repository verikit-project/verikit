/** A parsed panel URL. `resource` is the resource's panel path segment. */
export type PanelRoute =
  | { kind: "home" }
  | { kind: "list"; resource: string }
  | { kind: "create"; resource: string }
  | { kind: "view"; resource: string; id: string }
  | { kind: "edit"; resource: string; id: string }
  | { kind: "notFound" };

/**
 * Normalizes a mount path to `""` (mounted at the site root) or a path with a
 * leading slash and no trailing slash, such as `"/admin"`.
 */
export function normalizeBasePath(basePath: string): string {
  const trimmed = basePath.replace(/^\/+|\/+$/g, "");
  return trimmed === "" ? "" : `/${trimmed}`;
}

function decodeSegments(path: string): string[] | undefined {
  try {
    return path.split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    // A malformed escape such as "%E0%A4%A" can't name any page.
    return undefined;
  }
}

/**
 * Matches `pathname` against the panel's routes:
 * `{base}`, `{base}/{resource}`, `{base}/{resource}/create`,
 * `{base}/{resource}/{id}`, and `{base}/{resource}/{id}/edit`. A record whose
 * id is literally `create` has no view page (that path is the create page),
 * but its edit page still works.
 */
export function matchPanelRoute(
  pathname: string,
  basePath: string,
  resourcePaths: ReadonlySet<string>,
): PanelRoute {
  const base = normalizeBasePath(basePath);

  if (base && pathname !== base && !pathname.startsWith(`${base}/`)) {
    return { kind: "notFound" };
  }

  const segments = decodeSegments(pathname.slice(base.length));

  if (!segments) {
    return { kind: "notFound" };
  }

  if (segments.length === 0) {
    return { kind: "home" };
  }

  const [resource, second, third] = segments;

  if (!resourcePaths.has(resource)) {
    return { kind: "notFound" };
  }

  if (segments.length === 1) {
    return { kind: "list", resource };
  }

  if (segments.length === 2) {
    return second === "create"
      ? { kind: "create", resource }
      : { kind: "view", resource, id: second! };
  }

  if (segments.length === 3 && third === "edit") {
    return { kind: "edit", resource, id: second };
  }

  return { kind: "notFound" };
}

/** Builds a panel URL from path segments, encoding each one. */
export function panelHref(basePath: string, ...segments: string[]): string {
  const base = normalizeBasePath(basePath);

  if (segments.length === 0) {
    return base || "/";
  }

  return `${base}/${segments.map(encodeURIComponent).join("/")}`;
}
