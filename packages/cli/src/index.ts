#!/usr/bin/env node
import { main } from "./cli.js";

process.exitCode = await main({
  argv: process.argv.slice(2),
  cwd: process.cwd(),
  log: (message) => console.log(message),
  error: (message) => console.error(message),
});
