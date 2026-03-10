import type { ScanResult } from "./tracer";

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

export function formatHuman(result: ScanResult, useColor = true): string {
  const c = (color: string, text: string) =>
    useColor ? `${color}${text}${RESET}` : text;

  const lines: string[] = [];

  lines.push(`${c(BOLD, "solana-deps")} v${result.version}`);
  lines.push("");
  lines.push(
    `Scanned ${result.totalDeps} packages (${result.directDeps} direct)`,
  );
  lines.push("");

  if (result.traces.length === 0) {
    lines.push(
      c(GREEN, "  No legacy Solana packages found. Your tree is clean."),
    );
    lines.push("");
    return lines.join("\n");
  }

  // Group: direct first, then transitive
  const direct = result.traces.filter((t) => t.isDirect);
  const transitive = result.traces.filter((t) => !t.isDirect);

  if (direct.length > 0) {
    lines.push(c(BOLD, c(RED, `  Direct dependencies (${direct.length}):`)));
    lines.push("");

    for (const tr of direct) {
      lines.push(`  ${c(BOLD, tr.target.label)}`);
      lines.push(`  ${c(DIM, tr.target.reason)}`);
      lines.push(`  ${c(CYAN, "Migrate to:")} ${tr.target.migrateTo}`);
      if (tr.target.url) {
        lines.push(`  ${c(DIM, tr.target.url)}`);
      }
      lines.push("");
    }
  }

  if (transitive.length > 0) {
    lines.push(
      c(BOLD, c(YELLOW, `  Transitive dependencies (${transitive.length}):`)),
    );
    lines.push("");

    for (const tr of transitive) {
      lines.push(`  ${c(BOLD, tr.target.label)}`);
      lines.push(`  ${c(DIM, tr.target.reason)}`);

      // Show dependency chains
      for (const chain of tr.chains.slice(0, 5)) {
        const arrow = c(DIM, " > ");
        const formatted = chain
          .map((p, i) =>
            i === 0
              ? c(DIM, p)
              : i === chain.length - 1
                ? c(RED, p)
                : p,
          )
          .join(arrow);
        lines.push(`    ${formatted}`);
      }
      if (tr.chains.length > 5) {
        lines.push(
          `    ${c(DIM, `... and ${tr.chains.length - 5} more paths`)}`,
        );
      }

      lines.push(`  ${c(CYAN, "Migrate to:")} ${tr.target.migrateTo}`);
      lines.push("");
    }
  }

  // Hotspot summary
  if (result.hotspots.length > 0) {
    lines.push(c(BOLD, "  Hotspots:"));
    lines.push(
      c(
        DIM,
        "  Packages pulling in the most legacy dependencies:",
      ),
    );
    lines.push("");

    for (const hs of result.hotspots.slice(0, 5)) {
      lines.push(
        `    ${c(BOLD, hs.package)} ${c(DIM, "pulls in")} ${hs.legacyDeps.map((d) => c(RED, d)).join(", ")}`,
      );
    }
    lines.push("");
  }

  const total = result.traces.length;
  lines.push(
    `${total} legacy Solana ${total === 1 ? "package" : "packages"} found (${direct.length} direct, ${transitive.length} transitive)`,
  );
  lines.push("");

  return lines.join("\n");
}

export function formatJson(result: ScanResult): string {
  return JSON.stringify(
    {
      version: result.version,
      traces: result.traces.map((t) => ({
        package: t.target.package,
        label: t.target.label,
        reason: t.target.reason,
        migrateTo: t.target.migrateTo,
        url: t.target.url,
        isDirect: t.isDirect,
        chains: t.chains,
      })),
      hotspots: result.hotspots,
      summary: {
        total: result.traces.length,
        direct: result.traces.filter((t) => t.isDirect).length,
        transitive: result.traces.filter((t) => !t.isDirect).length,
      },
      totalDeps: result.totalDeps,
      directDeps: result.directDeps,
    },
    null,
    2,
  );
}
