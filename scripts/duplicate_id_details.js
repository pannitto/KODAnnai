const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app', 'locations-server.tsx');
const src = fs.readFileSync(file, 'utf8');

const idRe = /id:\s*"([^"]+)"/g;
const locidRe = /locid:\s*"([^"]+)"/;
const nameRe = /name:\s*"([^"]*)"/;
const organizerRe = /organizer:\s*"([^"]*)"/;

const entries = [];
let m;
while ((m = idRe.exec(src))) {
  const id = m[1];
  const idx = m.index;
  const window = src.slice(idx, idx + 800);
  const locidM = locidRe.exec(window);
  const nameM = nameRe.exec(window);
  const orgM = organizerRe.exec(window);
  const line = src.slice(0, idx).split('\n').length;
  entries.push({ id, locid: locidM ? locidM[1] : null, name: nameM ? nameM[1] : null, organizer: orgM ? orgM[1] : null, line });
}

const map = Object.create(null);
entries.forEach((e) => { map[e.id] = map[e.id] || []; map[e.id].push(e); });

const dup = Object.entries(map).filter(([, arr]) => arr.length > 1).map(([id, arr]) => ({ id, count: arr.length, entries: arr }));

console.log(JSON.stringify({ total: entries.length, duplicates: dup }, null, 2));

if (dup.length === 0) process.exitCode = 0; else process.exitCode = 2;
