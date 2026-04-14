const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app/(dashboard)/admin/sops/page.tsx');
let code = fs.readFileSync(file, 'utf8');

// Inject onListDragEnd
if (!code.includes('const onListDragEnd')) {
    const onListDragEndCode = `
    const onListDragEnd = async (result: any) => {
        if (!result.destination) return;
        
        const [sopId] = result.source.droppableId.split('||');
        const sopIndex = sops.findIndex(s => s.id === sopId);
        if (sopIndex === -1) return;
        
        const sop = sops[sopIndex];
        const newItems = Array.from(sop.items || []);
        const [movedItem] = newItems.splice(result.source.index, 1);
        newItems.splice(result.destination.index, 0, movedItem);
        
        const newSops = [...sops];
        newSops[sopIndex] = { ...sop, items: newItems };
        setSOPs(newSops);
        
        try {
            await updateSOP(sop.id, { items: newItems });
        } catch (e) {
            console.error(e);
        }
    }
    `;
    code = code.replace('const handleSave = async', onListDragEndCode + '\n    const handleSave = async');
}

// 1. Wrap the entire mapped list in a conditionally rendered DragDropContext
const rootReplaceSearch = `            ) : (
                <div className="space-y-4">
                    {filtered.map((sop: any) => (`;

const rootReplaceValue = `            ) : !isMounted ? null : (
                <DragDropContext onDragEnd={onListDragEnd}>
                    <div className="space-y-4">
                        {filtered.map((sop: any) => (`;

code = code.replace(rootReplaceSearch, rootReplaceValue);

// Close DragDropContext
const rootCloseSearch = `                            )}
                        </div>
                    ))}
                </div>
            )}`;

const rootCloseValue = `                            )}
                        </div>
                    ))}
                </div>
                </DragDropContext>
            )}`;

code = code.replace(rootCloseSearch, rootCloseValue);

// 2. Add Droppable around the checklist inside each SOP
const dropSearch = `                            <div className="space-y-2">
                                {(sop.items || []).map((item: any, idx: number) => {`;

const dropValue = `                            <Droppable droppableId={\`\${sop.id}||items\`}>
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                        {(sop.items || []).map((item: any, idx: number) => {`;
                                        
code = code.replace(dropSearch, dropValue);

// Close Droppable 
const dropCloseSearch = `                                        </div>
                                    )
                                })}
                            </div>`;

const dropCloseValue = `                                        </div>
                                                    )}
                                                </Draggable>
                                            )
                                        })}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>`;

code = code.replace(dropCloseSearch, dropCloseValue);

// 3. Make each checklist item Draggable
const dragSearch = `                                    return (
                                        <div key={idx} className="flex items-center gap-3 py-2.5 px-4 rounded-xl" style={{ background: 'rgba(5,34,16,0.02)' }}>
                                            <div className="w-4 h-4 rounded border-2 flex-shrink-0" style={{ borderColor: 'rgba(5,34,16,0.2)' }} />`;

const dragValue = `                                    return (
                                        <Draggable key={item.id || \`\${sop.id}-\${idx}\`} draggableId={item.id || \`\${sop.id}-\${idx}\`} index={idx}>
                                            {(provided) => (
                                                <div 
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className="flex items-start gap-3 py-3 px-4 rounded-xl group" 
                                                    style={{ background: 'rgba(5,34,16,0.02)' }}
                                                >
                                                    <div {...provided.dragHandleProps} className="mt-0.5 text-gray-300 hover:text-gray-500 transition-colors cursor-grab active:cursor-grabbing">
                                                        <GripVertical className="w-4 h-4" />
                                                    </div>
                                                    <div className="w-4 h-4 rounded border-2 flex-shrink-0" style={{ borderColor: 'rgba(5,34,16,0.2)' }} />`;

code = code.replace(dragSearch, dragValue);

// Add missing GripVertical import if it doesn't have it
if (!code.includes('GripVertical')) {
    code = code.replace('GripHorizontal, Plus,', 'GripHorizontal, GripVertical, Plus,');
}

fs.writeFileSync(file, code);
console.log('Done!');
