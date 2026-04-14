const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'app/(dashboard)/admin/sops/page.tsx');
let content = fs.readFileSync(pageFile, 'utf8');

// The line is: <Draggable key={item.id || idx.toString()} draggableId={item.id || idx.toString()} index={idx}>
content = content.replace(
    /<Draggable key=\{item\.id \|\| idx\.toString\(\)\} draggableId=\{item\.id \|\| idx\.toString\(\)\} index=\{idx\}>/g,
    `<Draggable key={item.id || \`\${sop.id}-\${idx}\`} draggableId={item.id || \`\${sop.id}-\${idx}\`} index={idx}>`
);

fs.writeFileSync(pageFile, content);
console.log('Fixed draggableIds in sops page.tsx');
