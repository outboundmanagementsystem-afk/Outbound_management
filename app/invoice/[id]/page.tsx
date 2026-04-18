"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { getItinerary, getItineraryPayments } from "@/lib/firestore"
import Image from "next/image"

const methodLabels: Record<string, string> = {
    cash: "Cash", gpay: "Google Pay", phonepe: "PhonePe", bank_transfer: "Bank Transfer"
}

export default function InvoicePage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const itinId = params.id as string
    const paymentId = searchParams.get("paymentId")
    const [itin, setItin] = useState<any>(null)
    const [payment, setPayment] = useState<any>(null)
    const [allPayments, setAllPayments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadData() }, [itinId, paymentId])

    const loadData = async () => {
        try {
            const [i, payments] = await Promise.all([getItinerary(itinId), getItineraryPayments(itinId)])
            setItin(i)
            setAllPayments(payments)
            if (paymentId) {
                const found = payments.find((p: any) => p.id === paymentId)
                setPayment(found || null)
            }
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} />
        </div>
    )

    if (!itin || !payment) return (
        <div className="min-h-screen flex items-center justify-center">
            <p style={{ color: '#6b7280', fontFamily: 'sans-serif' }}>Invoice not found.</p>
        </div>
    )

    const totalPaid = allPayments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0)
    const totalPrice = Number(itin.totalPrice) || 0
    const balance = totalPrice - totalPaid
    const invoiceNumber = `INV-${itinId.slice(0, 6).toUpperCase()}-${String(allPayments.findIndex((p: any) => p.id === paymentId) + 1).padStart(3, "0")}`
    const dateStr = payment.collectedAt ? new Date(payment.collectedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : "—"
    const isPaid = payment.type === "full" || (payment.type === "balance" && balance <= 0)
    const typeLabel = isPaid ? 'FULLY PAID' : payment.type.toUpperCase()
    const badgeColor = isPaid ? '#4ade80' : '#fbbf24'
    const badgeBg = isPaid ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)'
    const badgeBorder = isPaid ? 'rgba(74,222,128,0.35)' : 'rgba(251,191,36,0.35)'

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                html, body { font-family: 'Inter', sans-serif; background: #f1f5f9; }

                /* ── PRINT STYLES ── */
                @media print {
                    html, body {
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    .no-print { display: none !important; }
                    .print-wrapper {
                        padding: 0 !important;
                        background: white !important;
                        min-height: unset !important;
                    }
                    .invoice-card {
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        max-width: 100% !important;
                        width: 100% !important;
                        border: none !important;
                    }
                    .invoice-header {
                        background: #052210 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .badge {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    @page {
                        margin: 12mm 16mm;
                        size: A4 portrait;
                    }
                }
            `}</style>

            {/* ── Toolbar (hidden on print) ── */}
            <div className="no-print" style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid #e5e7eb', padding: '12px 24px',
                display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center'
            }}>
                <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#6b7280', marginRight: 'auto' }}>
                    {invoiceNumber} · {itin.customerName}
                </span>
                <button
                    onClick={() => window.print()}
                    style={{
                        background: '#052210', color: '#4ade80', border: 'none',
                        borderRadius: 10, padding: '9px 20px',
                        fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6
                    }}
                >
                    🖨 Print / Download PDF
                </button>
                <button
                    onClick={() => window.close()}
                    style={{
                        background: '#fff', color: '#374151',
                        border: '1.5px solid #e5e7eb', borderRadius: 10,
                        padding: '9px 18px', fontFamily: 'Inter, sans-serif',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer'
                    }}
                >
                    Close
                </button>
            </div>

            {/* ── Page wrapper ── */}
            <div className="print-wrapper" style={{
                minHeight: '100vh', display: 'flex', justifyContent: 'center',
                alignItems: 'flex-start', padding: '80px 16px 40px',
                background: '#f1f5f9'
            }}>
                {/* ── Invoice Card ── */}
                <div className="invoice-card" style={{
                    background: '#fff', borderRadius: 20,
                    boxShadow: '0 24px 64px rgba(0,0,0,0.1)',
                    width: '100%', maxWidth: 700, overflow: 'hidden'
                }}>

                    {/* ── Header ── */}
                    <div className="invoice-header" style={{
                        background: 'linear-gradient(135deg, #052210 0%, #073c18 100%)',
                        padding: '28px 40px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        {/* Logo + Title */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ marginBottom: '8px' }}>
                                <img
                                    src="/images/outbound png.png"
                                    alt="Outbound Travelers"
                                    style={{ 
                                        width: '180px', 
                                        height: 'auto', 
                                        display: 'block', 
                                        objectFit: 'contain', 
                                        objectPosition: 'left',
                                        maxWidth: 'none'
                                    }}
                                />
                            </div>
                            <p style={{
                                fontFamily: 'Playfair Display', fontSize: 22,
                                color: '#fff', fontWeight: 700, letterSpacing: '0.01em', marginTop: 2
                            }}>
                                Payment Invoice
                            </p>
                        </div>

                        {/* Badge + Invoice # */}
                        <div style={{ textAlign: 'right' }}>
                            <div className="badge" style={{
                                background: badgeBg,
                                border: `1.5px solid ${badgeBorder}`,
                                borderRadius: 8, padding: '6px 16px', marginBottom: 10,
                                display: 'inline-block'
                            }}>
                                <p style={{
                                    fontFamily: 'Inter', fontSize: 11, fontWeight: 800,
                                    letterSpacing: '0.15em', textTransform: 'uppercase', color: badgeColor
                                }}>
                                    {typeLabel}
                                </p>
                            </div>
                            <p style={{ fontFamily: 'Inter', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{invoiceNumber}</p>
                            <p style={{ fontFamily: 'Inter', fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{dateStr}</p>
                        </div>
                    </div>

                    {/* ── Body ── */}
                    <div style={{ padding: '32px 40px' }}>

                        {/* Client + Trip */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32,
                            marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid #f1f5f9'
                        }}>
                            <div>
                                <p style={{ fontFamily: 'Inter', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700, marginBottom: 8 }}>BILLED TO</p>
                                <p style={{ fontFamily: 'Playfair Display', fontSize: 18, color: '#052210', fontWeight: 700 }}>{itin.customerName || "—"}</p>
                                {itin.customerPhone && <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#6b7280', marginTop: 4 }}>{itin.customerPhone}</p>}
                                {itin.customerEmail && <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#6b7280' }}>{itin.customerEmail}</p>}
                            </div>
                            <div>
                                <p style={{ fontFamily: 'Inter', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700, marginBottom: 8 }}>TRIP DETAILS</p>
                                <p style={{ fontFamily: 'Inter', fontSize: 14, color: '#052210', fontWeight: 700 }}>{itin.destination || "—"}</p>
                                <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#6b7280', marginTop: 2 }}>{itin.nights}N / {itin.days}D</p>
                                {itin.startDate && <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#6b7280' }}>Start: {new Date(itin.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
                                <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Ref: {itin.quoteId || itinId.slice(0, 8).toUpperCase()}</p>
                            </div>
                        </div>

                        {/* Payment Details Table */}
                        <div style={{ marginBottom: 24 }}>
                            <p style={{ fontFamily: 'Inter', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700, marginBottom: 10 }}>PAYMENT DETAILS</p>
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                            <th style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'Inter', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af' }}>Description</th>
                                            <th style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'Inter', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '16px', fontFamily: 'Inter', fontSize: 13, color: '#052210' }}>
                                                <strong style={{ textTransform: 'capitalize' }}>{payment.type}</strong> Payment
                                                <span style={{ display: 'block', fontSize: 11, color: '#9ca3af', marginTop: 3 }}>via {methodLabels[payment.method] || payment.method}</span>
                                                {payment.notes && <span style={{ display: 'block', fontSize: 11, color: '#9ca3af', fontStyle: 'italic', marginTop: 2 }}>Note: {payment.notes}</span>}
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'Playfair Display', fontSize: 20, color: '#052210', fontWeight: 700 }}>
                                                ₹{Number(payment.amount).toLocaleString()}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totals */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
                            <div style={{ minWidth: 280, background: '#f9fafb', borderRadius: 10, padding: '16px 20px' }}>
                                {[
                                    { label: "Package Total", value: `₹${totalPrice.toLocaleString()}`, color: '#111827', bold: false },
                                    { label: "Total Received", value: `₹${totalPaid.toLocaleString()}`, color: '#06a15c', bold: false },
                                    { label: "Balance Due", value: balance > 0 ? `₹${balance.toLocaleString()}` : "Nil", color: balance > 0 ? '#ef4444' : '#06a15c', bold: true },
                                ].map((row, i) => (
                                    <div key={row.label} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '6px 0',
                                        borderTop: i > 0 ? '1px solid #e5e7eb' : 'none'
                                    }}>
                                        <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#6b7280' }}>{row.label}</span>
                                        <span style={{
                                            fontFamily: row.bold ? 'Playfair Display' : 'Inter',
                                            fontSize: row.bold ? 18 : 13,
                                            fontWeight: row.bold ? 700 : 600,
                                            color: row.color
                                        }}>{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Screenshot */}
                        {payment.screenshotUrl && (
                            <div style={{ marginBottom: 24 }}>
                                <p style={{ fontFamily: 'Inter', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700, marginBottom: 8 }}>PAYMENT EVIDENCE</p>
                                <img src={payment.screenshotUrl} alt="Payment evidence" style={{ maxHeight: 220, borderRadius: 8, border: '1px solid #e5e7eb', objectFit: 'contain', display: 'block' }} />
                            </div>
                        )}

                        {/* Footer */}
                        <div style={{ borderTop: '1.5px solid #f1f5f9', paddingTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#9ca3af' }}>Collected by: <strong style={{ color: '#374151' }}>{payment.collectedByName || "—"}</strong></p>
                                <p style={{ fontFamily: 'Inter', fontSize: 10, color: '#d1d5db', marginTop: 3 }}>
                                    Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontFamily: 'Inter', fontSize: 9, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>This is a computer generated invoice</p>
                                <img
                                    src="/images/outbound png.png"
                                    alt="Outbound"
                                    style={{ 
                                        width: '140px', 
                                        height: 'auto', 
                                        display: 'block', 
                                        marginLeft: 'auto', 
                                        objectFit: 'contain',
                                        maxWidth: 'none'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
