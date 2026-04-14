const fs = require('fs');

const files = [
  'app/(dashboard)/ops/booking/[id]/page.tsx',
  'app/(dashboard)/post-ops/booking/[id]/page.tsx',
  'app/(dashboard)/sales/itinerary/[id]/page.tsx'
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let updateStateMatch = c.match(/update([A-Za-z]+)ItemState/);
  if (!updateStateMatch) {
    console.log('Skipping ' + f + ', no update function found');
    return;
  }
  let updateFn = updateStateMatch[0];

  let block = `
                                    {/* Dynamic Input Types */}
                                    {['text_input', 'Text Input'].includes(item.type) && !item.checked && (
                                        <div className="mt-3">
                                            <input 
                                                type="text"
                                                value={item.response || ''}
                                                onChange={(e) => ${updateFn}(item.id, { response: e.target.value })}
                                                placeholder="Enter your answer..."
                                                className="w-full px-3 py-2 rounded-lg font-sans text-xs outline-none"
                                                style={{ border: '1px solid rgba(5,34,16,0.1)', color: '#052210' }}
                                            />
                                        </div>
                                    )}
                                    {['date_picker', 'Date Picker'].includes(item.type) && !item.checked && (
                                        <div className="mt-3">
                                            <input 
                                                type="date"
                                                value={item.response || ''}
                                                onChange={(e) => ${updateFn}(item.id, { response: e.target.value })}
                                                className="px-3 py-2 rounded-lg font-sans text-xs outline-none"
                                                style={{ border: '1px solid rgba(5,34,16,0.1)', color: '#052210' }}
                                            />
                                        </div>
                                    )}
                                    {['single_choice', 'Single Choice'].includes(item.type) && !item.checked && item.points && (
                                        <div className="mt-3 space-y-2">
                                            {item.points.map((opt, i) => (
                                                <label key={i} className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="radio"
                                                        name={\`single-\${item.id}\`}
                                                        checked={item.response === opt}
                                                        onChange={() => ${updateFn}(item.id, { response: opt })}
                                                        className="w-3.5 h-3.5"
                                                        style={{ accentColor: '#06a15c' }}
                                                    />
                                                    <span className="font-sans text-xs" style={{ color: 'rgba(5,34,16,0.8)' }}>{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                    {['multiple_choice', 'Multiple Choice'].includes(item.type) && !item.checked && item.points && (
                                        <div className="mt-3 space-y-2">
                                            {item.points.map((opt, i) => {
                                                const currentArr = Array.isArray(item.response) ? item.response : [];
                                                return (
                                                    <label key={i} className="flex items-center gap-2 cursor-pointer">
                                                        <input 
                                                            type="checkbox"
                                                            checked={currentArr.includes(opt)}
                                                            onChange={(e) => {
                                                                let n = [...currentArr];
                                                                if (e.target.checked) n.push(opt);
                                                                else n = n.filter(x => x !== opt);
                                                                ${updateFn}(item.id, { response: n });
                                                            }}
                                                            className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
                                                        />
                                                        <span className="font-sans text-xs" style={{ color: 'rgba(5,34,16,0.8)' }}>{opt}</span>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    )}
                                    {['rating', 'Rating'].includes(item.type) && !item.checked && (
                                        <div className="mt-3 flex items-center gap-1.5">
                                            {Array.from({ length: parseInt(item.extraInfo || '5') || 5 }).map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => ${updateFn}(item.id, { response: (i + 1).toString() })}
                                                    className="text-xl transition-colors hover:scale-110"
                                                    style={{ color: (parseInt(item.response || '0')) > i ? '#f59e0b' : 'rgba(5,34,16,0.1)' }}
                                                >
                                                    ★
                                                </button>
                                            ))}
                                            <span className="ml-2 font-sans text-[10px] text-gray-400">({item.response || 0} / {parseInt(item.extraInfo || '5') || 5})</span>
                                        </div>
                                    )}
                                    {item.checked && item.response && (
                                        <div className="mt-2 bg-emerald-50/50 px-3 py-2 rounded-lg border border-emerald-100">
                                            <span className="font-sans text-[10px] font-bold uppercase tracking-wider block text-emerald-600 mb-1">Response:</span>
                                            <span className="font-sans text-xs text-emerald-900 font-medium">
                                                {Array.isArray(item.response) ? item.response.join(', ') : item.response}
                                            </span>
                                        </div>
                                    )}

                                    {/* File upload section */}`;

  if (!c.includes('Dynamic Input Types')) {
    c = c.split('{/* File upload section */}').join(block);
    console.log('Injected ui for: ' + f);
  } else {
    console.log('Already injected ui for: ' + f);
  }

  // Handle the disabling logic update
  const regex = /disabled=\{\(item\.requiresAcknowledgement[\s\S]*?\)\}/;
  const newLogic = `disabled={(item.requiresAcknowledgement && !item.acknowledged && !item.checked) || ((item.type === 'file_upload' || item.type === 'File Upload') && !item.fileUrl && !item.checked) || (item.isRequired && ['text_input', 'Text Input', 'single_choice', 'Single Choice', 'rating', 'Rating'].includes(item.type) && !item.response && !item.checked) || (item.isRequired && ['multiple_choice', 'Multiple Choice'].includes(item.type) && (!item.response || item.response.length === 0) && !item.checked)}`;
  
  if (c.match(regex)) {
    c = c.replace(regex, newLogic);
    console.log('Replaced disabled logic in: ' + f);
  }

  fs.writeFileSync(f, c);
});
