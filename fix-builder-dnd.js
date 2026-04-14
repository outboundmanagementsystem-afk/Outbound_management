const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app/(dashboard)/admin/sops/page.tsx');
let code = fs.readFileSync(file, 'utf8');

// 1. Add onFormDragEnd
const moveFormItemSearch = `    const moveFormItem = (idx: number, direction: 'up' | 'down') => {
        setFormItems(f => {
            const newF = [...f];
            if (direction === 'up' && idx > 0) {
                [newF[idx - 1], newF[idx]] = [newF[idx], newF[idx - 1]];
            } else if (direction === 'down' && idx < newF.length - 1) {
                [newF[idx + 1], newF[idx]] = [newF[idx], newF[idx + 1]];
            }
            return newF;
        });
    }`;

const dragFormEndInjection = `
    const onFormDragEnd = (result: any) => {
        if (!result.destination) return;
        const newItems = Array.from(formItems);
        const [movedItem] = newItems.splice(result.source.index, 1);
        newItems.splice(result.destination.index, 0, movedItem);
        setFormItems(newItems);
    }
`;

if (!code.includes('onFormDragEnd')) {
    code = code.replace(moveFormItemSearch, moveFormItemSearch + dragFormEndInjection);
}


// 2. Wrap form items mapping in DragDropContext
const spaceY3Search = `<div className="space-y-3">
                                {formItems.map((item, idx) => (`;
const spaceY3Replace = `{isMounted && <DragDropContext onDragEnd={onFormDragEnd}>
                                <Droppable droppableId="builder-form-items">
                                    {(provided) => (
                                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                            {formItems.map((item, idx) => (`;


code = code.replace(spaceY3Search, spaceY3Replace);

const addProcessStepSearch = `</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={addFormItem}`;

const addProcessStepReplace = `</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>}
                            <button onClick={addFormItem}`;

// We need to also inject <Draggable> around the outer div of the item.
const builderItemSearch = `<div key={item.id} className="rounded-xl p-4" style={{ border: '1px solid rgba(5,34,16,0.08)', background: 'rgba(5,34,16,0.01)' }}>`;
const builderItemReplace = `<Draggable key={item.id} draggableId={item.id} index={idx}>
                                                {(provided) => (
                                                    <div 
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className="rounded-xl p-4 bg-white relative" 
                                                        style={{ border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                                                    >
                                                        {/* Google Forms style drag handle at top center */}
                                                        <div 
                                                            {...provided.dragHandleProps} 
                                                            className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-4 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-gray-50/50 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <div className="w-8 h-1 rounded-full bg-gray-200" />
                                                        </div>
                                                        <div className="flex justify-center mb-3">
                                                             <div {...provided.dragHandleProps} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
                                                                <GripVertical className="w-4 h-4 rotate-90" />
                                                             </div>
                                                        </div>`;
// Actually rotate-90 of GripVertical is GripHorizontal. Let's just use GripHorizontal. I'll import GripHorizontal later or just use GripVertical. Wait, `GripVertical` is available. Let's use `GripVertical` with `rotate-90` class! Wait, lucide-react has `GripHorizontal`. But let's just do an icon.

code = code.replace(/<div key=\{item\.id\} className="rounded-xl p-4"/g, `<Draggable key={item.id || \`form-item-\${idx}\`} draggableId={item.id || \`form-item-\${idx}\`} index={idx}>
                                                {(provided) => (
                                                    <div 
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className="rounded-xl p-5 bg-white relative group border border-gray-100 shadow-sm transition-all focus-within:ring-1 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/50" 
                                                    >
                                                        <div 
                                                            {...provided.dragHandleProps} 
                                                            className="absolute top-0 left-0 w-full h-6 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-emerald-50/50 rounded-t-xl transition-colors"
                                                        >
                                                            <GripHorizontal className="w-4 h-4 text-gray-300" />
                                                        </div>
                                                        <div className="mt-2">`); // wrap the inside 

const endMapSearch = `                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={addFormItem}`;
                            
const endMapReplace = `                                                )}
                                            </div>
                                        </div>
                                    </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                ))}
                                {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>}
                            <button onClick={addFormItem}`;

code = code.replace(endMapSearch, endMapReplace);


// Remove the up/down arrows from the builder UI
const arrowsSearch = `{formItems.length > 1 && (
                                                    <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(5,34,16,0.1)' }}>
                                                        <button 
                                                            onClick={() => moveFormItem(idx, 'up')} 
                                                            disabled={idx === 0}
                                                            className={\`w-8 h-8 flex items-center justify-center transition-colors \${idx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-50'}\`}
                                                        >
                                                            <ArrowUp className="w-3.5 h-3.5" style={{ color: '#052210' }} />
                                                        </button>
                                                        <div className="w-[1px] bg-gray-200" style={{ background: 'rgba(5,34,16,0.1)' }}></div>
                                                        <button 
                                                            onClick={() => moveFormItem(idx, 'down')} 
                                                            disabled={idx === formItems.length - 1}
                                                            className={\`w-8 h-8 flex items-center justify-center transition-colors \${idx === formItems.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-50'}\`}
                                                        >
                                                            <ArrowDown className="w-3.5 h-3.5" style={{ color: '#052210' }} />
                                                        </button>
                                                    </div>
                                                )}`;

code = code.replace(arrowsSearch, "");

// Import GripHorizontal
if (!code.includes('GripHorizontal')) {
    code = code.replace('import { GripVertical, Plus', 'import { GripHorizontal, GripVertical, Plus');
}

// Check alignment of main SOP list items (the "cant drag" issue)
// className="flex items-center gap-3 py-2.5 px-4 rounded-xl group transition-colors"
code = code.replace(/className="flex items-center gap-3 py-2\.5 px-4 rounded-xl group/g, 'className="flex items-start gap-4 py-3 px-5 rounded-xl group');
code = code.replace(/<div \{\.\.\.provided\.dragHandleProps\} className="text-gray-300 hover:text-gray-500 transition-colors cursor-grab active:cursor-grabbing">/g, '<div {...provided.dragHandleProps} className="mt-0.5 text-gray-300 hover:text-gray-500 transition-colors cursor-grab active:cursor-grabbing">');


fs.writeFileSync(file, code);
console.log('Fixed drag and drop inside builder + CSS alignments');
