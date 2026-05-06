"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getUsers, getDestinations, getItineraries } from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
    Users, MapPin, FileText, TrendingUp, Plus, ChevronRight, Download,
    DollarSign, CheckCircle, BarChart3, Award, Briefcase, Wrench, Crown, CreditCard, Target
} from "lucide-react"

const RechartsBarChart = dynamic(() => import("recharts").then(mod => {
    const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } = mod
    return function Chart({ data }: { data: any[] }) {
        return (
            <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(5,34,16,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(6,161,92,0.15)', fontSize: 12 }} />
                    <Bar dataKey="value" fill="#06a15c" radius={[6, 6, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        )
    }
}), { ssr: false })

const RechartsPieChart = dynamic(() => import("recharts").then(mod => {
    const { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } = mod
    const COLORS = ["#06a15c", "#60a5fa", "#f59e0b", "#a78bfa", "#f472b6", "#14b8a6"]
    return function Chart({ data }: { data: any[] }) {
        return (
            <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 9 }}>
                        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                </PieChart>
            </ResponsiveContainer>
        )
    }
}), { ssr: false })

const RechartsLineChart = dynamic(() => import("recharts").then(mod => {
    const { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } = mod
    return function Chart({ data }: { data: any[] }) {
        return (
            <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(5,34,16,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(6,161,92,0.15)', fontSize: 12 }} />
                    <Line type="monotone" dataKey="value" stroke="#06a15c" strokeWidth={2.5} dot={{ r: 4, fill: '#06a15c' }} />
                    <Line type="monotone" dataKey="confirmed" stroke="#34d399" strokeWidth={2} dot={{ r: 3, fill: '#34d399' }} />
                </LineChart>
            </ResponsiveContainer>
        )
    }
}), { ssr: false })

export default function AdminDashboard() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <AdminContent />
        </ProtectedRoute>
    )
}

const roleLabels: Record<string, string> = {
    admin: "Admin", owner: "Owner", sales_lead: "Sales Lead", sales: "Sales",
    pre_ops: "Pre-Operations", pre_ops_lead: "Pre-Ops Lead",
    post_ops_lead: "Post-Ops Lead", post_ops: "Post Ops"
}

