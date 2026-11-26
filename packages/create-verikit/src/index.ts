#!/usr/bin/env node
import { createEnvironment, main, packageRootFrom } from "./cli.js";

process.exitCode = await main(
  createEnvironment(packageRootFrom(import.meta.url)),
);
