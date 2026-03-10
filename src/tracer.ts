import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { findTargets, type Target } from "./targets";

/**
 * A single path through the dependency tree that leads to a legacy package.
 * e.g., ["my-app", "@coral-xyz/anchor", "@solana/web3.js"]
 */
export type DepChain = string[];

export interface TraceResult {
  /** The legacy package found */
  target: Target;
  /** All dependency chains leading to this package */
  chains: DepChain[];
  /** Whether any chain is a direct dependency (length === 2) */
  isDirect: boolean;
}

export interface ScanResult {
  version: string;
  traces: TraceResult[];
  totalDeps: number;
  directDeps: number;
  /** Packages that pull in the most legacy deps (sorted by count) */
  hotspots: Array<{ package: string; legacyDeps: string[] }>;
}

interface LockPackage {
  version?: string;
  dependencies?: Record<string, string>;
  requires?: Record<string, string>;
}

interface NpmLockV3 {
  packages?: Record<string, LockPackage>;
}

/**
 * Parse package-lock.json (v2/v3 format) into an adjacency list.
 * Returns a map of package name -> list of direct dependency names.
 */
function parseLockFile(targetDir: string): {
  adjacency: Map<string, string[]>;
  allPackages: Set<string>;
} {
  const adjacency = new Map<string, string[]>();
  const allPackages = new Set<string>();

  const lockPath = join(targetDir, "package-lock.json");
  if (!existsSync(lockPath)) {
    return { adjacency, allPackages };
  }

  const lock: NpmLockV3 = JSON.parse(readFileSync(lockPath, "utf8"));
  const packages = lock.packages ?? {};

  for (const [key, value] of Object.entries(packages)) {
    const name = key === "" ? "__root__" : extractPackageName(key);
    allPackages.add(name);

    const deps = {
      ...value.dependencies,
      ...value.requires,
    };

    if (deps && Object.keys(deps).length > 0) {
      adjacency.set(name, Object.keys(deps));
    }
  }

  return { adjacency, allPackages };
}

/**
 * Extract a clean package name from a node_modules path.
 * "node_modules/@solana/web3.js" -> "@solana/web3.js"
 * "node_modules/foo/node_modules/bar" -> "bar" (deepest)
 */
function extractPackageName(lockKey: string): string {
  const parts = lockKey.split("node_modules/");
  return parts[parts.length - 1];
}

/**
 * Read direct dependencies from package.json.
 */
function readDirectDeps(targetDir: string): {
  all: Record<string, string>;
  count: number;
} {
  const pkgPath = join(targetDir, "package.json");
  if (!existsSync(pkgPath)) {
    throw new Error(`No package.json found in ${targetDir}`);
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const deps = pkg.dependencies ?? {};
  const devDeps = pkg.devDependencies ?? {};
  return {
    all: { ...deps, ...devDeps },
    count: Object.keys(deps).length + Object.keys(devDeps).length,
  };
}

/**
 * BFS to find all paths from root to a target package.
 * Caps at MAX_PATHS to avoid blowup on huge trees.
 */
function findChains(
  adjacency: Map<string, string[]>,
  rootDeps: string[],
  targetName: string,
  maxPaths = 10,
): DepChain[] {
  const chains: DepChain[] = [];

  // BFS with path tracking
  const queue: DepChain[] = rootDeps.map((dep) => ["(root)", dep]);
  const visited = new Set<string>();

  while (queue.length > 0 && chains.length < maxPaths) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (current === targetName) {
      chains.push(path);
      continue;
    }

    // Prevent cycles
    const pathKey = path.join(" > ");
    if (visited.has(pathKey)) continue;
    visited.add(pathKey);

    // Don't recurse deeper than 8 levels
    if (path.length >= 8) continue;

    const children = adjacency.get(current) ?? [];
    for (const child of children) {
      if (!path.includes(child)) {
        queue.push([...path, child]);
      }
    }
  }

  return chains;
}

/**
 * Trace all legacy Solana packages in a project's dependency tree.
 */
export function trace(targetDir: string): ScanResult {
  const direct = readDirectDeps(targetDir);
  const { adjacency, allPackages } = parseLockFile(targetDir);
  const rootDeps = Object.keys(direct.all);

  // Find all legacy packages present in the tree
  const traceMap = new Map<string, TraceResult>();

  for (const pkgName of allPackages) {
    const matched = findTargets(pkgName);
    if (matched.length === 0) continue;

    for (const target of matched) {
      const key = target.package;
      if (traceMap.has(key)) continue;

      const chains = findChains(adjacency, rootDeps, pkgName);
      const isDirect = pkgName in direct.all;

      // If direct but no chains found from lock, synthesize one
      if (isDirect && chains.length === 0) {
        chains.push(["(root)", pkgName]);
      }

      if (chains.length > 0 || isDirect) {
        traceMap.set(key, { target, chains, isDirect });
      }
    }
  }

  // Build hotspot analysis: which packages are responsible for pulling in legacy deps
  const pullMap = new Map<string, Set<string>>();

  for (const [, tr] of traceMap) {
    for (const chain of tr.chains) {
      // The "culprit" is the first package after root (direct dep that pulls it in)
      if (chain.length >= 3) {
        const culprit = chain[1];
        if (!pullMap.has(culprit)) pullMap.set(culprit, new Set());
        pullMap.get(culprit)!.add(chain[chain.length - 1]);
      }
    }
  }

  const hotspots = Array.from(pullMap.entries())
    .map(([pkg, deps]) => ({ package: pkg, legacyDeps: Array.from(deps) }))
    .sort((a, b) => b.legacyDeps.length - a.legacyDeps.length);

  return {
    version: "0.1.0",
    traces: Array.from(traceMap.values()),
    totalDeps: allPackages.size,
    directDeps: direct.count,
    hotspots,
  };
}
