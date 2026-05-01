const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../lib/route-finder.ts");
const src = fs.readFileSync(filePath, "utf8");

function extractArrayByMarker(source, marker) {
  const idx = source.indexOf(marker);
  if (idx < 0) throw new Error(`Marker not found: ${marker}`);
  const eqIdx = source.indexOf("=", idx);
  const start = source.indexOf("[", eqIdx);

  let depth = 0;
  let inStr = false;
  let q = "";

  for (let i = start; i < source.length; i++) {
    const c = source[i];
    const prev = source[i - 1];

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
      if (depth === 0) return source.slice(start, i + 1);
    }
  }

  throw new Error(`Array not closed for marker: ${marker}`);
}

const edges = Function(
  "return " + extractArrayByMarker(src, "const GRAPH_EDGES"),
)();
const triplets = Function(
  "return " + extractArrayByMarker(src, "const NODE_TRIPLETS"),
)();

const edgeMap = new Map(edges.map((e) => [`${e.from}-${e.to}`, e]));

function isRedundantTriplet(p, c, n) {
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

const redundant = triplets.filter((t) =>
  isRedundantTriplet(t.previous, t.current, t.next),
);

console.log(`triplets total: ${triplets.length}`);
console.log(`redundant triplets: ${redundant.length}`);

for (const t of redundant.slice(0, 100)) {
  const pToC = edgeMap.get(`${t.previous}-${t.current}`);
  const cToN = edgeMap.get(`${t.current}-${t.next}`);
  const pToN = edgeMap.get(`${t.previous}-${t.next}`);
  console.log(
    `${t.previous}-${t.current}-${t.next} | via=${pToC.distance + cToN.distance} direct=${pToN.distance}`,
  );
}

if (redundant.length > 100) {
  console.log(`...and ${redundant.length - 100} more`);
}
