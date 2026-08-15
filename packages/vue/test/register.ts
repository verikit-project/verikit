import { installJsdom } from "./dom-setup.js";

// Vue's runtime-dom caches `document` into a module-scope const the moment
// it's first imported, so jsdom must exist before any test file (and its
// transitive `vue`/`@vue/test-utils` imports) loads at all.
installJsdom();
