const fs = require('fs');
const path = require('path');

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      walk(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      let c = fs.readFileSync(p, 'utf8');
      // Replace Ð{ back to ${ (corrupted template literals)
      let nc = c.split('\u00D0{').join('${');
      // Replace Ð1 back to $1 (corrupted regex replacements)
      nc = nc.split('\u00D01').join('$1');
      if (c !== nc) {
        fs.writeFileSync(p, nc, 'utf8');
        console.log('Fixed:', p);
      }
    }
  });
}

walk('app');
walk('components');
walk('lib');
console.log('Done.');
