const fs = require('fs');
const content = fs.readFileSync('lib/firestore.ts', 'utf8');

let newContent = content.replace(
    /export async function initSopChecklist\([\s\S]*?async function getItinSub/g,
    (match) => {
        return match
            .replace(/for \(const sop of sops\) {/g, 'let orderIndex = 0;\n    for (const sop of sops) {')
            .replace(/const originalId = isObj \? \(item\.id \|\| ''\) : '';/g, 'const originalId = isObj ? (item.id || "") : "";\n            const options = isObj ? (item.options || []) : [];\n            const order = orderIndex++;')
            .replace(/expectedItems\.push\({[\s\S]*?}\);/g, 'expectedItems.push({\n                name, type, isRequired, requiresAcknowledgement, notes, points, extraInfo, dependsOn, originalId, options, order\n            });')
            .replace(/await addItinSub\(itinId, "[^"]+", {[\s\S]*?dependsOn,/g, (m) => m + '\n                originalId,\n                options,\n                order,')
            .replace(/match\.originalId !== exp\.originalId;/g, 'match.originalId !== exp.originalId ||\n                JSON.stringify(match.options || []) !== JSON.stringify(exp.options || []) ||\n                match.order !== exp.order;');
    }
);

fs.writeFileSync('lib/firestore.ts', newContent, 'utf8');
console.log('Modified firestore.ts');
