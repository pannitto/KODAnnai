const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app', 'locations-server.tsx');
const src = fs.readFileSync(file, 'utf8');

const idRe = /id:\s*"([^"]+)"/g;
const nameRe = /name:\s*"([^"]*)"/g;
const categoryRe = /category:\s*"([^"]*)"/g;

function collect(re) {
  const arr = [];
  let m;
  while ((m = re.exec(src))) arr.push(m[1]);
  return arr;
}

const ids = collect(idRe);
// Note: `locid` can be shared by multiple locations (same room/different企画),
// so we do not treat duplicate `locid` as an error. We only collect `locid`
// for informational purposes if needed in future.
// const locidRe = /locid:\s*"([^"]+)"/g;
const names = collect(nameRe);
const categories = collect(categoryRe);

function findDuplicates(arr) {
  const map = Object.create(null);
  arr.forEach((v) => (map[v] = (map[v] || 0) + 1));
  return Object.entries(map).filter(([, c]) => c > 1).map(([v, c]) => ({ value: v, count: c }));
}

const dupIds = findDuplicates(ids);
const emptyNames = names.map((v, i) => ({ index: i + 1, value: v })).filter((o) => o.value === "");
const emptyCategories = categories.map((v, i) => ({ index: i + 1, value: v })).filter((o) => o.value === "");

const result = {
  totalObjects: ids.length,
  duplicateIds: dupIds,
  duplicateLocids: dupLocids,
  emptyNamesCount: emptyNames.length,
  emptyCategoriesCount: emptyCategories.length,
  sampleEmptyNames: emptyNames.slice(0, 10),
  sampleEmptyCategories: emptyCategories.slice(0, 10),
};

console.log(JSON.stringify(result, null, 2));

if (dupIds.length || dupLocids.length || emptyNames.length || emptyCategories.length) {
  console.error('Issues found in locations-server.tsx');
  process.exitCode = 2;
} else {
  console.log('No obvious issues found');
}
