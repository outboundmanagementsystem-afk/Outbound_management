"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState, useMemo } from "react"
import { getUsers, getItineraries } from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import dynamic from "next/dynamic"
import {
    Users, FileText, TrendingUp, CheckCircle, DollarSign, Download,
    BarChart3, Award, Briefcase, Wrench, ClipboardCheck, ChevronDown, Target
} from "lucide-react"

/* ── Recharts (SSR-safe) ─────────────────── */
const BarChartComp = dynamic(() => import("recharts").then(mod => {
    const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } = mod
    return function C({ data, bars }: { data: any[]; bars: { key: string; color: string; name: string }[] }) {
        return (
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(5,34,16,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(6,161,92,0.15)', fontSize: 11, background: '#fff' }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {bars.map(b => <Bar key={b.key} dataKey={b.key} fill={b.color} name={b.name} radius={[4, 4, 0, 0]} />)}
                </BarChart>
            </ResponsiveContainer>
        )
    }
}), { ssr: false })

const LineChartComp = dynamic(() => import("recharts").then(mod => {
    const { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } = mod
    return function C({ data, lines }: { data: any[]; lines: { key: string; color: string; name: string }[] }) {
        return (
            <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(5,34,16,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {lines.map(l => <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={2} dot={{ r: 3, fill: l.color }} name={l.name} />)}
                </LineChart>
            </ResponsiveContainer>
        )
    }
}), { ssr: false })

const PieChartComp = dynamic(() => import("recharts").then(mod => {
    const { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } = mod
    const COLORS = ["#06a15c", "#60a5fa", "#f59e0b", "#a78bfa", "#f472b6", "#14b8a6", "#ef4444"]
    return function C({ data }: { data: any[] }) {
        return (
            <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" outerRadius={75} innerRadius={40} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 9 }}>
                        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11 }} />
                </PieChart>
            </ResponsiveContainer>
        )
    }
}), { ssr: false })

/* ── Helpers ──────────────────────────────── */
type Period = "day" | "week" | "month"

const roleLabel: Record<string, string> = {
    admin: "Admin", owner: "Owner", sales_lead: "Sales Lead", sales: "Sales",
    ops_lead: "Ops Lead", ops: "Operations", pre_ops_lead: "Pre-Ops Lead",
    post_ops_lead: "Post-Ops Lead", post_ops: "Post Ops"
}

function isInPeriod(dateVal: any, period: Period) {
    const d = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal)
    if (isNaN(d.getTime())) return false
    const now = new Date()
    if (period === "day") {
        return d.toDateString() === now.toDateString()
    }
    if (period === "week") {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
        return d >= weekAgo && d <= now
    }
    // month
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function getPeriodLabels(period: Period) {
    const now = new Date()
    if (period === "day") {
        return Array.from({ length: 24 }, (_, h) => ({ key: h, label: `${h}:00` }))
    }
    if (period === "week") {
        const days = []
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now); d.setDate(now.getDate() - i)
            days.push({ key: d.toDateString(), label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }) })
        }
        return days
    }
    // month: last 30 days
    const days = []
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i)
        days.push({ key: d.toDateString(), label: d.getDate().toString() })
    }
    return days
}

function getBucket(dateVal: any, period: Period) {
    const d = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal)
    if (isNaN(d.getTime())) return null
    if (period === "day") return d.getHours()
    return d.toDateString()
}

/* ── Main Page ───────────────────────────── */
export default function AdminKPIPage() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <KPIContent />
        </ProtectedRoute>
    )
}

