"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getItineraries, getItineraryPayments, addPayment } from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import PaymentCollectionModal from "@/components/payment-collection-modal"
import type { PaymentFormData } from "@/components/payment-collection-modal"
import { DollarSign, Search, ChevronRight, Check, AlertCircle, Plus } from "lucide-react"

export default function FinancePaymentsPage() {
    return (
        <ProtectedRoute allowedRoles={["finance", "finance_lead", "admin", "owner"]}>
            <PaymentsContent />
        </ProtectedRoute>
    )
}

function PaymentsContent() {
    const { userProfile } = useAuth()
    const [itineraries, setItineraries] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "partial" | "paid">("all")
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [selectedItin, setSelectedItin] = useState<any>(null)

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        try {
            const all = await getItineraries()
            const active = all.filter((i: any) => i.status && i.status !== "draft")
            setItineraries(active)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const handleLogPayment = (itin: any) => {
        setSelectedItin(itin)
        setShowPaymentModal(true)
    }

    const handlePaymentSubmit = async (data: PaymentFormData) => {
        if (!selectedItin) return
        let screenshotUrl: string | undefined
        if (data.screenshotFile) {
            const workerUrl = "https://outbound-storage.outboundmanagementsystem.workers.dev"
            const url = `${workerUrl}/payments/${selectedItin.id}/${Date.now()}_${encodeURIComponent(data.screenshotFile.name)}`
            const res = await fetch(url, { method: "PUT", body: data.screenshotFile, headers: { "Content-Type": data.screenshotFile.type || "application/octet-stream" } })
            if (res.ok) screenshotUrl = url
        }
        await addPayment(selectedItin.id, {
            type: data.type,
            amount: data.amount,
            method: data.method,
            notes: data.notes,
            screenshotUrl,
            collectedBy: userProfile?.uid || "",
            collectedByName: userProfile?.name || "",
            collectedAt: new Date().toISOString(),
        })
        setShowPaymentModal(false)
        await loadData()
    }

    const getPaymentStatus = (itin: any) => {
        const paid = Number(itin.amountPaid) || 0
        const total = Number(itin.totalPrice) || 0
        if (!total) return "no_price"
        if (paid >= total) return "paid"
        if (paid > 0) return "partial"
        return "pending"
    }

    const filtered = itineraries.filter(i => {
        const q = search.toLowerCase()
        const matchSearch = !search || (i.customerName || "").toLowerCase().includes(q) || (i.quoteId || "").toLowerCase().includes(q) || (i.destination || "").toLowerCase().includes(q)
        const status = getPaymentStatus(i)
        const matchFilter = filterStatus === "all" || status === filterStatus
        return matchSearch && matchFilter
    })

    const statusConfig: Record<string, { color: string; label: string; icon: any }> = {
        paid: { color: "#06a15c", label: "Fully Paid", icon: Check },
        partial: { color: "#f59e0b", label: "Partial", icon: AlertCircle },
        pending: { color: "#ef4444", label: "Unpaid", icon: AlertCircle },
        no_price: { color: "#9ca3af", label: "No Price", icon: AlertCircle },
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="font-serif text-2xl sm:text-3xl tracking-wide" style={{ color: '#052210' }}>Payments</h1>
                    <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Manage all client payments and balances</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(5,34,16,0.3)' }} />
                    <input
                        type="text" placeholder="Search by name, quote ID..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl font-sans text-sm"
                        style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', outline: 'none', color: '#052210' }}
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {(["all", "pending", "partial", "paid"] as const).map(f => (
                        <button key={f}
                            onClick={() => setFilterStatus(f)}
                            className="px-4 py-2 rounded-xl font-sans text-xs font-semibold capitalize transition-all"
                            style={{
                                background: filterStatus === f ? '#052210' : '#FFFFFF',
                                color: filterStatus === f ? '#4ade80' : 'rgba(5,34,16,0.5)',
                                border: filterStatus === f ? '1px solid rgba(6,161,92,0.3)' : '1px solid rgba(5,34,16,0.08)',
                            }}
                        >
                            {f === "all" ? "All" : f === "pending" ? "Unpaid" : f === "partial" ? "Partial" : "Fully Paid"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                {/* Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 font-sans text-[9px] tracking-wider uppercase font-semibold" style={{ color: '#9ca3af', borderBottom: '1px solid rgba(5,34,16,0.04)', background: '#fafafa' }}>
                    <div className="col-span-3">Client</div>
                    <div className="col-span-2">Destination</div>
                    <div className="col-span-2 text-right">Total</div>
                    <div className="col-span-2 text-right">Collected</div>
                    <div className="col-span-2 text-right">Balance</div>
                    <div className="col-span-1 text-center">Action</div>
                </div>

                {loading ? (
                    <div className="px-6 py-10 text-center">
                        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <DollarSign className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(6,161,92,0.2)' }} />
                        <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No matching itineraries found.</p>
                    </div>
                ) : filtered.map((itin: any) => {
                    const paid = Number(itin.amountPaid) || 0
                    const total = Number(itin.totalPrice) || 0
                    const balance = total - paid
                    const pct = total > 0 ? Math.round((paid / total) * 100) : 0
                    const status = getPaymentStatus(itin)
                    const cfg = statusConfig[status]
                    const StatusIcon = cfg.icon

                    return (
                        <div key={itin.id} className="px-6 py-4" style={{ borderBottom: '1px solid rgba(5,34,16,0.04)' }}>
                            <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-3">
                                    <Link href={`/finance/itinerary/${itin.id}`} className="hover:underline">
                                        <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{itin.customerName || "Unnamed"}</p>
                                        <p className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{itin.quoteId}</p>
                                    </Link>
                                </div>
                                <div className="col-span-2">
                                    <p className="font-sans text-xs truncate" style={{ color: 'rgba(5,34,16,0.65)' }}>{itin.destination || "—"}</p>
                                    <p className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{itin.nights}N/{itin.days}D</p>
                                </div>
                                <div className="col-span-2 text-right font-sans font-bold text-sm" style={{ color: '#052210' }}>
                                    {total > 0 ? `₹${total.toLocaleString()}` : "—"}
                                </div>
                                <div className="col-span-2 text-right">
                                    <p className="font-sans font-bold text-sm" style={{ color: '#06a15c' }}>₹{paid.toLocaleString()}</p>
                                    <div className="mt-1 h-1 rounded-full bg-gray-100 w-full">
                                        <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? '#06a15c' : pct > 0 ? '#f59e0b' : '#ef4444' }} />
                                    </div>
                                </div>
                                <div className="col-span-2 text-right">
                                    <p className="font-sans font-bold text-sm" style={{ color: balance > 0 ? '#ef4444' : '#06a15c' }}>
                                        {balance > 0 ? `₹${balance.toLocaleString()}` : "✓ Paid"}
                                    </p>
                                    <span className="inline-flex items-center gap-1 font-sans text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full" style={{ background: `${cfg.color}15`, color: cfg.color }}>
                                        <StatusIcon className="w-3 h-3" />{cfg.label}
                                    </span>
                                </div>
                                <div className="col-span-1 flex justify-center">
                                    <button
                                        onClick={() => handleLogPayment(itin)}
                                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                                        style={{ background: 'rgba(6,161,92,0.1)', border: '1px solid rgba(6,161,92,0.2)' }}
                                        title="Log Payment"
                                    >
                                        <Plus className="w-4 h-4" style={{ color: '#06a15c' }} />
                                    </button>
                                </div>
                            </div>

                            {/* Mobile */}
                            <div className="md:hidden">
                                <Link href={`/finance/itinerary/${itin.id}`} className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{itin.customerName || "Unnamed"}</p>
                                        <p className="font-sans text-xs" style={{ color: 'rgba(5,34,16,0.4)' }}>{itin.destination} · {itin.quoteId}</p>
                                        <div className="flex gap-3 mt-2 text-xs font-sans">
                                            <span style={{ color: '#06a15c' }}>Paid: ₹{paid.toLocaleString()}</span>
                                            <span style={{ color: '#ef4444' }}>Bal: ₹{balance.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <button onClick={e => { e.preventDefault(); handleLogPayment(itin) }}
                                        className="flex-shrink-0 px-3 py-1.5 rounded-lg font-sans text-[10px] font-bold tracking-wider uppercase"
                                        style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c', border: '1px solid rgba(6,161,92,0.2)' }}>
                                        + Pay
                                    </button>
                                </Link>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Payment Modal */}
            {selectedItin && (
                <PaymentCollectionModal
                    isOpen={showPaymentModal}
                    onClose={() => { setShowPaymentModal(false); setSelectedItin(null) }}
                    onSubmit={handlePaymentSubmit}
                    itineraryName={selectedItin?.customerName || "Itinerary"}
                    totalPrice={Number(selectedItin?.totalPrice || 0)}
                    amountAlreadyPaid={Number(selectedItin?.amountPaid || 0)}
                    defaultType={Number(selectedItin?.amountPaid) > 0 ? "balance" : "advance"}
                    title="Log Payment"
                    submitLabel="Save Payment"
                />
            )}
        </div>
    )
}
