"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getItinerary, getItineraryPayments, addPayment, updatePayment } from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import PaymentCollectionModal from "@/components/payment-collection-modal"
import type { PaymentFormData } from "@/components/payment-collection-modal"
import Link from "next/link"
import { ArrowLeft, DollarSign, Receipt, CheckCircle, Printer, ExternalLink, Smartphone, Wallet, Building2 } from "lucide-react"

export default function FinanceItineraryPage() {
    return (
        <ProtectedRoute allowedRoles={["finance", "finance_lead", "admin", "owner"]}>
            <FinanceItineraryContent />
        </ProtectedRoute>
    )
}

const methodLabels: Record<string, string> = {
    cash: "Cash", gpay: "Google Pay", phonepe: "PhonePe", bank_transfer: "Bank Transfer"
}
const methodColors: Record<string, string> = {
    cash: "#22c55e", gpay: "#4285f4", phonepe: "#6d28d9", bank_transfer: "#0ea5e9"
}
const methodIcons: Record<string, any> = {
    cash: Wallet, gpay: Smartphone, phonepe: Smartphone, bank_transfer: Building2
}

function FinanceItineraryContent() {
    const params = useParams()
    const router = useRouter()
    const itinId = params.id as string
    const { userProfile } = useAuth()
    const [itin, setItin] = useState<any>(null)
    const [payments, setPayments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showPaymentModal, setShowPaymentModal] = useState(false)

    useEffect(() => { loadAll() }, [itinId])

    const loadAll = async () => {
        try {
            const [i, p] = await Promise.all([getItinerary(itinId), getItineraryPayments(itinId)])
            setItin(i)
            setPayments(p)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const handlePaymentSubmit = async (data: PaymentFormData) => {
        let screenshotUrl: string | undefined
        if (data.screenshotFile) {
            const workerUrl = "https://outbound-storage.outboundmanagementsystem.workers.dev"
            const url = `${workerUrl}/payments/${itinId}/${Date.now()}_${encodeURIComponent(data.screenshotFile.name)}`
            const res = await fetch(url, { method: "PUT", body: data.screenshotFile, headers: { "Content-Type": data.screenshotFile.type || "application/octet-stream" } })
            if (res.ok) screenshotUrl = url
        }
        await addPayment(itinId, {
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
        await loadAll()
    }

    const generateInvoice = (payment: any) => {
        window.open(`/invoice/${itinId}?paymentId=${payment.id}`, '_blank')
    }

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} />
        </div>
    )

    if (!itin) return (
        <div className="text-center py-20"><p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.5)' }}>Itinerary not found.</p></div>
    )

    const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const totalPrice = Number(itin.totalPrice) || 0
    const balance = totalPrice - totalPaid
    const pct = totalPrice > 0 ? Math.round((totalPaid / totalPrice) * 100) : 0

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <Link href="/finance/payments" className="inline-flex items-center gap-2 font-sans text-xs tracking-wider uppercase" style={{ color: 'rgba(6,161,92,0.6)' }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Payments
            </Link>

            {/* Client & Summary */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #062814 0%, #052210 100%)', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
                <div className="px-6 py-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="font-sans text-[10px] tracking-wider uppercase font-bold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>CLIENT</p>
                            <h1 className="font-serif text-2xl tracking-wide text-white">{itin.customerName || "Unnamed"}</h1>
                            <p className="font-sans text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{itin.destination} · {itin.nights}N/{itin.days}D · {itin.quoteId}</p>
                        </div>
                        <button
                            onClick={() => setShowPaymentModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs tracking-wider uppercase font-bold transition-all hover:scale-105"
                            style={{ background: 'rgba(6,161,92,0.2)', color: '#4ade80', border: '1px solid rgba(6,161,92,0.3)' }}
                        >
                            + Log Payment
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-6">
                        <div>
                            <p className="font-sans text-[9px] tracking-wider uppercase font-bold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Package Total</p>
                            <p className="font-serif text-xl font-bold text-white">₹{totalPrice.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="font-sans text-[9px] tracking-wider uppercase font-bold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Collected</p>
                            <p className="font-serif text-xl font-bold" style={{ color: '#4ade80' }}>₹{totalPaid.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="font-sans text-[9px] tracking-wider uppercase font-bold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Balance Due</p>
                            <p className="font-serif text-xl font-bold" style={{ color: balance > 0 ? '#fbbf24' : '#4ade80' }}>
                                {balance > 0 ? `₹${balance.toLocaleString()}` : '✓ Cleared'}
                            </p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                        <div className="flex justify-between font-sans text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            <span>Payment Progress</span>
                            <span>{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct === 100 ? '#4ade80' : 'linear-gradient(90deg, #4ade80, #22c55e)' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment History */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(5,34,16,0.06)' }}>
                    <h2 className="font-serif text-base tracking-wide" style={{ color: '#052210' }}>Payment History</h2>
                    <span className="font-sans text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c' }}>{payments.length} record{payments.length !== 1 ? 's' : ''}</span>
                </div>

                {payments.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <DollarSign className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(6,161,92,0.2)' }} />
                        <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No payments recorded yet.</p>
                        <button onClick={() => setShowPaymentModal(true)} className="mt-3 font-sans text-xs tracking-wider uppercase font-bold" style={{ color: '#06a15c' }}>
                            + Log First Payment
                        </button>
                    </div>
                ) : payments.map((payment: any, idx: number) => {
                    const MethodIcon = methodIcons[payment.method] || Wallet
                    const color = methodColors[payment.method] || '#06a15c'
                    const dateStr = payment.collectedAt ? new Date(payment.collectedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "—"

                    return (
                        <div key={payment.id} className="px-6 py-4" style={{ borderBottom: '1px solid rgba(5,34,16,0.04)' }}>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: `${color}15` }}>
                                    <MethodIcon className="w-4 h-4" style={{ color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 flex-wrap">
                                        <div>
                                            <p className="font-sans font-semibold text-sm" style={{ color: '#052210' }}>
                                                <span className="capitalize">{payment.type}</span> Payment
                                                <span className="ml-2 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase" style={{ background: `${color}15`, color }}>
                                                    {methodLabels[payment.method] || payment.method}
                                                </span>
                                            </p>
                                            <p className="font-sans text-[11px] mt-0.5" style={{ color: 'rgba(5,34,16,0.45)' }}>
                                                {dateStr} · Collected by {payment.collectedByName || "—"}
                                            </p>
                                            {payment.notes && (
                                                <p className="font-sans text-xs mt-1 italic" style={{ color: 'rgba(5,34,16,0.5)' }}>"{payment.notes}"</p>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="font-serif text-lg font-bold" style={{ color: '#06a15c' }}>₹{Number(payment.amount).toLocaleString()}</p>
                                            <div className="flex items-center gap-2 justify-end mt-1">
                                                {payment.screenshotUrl && (
                                                    <a href={payment.screenshotUrl} target="_blank" rel="noreferrer"
                                                        className="flex items-center gap-1 font-sans text-[10px] tracking-wider uppercase font-bold"
                                                        style={{ color: '#06a15c' }}>
                                                        <ExternalLink className="w-3 h-3" /> Screenshot
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => generateInvoice(payment)}
                                                    className="flex items-center gap-1 font-sans text-[10px] tracking-wider uppercase font-bold px-3 py-1 rounded-lg"
                                                    style={{ background: 'rgba(5,34,16,0.05)', color: 'rgba(5,34,16,0.6)', border: '1px solid rgba(5,34,16,0.1)' }}>
                                                    <Printer className="w-3 h-3" /> Invoice
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Payment Modal */}
            <PaymentCollectionModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onSubmit={handlePaymentSubmit}
                itineraryName={itin?.customerName || "Itinerary"}
                totalPrice={totalPrice}
                amountAlreadyPaid={totalPaid}
                defaultType={totalPaid > 0 ? "balance" : "advance"}
                title="Log Payment"
                submitLabel="Save Payment"
            />
        </div>
    )
}
