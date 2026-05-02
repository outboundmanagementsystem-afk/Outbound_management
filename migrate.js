const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'app', '(dashboard)');
const destDir = path.join(__dirname, 'app');

if (!fs.existsSync(srcDir)) {
  console.log('Source directory does not exist:', srcDir);
  process.exit(0);
}

function moveFolderRecursiveSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      moveFolderRecursiveSync(srcPath, destPath);
    } else {
      if (!fs.existsSync(destPath)) {
        fs.renameSync(srcPath, destPath);
        console.log(`Moved file: ${entry.name}`);
      } else {
        console.log(`Skipped existing file: ${destPath}`);
      }
    }
  }
}

const modules = ['admin', 'finance', 'ops', 'post-ops', 'sales'];

for (const mod of modules) {
  const modSrc = path.join(srcDir, mod);
  const modDest = path.join(destDir, mod);

  if (fs.existsSync(modSrc)) {
    const subdirs = fs.readdirSync(modSrc, { withFileTypes: true });
    for (const subdir of subdirs) {
      if (subdir.isDirectory()) {
        const subSrc = path.join(modSrc, subdir.name);
        const subDest = path.join(modDest, subdir.name);
        moveFolderRecursiveSync(subSrc, subDest);
        console.log(`Moved directory: ${mod}/${subdir.name}`);
      }
    }
  }
}

// After moving directories, we can just remove the (dashboard) folder
fs.rmSync(srcDir, { recursive: true, force: true });
console.log('Successfully removed (dashboard) directory');
