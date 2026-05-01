const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app', 'locations-server.tsx');
const src = fs.readFileSync(file, 'utf8');

// Find the LOCATIONS array content between the first '[' after 'LOCATIONS' and the matching ']'.
const idx = src.indexOf('LOCATIONS');
if (idx === -1) {
  console.error('LOCATIONS not found');
  process.exit(1);
}
const arrStart = src.indexOf('[', idx);
if (arrStart === -1) {
  console.error('Array start not found');
  process.exit(1);
}

let i = arrStart + 1;
let depth = 0;
let objStart = -1;
const objects = [];
for (; i < src.length; i++) {
  const ch = src[i];
  if (ch === '{') {
    if (depth === 0) objStart = i;
    depth++;
  } else if (ch === '}') {
    depth--;
    if (depth === 0 && objStart !== -1) {
      const objText = src.slice(objStart, i + 1);
      // record line number where object starts
      const line = src.slice(0, objStart).split('\n').length;
      objects.push({ text: objText, line });
      objStart = -1;
    }
  }
  // stop when we hit the array end (']') at top-level after objects
  if (depth === 0 && src[i] === ']') break;
}

function extract(re, s) {
  const m = re.exec(s);
  return m ? m[1] : null;
}

const entries = objects.map((o) => {
  const id = extract(/\bid\s*:\s*"([^"]+)"/, o.text);
  const locid = extract(/\blocid\s*:\s*"([^"]+)"/, o.text);
  const name = extract(/\bname\s*:\s*"([^"]*)"/, o.text);
  const organizer = extract(/\borganizer\s*:\s*"([^"]*)"/, o.text);
  return { id, locid, name, organizer, line: o.line };
});

const map = Object.create(null);
entries.forEach((e, idx) => {
  const key = String(e.id || '');
  map[key] = map[key] || [];
  map[key].push(Object.assign({ index: idx + 1 }, e));
});

const duplicates = Object.entries(map).filter(([k, arr]) => k !== '' && arr.length > 1).map(([id, arr]) => ({ id, count: arr.length, entries: arr }));

console.log(JSON.stringify({ total: entries.length, duplicates }, null, 2));

process.exit(duplicates.length ? 2 : 0);
