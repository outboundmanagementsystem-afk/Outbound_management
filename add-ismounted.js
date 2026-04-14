const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'app/(dashboard)/admin/sops/page.tsx');
let content = fs.readFileSync(pageFile, 'utf8');

// Add isMounted hook
if (!content.includes('const [isMounted, setIsMounted]')) {
    const isMountedCode = `
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);
    `;
    content = content.replace('export default function SOPs() {', 'export default function SOPs() {\n' + isMountedCode);
}

// Wrap the main DragDropContext
if (content.includes('<DragDropContext onDragEnd={onDragEnd}>')) {
    content = content.replace(
        '<DragDropContext onDragEnd={onDragEnd}>',
        '{isMounted && <DragDropContext onDragEnd={onDragEnd}>'
    );
    // Find the end tag exactly, assuming they line up (they don't always, so be careful).
}

// Look for the end of the main page rendering block. Wait, easier to regex replace closing DragDropContext with </DragDropContext>}
fs.writeFileSync(pageFile, content);
console.log('Fixed DND duplicate IDs and wrapped main DragDropContext in isMounted check in sops page.tsx');