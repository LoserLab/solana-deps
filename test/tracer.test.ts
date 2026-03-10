import { describe, it, expect } from "vitest";
import { trace } from "../src/tracer";
import { join } from "path";

const fixturesDir = join(__dirname, "fixtures");

describe("tracer", () => {
  it("reports no legacy packages for clean project", () => {
    const result = trace(join(fixturesDir, "clean"));
    expect(result.traces).toHaveLength(0);
    expect(result.totalDeps).toBeGreaterThan(0);
  });

  it("detects direct v1 dependencies", () => {
    const result = trace(join(fixturesDir, "v1-direct"));

    const web3 = result.traces.find((t) => t.target.package === "@solana/web3.js");
    expect(web3).toBeDefined();
    expect(web3!.isDirect).toBe(true);

    const serum = result.traces.find((t) => t.target.package === "@project-serum/anchor");
    expect(serum).toBeDefined();
    expect(serum!.isDirect).toBe(true);
  });

  it("detects transitive v1 dependencies", () => {
    const result = trace(join(fixturesDir, "v1-transitive"));

    const web3 = result.traces.find((t) => t.target.package === "@solana/web3.js");
    expect(web3).toBeDefined();
    expect(web3!.isDirect).toBe(false);
    expect(web3!.chains.length).toBeGreaterThan(0);

    // Chain should show: (root) > @coral-xyz/anchor > @solana/web3.js
    const chain = web3!.chains[0];
    expect(chain).toContain("@coral-xyz/anchor");
    expect(chain[chain.length - 1]).toBe("@solana/web3.js");
  });

  it("traces deep dependency chains", () => {
    const result = trace(join(fixturesDir, "v1-deep"));

    const metaplex = result.traces.find(
      (t) => t.target.package === "@metaplex-foundation/js",
    );
    expect(metaplex).toBeDefined();
    expect(metaplex!.isDirect).toBe(true);

    // Should also find transitive web3.js, bigint-buffer, etc.
    const web3 = result.traces.find((t) => t.target.package === "@solana/web3.js");
    expect(web3).toBeDefined();

    const bigint = result.traces.find((t) => t.target.package === "bigint-buffer");
    expect(bigint).toBeDefined();
  });

  it("identifies hotspots correctly", () => {
    const result = trace(join(fixturesDir, "v1-deep"));
    expect(result.hotspots.length).toBeGreaterThan(0);

    // @metaplex-foundation/js should be a hotspot since it pulls in multiple legacy deps
    const metaplexHotspot = result.hotspots.find(
      (h) => h.package === "@metaplex-foundation/js",
    );
    expect(metaplexHotspot).toBeDefined();
    expect(metaplexHotspot!.legacyDeps.length).toBeGreaterThanOrEqual(1);
  });

  it("throws for missing package.json", () => {
    expect(() => trace("/nonexistent/path")).toThrow("No package.json found");
  });
});
