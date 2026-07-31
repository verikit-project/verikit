// `ActionState` is intentionally not re-exported here: it's the builder's
// raw, pre-finalized internal state (the same state `getRuntime()` is
// `@internal` about), not part of the public API. `ActionBuilder` and
// `action()` are the supported surface.
export { ActionBuilder, action } from "./action-builder.js";
