#!/usr/bin/env node
/* Collects the static app into dist/ for the native wrappers.
   Cross-platform on purpose: the Windows CI runner has no `sh`. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
const items = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'vendor', 'icons'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const item of items) {
  const from = path.join(root, item);
  const to = path.join(out, item);
  if (!fs.existsSync(from)) { console.warn('missing', item); continue; }
  fs.cpSync(from, to, { recursive: true });
}

let bytes = 0;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) walk(p); else bytes += fs.statSync(p).size;
});
walk(out);
console.log(`dist/ ready: ${(bytes / 1024).toFixed(0)} KB`);
