declare module "node:test" {
  type TestResult = void | Promise<void>;

  export interface TestContext {
    name: string;
  }

  export function test(
    name: string,
    fn: (context: TestContext) => TestResult,
  ): void;

  export default test;
}

declare module "node:assert/strict" {
  interface AssertStrict {
    deepEqual(actual: unknown, expected: unknown): void;
    equal(actual: unknown, expected: unknown): void;
    notEqual(actual: unknown, expected: unknown): void;
    throws(fn: () => unknown, expected?: RegExp): void;
  }

  const assert: AssertStrict;
  export const deepEqual: AssertStrict["deepEqual"];
  export const equal: AssertStrict["equal"];
  export const notEqual: AssertStrict["notEqual"];
  export const throws: AssertStrict["throws"];
  export default assert;
}
