#!/usr/bin/env node
// `npx verikit ...` runs @verikit/cli. This file is committed rather than
// built so package managers can link the `verikit` command before a
// workspace build has run; it only needs the build output when it runs.
import "@verikit/cli/dist/index.js";
