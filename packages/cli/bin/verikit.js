#!/usr/bin/env node
// Committed rather than built so package managers can link the `verikit`
// command before a workspace build has run; it needs dist/ only when it runs.
import "../dist/index.js";
