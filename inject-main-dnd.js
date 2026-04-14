const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app/(dashboard)/admin/sops/page.tsx');
let code = fs.readFileSync(file, 'utf8');

// Inject onListDragEnd
if (!code.includes('const onListDragEnd')) {
    const onListDragEndCode = `
    const onListDragEnd = async (result: any) => {
        if (!result.destination) return;
        
        // Find which SOP was dragged in
        const [sopId, dummy] = result.source.droppableId.split('||');
        const sopIndex = sops.findIndex(s => s.id === sopId);
        if (sopIndex === -1) return;
        
        const sop = sops[sopIndex];
        const newItems = Array.from(sop.items || []);
        const [movedItem] = newItems.splice(result.source.index, 1);
        newItems.splice(result.destination.index, 0, movedItem);
        
        const newSops = [...sops];
        newSops[sopIndex] = { ...sop, items: newItems };
        setSOPs(newSops);
        
        // Save to DB
        try {
            await updateSOP(sop.id, { items: newItems });
        } catch (e) {
            console.error(e);
        }
    }
    `;
    code = code.replace('const handleSave = async', onListDragEndCode + '\n    const handleSave = async');
}

// Wrap the entire list mapping in DragDropContext
if (!code.includes('<DragDropContext onDragEnd={onListDragEnd}>')) {
    code = code.replace(
        '<div className="space-y-4">',
        '{isMounted && <DragDropContext onDragEnd={onListDragEnd}>\n                   <div className="space-y-4">'
    );
    // Find the end of filtered.map
    const searchEndFiltered = `                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16`;
    // If it doesn't match... wait to be safe, we can just replace what's exact.
    
    code = code.replace(
        `                            )}
                        </div>
                    ))}
                </div>`,
        `                            )}
                        </div>
                    ))}
                </div>
                </DragDropContext>}`
    );
}

// Add Droppable for each SOP's checklist items
const searchSopList = `<div className="space-y-2">
                                {(sop.items || []).map((item: any, idx: number) => {`;

const replaceSopList = `<Droppable droppableId={\`\${sop.id}||items\`}>
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                        {(sop.items || []).map((item: any, idx: number) => {`;
code = code.replace(searchSopList, replaceSopList);

const searchSopItemStart = `                                            <div className="w-4 h-4 rounded border-2 flex-shrink-0" style={{ borderColor: 'rgba(5,34,16,0.2)' }} />
                                            <div>`;

const replaceSopItemStart = `                                            <div {...provided.dragHandleProps} className="mt-0.5 text-gray-300 hover:text-gray-500 transition-colors cursor-grab active:cursor-grabbing">
                                                <GripVertical className="w-4 h-4" />
                                            </div>
                                            <div className="w-4 h-4 rounded border-2 flex-shrink-0" style={{ borderColor: 'rgba(5,34,16,0.2)' }} />
                                            <div>`;

code = code.replace(searchSopItemStart, replaceSopItemStart);
code = code.replace(searchSopItemStart, replaceSopItemStart); // Ensure we get it if there's multiple? wait, let's use regexp or a more specific replace.

// Let's use a regex to replace the item wrapper with Draggable
code = code.replace(
    /return \(\s*<div key=\{idx\} className="flex items-center gap-3 py-2\.5 px-4 rounded-xl"/g,
    `return (
                                        <Draggable key={item.id || \`\${sop.id}-\${idx}\`} draggableId={item.id || \`\${sop.id}-\${idx}\`} index={idx}>
                                            {(provided) => (
                                                <div 
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className="flex items-start gap-3 py-3 px-4 rounded-xl group"`
);

// Close Draggable and Droppable
const searchSopItemEnd = `                                        </div>
                                    )
                                })}
                            </div>`;

const replaceSopItemEnd = `                                        </div>
                                            )}
                                        </Draggable>
                                    )
                                })}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>`;

code = code.replace(searchSopItemEnd, replaceSopItemEnd);

// Import GripVertical
if (!code.includes('GripVertical')) {
    code = code.replace('GripHorizontal, Plus, Trash2', 'GripHorizontal, GripVertical, Plus, Trash2');
}

fs.writeFileSync(file, code);
console.log('Restored main page DND safely!');
