const fs = require('fs');
const path = require('path');

const targetDirs = [path.join(__dirname, '../app'), path.join(__dirname, '../components')];

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

targetDirs.forEach(targetDir => {
    walkDir(targetDir, function(filePath) {
        if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;

        // Only replace specific known variables holding itineraries to avoid breaking internal maps
        const vars = ['itin', 'i', 't', 'c', 'curr', 'selectedItin', 'doc', 'data'];
        
        vars.forEach(v => {
            const regexTotal = new RegExp(`\\b${v}\\.totalPrice\\b`, 'g');
            const regexPP = new RegExp(`\\b${v}\\.perPersonPrice\\b`, 'g');
            
            content = content.replace(regexTotal, `(${v}.plans?.find((p:any) => p.planId === ${v}.selectedPlanId)?.totalPrice || ${v}.plans?.[0]?.totalPrice || 0)`);
            content = content.replace(regexPP, `(${v}.plans?.find((p:any) => p.planId === ${v}.selectedPlanId)?.perPersonPrice || ${v}.plans?.[0]?.perPersonPrice || 0)`);
        });

        if (content !== original) {
            console.log("Updated: " + filePath);
            fs.writeFileSync(filePath, content, 'utf8');
        }
    });
});
