const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app', 'locations-server.tsx');
const src = fs.readFileSync(file, 'utf8');

const idRe = /id:\s*"([^"]+)"/g;

const counts = Object.create(null);
let match;
let index = 0;
let out = '';
let lastIndex = 0;

while ((match = idRe.exec(src))) {
  const id = match[1];
  index += 1;
  counts[id] = (counts[id] || 0) + 1;
  const occ = counts[id];

  out += src.slice(lastIndex, match.index);
  if (occ === 1) {
    // keep first occurrence
    out += match[0];
  } else {
    // replace duplicate id with id_<occ>
    const newId = `${id}_${occ}`;
    const replaced = `id: "${newId}"`;
    out += replaced;
  }
  lastIndex = match.index + match[0].length;
}

out += src.slice(lastIndex);

const bak = file + '.bak.' + Date.now();
fs.copyFileSync(file, bak);
fs.writeFileSync(file, out, 'utf8');
console.log('Wrote', file);
console.log('Backup saved to', bak);
