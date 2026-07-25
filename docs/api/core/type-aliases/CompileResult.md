[**@verikit/core**](../core.md)

***

[@verikit/core](../core.md) / CompileResult

# Type Alias: CompileResult

> **CompileResult** = \{ `graph`: [`CompiledGraph`](../interfaces/CompiledGraph.md); `success`: `true`; \} \| \{ `issues`: [`CompileIssue`](../interfaces/CompileIssue.md)[]; `success`: `false`; \}

Defined in: compiler/compile.d.ts:15

Result of compiling a set of resources; mirrors the ValidationResult shape used elsewhere.
