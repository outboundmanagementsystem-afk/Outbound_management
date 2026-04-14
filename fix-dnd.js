const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app/(dashboard)/admin/sops/page.tsx');
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('isMounted')) {
    const search = `    const [formWhatsapp, setFormWhatsapp] = useState("")

    useEffect(() => { loadSOPs() }, [])`;
    const replace = `    const [formWhatsapp, setFormWhatsapp] = useState("")
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => { 
        setIsMounted(true);
        loadSOPs() 
    }, [])`;
    code = code.replace(search, replace);
}

// Modify the DragDropContext conditionally if possible, or just wrap the Droppable
// Wait, we can just replace the DragDropContext block:
const dndSearch = `<DragDropContext onDragEnd={(res) => onDragEnd(res, sop.id)}>`;
const dndReplace = `{isMounted && <DragDropContext onDragEnd={(res) => onDragEnd(res, sop.id)}>`;
code = code.replace(new RegExp(dndSearch, 'g'), dndReplace);

const endDndSearch = `</DragDropContext>`;
const endDndReplace = `</DragDropContext>}`;
code = code.replace(new RegExp(endDndSearch, 'g'), endDndReplace);

fs.writeFileSync(file, code);
console.log('Fixed drag and drop strict mode issue');
