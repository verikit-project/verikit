/** What happened when connecting a resource to its action declarations. */
export type WireResult =
  | { status: "already" }
  | { status: "wired"; source: string }
  | { status: "manual"; reason: string };

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Adds `import * as <namespace> from "<module>"` and
 * `actions: Object.values(<namespace>)` to the `defineResource(name, {` call in
 * `source`. It edits only when the call has the layout `make:resource` writes,
 * and reports `manual` otherwise so the user can add the two lines.
 */
export function wireResourceActions(
  source: string,
  resourceName: string,
  actionsModule: string,
  namespace: string,
): WireResult {
  if (source.includes(`"${actionsModule}"`)) {
    return { status: "already" };
  }

  const call = new RegExp(
    `defineResource\\(\\s*["'\`]${escapeRegExp(resourceName)}["'\`]\\s*,\\s*\\{[ \\t]*\\n`,
  ).exec(source);

  if (!call) {
    return {
      status: "manual",
      reason: `couldn't find defineResource("${resourceName}", {`,
    };
  }

  const configStart = call.index + call[0].length;

  if (/^\s*actions\s*:/m.test(source.slice(configStart))) {
    return { status: "manual", reason: "it already sets `actions`" };
  }

  const withActions = `${source.slice(0, configStart)}  actions: Object.values(${namespace}),\n${source.slice(configStart)}`;
  const imports = [...withActions.matchAll(/^import [^;]*;\n/gm)];
  const importEnd =
    imports.length > 0 ? imports.at(-1)!.index! + imports.at(-1)![0].length : 0;

  return {
    status: "wired",
    source: `${withActions.slice(0, importEnd)}import * as ${namespace} from "${actionsModule}";\n${withActions.slice(importEnd)}`,
  };
}
