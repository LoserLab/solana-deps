import { describe, it, expect } from "vitest";
import { trace } from "../src/tracer";
import { formatHuman, formatJson } from "../src/reporter";
import { join } from "path";

const fixturesDir = join(__dirname, "fixtures");

describe("reporter", () => {
  it("formats clean project as human-readable", () => {
    const result = trace(join(fixturesDir, "clean"));
    const output = formatHuman(result, false);
    expect(output).toContain("No legacy Solana packages found");
  });

  it("formats issues as human-readable", () => {
    const result = trace(join(fixturesDir, "v1-direct"));
    const output = formatHuman(result, false);
    expect(output).toContain("@solana/web3.js");
    expect(output).toContain("Direct dependencies");
    expect(output).toContain("Migrate to:");
  });

  it("shows dependency chains for transitive deps", () => {
    const result = trace(join(fixturesDir, "v1-transitive"));
    const output = formatHuman(result, false);
    expect(output).toContain("Transitive dependencies");
    expect(output).toContain("@coral-xyz/anchor");
  });

  it("formats as JSON", () => {
    const result = trace(join(fixturesDir, "v1-direct"));
    const output = formatJson(result);
    const parsed = JSON.parse(output);
    expect(parsed.version).toBe("0.1.0");
    expect(parsed.traces.length).toBeGreaterThan(0);
    expect(parsed.summary.total).toBeGreaterThan(0);
  });

  it("shows hotspot analysis", () => {
    const result = trace(join(fixturesDir, "v1-deep"));
    const output = formatHuman(result, false);
    expect(output).toContain("Hotspots");
  });
});
