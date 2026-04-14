const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app/(dashboard)/admin/sops/page.tsx');
let code = fs.readFileSync(file, 'utf8');

// Imports
if (!code.includes('DragDropContext')) {
    code = code.replace(
        'import { Plus, Trash2',
        'import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"\nimport { GripHorizontal, Plus, Trash2'
    );
}

// Add isMounted to SOPsContent
if (!code.includes('const [isMounted, setIsMounted] = useState(false)')) {
    code = code.replace(
        'const [formWhatsapp, setFormWhatsapp] = useState("")',
        'const [formWhatsapp, setFormWhatsapp] = useState("")\n    const [isMounted, setIsMounted] = useState(false)\n    useEffect(() => { setIsMounted(true) }, [])'
    );
}

// Add onDragEnd
if (!code.includes('const onDragEnd')) {
    const onDragEndCode = `
    const onDragEnd = (result: any) => {
        if (!result.destination) return;
        const newItems = Array.from(formItems);
        const [movedItem] = newItems.splice(result.source.index, 1);
        newItems.splice(result.destination.index, 0, movedItem);
        setFormItems(newItems);
    }
    `;
    code = code.replace('const addFormItem = () =>', onDragEndCode + '\n    const addFormItem = () =>');
}

// Replace the Process Steps rendering
const searchStr = `                            <div className="space-y-3">
                                {formItems.map((item, idx) => (
                                    <div key={item.id} className="rounded-xl p-4" style={{ border: '1px solid rgba(5,34,16,0.08)', background: 'rgba(5,34,16,0.01)' }}>`;

const replaceStr = `                            {isMounted && (
                                <DragDropContext onDragEnd={onDragEnd}>
                                    <Droppable droppableId="builder-steps">
                                        {(provided) => (
                                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                                {formItems.map((item, idx) => (
                                                    <Draggable key={item.id || \`step-\${idx}\`} draggableId={item.id || \`step-\${idx}\`} index={idx}>
                                                        {(provided) => (
                                                            <div 
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                className="rounded-xl p-5 pt-8 bg-white relative group border transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/50" 
                                                                style={{ borderColor: 'rgba(5,34,16,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}
                                                            >
                                                                <div 
                                                                    {...provided.dragHandleProps} 
                                                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-emerald-50/80 rounded-b-lg transition-colors border-b border-x"
                                                                    style={{ borderColor: 'rgba(5,34,16,0.04)' }}
                                                                >
                                                                    <GripHorizontal className="w-4 h-4 text-emerald-900/30" />
                                                                </div>`;

code = code.replace(searchStr, replaceStr);

// Now patch the end of the FormBuilder map
const searchEndStr = `                                            {formItems.length > 1 && (
                                                <button onClick={() => removeFormItem(idx)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50">
                                                    <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>`;

const replaceEndStr = `                                            {formItems.length > 1 && (
                                                <button onClick={() => removeFormItem(idx)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50">
                                                    <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                                                </button>
                                            )}
                                        </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                            )}`;

code = code.replace(searchEndStr, replaceEndStr);

fs.writeFileSync(file, code);
console.log('Successfully injected Drag and Drop into Modal Builder!');
