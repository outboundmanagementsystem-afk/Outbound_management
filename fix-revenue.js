const fs = require('fs');
const glob = require('glob'); // we don't have glob, just use a basic recursive readdir
const path = require('path');

function walk(dir, fn) {
  const stat = fs.statSync(dir);
  if (stat.isDirectory()) {
    const list = fs.readdirSync(dir);
    list.forEach(item => walk(path.join(dir, item), fn));
  } else {
    fn(dir);
  }
}

walk('app', (file) => {
  if (!file.endsWith('.tsx')) return;
  let code = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace totalRevenue = allItineraries.reduce(...)
  let newCode = code.replace(
    /const totalRevenue = (.+?)\.reduce\(\(s, i\) => s \+ \(Number\(i\.totalPrice\) \|\| 0\), 0\)/g,
    "const totalRevenue = $1.reduce((s, i) => s + Math.round((Number(i.totalPrice) || 0) * ((Number(i.margin) || 15) / (100 + (Number(i.margin) || 15)))), 0)"
  );
  
  newCode = newCode.replace(
    /const confirmedRevenue = (.+?)\.reduce\(\(s: number, i: any\) => s \+ \(Number\(i\.totalPrice\) \|\| 0\), 0\)/g,
    "const confirmedRevenue = $1.reduce((s: number, i: any) => s + Math.round((Number(i.totalPrice) || 0) * ((Number(i.margin) || 15) / (100 + (Number(i.margin) || 15)))), 0)"
  );

  newCode = newCode.replace(
    /const rev = conf\.reduce\(\(s: number, i: any\) => s \+ \(Number\(i\.totalPrice\) \|\| 0\), 0\)/g,
    "const rev = conf.reduce((s: number, i: any) => s + Math.round((Number(i.totalPrice) || 0) * ((Number(i.margin) || 15) / (100 + (Number(i.margin) || 15)))), 0)"
  );

  newCode = newCode.replace(
    /const revenue = (.+?)\.reduce\(\(.*?, i.*?\) => .*? \+ \(Number\(i\.totalPrice\) \|\| 0\), 0\)/g,
    "const revenue = $1.reduce((s: number, i: any) => s + Math.round((Number(i.totalPrice) || 0) * ((Number(i.margin) || 15) / (100 + (Number(i.margin) || 15)))), 0)"
  );

  newCode = newCode.replace(
    /\.reduce\(\(sum: number, i: any\) => sum \+ \(Number\(i\.totalPrice\) \|\| 0\), 0\)/g,
    ".reduce((sum: number, i: any) => sum + Math.round((Number(i.totalPrice) || 0) * ((Number(i.margin) || 15) / (100 + (Number(i.margin) || 15)))), 0)"
  );

  newCode = newCode.replace(
    /totalRevenue: trips\.reduce\(\(s: number, i: any\) => s \+ \(Number\(i\.totalPrice\) \|\| 0\), 0\)/g,
    "totalRevenue: trips.reduce((s: number, i: any) => s + Math.round((Number(i.totalPrice) || 0) * ((Number(i.margin) || 15) / (100 + (Number(i.margin) || 15)))), 0)"
  );

  if (newCode !== code) {
    fs.writeFileSync(file, newCode, 'utf8');
    console.log('Updated revenues in:', file);
  }
});
