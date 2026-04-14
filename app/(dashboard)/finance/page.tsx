"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getItineraries } from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { DollarSign, TrendingUp, Clock, CheckCircle, AlertTriangle, Receipt, FileText, ArrowRight } from "lucide-react"

export default function FinanceDashboard() {
    return (
        <ProtectedRoute allowedRoles={["finance", "finance_lead", "admin", "owner"]}>
            <FinanceContent />
        </ProtectedRoute>
    )
}

function FinanceContent() {
    const { userProfile } = useAuth()
    const [itineraries, setItineraries] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        try {
            const all = await getItineraries()
            // Only show itineraries that are "sent" or beyond (not draft)
            setItineraries(all.filter((i: any) => i.status && i.status !== "draft"))
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const totalPackageValue = itineraries.reduce((s, i) => s + (Number(i.totalPrice) || 0), 0)
    const totalCollected = itineraries.reduce((s, i) => s + (Number(i.amountPaid) || 0), 0)
    const totalPending = totalPackageValue - totalCollected
    const fullyPaid = itineraries.filter(i => Number(i.amountPaid) >= Number(i.totalPrice) && Number(i.totalPrice) > 0)
    const partiallyPaid = itineraries.filter(i => Number(i.amountPaid) > 0 && Number(i.amountPaid) < Number(i.totalPrice))
    const notPaid = itineraries.filter(i => !Number(i.amountPaid) && Number(i.totalPrice) > 0)

    const kpis = [
        { label: "Total Package Value", value: `₹${totalPackageValue.toLocaleString()}`, icon: DollarSign, color: "#8b5cf6" },
        { label: "Total Collected", value: `₹${totalCollected.toLocaleString()}`, icon: CheckCircle, color: "#06a15c" },
        { label: "Pending Balance", value: `₹${totalPending.toLocaleString()}`, icon: Clock, color: "#f59e0b" },
        { label: "Fully Paid", value: fullyPaid.length, icon: TrendingUp, color: "#34d399" },
        { label: "Partial Payment", value: partiallyPaid.length, icon: AlertTriangle, color: "#f97316" },
        { label: "No Payment Yet", value: notPaid.length, icon: AlertTriangle, color: "#ef4444" },
    ]

    // Recent itins needing collection
    const needsAttention = [...partiallyPaid, ...notPaid].slice(0, 8)

    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="font-serif text-2xl sm:text-3xl tracking-wide" style={{ color: '#052210' }}>Finance Dashboard</h1>
                    <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Welcome, {userProfile?.name}</p>
                </div>
                <Link
                    href="/finance/payments"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs tracking-wider uppercase transition-all hover:scale-105"
                    style={{ background: '#06a15c', color: '#FFFFFF' }}
                >
                    <Receipt className="w-4 h-4" /> Manage Payments
                </Link>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {kpis.map(kpi => (
                    <div key={kpi.label} className="rounded-2xl p-4 transition-all hover:-translate-y-0.5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${kpi.color}12` }}>
                            <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                        </div>
                        <p className="font-sans text-[9px] tracking-wider uppercase font-semibold mb-1" style={{ color: 'rgba(5,34,16,0.45)' }}>{kpi.label}</p>
                        <p className="font-serif text-xl font-bold" style={{ color: '#052210' }}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Needs Attention */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(5,34,16,0.06)' }}>
                    <h3 className="font-serif text-base tracking-wide" style={{ color: '#052210' }}>Requires Payment Collection</h3>
                    <Link href="/finance/payments" className="font-sans text-[10px] tracking-wider uppercase" style={{ color: '#06a15c' }}>View All →</Link>
                </div>
                {loading ? (
                    <div className="px-6 py-8 text-center"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} /></div>
                ) : needsAttention.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#06a15c', opacity: 0.3 }} />
                        <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>All payments are up to date!</p>
                    </div>
                ) : needsAttention.map((itin: any) => {
                    const paid = Number(itin.amountPaid) || 0
                    const total = Number(itin.totalPrice) || 0
                    const balance = total - paid
                    const pct = total > 0 ? Math.round((paid / total) * 100) : 0
                    return (
                        <Link key={itin.id} href={`/finance/itinerary/${itin.id}`}
                            className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/60 transition-colors block"
                            style={{ borderBottom: '1px solid rgba(5,34,16,0.04)' }}
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: paid > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)' }}>
                                    <DollarSign className="w-4 h-4" style={{ color: paid > 0 ? '#f59e0b' : '#ef4444' }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{itin.customerName || "Unnamed"}</p>
                                    <p className="font-sans text-[11px] truncate" style={{ color: 'rgba(5,34,16,0.45)' }}>{itin.destination} · {itin.quoteId}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 max-w-[100px] h-1 rounded-full bg-gray-100">
                                            <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: pct === 0 ? '#ef4444' : '#f59e0b' }} />
                                        </div>
                                        <span className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{pct}%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-shrink-0 text-right ml-4">
                                <p className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>Balance</p>
                                <p className="font-serif text-sm font-bold" style={{ color: '#ef4444' }}>₹{balance.toLocaleString()}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 ml-3 flex-shrink-0" style={{ color: 'rgba(5,34,16,0.25)' }} />
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
