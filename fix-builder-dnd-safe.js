const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app/(dashboard)/admin/sops/page.tsx');
let code = fs.readFileSync(file, 'utf8');

// Add onFormDragEnd
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
    code = code.replace('const moveFormItem = (idx: number', dragFormEndInjection + '\n    const moveFormItem = (idx: number');
}

// 1. Wrap formItems.map inside DragDropContext
const spaceY3Search = `<div className="space-y-3">
                                {formItems.map((item, idx) => (`;
const spaceY3Replace = `{isMounted && <DragDropContext onDragEnd={onFormDragEnd}>
                                <Droppable droppableId="builder-form-items">
                                    {(provided) => (
                                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                            {formItems.map((item, idx) => (`;
code = code.replace(spaceY3Search, spaceY3Replace);

// 2. Add Draggable to the builder items
const builderItemSearch = `<div key={item.id} className="rounded-xl p-4" style={{ border: '1px solid rgba(5,34,16,0.08)', background: 'rgba(5,34,16,0.01)' }}>`;
const builderItemReplace = `<Draggable key={item.id || \`form-item-\${idx}\`} draggableId={item.id || \`form-item-\${idx}\`} index={idx}>
                                                {(provided) => (
                                                    <div 
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className="rounded-xl p-5 pt-8 bg-white relative group border transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/50" 
                                                        style={{ borderColor: 'rgba(5,34,16,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}
                                                    >
                                                        {/* Drag Handle Top Center */}
                                                        <div 
                                                            {...provided.dragHandleProps} 
                                                            className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-emerald-50/80 rounded-b-lg transition-colors"
                                                        >
                                                            <GripHorizontal className="w-4 h-4 text-emerald-900/30" />
                                                        </div>`;
code = code.replace(new RegExp(builderItemSearch.replace(/[.*+?^$\{}()|[\]\\]/g, '\\$&'), 'g'), builderItemReplace);

// 3. Find the closing tag of the <div key={item.id}> and close Draggable
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

// Remove arrows
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

// Fix alignment for main SOP list items
code = code.replace(/className="flex items-center gap-3 py-2\.5 px-4 rounded-xl group/g, 'className="flex items-start gap-3 py-3 px-4 rounded-xl group');
code = code.replace(/<div \{\.\.\.provided\.dragHandleProps\} className="text-gray-300 hover:text-gray-500 transition-colors cursor-grab active:cursor-grabbing">/g, '<div {...provided.dragHandleProps} className="mt-0.5 text-gray-300 hover:text-gray-500 transition-colors cursor-grab active:cursor-grabbing">');

fs.writeFileSync(file, code);
console.log('Fixed drag and drop inside builder + CSS alignments SAFELY');
