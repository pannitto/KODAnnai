// Usage: node scripts/generate_triplets.js
// Reads GRAPH_EDGES and existing triplets from route-finder.ts,
// preserves filled texts/images where possible,
// generates all valid (previous, current, next) combinations,
// and replaces the NODE_TRIPLETS block in-place.

const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../lib/route-finder.ts");
const src = fs.readFileSync(filePath, "utf8");

function extractArrayByMarker(src, marker) {
  const idx = src.indexOf(marker);
  if (idx < 0) throw new Error("Marker not found: " + marker);
  const eqIdx = src.indexOf("=", idx);
  if (eqIdx < 0) throw new Error("Assignment not found for marker: " + marker);
  const start = src.indexOf("[", eqIdx);
  let depth = 0,
    inStr = false,
    q = "";
  for (let i = start; i < src.length; i++) {
    const c = src[i],
      prev = src[i - 1];
    if (inStr) {
      if (c === q && prev !== "\\") inStr = false;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inStr = true;
      q = c;
      continue;
    }
    if (c === "[") depth++;
    if (c === "]") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error("Array not closed for marker: " + marker);
}

const edges = Function(
  "return " + extractArrayByMarker(src, "const GRAPH_EDGES"),
)();
const existingTriplets = Function(
  "return " + extractArrayByMarker(src, "const NODE_TRIPLETS"),
)();

// Build edge map for quick lookup: key="from-to", value=edge
const edgeMap = new Map();
for (const e of edges) {
  edgeMap.set(`${e.from}-${e.to}`, e);
}

const FORCE_EXCLUDED_TRIPLETS = new Set([
  "267-65-268",
  "268-65-267",
  "268-66-269",
  "269-66-268",
  "276-70-277",
  "277-70-276",
  "277-71-278",
  "278-71-277",
]);

const existing = new Set(
  existingTriplets.map((t) => `${t.previous}-${t.current}-${t.next}`),
);

const incoming = new Map();
const outgoing = new Map();
for (const e of edges) {
  if (!outgoing.has(e.from)) outgoing.set(e.from, new Set());
  if (!incoming.has(e.to)) incoming.set(e.to, new Set());
  outgoing.get(e.from).add(e.to);
  incoming.get(e.to).add(e.from);
}

function isRedundantTriplet(p, c, n) {
  if (FORCE_EXCLUDED_TRIPLETS.has(`${p}-${c}-${n}`)) return true;

  const pToC = edgeMap.get(`${p}-${c}`);
  const cToN = edgeMap.get(`${c}-${n}`);
  const pToN = edgeMap.get(`${p}-${n}`);

  if (!(pToC && cToN && pToN)) return false;

  const viaCost = pToC.distance + cToN.distance;
  const directCost = pToN.distance;
  const directOutdoor = Boolean(pToN.outdoor);
  const directStairs = Boolean(pToN.hasStairs);
  const viaOutdoor = Boolean(pToC.outdoor) || Boolean(cToN.outdoor);
  const viaStairs = Boolean(pToC.hasStairs) || Boolean(cToN.hasStairs);
  const outdoorMatch = viaOutdoor === directOutdoor;
  const stairsMatch = viaStairs === directStairs;

  return viaCost >= directCost && outdoorMatch && stairsMatch;
}

const preserved = existingTriplets.filter(
  (t) => !isRedundantTriplet(t.previous, t.current, t.next),
);
const preservedKeys = new Set(
  preserved.map((t) => `${t.previous}-${t.current}-${t.next}`),
);

const currentNodes = [
  ...new Set([...incoming.keys(), ...outgoing.keys()]),
].sort((a, b) => a - b);
const generated = [];
for (const c of currentNodes) {
  const prev = [...(incoming.get(c) || [])].sort((a, b) => a - b);
  const next = [...(outgoing.get(c) || [])].sort((a, b) => a - b);
  for (const p of prev) {
    for (const n of next) {
      if (p === n) continue;
      const k = `${p}-${c}-${n}`;
      if (preservedKeys.has(k)) continue;
      if (isRedundantTriplet(p, c, n)) continue;

      generated.push({
        previous: p,
        current: c,
        next: n,
        prev_name: "",
        curr_name: "",
        next_name: "",
        image: `${p}-${c}-${n}.webp`,
      });
    }
  }
}

const all = [...preserved, ...generated].sort(
  (a, b) =>
    a.current - b.current ||
    (a.previous ?? -1) - (b.previous ?? -1) ||
    (a.next ?? -1) - (b.next ?? -1),
);

console.log(
  `preserved: ${preserved.length}, generated: ${generated.length}, total: ${all.length}`,
);

const body = all
  .map(
    (t) =>
      `  {\n    previous: ${t.previous},\n    current: ${t.current},\n    next: ${t.next},\n    prev_name: ${JSON.stringify(t.prev_name ?? "")},\n    curr_name: ${JSON.stringify(t.curr_name ?? "")},\n    next_name: ${JSON.stringify(t.next_name ?? "")},\n    image: ${JSON.stringify(t.image ?? "")},\n  },`,
  )
  .join("\n");

const newBlock = `const NODE_TRIPLETS: NodeTriplet[] = [\n${body}\n];`;

// Find and replace from MANUAL_NODE_TRIPLETS through NODE_TRIPLETS (everything before Dijkstra)
const startMarker = "// Triplet definitions for node names and descriptions";
const endMarker = "// Dijkstra's algorithm for shortest path";

const startIdx = src.indexOf(startMarker);
const endIdx = src.indexOf(endMarker);

if (startIdx < 0 || endIdx < 0) {
  throw new Error("Could not find markers for replacement block");
}

const newSrc =
  src.slice(0, startIdx) +
  "// Triplet definitions for node names and descriptions\n" +
  newBlock +
  "\n\n" +
  src.slice(endIdx);

fs.writeFileSync(filePath, newSrc, "utf8");
console.log("Done! route-finder.ts updated.");
