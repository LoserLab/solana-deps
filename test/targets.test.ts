import { describe, it, expect } from "vitest";
import { findTargets, matchesTarget, targets } from "../src/targets";

describe("targets", () => {
  it("has targets defined", () => {
    expect(targets.length).toBeGreaterThan(0);
  });

  it("matches exact package names", () => {
    const matched = findTargets("@solana/web3.js");
    expect(matched.length).toBe(1);
    expect(matched[0].package).toBe("@solana/web3.js");
  });

  it("matches scoped wildcard patterns", () => {
    const serum = targets.find((t) => t.package === "@project-serum/anchor");
    expect(serum).toBeDefined();
    expect(matchesTarget("@project-serum/anchor", serum!)).toBe(true);
  });

  it("does not match unrelated packages", () => {
    const matched = findTargets("react");
    expect(matched).toHaveLength(0);
  });

  it("does not match v2 packages", () => {
    const matched = findTargets("@solana/kit");
    expect(matched).toHaveLength(0);
  });
});
