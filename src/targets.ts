/**
 * Registry of legacy Solana packages to trace.
 * Each target defines what to look for, why it matters, and what to migrate to.
 */

export interface Target {
  /** npm package name or scope prefix (e.g., "@project-serum/*") */
  package: string;
  /** Human-readable label */
  label: string;
  /** Why this is a problem */
  reason: string;
  /** What to migrate to */
  migrateTo: string;
  /** URL for migration guide */
  url?: string;
}

export const targets: Target[] = [
  {
    package: "@solana/web3.js",
    label: "@solana/web3.js v1",
    reason: "Maintenance-mode. No new features, will stop receiving patches.",
    migrateTo: "@solana/kit (v2)",
    url: "https://www.anza.xyz/blog/solana-web3-js-2-release",
  },
  {
    package: "bigint-buffer",
    label: "bigint-buffer",
    reason: "CVE-2025-3194 buffer overflow. Abandoned native addon.",
    migrateTo: "bigint-buffer-safe (pure JS drop-in)",
  },
  {
    package: "@solana/buffer-layout-utils",
    label: "@solana/buffer-layout-utils",
    reason: "Pulls in bigint-buffer (CVE-2025-3194). Only needed for web3.js v1 patterns.",
    migrateTo: "@solana/codecs (part of Kit v2)",
  },
  {
    package: "@project-serum/anchor",
    label: "@project-serum/anchor",
    reason: "Archived. Project Serum org abandoned after FTX collapse.",
    migrateTo: "@coral-xyz/anchor",
  },
  {
    package: "@project-serum/serum",
    label: "@project-serum/serum",
    reason: "Archived. Serum DEX is defunct.",
    migrateTo: "OpenBook (@openbook-dex/openbook-v2)",
  },
  {
    package: "@project-serum/sol-wallet-adapter",
    label: "@project-serum/sol-wallet-adapter",
    reason: "Archived. Replaced by wallet-adapter standard.",
    migrateTo: "@solana/wallet-adapter-base",
  },
  {
    package: "@solana/spl-token",
    label: "@solana/spl-token (legacy)",
    reason: "Being replaced by @solana-program/token for Kit v2.",
    migrateTo: "@solana-program/token + @solana-program/token-2022",
    url: "https://www.npmjs.com/package/@solana-program/token",
  },
  {
    package: "@metaplex-foundation/js",
    label: "@metaplex-foundation/js",
    reason: "Deprecated. Replaced by Umi framework.",
    migrateTo: "@metaplex-foundation/umi",
    url: "https://github.com/metaplex-foundation/umi",
  },
  {
    package: "@metaplex-foundation/mpl-token-metadata",
    label: "@metaplex-foundation/mpl-token-metadata (legacy)",
    reason: "Old versions depend on deprecated @metaplex-foundation/js.",
    migrateTo: "@metaplex-foundation/mpl-token-metadata (v3+ with Umi)",
  },
  {
    package: "@solana/wallet-adapter-react",
    label: "@solana/wallet-adapter-react",
    reason: "Built on web3.js v1 Connection/Transaction types.",
    migrateTo: "Watch for @solana/connector (Kit v2 wallet standard)",
  },
];

/**
 * Check if a package name matches a target pattern.
 */
export function matchesTarget(depName: string, target: Target): boolean {
  if (target.package.endsWith("/*")) {
    const prefix = target.package.slice(0, -2);
    return depName.startsWith(prefix + "/");
  }
  return depName === target.package;
}

/**
 * Find all targets that match a given package name.
 */
export function findTargets(depName: string): Target[] {
  return targets.filter((t) => matchesTarget(depName, t));
}
