const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('app/(dashboard)', function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf-8');
        let updated = false;
        if (content.includes('allowedRoles={')) {
            content = content.replace(/allowedRoles=\{.*?}/g, match => {
                let inside = match;
                if (inside.includes('"ops"')) { inside = inside.replace(/"ops"/g, '"pre_ops"'); updated = true; }
                if (inside.includes('"ops_lead"')) { inside = inside.replace(/"ops_lead"/g, '"pre_ops_lead"'); updated = true; }
                return inside;
            });
        }
        if (updated) {
            fs.writeFileSync(filePath, content);
            console.log("Updated", filePath);
        }
    }
});
