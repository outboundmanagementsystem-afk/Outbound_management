const fs = require('fs');
let c = fs.readFileSync('app/(dashboard)/admin/page.tsx', 'utf8');
c = c.replace(/\\`/g, '`');
fs.writeFileSync('app/(dashboard)/admin/page.tsx', c, 'utf8');
console.log('Fixed syntax error in page.tsx');