---
sidebar_position: 2
title: Installation
---

# Installation

Install the core package:

```sh
pnpm add @verikit/core
```

Install runtime helpers when you need executable actions:

```sh
pnpm add @verikit/runtime
```

`@verikit/runtime` depends on `@verikit/core`, so applications using actions usually install both packages through the runtime package.

## TypeScript

Verikit is published as ESM and provides TypeScript declaration files through each package's `types` export.

Use modern TypeScript module resolution in consuming projects:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true
  }
}
```

Bundler-based projects can use their framework's normal TypeScript settings as long as ESM package exports are supported.
