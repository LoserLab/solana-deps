import { Command } from "commander";
import { resolve } from "path";
import { trace } from "./tracer";
import { formatHuman, formatJson } from "./reporter";

export function cli(argv: string[]): void {
  const program = new Command();

  program
    .name("solana-deps")
    .description(
      "Trace why legacy Solana packages are in your dependency tree. Find every path pulling in @solana/web3.js v1, deprecated SDKs, and abandoned packages.",
    )
    .version("0.1.0")
    .argument("[path]", "Path to project directory", ".")
    .option("--json", "Output as JSON")
    .option("--direct-only", "Only show direct dependencies")
    .action((targetPath, opts) => {
      const resolvedPath = resolve(targetPath);

      try {
        const result = trace(resolvedPath);

        // Filter if requested
        if (opts.directOnly) {
          result.traces = result.traces.filter((t) => t.isDirect);
          result.hotspots = [];
        }

        if (opts.json) {
          console.log(formatJson(result));
        } else {
          console.log(formatHuman(result));
        }

        // Exit code: 1 if legacy deps found, 0 if clean
        if (result.traces.length > 0) {
          process.exit(1);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${msg}`);
        process.exit(1);
      }
    });

  program.parse(argv);
}
