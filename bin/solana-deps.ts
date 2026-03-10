#!/usr/bin/env node
import { cli } from "../src/cli";

cli(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
