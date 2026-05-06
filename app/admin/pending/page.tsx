"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getItineraries, updateItinerary } from "@/lib/firestore"
import { AlertCircle, CheckCircle2, Clock, DollarSign, CreditCard, Search } from "lucide-react"

export default function PendingTasksPage() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <PendingContent />
        </ProtectedRoute>
    )
}

function PendingContent() {
    const [itineraries, setItineraries] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [tab, setTab] = useState<"payments" | "tasks">("payments")

    useEffect(() => { loadData() }, [])
    const loadData = async () => {
        try { setItineraries(await getItineraries()) } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    // Payment status: pending, partial, paid
    const pendingPayments = itineraries.filter(i => {
        const paid = Number(i.amountPaid) || 0
        const total = Number((i.plans?.find((p:any) => p.planId === i.selectedPlanId)?.totalPrice || i.plans?.[0]?.totalPrice || 0)) || 0
        return total > 0 && paid < total && i.status !== "draft"
    })

    const filtered = pendingPayments.filter(i => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (i.customerName || "").toLowerCase().includes(q) || (i.quoteId || "").toLowerCase().includes(q)
    })

    const togglePaymentStatus = async (itin: any) => {
        const total = Number((itin.plans?.find((p:any) => p.planId === itin.selectedPlanId)?.totalPrice || itin.plans?.[0]?.totalPrice || 0)) || 0
        const newPaid = Number(itin.amountPaid || 0) >= total ? 0 : total
        await updateItinerary(itin.id, { amountPaid: newPaid })
        loadData()
    }

    const getPaymentPercent = (itin: any) => {
        const total = Number((itin.plans?.find((p:any) => p.planId === itin.selectedPlanId)?.totalPrice || itin.plans?.[0]?.totalPrice || 0)) || 1
        const paid = Number(itin.amountPaid) || 0
        return Math.min(Math.round((paid / total) * 100), 100)
    }

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="font-serif text-3xl tracking-wide" style={{ color: '#052210' }}>Pending Tasks</h1>
                <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Payment tracking & task management</p>
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(5,34,16,0.1)' }}>
                <button onClick={() => setTab("payments")} className="flex-1 px-4 py-3 font-sans text-xs tracking-wider uppercase font-semibold transition-all flex items-center justify-center gap-2"
                    style={{ background: tab === "payments" ? '#052210' : 'transparent', color: tab === "payments" ? '#fff' : 'rgba(5,34,16,0.5)' }}>
                    <CreditCard className="w-3.5 h-3.5" /> Payment Checklist
                </button>
                <button onClick={() => setTab("tasks")} className="flex-1 px-4 py-3 font-sans text-xs tracking-wider uppercase font-semibold transition-all flex items-center justify-center gap-2"
                    style={{ background: tab === "tasks" ? '#052210' : 'transparent', color: tab === "tasks" ? '#fff' : 'rgba(5,34,16,0.5)' }}>
                    <AlertCircle className="w-3.5 h-3.5" /> Pending SOPs
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(5,34,16,0.3)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-2xl font-sans text-sm" placeholder="Search by customer name or quote ID..." style={{ border: '1px solid rgba(5,34,16,0.08)', outline: 'none', background: '#fff' }} />
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} /></div>
            ) : tab === "payments" ? (
                /* Payment Checklist */
                <div className="space-y-3">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid rgba(5,34,16,0.06)' }}>
                            <DollarSign className="w-5 h-5 mb-2" style={{ color: '#f59e0b' }} />
                            <p className="font-sans text-[10px] tracking-wider uppercase font-semibold" style={{ color: 'rgba(5,34,16,0.4)' }}>Pending Payments</p>
                            <p className="font-serif text-2xl font-bold mt-1" style={{ color: '#052210' }}>{pendingPayments.length}</p>
                        </div>
                        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid rgba(5,34,16,0.06)' }}>
                            <DollarSign className="w-5 h-5 mb-2" style={{ color: '#ef4444' }} />
                            <p className="font-sans text-[10px] tracking-wider uppercase font-semibold" style={{ color: 'rgba(5,34,16,0.4)' }}>Total Outstanding</p>
                            <p className="font-serif text-2xl font-bold mt-1" style={{ color: '#ef4444' }}>
                                ₹{pendingPayments.reduce((s, i) => s + ((Number((i.plans?.find((p:any) => p.planId === i.selectedPlanId)?.totalPrice || i.plans?.[0]?.totalPrice || 0)) || 0) - (Number(i.amountPaid) || 0)), 0).toLocaleString()}
                            </p>
                        </div>
                        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid rgba(5,34,16,0.06)' }}>
                            <CheckCircle2 className="w-5 h-5 mb-2" style={{ color: '#06a15c' }} />
                            <p className="font-sans text-[10px] tracking-wider uppercase font-semibold" style={{ color: 'rgba(5,34,16,0.4)' }}>Total Collected</p>
                            <p className="font-serif text-2xl font-bold mt-1" style={{ color: '#06a15c' }}>
                                ₹{pendingPayments.reduce((s, i) => s + (Number(i.amountPaid) || 0), 0).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="text-center py-16 rounded-2xl" style={{ background: '#fff', border: '1px solid rgba(5,34,16,0.06)' }}>
                            <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(5,34,16,0.15)' }} />
                            <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No pending payments</p>
                        </div>
                    ) : filtered.map(itin => {
                        const percent = getPaymentPercent(itin)
                        const outstanding = (Number((itin.plans?.find((p:any) => p.planId === itin.selectedPlanId)?.totalPrice || itin.plans?.[0]?.totalPrice || 0)) || 0) - (Number(itin.amountPaid) || 0)
                        return (
                            <div key={itin.id} className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid rgba(5,34,16,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{itin.customerName}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {itin.quoteId && <span className="font-sans text-[9px] font-bold tracking-wider" style={{ color: '#06a15c' }}>{itin.quoteId}</span>}
                                            <span className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{itin.destination}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => togglePaymentStatus(itin)} className="px-4 py-2 rounded-xl font-sans text-[10px] font-bold tracking-wider uppercase transition-all hover:scale-105"
                                        style={{ background: percent >= 100 ? '#ecfdf5' : '#fef2f2', color: percent >= 100 ? '#059669' : '#dc2626', border: `1px solid ${percent >= 100 ? '#06a15c30' : '#ef444430'}` }}>
                                        {percent >= 100 ? "Paid ✓" : "Mark Paid"}
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(5,34,16,0.06)' }}>
                                        <div className="h-2 rounded-full transition-all" style={{ width: `${percent}%`, background: percent >= 70 ? '#06a15c' : percent >= 40 ? '#f59e0b' : '#ef4444' }} />
                                    </div>
                                    <span className="font-sans text-xs font-bold min-w-[40px]" style={{ color: percent >= 70 ? '#06a15c' : '#f59e0b' }}>{percent}%</span>
                                </div>
                                <div className="flex justify-between font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.5)' }}>
                                    <span>Paid: ₹{(Number(itin.amountPaid) || 0).toLocaleString()}</span>
                                    <span>Outstanding: ₹{outstanding.toLocaleString()}</span>
                                    <span>Total: ₹{(Number((itin.plans?.find((p:any) => p.planId === itin.selectedPlanId)?.totalPrice || itin.plans?.[0]?.totalPrice || 0)) || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                /* Pending SOPs */
                <div className="space-y-3">
                    {itineraries.filter(i => i.status === "handover" || i.status === "post-ops").length === 0 ? (
                        <div className="text-center py-16 rounded-2xl" style={{ background: '#fff', border: '1px solid rgba(5,34,16,0.06)' }}>
                            <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(5,34,16,0.15)' }} />
                            <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>All SOPs completed</p>
                        </div>
                    ) : itineraries.filter(i => i.status === "handover" || i.status === "post-ops").map(itin => (
                        <div key={itin.id} className="rounded-2xl p-5 flex items-center justify-between" style={{ background: '#fff', border: '1px solid rgba(5,34,16,0.06)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: itin.status === "handover" ? 'rgba(167,139,250,0.1)' : 'rgba(245,158,11,0.1)' }}>
                                    <Clock className="w-4 h-4" style={{ color: itin.status === "handover" ? '#a78bfa' : '#f59e0b' }} />
                                </div>
                                <div>
                                    <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{itin.customerName}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {itin.quoteId && <span className="font-sans text-[9px] font-bold" style={{ color: '#06a15c' }}>{itin.quoteId}</span>}
                                        <span className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{itin.destination}</span>
                                    </div>
                                </div>
                            </div>
                            <span className="px-3 py-1 rounded-full font-sans text-[10px] font-bold tracking-wider uppercase"
                                style={{ background: itin.status === "handover" ? 'rgba(167,139,250,0.1)' : 'rgba(245,158,11,0.1)', color: itin.status === "handover" ? '#a78bfa' : '#f59e0b' }}>
                                {itin.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
