"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getItineraries, getItineraryPayments } from "@/lib/firestore"
import Link from "next/link"
import { FileText, Search, ExternalLink, Printer, DollarSign } from "lucide-react"

export default function FinanceInvoicesPage() {
    return (
        <ProtectedRoute allowedRoles={["finance", "finance_lead", "admin", "owner"]}>
            <InvoicesContent />
        </ProtectedRoute>
    )
}

function InvoicesContent() {
    const [invoices, setInvoices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        try {
            const all = await getItineraries()
            const active = all.filter((i: any) => i.status && i.status !== "draft")
            // For each itin, get payment records
            const results: any[] = []
            for (const itin of active) {
                const payments = await getItineraryPayments(itin.id)
                for (const p of payments) {
                    results.push({ ...p, itin })
                }
            }
            setInvoices(results)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const filtered = invoices.filter(inv => {
        const q = search.toLowerCase()
        return !search ||
            (inv.itin?.customerName || "").toLowerCase().includes(q) ||
            (inv.itin?.quoteId || "").toLowerCase().includes(q) ||
            (inv.collectedByName || "").toLowerCase().includes(q)
    })

    const methodLabels: Record<string, string> = {
        cash: "Cash", gpay: "GPay", phonepe: "PhonePe", bank_transfer: "Bank Transfer"
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="font-serif text-2xl sm:text-3xl tracking-wide" style={{ color: '#052210' }}>Invoices</h1>
                    <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>All payment records and invoices</p>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(5,34,16,0.3)' }} />
                <input
                    type="text" placeholder="Search by client name, quote ID..."
                    className="w-full max-w-md pl-10 pr-4 py-2.5 rounded-xl font-sans text-sm"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', outline: 'none', color: '#052210' }}
                    value={search} onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3 font-sans text-[9px] tracking-wider uppercase font-semibold" style={{ color: '#9ca3af', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                    <div className="col-span-3">Client</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-2">Method</div>
                    <div className="col-span-2">Collected By</div>
                    <div className="col-span-2 text-right">Amount</div>
                    <div className="col-span-1 text-center">Actions</div>
                </div>

                {loading ? (
                    <div className="px-6 py-10 text-center">
                        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(6,161,92,0.2)' }} />
                        <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No payment records found.</p>
                    </div>
                ) : filtered.map((inv: any) => {
                    const dateStr = inv.collectedAt ? new Date(inv.collectedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "—"
                    return (
                        <div key={inv.id} className="px-6 py-4" style={{ borderBottom: '1px solid #f9fafb' }}>
                            <div className="hidden md:grid grid-cols-12 gap-3 items-center">
                                <div className="col-span-3">
                                    <Link href={`/finance/itinerary/${inv.itin?.id}`}>
                                        <p className="font-sans text-sm font-semibold hover:underline" style={{ color: '#052210' }}>{inv.itin?.customerName || "Unnamed"}</p>
                                        <p className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{dateStr} · {inv.itin?.quoteId}</p>
                                    </Link>
                                </div>
                                <div className="col-span-2">
                                    <span className="px-2 py-0.5 rounded-full font-sans text-[10px] font-bold tracking-wider uppercase capitalize" style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c' }}>
                                        {inv.type}
                                    </span>
                                </div>
                                <div className="col-span-2 font-sans text-sm" style={{ color: 'rgba(5,34,16,0.65)' }}>
                                    {methodLabels[inv.method] || inv.method}
                                </div>
                                <div className="col-span-2 font-sans text-sm" style={{ color: 'rgba(5,34,16,0.65)' }}>
                                    {inv.collectedByName || "—"}
                                </div>
                                <div className="col-span-2 text-right font-serif font-bold text-base" style={{ color: '#06a15c' }}>
                                    ₹{Number(inv.amount).toLocaleString()}
                                </div>
                                <div className="col-span-1 flex items-center justify-center gap-2">
                                    {inv.screenshotUrl && (
                                        <a href={inv.screenshotUrl} target="_blank" rel="noreferrer">
                                            <ExternalLink className="w-4 h-4" style={{ color: '#06a15c' }} />
                                        </a>
                                    )}
                                    <button onClick={() => window.open(`/invoice/${inv.itin?.id}?paymentId=${inv.id}`, '_blank')}>
                                        <Printer className="w-4 h-4" style={{ color: 'rgba(5,34,16,0.5)' }} />
                                    </button>
                                </div>
                            </div>
                            {/* Mobile */}
                            <div className="md:hidden flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{inv.itin?.customerName || "Unnamed"}</p>
                                    <p className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{dateStr} · {inv.type} · {methodLabels[inv.method]}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="font-serif font-bold text-sm" style={{ color: '#06a15c' }}>₹{Number(inv.amount).toLocaleString()}</span>
                                    <button onClick={() => window.open(`/invoice/${inv.itin?.id}?paymentId=${inv.id}`, '_blank')}>
                                        <Printer className="w-4 h-4" style={{ color: 'rgba(5,34,16,0.5)' }} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