function KPIContent() {
    const { userProfile } = useAuth()
    const [allItineraries, setAllItineraries] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState<Period>("month")
    const [expandedSection, setExpandedSection] = useState<string | null>("sales")
    const [expandedUser, setExpandedUser] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])
    const loadData = async () => {
        try {
            const [u, i] = await Promise.all([getUsers(), getItineraries()])
            setUsers(u); setAllItineraries(i)
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    // ── Time-filtered itineraries ──
    const filteredItins = useMemo(() =>
        allItineraries.filter(i => i.createdAt && isInPeriod(i.createdAt, period)),
        [allItineraries, period]
    )

    // ── Role groups ──
    const salesUsers = users.filter(u => u.role === "sales" || u.role === "sales_lead")
    const preOpsUsers = users.filter(u => u.role === "pre_ops" || u.role === "pre_ops_lead")
    const postOpsUsers = users.filter(u => u.role === "post_ops" || u.role === "post_ops_lead")
    const salesLeads = users.filter(u => u.role === "sales_lead")
    const opsLeads = users.filter(u => u.role === "pre_ops_lead")
    const preOpsLeads = users.filter(u => u.role === "pre_ops_lead")
    const postOpsLeads = users.filter(u => u.role === "post_ops_lead")

    // ── KPI builders ──
    const getStats = (itins: any[]) => {
        const total = itins.length
        const confirmed = itins.filter(i => ["confirmed", "handover", "completed"].includes(i.status)).length
        const revenue = itins.filter(i => ["confirmed", "handover", "completed"].includes(i.status)).reduce((s: number, i: any) => s + Math.round((Number((i.plans?.find((p:any) => p.planId === i.selectedPlanId)?.totalPrice || i.plans?.[0]?.totalPrice || 0)) || 0) * ((Number(i.margin) || 15) / (100 + (Number(i.margin) || 15)))), 0)
        const conversion = total > 0 ? Math.round((confirmed / total) * 100) : 0
        return { total, confirmed, revenue, conversion }
    }

    const getUserStats = (uid: string) => getStats(filteredItins.filter(i => i.createdBy === uid))
    const getTeamStats = (uids: string[]) => getStats(filteredItins.filter(i => uids.includes(i.createdBy)))

    // ── Timeline charts ──
    const periodLabels = useMemo(() => getPeriodLabels(period), [period])
    const buildTimeline = (itins: any[]) => {
        const buckets: Record<string | number, { total: number; confirmed: number }> = {}
        periodLabels.forEach(p => { buckets[p.key] = { total: 0, confirmed: 0 } })
        itins.forEach(i => {
            const bucket = getBucket(i.createdAt, period)
            if (bucket !== null && buckets[bucket] !== undefined) {
                buckets[bucket].total++
                if (["confirmed", "handover", "completed"].includes(i.status)) buckets[bucket].confirmed++
            }
        })
        return periodLabels.map(p => ({ label: p.label, total: buckets[p.key].total, confirmed: buckets[p.key].confirmed }))
    }

    // ── Global stats ──
    const globalStats = getStats(filteredItins)
    const salesTeamUids = salesUsers.map(u => u.uid)
    const preOpsUids = preOpsUsers.map(u => u.uid)
    const postOpsUids = postOpsUsers.map(u => u.uid)
    const salesStats = getTeamStats(salesTeamUids)
    const preOpsStats = getTeamStats(preOpsUids)
    const postOpsStats = getTeamStats(postOpsUids)

    // Status breakdown
    const statusData = ["draft", "sent", "negotiation", "confirmed", "handover", "post-ops", "completed"]
        .map(s => ({ name: s, value: filteredItins.filter(i => i.status === s).length })).filter(s => s.value > 0)

    // Lead performance
    const getLeadPerf = (lead: any) => {
        const members = users.filter(u => u.leadId === lead.uid)
        const uids = [lead.uid, ...members.map(m => m.uid)]
        const stats = getTeamStats(uids)
        return { ...stats, name: lead.name, code: lead.employeeCode, role: lead.role, memberCount: members.length }
    }

    // ── Export ──
    const exportCSV = () => {
        const headers = ["Name", "Role", "Employee Code", "Period", "Itineraries", "Confirmed", "Conversion %", "Revenue"]
        const periodLabel = period === "day" ? "Today" : period === "week" ? "This Week" : "This Month"
        const rows = users.filter(u => u.role !== "admin" && u.role !== "owner").map(u => {
            const s = getUserStats(u.uid)
            return [u.name, roleLabel[u.role] || u.role, u.employeeCode || "", periodLabel, s.total, s.confirmed, s.conversion, s.revenue]
        })
        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a"); a.href = url
        a.download = `kpi-${period}-${new Date().toISOString().split('T')[0]}.csv`
        a.click(); URL.revokeObjectURL(url)
    }

    // ── Section renderer ──
    const toggleSection = (key: string) => setExpandedSection(expandedSection === key ? null : key)

    const renderTeamSection = (key: string, title: string, color: string, icon: any, teamUsers: any[], teamStats: any) => {
        const Icon = icon
        const isOpen = expandedSection === key
        const maxRev = Math.max(...teamUsers.map(u => getUserStats(u.uid).revenue), 1)
        const timelineData = buildTimeline(filteredItins.filter(i => teamUsers.map(u => u.uid).includes(i.createdBy)))

        return (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                {/* Section Header — clickable */}
                <button onClick={() => toggleSection(key)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/30 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}12` }}>
                            <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-serif text-base tracking-wide" style={{ color: '#052210' }}>{title}</h3>
                            <p className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{teamUsers.length} members · {teamStats.total} itineraries · ₹{teamStats.revenue.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex gap-4">
                            <div className="text-center">
                                <p className="font-sans text-[9px] uppercase" style={{ color: 'rgba(5,34,16,0.4)' }}>Total</p>
                                <p className="font-sans text-lg font-bold" style={{ color: '#052210' }}>{teamStats.total}</p>
                            </div>
                            <div className="text-center">
                                <p className="font-sans text-[9px] uppercase" style={{ color: 'rgba(5,34,16,0.4)' }}>Confirmed</p>
                                <p className="font-sans text-lg font-bold" style={{ color }}>{teamStats.confirmed}</p>
                            </div>
                            <div className="text-center">
                                <p className="font-sans text-[9px] uppercase" style={{ color: 'rgba(5,34,16,0.4)' }}>Conv.</p>
                                <p className="font-sans text-lg font-bold" style={{ color: teamStats.conversion >= 50 ? '#059669' : '#d97706' }}>{teamStats.conversion}%</p>
                            </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: 'rgba(5,34,16,0.3)' }} />
                    </div>
                </button>

                {isOpen && (
                    <div style={{ borderTop: '1px solid rgba(5,34,16,0.06)' }}>
                        {/* Team Timeline Chart */}
                        <div className="px-6 py-5">
                            <h4 className="font-sans text-[10px] tracking-wider uppercase font-semibold mb-3" style={{ color: 'rgba(5,34,16,0.4)' }}>
                                {title} — {period === "day" ? "Today Hourly" : period === "week" ? "This Week Daily" : "This Month Daily"}
                            </h4>
                            <BarChartComp data={timelineData} bars={[
                                { key: "total", color: `${color}90`, name: "Total" },
                                { key: "confirmed", color, name: "Confirmed" }
                            ]} />
                        </div>

                        {/* Individual User Table */}
                        <div style={{ borderTop: '1px solid rgba(5,34,16,0.06)' }}>
                            <div className="hidden sm:grid grid-cols-12 gap-2 px-6 py-2 font-sans text-[9px] tracking-wider uppercase font-semibold" style={{ color: '#9ca3af', borderBottom: '1px solid #f3f4f6' }}>
                                <div className="col-span-3">User</div>
                                <div className="col-span-1 text-center">Code</div>
                                <div className="col-span-2 text-center">Itineraries</div>
                                <div className="col-span-2 text-center">Conv.</div>
                                <div className="col-span-4 text-right">Revenue</div>
                            </div>
                            {teamUsers.map((u: any) => {
                                const s = getUserStats(u.uid)
                                return (
                                    <div key={u.uid} className="px-6 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer" style={{ borderBottom: '1px solid #f9fafb' }} onClick={() => setExpandedUser(expandedUser === u.uid ? null : u.uid)}>
                                        <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                                            <div className="col-span-3">
                                                <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{u.name}</p>
                                                <p className="font-sans text-[9px] uppercase" style={{ color }}>{roleLabel[u.role]}</p>
                                            </div>
                                            <div className="col-span-1 text-center">
                                                <span className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{u.employeeCode}</span>
                                            </div>
                                            <div className="col-span-2 text-center">
                                                <span className="font-sans text-sm font-bold" style={{ color: '#052210' }}>{s.total}</span>
                                                <span className="font-sans text-[10px] ml-1" style={{ color }}>{s.confirmed}✓</span>
                                            </div>
                                            <div className="col-span-2 text-center">
                                                <span className="px-2 py-0.5 rounded-full font-sans text-[10px] font-bold" style={{
                                                    background: s.conversion >= 50 ? '#ecfdf5' : s.conversion >= 25 ? '#fffbeb' : '#fef2f2',
                                                    color: s.conversion >= 50 ? '#059669' : s.conversion >= 25 ? '#d97706' : '#dc2626',
                                                }}>{s.conversion}%</span>
                                            </div>
                                            <div className="col-span-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                                                        <div className="h-1.5 rounded-full" style={{ width: `${(s.revenue / maxRev) * 100}%`, background: color }} />
                                                    </div>
                                                    <span className="font-sans text-xs font-bold min-w-[70px] text-right" style={{ color: '#052210' }}>₹{s.revenue.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Mobile */}
                                        <div className="sm:hidden space-y-1">
                                            <div className="flex justify-between items-center">
                                                <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{u.name}</p>
                                                <span className="font-sans text-xs font-bold" style={{ color }}>₹{s.revenue.toLocaleString()}</span>
                                            </div>
                                            <div className="flex gap-3 font-sans text-[10px]" style={{ color: '#6b7280' }}>
                                                <span>{s.total} itins</span><span>{s.confirmed} conf</span><span className="font-bold">{s.conversion}%</span>
                                            </div>
                                        </div>
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
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-16 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="font-serif text-3xl tracking-wide" style={{ color: '#052210' }}>KPI Analytics</h1>
                    <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Team performance · All departments</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Period Toggle */}
                    <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(5,34,16,0.1)' }}>
                        {(["day", "week", "month"] as Period[]).map(p => (
                            <button key={p} onClick={() => setPeriod(p)}
                                className="px-4 py-2 font-sans text-xs tracking-wider uppercase font-semibold transition-all"
                                style={{
                                    background: period === p ? '#052210' : 'transparent',
                                    color: period === p ? '#FFFFFF' : 'rgba(5,34,16,0.5)',
                                }}>
                                {p === "day" ? "Today" : p === "week" ? "Week" : "Month"}
                            </button>
                        ))}
                    </div>
                    <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl font-sans text-xs tracking-wider uppercase font-semibold transition-all hover:scale-105" style={{ background: '#052210', color: '#fff' }}>
                        <Download className="w-3.5 h-3.5" /> Export
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} />
                </div>
            ) : (
                <>
                    {/* Global KPI Summary Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: "Itineraries", value: globalStats.total, icon: FileText, color: "#06a15c" },
                            { label: "Confirmed", value: globalStats.confirmed, icon: CheckCircle, color: "#34d399" },
                            { label: "Conversion", value: `${globalStats.conversion}%`, icon: TrendingUp, color: "#60a5fa" },
                            { label: "Revenue", value: `₹${globalStats.revenue.toLocaleString()}`, icon: DollarSign, color: "#f472b6" },
                        ].map(kpi => (
                            <div key={kpi.label} className="rounded-2xl p-5 transition-all hover:-translate-y-0.5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${kpi.color}12` }}>
                                    <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                                </div>
                                <p className="font-sans text-[9px] tracking-wider uppercase font-semibold" style={{ color: 'rgba(5,34,16,0.4)' }}>{kpi.label}</p>
                                <p className="font-serif text-2xl font-bold" style={{ color: '#052210' }}>{kpi.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Overall Timeline + Status Pie */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                            <h3 className="font-serif text-sm tracking-wider uppercase mb-3" style={{ color: '#052210' }}>
                                {period === "day" ? "Today — Hourly" : period === "week" ? "This Week — Daily" : "This Month — Daily"} Overview
                            </h3>
                            <LineChartComp
                                data={buildTimeline(filteredItins)}
                                lines={[
                                    { key: "total", color: "#06a15c", name: "Total" },
                                    { key: "confirmed", color: "#34d399", name: "Confirmed" }
                                ]}
                            />
                        </div>
                        <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                            <h3 className="font-serif text-sm tracking-wider uppercase mb-3" style={{ color: '#052210' }}>Status Distribution</h3>
                            {statusData.length > 0 ? <PieChartComp data={statusData} /> : <p className="text-center py-16 font-sans text-sm" style={{ color: 'rgba(5,34,16,0.3)' }}>No data for this period</p>}
                        </div>
                    </div>

                    {/* Department Comparison Bar */}
                    <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                        <h3 className="font-serif text-sm tracking-wider uppercase mb-3" style={{ color: '#052210' }}>Department Comparison</h3>
                        <BarChartComp data={[
                            { label: "Sales", total: salesStats.total, confirmed: salesStats.confirmed },
                            { label: "Pre-Ops", total: preOpsStats.total, confirmed: preOpsStats.confirmed },
                            { label: "Post-Ops", total: postOpsStats.total, confirmed: postOpsStats.confirmed },
                        ]} bars={[
                            { key: "total", color: "#06a15c90", name: "Total" },
                            { key: "confirmed", color: "#06a15c", name: "Confirmed" }
                        ]} />
                    </div>

                    {/* Team Lead Performance */}
                    {(salesLeads.length > 0 || opsLeads.length > 0) && (
                        <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(5,34,16,0.06)' }}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
                                    <Award className="w-4 h-4" style={{ color: '#f59e0b' }} />
                                </div>
                                <h3 className="font-serif text-base tracking-wide" style={{ color: '#052210' }}>Team Lead Performance</h3>
                            </div>
                            <div className="hidden sm:grid grid-cols-12 gap-2 px-6 py-2 font-sans text-[9px] tracking-wider uppercase font-semibold" style={{ color: '#9ca3af', borderBottom: '1px solid #f3f4f6' }}>
                                <div className="col-span-3">Lead</div>
                                <div className="col-span-1 text-center">Team</div>
                                <div className="col-span-2 text-center">Itineraries</div>
                                <div className="col-span-2 text-center">Confirmed</div>
                                <div className="col-span-2 text-center">Conv.</div>
                                <div className="col-span-2 text-right">Revenue</div>
                            </div>
                            {[...salesLeads, ...opsLeads, ...preOpsLeads, ...postOpsLeads].map((lead: any) => {
                                const perf = getLeadPerf(lead)
                                const isSales = lead.role === "sales_lead"
                                return (
                                    <div key={lead.uid} className="px-6 py-3.5 hover:bg-gray-50/50 transition-colors" style={{ borderBottom: '1px solid #f9fafb' }}>
                                        <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                                            <div className="col-span-3">
                                                <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{perf.name}</p>
                                                <p className="font-sans text-[9px] uppercase" style={{ color: isSales ? '#06a15c' : '#3b82f6' }}>{perf.code} · {isSales ? "Sales" : "Ops"}</p>
                                            </div>
                                            <div className="col-span-1 text-center"><span className="font-sans text-sm font-bold" style={{ color: '#8b5cf6' }}>{perf.memberCount}</span></div>
                                            <div className="col-span-2 text-center"><span className="font-sans text-sm font-bold" style={{ color: '#052210' }}>{perf.total}</span></div>
                                            <div className="col-span-2 text-center"><span className="font-sans text-sm font-bold" style={{ color: '#06a15c' }}>{perf.confirmed}</span></div>
                                            <div className="col-span-2 text-center">
                                                <span className="px-2 py-0.5 rounded-full font-sans text-[10px] font-bold" style={{
                                                    background: perf.conversion >= 50 ? '#ecfdf5' : perf.conversion >= 25 ? '#fffbeb' : '#fef2f2',
                                                    color: perf.conversion >= 50 ? '#059669' : perf.conversion >= 25 ? '#d97706' : '#dc2626',
                                                }}>{perf.conversion}%</span>
                                            </div>
                                            <div className="col-span-2 text-right"><span className="font-sans text-sm font-bold" style={{ color: '#052210' }}>₹{perf.revenue.toLocaleString()}</span></div>
                                        </div>
                                        <div className="sm:hidden space-y-1">
                                            <div className="flex justify-between">
                                                <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{perf.name} <span className="text-[9px]" style={{ color: '#9ca3af' }}>{perf.memberCount} members</span></p>
                                                <span className="font-sans text-sm font-bold" style={{ color: '#06a15c' }}>₹{perf.revenue.toLocaleString()}</span>
                                            </div>
                                            <div className="flex gap-3 font-sans text-[10px]" style={{ color: '#6b7280' }}>
                                                <span>{perf.total} itins</span><span>{perf.confirmed} conf</span><span className="font-bold">{perf.conversion}%</span>
                                            </div>
                                        </div>
                                        {expandedUser === lead.uid && (
                                            <div className="mt-4 p-4 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e5e7eb' }}>
                                                <h5 className="font-sans text-xs font-bold mb-2" style={{ color: '#052210' }}>Personal Analytics ({period})</h5>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                    <div>
                                                        <p className="font-sans text-[10px] uppercase tracking-wider" style={{ color: '#6b7280' }}>Total Handled</p>
                                                        <p className="font-sans text-lg font-bold" style={{ color: isSales ? '#06a15c' : '#3b82f6' }}>{perf.total}</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-sans text-[10px] uppercase tracking-wider" style={{ color: '#6b7280' }}>Confirmed</p>
                                                        <p className="font-sans text-lg font-bold" style={{ color: isSales ? '#06a15c' : '#3b82f6' }}>{perf.confirmed}</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-sans text-[10px] uppercase tracking-wider" style={{ color: '#6b7280' }}>Conversion</p>
                                                        <p className="font-sans text-lg font-bold" style={{ color: isSales ? '#06a15c' : '#3b82f6' }}>{perf.conversion}%</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-sans text-[10px] uppercase tracking-wider" style={{ color: '#6b7280' }}>Total Profit Generated</p>
                                                        <p className="font-sans text-lg font-bold" style={{ color: isSales ? '#06a15c' : '#3b82f6' }}>₹{perf.revenue.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Expandable Department Sections */}
                    {renderTeamSection("sales", "Sales Performance", "#06a15c", Briefcase, salesUsers, salesStats)}
                    {renderTeamSection("preops", "Pre-Operations Performance", "#3b82f6", Wrench, preOpsUsers, preOpsStats)}
                    {postOpsUsers.length > 0 && renderTeamSection("postops", "Post-Operations Performance", "#f59e0b", ClipboardCheck, postOpsUsers, postOpsStats)}
                </>
            )}
        </div>
    )
}
