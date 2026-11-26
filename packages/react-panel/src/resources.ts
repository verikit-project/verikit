import type { Resource, ResourceSchema } from "@verikit/core";
import type { ComponentType } from "react";

/** A resource the panel can list, create, and edit. */
export type PanelResourceSource = Resource | ResourceSchema;

/** Per-resource panel settings. Everything except `resource` is optional. */
export interface PanelResourceConfig {
  resource: PanelResourceSource;
  /** Navigation and page title. Defaults to the pluralized resource name, e.g. "Blog posts". */
  label?: string;
  /** Used in "New …" and "Edit …" titles. Defaults to the resource name, e.g. "Blog post". */
  singularLabel?: string;
  /** URL segment. Defaults to the kebab-cased plural, e.g. "blog-posts". */
  path?: string;
  /** Icon shown in the navigation, such as a lucide-react icon. */
  icon?: ComponentType<{ className?: string }>;
  /** Navigation group heading. Ungrouped resources are listed first. */
  group?: string;
}

/** A resource, or a resource with panel settings. */
export type PanelResourceInput = PanelResourceSource | PanelResourceConfig;

/** A resource with every panel setting resolved. */
export interface PanelResourceEntry {
  resource: PanelResourceSource;
  label: string;
  singularLabel: string;
  path: string;
  icon?: ComponentType<{ className?: string }>;
  group?: string;
}

function words(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

/** English plural for a single lowercase word, good enough for default labels. */
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

function sentenceCase(parts: string[]): string {
  const text = parts.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function pluralWords(name: string): string[] {
  const parts = words(name);
  return [...parts.slice(0, -1), pluralize(parts.at(-1) ?? "")];
}

/** Resolves labels and paths, and rejects resources that would share a URL. */
export function normalizePanelResources(
  inputs: readonly PanelResourceInput[],
): PanelResourceEntry[] {
  const seen = new Set<string>();

  return inputs.map((input) => {
    const config: PanelResourceConfig =
      "resource" in input ? input : { resource: input };
    const { name } = config.resource;
    const path = config.path ?? pluralWords(name).join("-");

    if (path === "" || path.includes("/")) {
      throw new Error(
        `@verikit/react-panel: resource "${name}" has an invalid path "${path}". Use one URL segment without slashes.`,
      );
    }

    if (seen.has(path)) {
      throw new Error(
        `@verikit/react-panel: two resources use the path "${path}". Give one of them a different \`path\`.`,
      );
    }

    seen.add(path);

    return {
      resource: config.resource,
      label: config.label ?? sentenceCase(pluralWords(name)),
      singularLabel: config.singularLabel ?? sentenceCase(words(name)),
      path,
      icon: config.icon,
      group: config.group,
    };
  });
}
