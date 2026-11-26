/** Where generated files import Verikit from. */
export interface ImportSources {
  /** defineResource, fields, relationships. */
  core: string;
  /** action(). */
  runtime: string;
  /** ServerResourceConfig. */
  server: string;
}

/** For apps that install the scoped @verikit/* packages. */
export const SCOPED_IMPORTS: ImportSources = {
  core: "@verikit/core",
  runtime: "@verikit/runtime",
  server: "@verikit/server",
};

/** For apps that install the `verikit` meta-package. */
export const META_IMPORTS: ImportSources = {
  core: "verikit",
  runtime: "verikit",
  server: "verikit/server",
};