function AdminContent() {
    const { userProfile } = useAuth()
    const [allItineraries, setAllItineraries] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [destinations, setDestinations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        try {
            const [u, d, i] = await Promise.all([getUsers(), getDestinations(), getItineraries()])
            setUsers(u); setDestinations(d); setAllItineraries(i)
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    // ── Global KPIs ──
    const totalRevenue = allItineraries.reduce((s, i) => s + Math.round((Number((i.plans?.find((p:any) => p.planId === i.selectedPlanId)?.totalPrice || i.plans?.[0]?.totalPrice || 0)) || 0) * ((Number(i.margin) || 15) / (100 + (Number(i.margin) || 15)))), 0)
    const confirmedItins = allItineraries.filter((i: any) => ["handover", "completed"].includes(i.status))
    const confirmedRevenue = confirmedItins.reduce((s: number, i: any) => s + Math.round((Number((i.plans?.find((p:any) => p.planId === i.selectedPlanId)?.totalPrice || i.plans?.[0]?.totalPrice || 0)) || 0) * ((Number(i.margin) || 15) / (100 + (Number(i.margin) || 15)))), 0)
    const avgDeal = confirmedItins.length > 0 ? Math.round(confirmedRevenue / confirmedItins.length) : 0
    const conversionRate = allItineraries.length > 0 ? Math.round((confirmedItins.length / allItineraries.length) * 100) : 0


    // Trip stats
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6);

    const onTrip = allItineraries.filter((i: any) => i.status === 'post-ops');
    
    // Date Helpers
    const isDateEq = (dt: any, targetStr: any) => dt && new Date(dt).toISOString().split('T')[0] === targetStr;
    const isDateInWeek = (dt: any) => {
        if (!dt) return false;
        const d = new Date(dt);
        const ymd = new Date(d.toISOString().split('T')[0]);
        const s = new Date(startOfWeek.toISOString().split('T')[0]);
        const e = new Date(endOfWeek.toISOString().split('T')[0]);
        return ymd >= s && ymd <= e;
    };

    const startingToday = allItineraries.filter((i: any) => isDateEq(i.startDate, todayStr));
    const endingToday = allItineraries.filter((i: any) => isDateEq(i.endDate, todayStr));
    const startingTomorrow = allItineraries.filter((i: any) => isDateEq(i.startDate, tomorrowStr));
    const endingTomorrow = allItineraries.filter((i: any) => isDateEq(i.endDate, tomorrowStr));
    const startingThisWeek = allItineraries.filter((i: any) => isDateInWeek(i.startDate));

    const pendingPayments = allItineraries.filter(i => {
        const paid = Number(i.amountPaid) || 0
        const total = Number((i.plans?.find((p:any) => p.planId === i.selectedPlanId)?.totalPrice || i.plans?.[0]?.totalPrice || 0)) || 0
        return total > 0 && paid < total && i.status !== "draft"
    })

    // ── Department breakdowns ──
    const salesUsers = users.filter((u: any) => u.role === "sales" || u.role === "sales_lead")
    const opsUsers = users.filter((u: any) => u.role === "pre_ops" || u.role === "pre_ops_lead" || u.role === "post_ops")
    const salesLeads = users.filter((u: any) => u.role === "sales_lead")
    const opsLeads = users.filter((u: any) => u.role === "pre_ops_lead")

    // ── Per-user KPI builder ──
    const getUserKpis = (userList: any[]) => userList.map((u: any) => {
        const itins = allItineraries.filter((i: any) => i.createdBy === u.uid)
        const conf = itins.filter((i: any) => ["handover", "completed"].includes(i.status))
        const rev = conf.reduce((s: number, i: any) => s + Math.round((Number((i.plans?.find((p:any) => p.planId === i.selectedPlanId)?.totalPrice || i.plans?.[0]?.totalPrice || 0)) || 0) * ((Number(i.margin) || 15) / (100 + (Number(i.margin) || 15)))), 0)
        return {
            uid: u.uid, name: u.name || u.email || "Unknown", role: u.role,
            employeeCode: u.employeeCode || "",
            total: itins.length, confirmed: conf.length, revenue: rev,
            conversion: itins.length > 0 ? Math.round((conf.length / itins.length) * 100) : 0,
        }
    }).sort((a, b) => b.revenue - a.revenue)

    const salesKpis = getUserKpis(salesUsers)
    const opsKpis = getUserKpis(opsUsers)
    const allUserKpis = getUserKpis(users.filter(u => u.role !== "admin" && u.role !== "owner"))

    // Lead performance
    const getLeadStats = (lead: any) => {
        const members = users.filter((u: any) => u.leadId === lead.uid)
        const memberUids = [lead.uid, ...members.map((m: any) => m.uid)]
        const itins = allItineraries.filter((i: any) => memberUids.includes(i.createdBy))
        const conf = itins.filter((i: any) => ["handover", "completed"].includes(i.status))
        const rev = conf.reduce((s: number, i: any) => s + Math.round((Number((i.plans?.find((p:any) => p.planId === i.selectedPlanId)?.totalPrice || i.plans?.[0]?.totalPrice || 0)) || 0) * ((Number(i.margin) || 15) / (100 + (Number(i.margin) || 15)))), 0)
        return {
            name: lead.name, code: lead.employeeCode, memberCount: members.length,
            total: itins.length, confirmed: conf.length, revenue: rev,
            conversion: itins.length > 0 ? Math.round((conf.length / itins.length) * 100) : 0,
        }
    }

    // ── Chart data ──
    const now = new Date()
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = d.toLocaleDateString('en-US', { month: 'short' })
        const monthItins = allItineraries.filter((it: any) => {
            if (!it.createdAt) return false
            const cd = it.createdAt.toDate ? it.createdAt.toDate() : new Date(it.createdAt)
            return `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, '0')}` === key
        })
        const conf = monthItins.filter((it: any) => ["handover", "completed"].includes(it.status)).length
        return { label, value: monthItins.length, confirmed: conf }
    })

    // Status distribution pie
    const statusDist = ["draft", "handover", "post-ops", "completed"]
        .map(s => ({ name: s, value: allItineraries.filter((i: any) => i.status === s).length }))
        .filter(s => s.value > 0)

    // Destination breakdown bar
    const destMap: Record<string, number> = {}
    allItineraries.forEach((i: any) => { if (i.destination) destMap[i.destination] = (destMap[i.destination] || 0) + 1 })
    const destData = Object.entries(destMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }))

    // ── Export CSV ──
    const exportReport = () => {
        const headers = ["Name", "Role", "Employee Code", "Itineraries", "Confirmed", "Conversion %", "Revenue"]
        const rows = allUserKpis.map(u => [u.name, roleLabels[u.role] || u.role, u.employeeCode, u.total, u.confirmed, u.conversion, u.revenue])
        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url; a.download = `kpi-report-${new Date().toISOString().split('T')[0]}.csv`
        a.click(); URL.revokeObjectURL(url)
    }

    const kpis = [
        { label: "Revenue", value: `₹${confirmedRevenue.toLocaleString()}`, icon: DollarSign, color: "#f472b6" },
        { label: "Avg Deal", value: `₹${avgDeal.toLocaleString()}`, icon: TrendingUp, color: "#f59e0b" },
        { label: "Total Users", value: users.length, icon: Users, color: "#8b5cf6" },
        { label: "Destinations", value: destinations.length, icon: MapPin, color: "#34d399" },
        { label: "Itineraries", value: allItineraries.length, icon: FileText, color: "#60a5fa" },
        { label: "Confirmed", value: confirmedItins.length, icon: CheckCircle, color: "#06a15c" },
        { label: "Sales Team", value: salesUsers.length, icon: Briefcase, color: "#a78bfa" },
    ]

    const tripKpis = [
        { label: "On-Trip Clients", value: onTrip.length, icon: Users, color: "#f59e0b" },
        { label: "Starting Today", value: startingToday.length, icon: Target, color: "#34d399" },
        { label: "Ending Today", value: endingToday.length, icon: MapPin, color: "#ef4444" },
        { label: "Starting Tomorrow", value: startingTomorrow.length, icon: Target, color: "#60a5fa" },
        { label: "Ending Tomorrow", value: endingTomorrow.length, icon: MapPin, color: "#f43f5e" },
        { label: "Starting This Week", value: startingThisWeek.length, icon: Target, color: "#8b5cf6" },
        { label: "Pending Payments", value: pendingPayments.length, icon: CreditCard, color: "#eab308" },
    ]

    const maxRev = Math.max(...allUserKpis.map(u => u.revenue), 1)

    const renderUserTable = (title: string, data: any[], color: string, icon: any) => {
        const Icon = icon
        if (data.length === 0) return null
        return (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(5,34,16,0.06)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}12` }}>
                            <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <h3 className="font-serif text-sm tracking-wider uppercase" style={{ color }}>{title}</h3>
                    </div>
                    <span className="font-sans text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}10`, color }}>{data.length}</span>
                </div>
                <div className="hidden sm:grid grid-cols-12 gap-3 px-6 py-2.5 font-sans text-[9px] tracking-wider uppercase font-semibold" style={{ color: '#9ca3af', borderBottom: '1px solid #f3f4f6' }}>
                    <div className="col-span-3">User</div>
                    <div className="col-span-1 text-center">Code</div>
                    <div className="col-span-2 text-center">Itineraries</div>
                    <div className="col-span-2 text-center">Conv.</div>
                    <div className="col-span-4 text-right">Revenue</div>
                </div>
                {data.map((u, idx) => (
                    <div key={idx} className="px-6 py-3 hover:bg-gray-50/50 transition-colors" style={{ borderBottom: '1px solid #f9fafb' }}>
                        <div className="hidden sm:grid grid-cols-12 gap-3 items-center">
                            <div className="col-span-3">
                                <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{u.name}</p>
                                <p className="font-sans text-[9px] uppercase tracking-wider" style={{ color: '#9ca3af' }}>{roleLabels[u.role]}</p>
                            </div>
                            <div className="col-span-1 text-center">
                                <span className="font-sans text-[10px] font-medium" style={{ color: 'rgba(5,34,16,0.5)' }}>{u.employeeCode}</span>
                            </div>
                            <div className="col-span-2 text-center">
                                <span className="font-sans text-sm font-bold" style={{ color: '#052210' }}>{u.total}</span>
                                <span className="font-sans text-[10px] ml-1" style={{ color: '#06a15c' }}>({u.confirmed}✓)</span>
                            </div>
                            <div className="col-span-2 text-center">
                                <span className="px-2 py-0.5 rounded-full font-sans text-[10px] font-bold" style={{
                                    background: u.conversion >= 50 ? '#ecfdf5' : u.conversion >= 25 ? '#fffbeb' : '#fef2f2',
                                    color: u.conversion >= 50 ? '#059669' : u.conversion >= 25 ? '#d97706' : '#dc2626',
                                }}>{u.conversion}%</span>
                            </div>
                            <div className="col-span-4">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                                        <div className="h-1.5 rounded-full" style={{ width: `${(u.revenue / maxRev) * 100}%`, background: `linear-gradient(90deg, ${color}, ${color}90)` }} />
                                    </div>
                                    <span className="font-sans text-xs font-bold min-w-[70px] text-right" style={{ color: '#052210' }}>₹{u.revenue.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="sm:hidden space-y-1.5">
                            <div className="flex justify-between">
                                <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{u.name} <span className="text-[9px] uppercase" style={{ color: '#9ca3af' }}>{u.employeeCode}</span></p>
                                <span className="font-sans text-sm font-bold" style={{ color }}>{u.conversion}%</span>
                            </div>
                            <div className="flex gap-3 font-sans text-[10px]" style={{ color: '#6b7280' }}>
                                <span>{u.total} itins</span><span>{u.confirmed} conf</span><span className="font-bold" style={{ color: '#06a15c' }}>₹{u.revenue.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-16">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="font-serif text-3xl tracking-wide" style={{ color: '#052210' }}>Admin Dashboard</h1>
                    <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Welcome, {userProfile?.name} · Complete KPI overview</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={exportReport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs tracking-wider uppercase transition-all hover:scale-105" style={{ background: '#052210', color: '#FFFFFF' }}>
                        <Download className="w-3.5 h-3.5" /> Export Report
                    </button>
                    <Link href="/admin/users" className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs tracking-wider uppercase transition-all hover:scale-105" style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c', border: '1px solid rgba(6,161,92,0.2)' }}>
                        <Users className="w-3.5 h-3.5" /> Users
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} />
                </div>
            ) : (
                <>
                    {/* Global KPIs & Trip Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {[...kpis, ...tripKpis].map(kpi => (
                            <div key={kpi.label} className="rounded-2xl p-4 transition-all hover:-translate-y-0.5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${kpi.color}10` }}>
                                    <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                                </div>
                                <p className="font-sans text-[9px] tracking-wider uppercase font-semibold" style={{ color: 'rgba(5,34,16,0.45)' }}>{kpi.label}</p>
                                <p className="font-serif text-xl font-bold mt-0.5" style={{ color: '#052210' }}>{kpi.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Monthly Trend Line */}
                        <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                            <h3 className="font-serif text-sm tracking-wider uppercase mb-4" style={{ color: '#052210' }}>Monthly Trend</h3>
                            <RechartsLineChart data={monthlyData} />
                            <div className="flex gap-4 mt-2 justify-center">
                                <span className="flex items-center gap-1 font-sans text-[9px]"><span className="w-2 h-2 rounded-full" style={{ background: '#06a15c' }} /> Total</span>
                                <span className="flex items-center gap-1 font-sans text-[9px]"><span className="w-2 h-2 rounded-full" style={{ background: '#34d399' }} /> Confirmed</span>
                            </div>
                        </div>

                        {/* Status Distribution Pie */}
                        <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                            <h3 className="font-serif text-sm tracking-wider uppercase mb-4" style={{ color: '#052210' }}>Status Distribution</h3>
                            {statusDist.length > 0 ? <RechartsPieChart data={statusDist} /> : <p className="text-center py-16 font-sans text-sm" style={{ color: 'rgba(5,34,16,0.3)' }}>No data</p>}
                        </div>

                        {/* Top Destinations Bar */}
                        <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                            <h3 className="font-serif text-sm tracking-wider uppercase mb-4" style={{ color: '#052210' }}>Top Destinations</h3>
                            {destData.length > 0 ? <RechartsBarChart data={destData} /> : <p className="text-center py-16 font-sans text-sm" style={{ color: 'rgba(5,34,16,0.3)' }}>No data</p>}
                        </div>
                    </div>

                    {/* Team Lead Performance */}
                    {(salesLeads.length > 0 || opsLeads.length > 0) && (
                        <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(5,34,16,0.06)' }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
                                    <Award className="w-4 h-4" style={{ color: '#f59e0b' }} />
                                </div>
                                <h3 className="font-serif text-sm tracking-wider uppercase" style={{ color: '#f59e0b' }}>Team Lead Performance</h3>
                            </div>
                            <div className="hidden sm:grid grid-cols-12 gap-3 px-6 py-2 font-sans text-[9px] tracking-wider uppercase font-semibold" style={{ color: '#9ca3af', borderBottom: '1px solid #f3f4f6' }}>
                                <div className="col-span-3">Lead</div>
                                <div className="col-span-1 text-center">Members</div>
                                <div className="col-span-2 text-center">Itineraries</div>
                                <div className="col-span-2 text-center">Confirmed</div>
                                <div className="col-span-2 text-center">Conv.</div>
                                <div className="col-span-2 text-right">Revenue</div>
                            </div>
                            {[...salesLeads, ...opsLeads].map((lead: any) => {
                                const stats = getLeadStats(lead)
                                const isSales = lead.role === "sales_lead"
                                return (
                                    <div key={lead.uid} className="px-6 py-3 hover:bg-gray-50/50 transition-colors" style={{ borderBottom: '1px solid #f9fafb' }}>
                                        <div className="hidden sm:grid grid-cols-12 gap-3 items-center">
                                            <div className="col-span-3">
                                                <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{stats.name}</p>
                                                <p className="font-sans text-[9px] uppercase" style={{ color: isSales ? '#06a15c' : '#3b82f6' }}>{stats.code} · {isSales ? "Sales Lead" : "Ops Lead"}</p>
                                            </div>
                                            <div className="col-span-1 text-center"><span className="font-sans text-sm font-bold" style={{ color: '#8b5cf6' }}>{stats.memberCount}</span></div>
                                            <div className="col-span-2 text-center"><span className="font-sans text-sm font-bold" style={{ color: '#052210' }}>{stats.total}</span></div>
                                            <div className="col-span-2 text-center"><span className="font-sans text-sm font-bold" style={{ color: '#06a15c' }}>{stats.confirmed}</span></div>
                                            <div className="col-span-2 text-center">
                                                <span className="px-2 py-0.5 rounded-full font-sans text-[10px] font-bold" style={{
                                                    background: stats.conversion >= 50 ? '#ecfdf5' : stats.conversion >= 25 ? '#fffbeb' : '#fef2f2',
                                                    color: stats.conversion >= 50 ? '#059669' : stats.conversion >= 25 ? '#d97706' : '#dc2626',
                                                }}>{stats.conversion}%</span>
                                            </div>
                                            <div className="col-span-2 text-right"><span className="font-sans text-sm font-bold" style={{ color: '#052210' }}>₹{stats.revenue.toLocaleString()}</span></div>
                                        </div>
                                        <div className="sm:hidden space-y-1">
                                            <div className="flex justify-between">
                                                <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{stats.name}</p>
                                                <span className="font-sans text-sm font-bold" style={{ color: '#06a15c' }}>₹{stats.revenue.toLocaleString()}</span>
                                            </div>
                                            <div className="flex gap-3 font-sans text-[10px]" style={{ color: '#6b7280' }}>
                                                <span>{stats.memberCount} members</span><span>{stats.total} itins</span><span>{stats.conversion}% conv</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Sales Department */}
                    {renderUserTable("Sales Department", salesKpis, "#06a15c", Briefcase)}

                    {/* Operations Department */}
                    {renderUserTable("Operations Department", opsKpis, "#3b82f6", Wrench)}

                    {/* Recent Itineraries */}
                    <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(5,34,16,0.06)' }}>
                            <h3 className="font-serif text-sm tracking-wider uppercase" style={{ color: '#052210' }}>Latest Itineraries</h3>
                            <Link href="/admin/kanban" className="font-sans text-[10px] tracking-wider uppercase" style={{ color: '#06a15c' }}>View Pipeline →</Link>
                        </div>
                        {allItineraries.slice(0, 8).map((itin: any) => (
                            <Link key={itin.id} href={`/sales/itinerary/${itin.id}`} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors block" style={{ borderBottom: '1px solid #f9fafb' }}>
                                <div>
                                    <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{itin.customerName || "Unnamed"}</p>
                                    <p className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.45)' }}>{itin.destination || "—"} · by {itin.createdByName || "—"}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {(itin.plans?.find((p:any) => p.planId === itin.selectedPlanId)?.totalPrice || itin.plans?.[0]?.totalPrice || 0) && <span className="font-sans text-xs font-bold" style={{ color: '#052210' }}>₹{Number((itin.plans?.find((p:any) => p.planId === itin.selectedPlanId)?.totalPrice || itin.plans?.[0]?.totalPrice || 0)).toLocaleString()}</span>}
                                    <span className="px-2 py-0.5 rounded-full font-sans text-[9px] font-bold uppercase" style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c' }}>{itin.status}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
