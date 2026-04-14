const fs = require('fs');
let c = fs.readFileSync('app/(dashboard)/admin/kpi/page.tsx', 'utf8');

c = c.replace(
  'const [sections, setSections] = useState<Record<string, boolean>>({',
  'const [expandedUser, setExpandedUser] = useState<string | null>(null);\n    const [sections, setSections] = useState<Record<string, boolean>>({'
);

let replaceRow = `                                    <div key={u.uid} className="px-6 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer" style={{ borderBottom: '1px solid #f9fafb' }} onClick={() => setExpandedUser(expandedUser === u.uid ? null : u.uid)}>
                                        <div className="hidden sm:grid grid-cols-12 gap-2 items-center">`;

c = c.replace(
  `                                    <div key={u.uid} className="px-6 py-3 hover:bg-gray-50/50 transition-colors" style={{ borderBottom: '1px solid #f9fafb' }}>
                                        <div className="hidden sm:grid grid-cols-12 gap-2 items-center">`,
  replaceRow
);

let expandSection = `                                        </div>
                                        {expandedUser === u.uid && (
                                            <div className="mt-4 p-4 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e5e7eb' }}>
                                                <h5 className="font-sans text-xs font-bold mb-2" style={{ color: '#052210' }}>Personal Analytics ({period})</h5>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                    <div>
                                                        <p className="font-sans text-[10px] uppercase tracking-wider" style={{ color: '#6b7280' }}>Total Handled</p>
                                                        <p className="font-sans text-lg font-bold" style={{ color }}>{s.total}</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-sans text-[10px] uppercase tracking-wider" style={{ color: '#6b7280' }}>Confirmed</p>
                                                        <p className="font-sans text-lg font-bold" style={{ color }}>{s.confirmed}</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-sans text-[10px] uppercase tracking-wider" style={{ color: '#6b7280' }}>Conversion</p>
                                                        <p className="font-sans text-lg font-bold" style={{ color }}>{s.total > 0 ? Math.round((s.confirmed / s.total) * 100) : 0}%</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-sans text-[10px] uppercase tracking-wider" style={{ color: '#6b7280' }}>Total Profit Generated</p>
                                                        <p className="font-sans text-lg font-bold" style={{ color }}>₹{s.revenue.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )`;

// I will use regex to find where to replace
c = c.replace(
  /                                        <\/div>\n                                    <\/div>\n                                \)/g,
  expandSection
);

fs.writeFileSync('app/(dashboard)/admin/kpi/page.tsx', c, 'utf8');
console.log('updated admin kpi page');
