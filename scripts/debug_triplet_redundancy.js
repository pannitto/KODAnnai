const fs = require("fs");
const path = require("path");
const filePath = path.join(__dirname, "../lib/route-finder.ts");
const src = fs.readFileSync(filePath, "utf8");

function extractArrayByMarker(src, marker) {
  const idx = src.indexOf(marker);
  if (idx < 0) throw new Error("Marker not found: " + marker);
  const eqIdx = src.indexOf("=", idx);
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
  throw new Error("Array not closed");
}

const edges = Function(
  "return " + extractArrayByMarker(src, "const GRAPH_EDGES"),
)();
const edgeMap = new Map(edges.map((e) => [`${e.from}-${e.to}`, e]));

function debug(p, c, n) {
  const pToC = edgeMap.get(`${p}-${c}`);
  const cToN = edgeMap.get(`${c}-${n}`);
  const pToN = edgeMap.get(`${p}-${n}`);
  const viaCost = pToC.distance + cToN.distance;
  const directCost = pToN.distance;
  const directOutdoor = Boolean(pToN.outdoor);
  const directStairs = Boolean(pToN.hasStairs);
  const viaOutdoor = Boolean(pToC.outdoor) || Boolean(cToN.outdoor);
  const viaStairs = Boolean(pToC.hasStairs) || Boolean(cToN.hasStairs);
  const outdoorMatch = viaOutdoor === directOutdoor;
  const stairsMatch = viaStairs === directStairs;
  const redundant = viaCost >= directCost && outdoorMatch && stairsMatch;
  console.log({
    pToC,
    cToN,
    pToN,
    viaCost,
    directCost,
    outdoorMatch,
    stairsMatch,
    redundant,
  });
}

debug(268, 66, 269);
debug(267, 65, 268);
