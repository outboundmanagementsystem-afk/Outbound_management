const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'components/manual-canvas.tsx');
let code = fs.readFileSync(file, 'utf8');

// Replace updateBlockData with one that intercepts dates
const updateBlockDataSearch = `const updateBlockData = (id: string, key: string, value: any) => {
        setBlocks(blocks.map(b => b.id === id ? { ...b, data: { ...b.data, [key]: value } } : b))
    }`;

const updateBlockDataReplace = `const updateBlockData = (id: string, key: string, value: any) => {
        setBlocks(blocks.map(b => {
            if (b.id !== id) return b;
            
            const newData = { ...b.data, [key]: value };
            
            // Auto calculate days and nights if start/end dates change
            if (b.type === 'HERO' && (key === 'startDate' || key === 'endDate')) {
                const start = new Date(key === 'startDate' ? value : b.data.startDate);
                const end = new Date(key === 'endDate' ? value : b.data.endDate);
                
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    const diffTime = end.getTime() - start.getTime();
                    if (diffTime >= 0) {
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        newData.nights = diffDays;
                        newData.days = diffDays + 1;
                    }
                }
            }
            
            return { ...b, data: newData };
        }));
    }`;

code = code.replace(updateBlockDataSearch, updateBlockDataReplace);

// Update startDate and endDate input types
code = code.replace(
    /type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value=\{selectedBlock\.data\.startDate\}/g,
    `type="date" className="w-full px-3 py-2 border rounded-lg text-sm" value={selectedBlock.data.startDate ? new Date(selectedBlock.data.startDate).toISOString().split('T')[0] : ''}`
);
code = code.replace(
    /type="text" className="w-full px-3 py-2 border rounded-lg text-sm" value=\{selectedBlock\.data\.endDate\}/g,
    `type="date" className="w-full px-3 py-2 border rounded-lg text-sm" value={selectedBlock.data.endDate ? new Date(selectedBlock.data.endDate).toISOString().split('T')[0] : ''}`
);

// We need to also format the date when it's saved from native input, but actually the native input onChange will provide YYYY-MM-DD. 
// Let's modify the onChange!

const startDateOnChangeSearch = `onChange={e => updateBlockData(selectedBlock.id, 'startDate', e.target.value)}`;
const startDateOnChangeReplace = `onChange={e => {
                                            const d = new Date(e.target.value);
                                            const formatted = isNaN(d.getTime()) ? e.target.value : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                            updateBlockData(selectedBlock.id, 'startDate', formatted);
                                        }}`;
code = code.replace(startDateOnChangeSearch, startDateOnChangeReplace);

const endDateOnChangeSearch = `onChange={e => updateBlockData(selectedBlock.id, 'endDate', e.target.value)}`;
const endDateOnChangeReplace = `onChange={e => {
                                            const d = new Date(e.target.value);
                                            const formatted = isNaN(d.getTime()) ? e.target.value : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                            updateBlockData(selectedBlock.id, 'endDate', formatted);
                                        }}`;
code = code.replace(endDateOnChangeSearch, endDateOnChangeReplace);


fs.writeFileSync(file, code);
console.log('Fixed manual canvas date logic');
