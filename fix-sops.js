const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app/(dashboard)/admin/sops/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// Add imports
if (!content.includes('DragDropContext')) {
    content = content.replace('import { Plus,', 'import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";\nimport { GripVertical, Plus,');
}

// Add onDragEnd function inside SOPsContent
if (!content.includes('const onDragEnd =')) {
    content = content.replace('const handleSave = async () => {', 
`const onDragEnd = async (result: any, sopId: string) => {
        if (!result.destination) return;
        const sopIndex = sops.findIndex(s => s.id === sopId);
        if (sopIndex === -1) return;
        const sop = sops[sopIndex];
        const newItems = Array.from(sop.items || []);
        const [movedItem] = newItems.splice(result.source.index, 1);
        newItems.splice(result.destination.index, 0, movedItem);

        // Optimistic update
        const newSops = [...sops];
        newSops[sopIndex] = { ...sop, items: newItems };
        setSOPs(newSops);

        // Database update
        try {
            await updateSOP(sopId, { items: newItems });
        } catch (e) {
            console.error("Reorder failed", e);
            loadSOPs(); // Revert on failure
        }
    }

    const handleSave = async () => {`);
}

// Replace rendering of SOP items with Droppable
const itemsMapTarget = `<div className="space-y-2">
                                {(sop.items || []).map((item: any, idx: number) => {`;
const itemsMapReplacement = `<DragDropContext onDragEnd={(res) => onDragEnd(res, sop.id)}>
                                <Droppable droppableId={sop.id}>
                                    {(provided) => (
                                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                            {(sop.items || []).map((item: any, idx: number) => {`;

content = content.replace(itemsMapTarget, itemsMapReplacement);

content = content.replace(`                                })}
                            </div>
                            {sop.whatsappTemplate`, `                                })}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>
                            {sop.whatsappTemplate`);

// Now replace the item div with Draggable
const returnTarget = `return (
                                        <div key={idx} className="flex items-center gap-3 py-2.5 px-4 rounded-xl" style={{ background: 'rgba(5,34,16,0.02)' }}>
                                            <div className="w-4 h-4 rounded border-2 flex-shrink-0" style={{ borderColor: 'rgba(5,34,16,0.2)' }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-sans text-sm font-medium" style={{ color: '#052210' }}>{title}</span>
                                                    {!isRequired && (
                                                        <span className="font-sans text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full" style={{ color: 'rgba(5,34,16,0.4)', background: 'rgba(5,34,16,0.06)' }}>Optional</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span className="font-sans text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded" style={{ background: 'rgba(5,34,16,0.06)', color: 'rgba(5,34,16,0.45)' }}>
                                                        {typeLabel(type)}
                                                    </span>
                                                    {depLabel && (
                                                        <span className="font-sans text-[9px] font-bold tracking-wider uppercase flex items-center gap-1" style={{ color: '#06a15c' }}>
                                                            <Link2 className="w-2.5 h-2.5" /> Depends on: {depLabel}
                                                        </span>
                                                    )}
                                                    {isObj && item.requiresAcknowledgement && (
                                                        <span className="font-sans text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded flex items-center gap-1" style={{ background: 'rgba(5,34,16,0.06)', color: 'rgba(5,34,16,0.6)' }}>
                                                            <CheckSquare className="w-2.5 h-2.5" /> Must Acknowledge
                                                        </span>
                                                    )}
                                                </div>
                                                {isObj && (item.notes || (item.points && item.points.length > 0) || item.extraInfo) && (
                                                    <div className="mt-3 space-y-2 border-l-2 border-dashed pl-3" style={{ borderColor: 'rgba(5,34,16,0.1)' }}>
                                                        {item.extraInfo && (
                                                            <div className="inline-flex items-center px-1.5 py-0.5 rounded font-bold font-sans text-xs" style={{ background: 'rgba(5,34,16,0.06)', color: '#052210' }}>
                                                                {item.extraInfo}
                                                            </div>
                                                        )}
                                                        {item.notes && <p className="font-sans text-[11px] italic leading-relaxed" style={{ color: 'rgba(5,34,16,0.5)' }}>{item.notes}</p>}
                                                        {item.points && item.points.length > 0 && (
                                                            <ul className="space-y-1">
                                                                {item.points.map((p: string, k: number) => (
                                                                    <li key={k} className="font-sans text-[10px] flex items-start gap-1.5" style={{ color: 'rgba(5,34,16,0.6)' }}>
                                                                        <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'rgba(5,34,16,0.3)' }} />
                                                                        {p}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )`;

const returnReplacement = `return (
                                        <Draggable key={item.id || idx.toString()} draggableId={item.id || idx.toString()} index={idx}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className="flex items-center gap-3 py-2.5 px-4 rounded-xl group transition-colors"
                                                    style={{ background: 'rgba(5,34,16,0.02)', border: '1px solid rgba(5,34,16,0.04)' }}
                                                >
                                                    <div {...provided.dragHandleProps} className="text-gray-300 hover:text-gray-500 transition-colors cursor-grab active:cursor-grabbing">
                                                        <GripVertical className="w-4 h-4" />
                                                    </div>
                                                    <div className="w-4 h-4 rounded border-2 flex-shrink-0" style={{ borderColor: 'rgba(5,34,16,0.2)' }} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-sans text-sm font-medium" style={{ color: '#052210' }}>{title}</span>
                                                            {!isRequired && (
                                                                <span className="font-sans text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full" style={{ color: 'rgba(5,34,16,0.4)', background: 'rgba(5,34,16,0.06)' }}>Optional</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                            <span className="font-sans text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded" style={{ background: 'rgba(5,34,16,0.06)', color: 'rgba(5,34,16,0.45)' }}>
                                                                {typeLabel(type)}
                                                            </span>
                                                            {depLabel && (
                                                                <span className="font-sans text-[9px] font-bold tracking-wider uppercase flex items-center gap-1" style={{ color: '#06a15c' }}>
                                                                    <Link2 className="w-2.5 h-2.5" /> Depends on: {depLabel}
                                                                </span>
                                                            )}
                                                            {isObj && item.requiresAcknowledgement && (
                                                                <span className="font-sans text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded flex items-center gap-1" style={{ background: 'rgba(5,34,16,0.06)', color: 'rgba(5,34,16,0.6)' }}>
                                                                    <CheckSquare className="w-2.5 h-2.5" /> Must Acknowledge
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isObj && (item.notes || (item.points && item.points.length > 0) || item.extraInfo) && (
                                                            <div className="mt-3 space-y-2 border-l-2 border-dashed pl-3" style={{ borderColor: 'rgba(5,34,16,0.1)' }}>
                                                                {item.extraInfo && (
                                                                    <div className="inline-flex items-center px-1.5 py-0.5 rounded font-bold font-sans text-xs" style={{ background: 'rgba(5,34,16,0.06)', color: '#052210' }}>
                                                                        {item.extraInfo}
                                                                    </div>
                                                                )}
                                                                {item.notes && <p className="font-sans text-[11px] italic leading-relaxed" style={{ color: 'rgba(5,34,16,0.5)' }}>{item.notes}</p>}
                                                                {item.points && item.points.length > 0 && (
                                                                    <ul className="space-y-1">
                                                                        {item.points.map((p: string, k: number) => (
                                                                            <li key={k} className="font-sans text-[10px] flex items-start gap-1.5" style={{ color: 'rgba(5,34,16,0.6)' }}>
                                                                                <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'rgba(5,34,16,0.3)' }} />
                                                                                {p}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    )`;

content = content.replace(returnTarget, returnReplacement);

fs.writeFileSync(file, content);
console.log('Modified page.tsx');