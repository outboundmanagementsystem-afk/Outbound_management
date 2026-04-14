const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app/(dashboard)/admin/sops/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace the standard points block
const pointsOriginal = `{/* Points */}
                                        <div className="mb-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="font-sans text-[9px] font-bold tracking-wider uppercase text-gray-400">Key Points / Options (Choices)</label>
                                                <button 
                                                    onClick={() => {
                                                        const newPoints = [...(item.points || []), ""]
                                                        updateFormItem(idx, { points: newPoints })
                                                    }}
                                                    className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-tighter"
                                                >
                                                    <Plus className="w-2.5 h-2.5" /> Add Point
                                                </button>
                                            </div>
                                            {(item.points || []).map((p, pIdx) => (
                                                <div key={pIdx} className="flex gap-2">
                                                    <div className="mt-2 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'rgba(5,34,16,0.2)' }} />
                                                    <input
                                                        value={p}
                                                        onChange={e => {
                                                            const newPoints = [...(item.points || [])]
                                                            newPoints[pIdx] = e.target.value
                                                            updateFormItem(idx, { points: newPoints })
                                                        }}
                                                        className="flex-1 px-3 py-1.5 rounded-lg font-sans text-[11px]"
                                                        placeholder={\`Detail point \${pIdx + 1}\`}
                                                        style={{ border: '1px solid rgba(5,34,16,0.04)', outline: 'none', background: '#fff', color: '#052210' }}
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            const newPoints = (item.points || []).filter((_, k) => k !== pIdx)
                                                            updateFormItem(idx, { points: newPoints })
                                                        }}
                                                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Extra Info */}
                                        <div className="mb-3">
                                            <input
                                                value={item.extraInfo || ""}
                                                onChange={e => updateFormItem(idx, { extraInfo: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg font-sans text-[10px]"
                                                placeholder="Extra configuration or metadata (Optional)"
                                                style={{ border: '1px solid rgba(5,34,16,0.06)', outline: 'none', background: '#fff', color: '#052210' }}
                                            />
                                        </div>`;

const pointsReplacement = `{/* Points */}
                                        {['multiple_choice', 'single_choice'].includes(item.type) && (
                                            <div className="mb-3 space-y-2 p-3 rounded-lg border border-emerald-100 bg-emerald-50/30">
                                                <div className="flex items-center justify-between">
                                                    <label className="font-sans text-[9px] font-bold tracking-wider uppercase text-emerald-700">Options (Choices)</label>
                                                    <button 
                                                        onClick={() => {
                                                            const newPoints = [...(item.points || []), ""]
                                                            updateFormItem(idx, { points: newPoints })
                                                        }}
                                                        className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-tighter"
                                                    >
                                                        <Plus className="w-2.5 h-2.5" /> Add Choice
                                                    </button>
                                                </div>
                                                {(item.points || []).map((p, pIdx) => (
                                                    <div key={pIdx} className="flex gap-2 items-center">
                                                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-emerald-400" />
                                                        <input
                                                            value={p}
                                                            onChange={e => {
                                                                const newPoints = [...(item.points || [])]
                                                                newPoints[pIdx] = e.target.value
                                                                updateFormItem(idx, { points: newPoints })
                                                            }}
                                                            className="flex-1 px-3 py-1.5 rounded-lg font-sans text-[11px]"
                                                            placeholder={\`Choice \${pIdx + 1}\`}
                                                            style={{ border: '1px solid rgba(16,185,129,0.2)', outline: 'none', background: '#fff', color: '#052210' }}
                                                        />
                                                        <button 
                                                            onClick={() => {
                                                                const newPoints = (item.points || []).filter((_, k) => k !== pIdx)
                                                                updateFormItem(idx, { points: newPoints })
                                                            }}
                                                            className="p-1.5 text-emerald-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {(!item.points || item.points.length === 0) && (
                                                    <p className="text-[10px] text-emerald-600/60 italic">Add choices above to allow users to select them.</p>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Rating Scale */}
                                        {item.type === 'rating' && (
                                            <div className="mb-3 space-y-2 p-3 rounded-lg border border-purple-100 bg-purple-50/30">
                                                <label className="font-sans text-[9px] font-bold tracking-wider uppercase text-purple-700">Rating Scale Max</label>
                                                <select
                                                    value={item.extraInfo || "5"}
                                                    onChange={e => updateFormItem(idx, { extraInfo: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-lg font-sans text-xs"
                                                    style={{ border: '1px solid rgba(168,85,247,0.2)', outline: 'none', background: '#fff' }}
                                                >
                                                    <option value="5">1 to 5 Stars</option>
                                                    <option value="10">1 to 10 Scale</option>
                                                </select>
                                            </div>
                                        )}

                                        {/* Text Input Configuration */}
                                        {item.type === 'text_input' && (
                                            <div className="mb-3 space-y-2 p-3 rounded-lg border border-blue-100 bg-blue-50/30">
                                                <label className="font-sans text-[9px] font-bold tracking-wider uppercase text-blue-700">Input Placeholder / Hint</label>
                                                <input
                                                    value={item.extraInfo || ""}
                                                    onChange={e => updateFormItem(idx, { extraInfo: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-lg font-sans text-[10px]"
                                                    placeholder="e.g., Please enter passenger full names..."
                                                    style={{ border: '1px solid rgba(59,130,246,0.2)', outline: 'none', background: '#fff', color: '#052210' }}
                                                />
                                            </div>
                                        )}`;

if (content.includes('Key Points / Options (Choices)')) {
    content = content.replace(pointsOriginal, pointsReplacement);
    fs.writeFileSync(file, content);
    console.log('Modified UI configuration');
} else {
    console.log('Regex did not match points block');
}
