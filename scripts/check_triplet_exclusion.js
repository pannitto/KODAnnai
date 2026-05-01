const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(
  path.join(__dirname, "../lib/route-finder.ts"),
  "utf8",
);

function extractArrayByMarker(source, marker) {
  const idx = source.indexOf(marker);
  if (idx < 0) throw new Error("Marker not found: " + marker);
  const eqIdx = source.indexOf("=", idx);
  const start = source.indexOf("[", eqIdx);
  let depth = 0,
    inStr = false,
    q = "";
  for (let i = start; i < source.length; i++) {
    const c = source[i],
      prev = source[i - 1];
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
  throw new Error("Array not closed");
}

const rawTripletsArray = extractArrayByMarker(src, "const NODE_TRIPLETS");
console.log("rawTripletsArray head:", rawTripletsArray.slice(0, 120));
const triplets = Function("return " + rawTripletsArray)();
const target1 = triplets.find(
  (t) => t.previous === 277 && t.current === 71 && t.next === 278,
);
const target2 = triplets.find(
  (t) => t.previous === 278 && t.current === 71 && t.next === 277,
);
console.log("target1 exists:", !!target1, target1);
console.log("target2 exists:", !!target2, target2);

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
console.log("force has 277-71-278:", FORCE_EXCLUDED_TRIPLETS.has("277-71-278"));
console.log("force has 278-71-277:", FORCE_EXCLUDED_TRIPLETS.has("278-71-277"));

const around71 = triplets.filter((t) => t.current == 71).slice(0, 10);
console.log(
  "current==71 count:",
  triplets.filter((t) => t.current == 71).length,
);
console.log("sample current==71:", around71);
if (around71[0]) {
  console.log("types:", {
    previous: typeof around71[0].previous,
    current: typeof around71[0].current,
    next: typeof around71[0].next,
  });
}
