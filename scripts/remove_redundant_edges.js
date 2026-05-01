// Usage: node scripts/remove_redundant_edges.js
// Detects and removes redundant edges in triangles (A-B-C where A-C is shorter and has same properties)

const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../lib/route-finder.ts");
const src = fs.readFileSync(filePath, "utf8");

function extractArrayByMarker(src, marker) {
  const idx = src.indexOf(marker);
  if (idx < 0) throw new Error("Marker not found: " + marker);
  const start = src.indexOf("[", idx);
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

// Build edge maps for quick lookup
const edgeMap = new Map();
for (const e of edges) {
  const key = `${e.from}-${e.to}`;
  edgeMap.set(key, e);
}

// Find triangles and check redundancy
const redundant = [];
for (const edge of edges) {
  const a = edge.from,
    b = edge.to;

  // Find all nodes C such that B-C exists
  for (const edge2 of edges) {
    if (edge2.from !== b) continue;
    const c = edge2.to;

    // Check if direct A-C edge exists
    const directKey = `${a}-${c}`;
    const directEdge = edgeMap.get(directKey);
    if (!directEdge) continue;

    const costViaBCRoute = edge.distance + edge2.distance;
    const directCost = directEdge.distance;

    // Check if A-B-C is redundant (longer or equal to A-C)
    // AND has same outdoor/stairs properties
    if (costViaBCRoute >= directCost) {
      const outdoorMatch =
        (edge.outdoor || false) === (directEdge.outdoor || false);
      const stairsMatch =
        (edge.hasStairs || false) === (directEdge.hasStairs || false);

      if (outdoorMatch && stairsMatch) {
        redundant.push({
          triangle: `${a}-${b}-${c}`,
          viaRoute: `${a}-${b}: ${edge.distance}, ${b}-${c}: ${edge2.distance} = ${costViaBCRoute}`,
          direct: `${a}-${c}: ${directCost}`,
          redundantEdge: `${a}-${b}`, // could remove this or ${b}-${c}
          reason: `via route (${costViaBCRoute}) >= direct (${directCost}), same properties`,
        });
      }
    }
  }
}

console.log(`Found ${redundant.length} potentially redundant edges:`);
redundant.slice(0, 20).forEach((r) => {
  console.log(`  Triangle ${r.triangle}: ${r.viaRoute} vs ${r.direct}`);
  console.log(`    -> Consider removing: ${r.redundantEdge}`);
});

if (redundant.length > 20) {
  console.log(`  ... and ${redundant.length - 20} more`);
}

// Write report
fs.writeFileSync(
  path.join(__dirname, "../redundant_edges_report.json"),
  JSON.stringify(redundant, null, 2),
);

console.log(`\nFull report saved to redundant_edges_report.json`);
console.log(
  `\nTo remove these edges, review the report and modify GRAPH_EDGES manually.`,
);
