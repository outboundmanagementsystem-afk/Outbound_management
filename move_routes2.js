const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'app', '(dashboard)');
const destDir = path.join(__dirname, 'app');

if (!fs.existsSync(srcDir)) {
    console.log('No (dashboard) dir found.');
    process.exit(0);
}

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach(function(childItemName) {
            if (childItemName === 'layout.tsx' && dest === destDir) {
                // skip top level layout.tsx
                return;
            }
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.renameSync(src, dest);
        console.log(`Moved ${src} -> ${dest}`);
    }
}

copyRecursiveSync(srcDir, destDir);
console.log('Done moving routes!');
