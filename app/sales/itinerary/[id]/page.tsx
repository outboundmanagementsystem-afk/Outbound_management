"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
    getItinerary, getItineraryDays, getItineraryHotels, getItineraryTransfers,
    getItineraryPricing, updateItineraryStatus, initSopChecklist, getItineraryFlights, getItineraryActivities,
    getSalesChecklist, updateSalesItem, initSalesChecklist, syncChecklist, addPayment
} from "@/lib/firestore"
import { storage } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { ItineraryStatus } from "@/lib/firestore"
import type { PaymentFormData } from "@/components/payment-collection-modal"
import PaymentCollectionModal from "@/components/payment-collection-modal"
import SalesChecklistModal from "@/components/sales-checklist-modal"
import Link from "next/link"
import { ArrowLeft, Clock, Send, FileEdit, CheckCircle, XCircle, ChevronRight, Share2, Eye, Download, FileText, Hotel, Car, DollarSign, MapPin, Calendar, Users, Map, Circle } from "lucide-react"

const statusFlow: ItineraryStatus[] = ["draft", "handover", "pre-ops", "post-ops", "completed"]
const statusColors: Record<string, string> = {
    draft: "#9ca3af", sent: "#60a5fa", confirmed: "#34d399",
    handover: "#a78bfa", "pre-ops": "#f59e0b", "post-ops": "#3b82f6", completed: "#f472b6",
}

export default function ItineraryDetailPage() {
    return (
        <ProtectedRoute allowedRoles={["sales", "sales_lead", "ops", "ops_lead", "admin", "owner"]}>
            <ItineraryDetail />
        </ProtectedRoute>
    )
}

function ItineraryDetail() {
    const params = useParams()
    const router = useRouter()
    const itinId = params.id as string
    const { userProfile } = useAuth()
    const [itin, setItin] = useState<any>(null)
    const [days, setDays] = useState<any[]>([])
    const [hotels, setHotels] = useState<any[]>([])
    const [transfers, setTransfers] = useState<any[]>([])
    const [pricing, setPricing] = useState<any[]>([])
    const [flights, setFlights] = useState<any[]>([])
    const [activities, setActivities] = useState<any[]>([])
    const [salesChecklist, setSalesChecklist] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [uploadingItemId, setUploadingItemId] = useState<string | null>(null)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showChecklistModal, setShowChecklistModal] = useState(false)
    const [pendingStatus, setPendingStatus] = useState<ItineraryStatus | null>(null)
    const [showConfirmOps, setShowConfirmOps] = useState(false)
    const [stagingOps, setStagingOps] = useState(false)

    useEffect(() => { loadAll() }, [itinId])

    const loadAll = async () => {
        try {
            const [it, d, h, t, p, f, a] = await Promise.all([
                getItinerary(itinId),
                getItineraryDays(itinId),
                getItineraryHotels(itinId),
                getItineraryTransfers(itinId),
                getItineraryPricing(itinId),
                getItineraryFlights(itinId),
                getItineraryActivities(itinId),
            ])
            setItin(it)
            setDays(d)
            setHotels(h)
            setTransfers(t)
            setPricing(p)
            setFlights(f)
            setActivities(a)

            await syncChecklist(itinId, "sales", "salesChecklist");
            const cl = await getSalesChecklist(itinId);
            
            // Client-side deduplication to prevent React 18 strict mode double-mount artifacts from displaying
            const uniqueCl = [];
            const seen = new Set();
            for (const item of cl) {
                const key = item.originalId || item.name;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueCl.push(item);
                }
            }
            setSalesChecklist(uniqueCl);
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const toggleSalesItem = async (itemId: string, currentChecked: boolean) => {
        await updateSalesItem(itinId, itemId, {
            checked: !currentChecked,
            updatedAt: new Date().toISOString(),
        })
        setSalesChecklist(salesChecklist.map(c => c.id === itemId ? { ...c, checked: !currentChecked } : c))
    }

    const updateSalesItemState = async (itemId: string, data: any) => {
        await updateSalesItem(itinId, itemId, data)
        setSalesChecklist(salesChecklist.map(c => c.id === itemId ? { ...c, ...data } : c))
    }

    const handleFileUpload = async (itemId: string, file: File | undefined) => {
        if (!file) return
        setUploadingItemId(itemId)
        try {
            const workerUrl = "https://outbound-storage.outboundmanagementsystem.workers.dev"
            const url = `${workerUrl.replace(/\/$/, '')}/sops/${itinId}/${itemId}/${encodeURIComponent(file.name)}`
            
            const response = await fetch(url, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type || "application/octet-stream" }
            })
            if (!response.ok) throw new Error("R2 Worker upload failed")
                
            await updateSalesItemState(itemId, { fileUrl: url })
        } catch (error) {
            console.error("Upload failed", error)
            alert("File upload failed.")
        } finally {
            setUploadingItemId(null)
        }
    }

    const handleStatusChange = async (newStatus: ItineraryStatus) => {
        // When moving to "handover", show checklist modal first
        if (newStatus === "handover") {
            setPendingStatus("handover")
            setShowChecklistModal(true)
            return
        }
        await _doStatusChange(newStatus)
    }

    const handleSubmitToOps = async () => {
        setStagingOps(true)
        try {
            await _doStatusChange("pre-ops")
        } finally {
            setStagingOps(false)
            setShowConfirmOps(false)
        }
    }

    const _doStatusChange = async (newStatus: ItineraryStatus) => {
        await updateItineraryStatus(itinId, newStatus)
        if (newStatus === "handover") {
            await initSopChecklist(itinId)
        }
        loadAll()
    }

    const handlePaymentSubmit = async (data: PaymentFormData) => {
        let screenshotUrl: string | undefined

        // Upload screenshot via Cloudflare R2 worker if provided
        if (data.screenshotFile) {
            const workerUrl = "https://outbound-storage.outboundmanagementsystem.workers.dev"
            const url = `${workerUrl}/payments/${itinId}/${Date.now()}_${encodeURIComponent(data.screenshotFile.name)}`
            const res = await fetch(url, {
                method: "PUT",
                body: data.screenshotFile,
                headers: { "Content-Type": data.screenshotFile.type || "application/octet-stream" },
            })
            if (res.ok) screenshotUrl = url
        }

        await addPayment(itinId, {
            type: data.type,
            amount: data.amount,
            method: data.method,
            notes: data.notes,
            screenshotUrl,
            selectedPlan: data.selectedPlan ?? null,
            collectedBy: userProfile?.uid || "",
            collectedByName: userProfile?.name || "",
            collectedAt: new Date().toISOString(),
        })

        setShowPaymentModal(false)
        // Now proceed with the status change
        if (pendingStatus) {
            await _doStatusChange(pendingStatus)
            setPendingStatus(null)
        }
    }

    const currentStatusIdx = statusFlow.indexOf(itin?.status || "draft")
    const nextStatus = currentStatusIdx < statusFlow.length - 1 ? statusFlow[currentStatusIdx + 1] : null
    const role = userProfile?.role || ""
    const isAdmin = role === "admin" || role === "owner"
    const isSales = role === "sales" || role === "sales_lead"
    const isOps = role === "ops" || role === "ops_lead"
    const currentStatus = itin?.status || "draft"

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} />
        </div>
    )

    if (!itin) return (
        <div className="text-center py-20">
            <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.5)' }}>Itinerary not found</p>
        </div>
    )

    const requiredChecklist = salesChecklist.filter(c => c.isRequired !== false)

    const handleShare = async () => {
        // Step 1: Generate and download the PDF
        window.open(`/itinerary/${itinId}?download=1`, '_blank')
        
        // Step 2: Wait a moment then open WhatsApp with pre-filled message
        await new Promise(r => setTimeout(r, 1500))
        
        const consultantName = userProfile?.name || "our travel consultant"
        const destination = itin?.destination || "your destination"
        const nights = itin?.nights || ""
        const days = itin?.days || ""
        const duration = nights && days ? `${nights}N/${days}D` : ""
        
        const message = `Hello ${itin?.customerName || "Sir/Madam"},

Greetings from Outbound Travelers!

This is ${consultantName}, and I would be happy to assist you in planning your trip to ${destination}${duration ? ` (${duration})` : ""} and ensuring a smooth travel experience.

I have shared your detailed itinerary with you in the attached PDF. Kindly go through it at your convenience.

If you have any questions, would like to make customizations, or have any concerns regarding the package, please feel free to reach out to me. I am here to assist you in any way I can.`

        const encodedMessage = encodeURIComponent(message)
        
        // If customer phone exists, open direct WhatsApp chat
        // Otherwise open WhatsApp with message ready to select contact
        alert("PDF is downloading. Please attach it in WhatsApp after sending the message.")
        if (itin?.customerPhone) {
            const phone = itin.customerPhone.replace(/[^0-9]/g, '')
            const phoneWithCode = phone.startsWith('91') ? phone : `91${phone}`
            window.open(`https://wa.me/${phoneWithCode}?text=${encodedMessage}`, '_blank')
        } else {
            window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
        }
    }

    return (
        <>
        {showChecklistModal ? (
            <SalesChecklistModal
                isOpen={showChecklistModal}
                onClose={() => setShowChecklistModal(false)}
                checklist={salesChecklist}
                onToggleItem={toggleSalesItem}
                onUpdateItem={updateSalesItemState}
                onFileUpload={handleFileUpload}
                uploadingItemId={uploadingItemId}
                onComplete={() => {
                    setShowChecklistModal(false)
                    setShowPaymentModal(true)
                }}
            />
        ) : (
            <div className="space-y-6 max-w-5xl mx-auto">
                {/* Back */}
                <Link href="/sales" className="inline-flex items-center gap-2 font-sans text-xs tracking-wider uppercase" style={{ color: 'rgba(6,161,92,0.6)' }}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
                </Link>

                {/* Header */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <h1 className="font-serif text-2xl sm:text-3xl tracking-wide" style={{ color: '#052210' }}>{itin.customerName || "Unnamed Itinerary"}</h1>
                        {itin.quoteId && (
                            <span className="font-sans text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase tracking-widest mt-1">
                                {itin.quoteId}
                            </span>
                        )}
                    </div>
                    <p className="font-sans text-xs sm:text-sm mt-1" style={{ color: 'rgba(5,34,16,0.6)' }}>{itin.destination} · {itin.nights}N/{itin.days}D</p>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={`/sales/itinerary-generator/${itin?.module === 'built-package' ? 'build-package' : 'custom'}?editId=${itinId}`}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-sans text-[10px] tracking-wider uppercase transition-all hover:scale-105"
                            style={{ background: 'rgba(52,211,153,0.1)', color: '#06a15c', border: '1px solid rgba(52,211,153,0.2)' }}
                        >
                            <FileEdit className="w-3 h-3" /> Edit
                        </Link>
                        {userProfile?.role !== "sales" && (
                            <button
                                onClick={() => window.open(`/voucher/${itinId}?download=1`, '_blank')}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-sans text-[10px] tracking-wider uppercase transition-all hover:scale-105"
                                style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c', border: '1px solid rgba(6,161,92,0.2)' }}
                            >
                                <FileText className="w-3 h-3" /> Voucher
                            </button>
                        )}
                        <button
                            onClick={() => window.open(`/itinerary/${itinId}?download=1`, '_blank')}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-sans text-[10px] tracking-wider uppercase transition-all hover:scale-105"
                            style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c', border: '1px solid rgba(6,161,92,0.2)' }}
                        >
                            <Download className="w-3 h-3" /> PDF
                        </button>
                        <Link
                            href={`/itinerary/${itinId}`}
                            target="_blank"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-sans text-[10px] tracking-wider uppercase transition-all hover:scale-105"
                            style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c', border: '1px solid rgba(6,161,92,0.2)' }}
                        >
                            <Eye className="w-3 h-3" /> View
                        </Link>
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-sans text-[10px] tracking-wider uppercase transition-all hover:scale-105"
                            style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c', border: '1px solid rgba(6,161,92,0.2)' }}
                        >
                            <Share2 className="w-3 h-3" /> Share
                        </button>
                    </div>
                </div>

                {/* Status pipeline */}
                {(() => {
                    const visibleFlow = isSales
                        ? statusFlow.filter(s => s === "draft" || s === "handover" || s === "pre-ops")
                        : statusFlow
                    return (
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                            {visibleFlow.map((status, i) => {
                                const isActive = statusFlow.indexOf(status) <= currentStatusIdx
                                const color = statusColors[status]
                                return (
                                    <div key={status} className="flex items-center gap-2">
                                        <span
                                            className="px-3 py-1.5 rounded-full font-sans text-[10px] font-bold tracking-wider uppercase whitespace-nowrap"
                                            style={{
                                                background: isActive ? `${color}20` : 'rgba(5,34,16,0.05)',
                                                color: isActive ? color : 'rgba(5,34,16,0.4)',
                                                border: `1px solid ${isActive ? `${color}40` : 'rgba(5,34,16,0.08)'}`,
                                            }}
                                        >
                                            {status}
                                        </span>
                                        {i < visibleFlow.length - 1 && <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(5,34,16,0.3)' }} />}
                                    </div>
                                )
                            })}
                        </div>
                    )
                })()}

                {/* ── Role-based action button ── */}
                {(() => {
                    // ADMIN: generic next-stage button for all stages
                    if (isAdmin && nextStatus) {
                        return (
                            <div className="flex flex-col items-end gap-1">
                                <button
                                    onClick={() => handleStatusChange(nextStatus)}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-sans text-xs tracking-wider uppercase transition-all hover:scale-105 shadow-xl shadow-emerald-900/10 active:scale-95"
                                    style={{ background: '#052210', color: '#4ade80' }}
                                >
                                    Move to {nextStatus} <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )
                    }

                    // SALES: Draft → Collect Advance & Move to Handover
                    if (isSales && currentStatus === "draft") {
                        return (
                            <div className="flex flex-col items-end gap-1">
                                <button
                                    onClick={() => { setPendingStatus("handover"); setShowChecklistModal(true) }}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-sans text-xs tracking-wider uppercase transition-all hover:scale-105 shadow-xl shadow-emerald-900/10 active:scale-95"
                                    style={{ background: '#052210', color: '#4ade80' }}
                                >
                                    <CheckCircle className="w-4 h-4" /> Collect Advance &amp; Move to Handover
                                </button>
                            </div>
                        )
                    }

                    // SALES: Handover → Submit to Operations
                    if (isSales && currentStatus === "handover") {
                        return (
                            <div className="flex flex-col items-end gap-1">
                                <button
                                    onClick={() => setShowConfirmOps(true)}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-sans text-xs tracking-wider uppercase transition-all hover:scale-105 shadow-xl shadow-emerald-900/10 active:scale-95"
                                    style={{ background: '#052210', color: '#4ade80' }}
                                >
                                    <Send className="w-4 h-4" /> Submit to Operations
                                </button>
                            </div>
                        )
                    }

                    // SALES: Pre-Ops / Post-Ops / Completed → read-only badge
                    if (isSales && (currentStatus === "pre-ops" || currentStatus === "post-ops")) {
                        return (
                            <div className="flex justify-end">
                                <span className="flex items-center gap-2 px-4 py-2 rounded-full font-sans text-[11px] font-bold tracking-wider uppercase" style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.25)' }}>
                                    🔄 In Operations
                                </span>
                            </div>
                        )
                    }
                    if (isSales && currentStatus === "completed") {
                        return (
                            <div className="flex justify-end">
                                <span className="flex items-center gap-2 px-4 py-2 rounded-full font-sans text-[11px] font-bold tracking-wider uppercase" style={{ background: 'rgba(52,211,153,0.1)', color: '#059669', border: '1px solid rgba(52,211,153,0.25)' }}>
                                    ✅ Completed
                                </span>
                            </div>
                        )
                    }

                    // OPS: Pre-Ops → Move to Post Ops
                    if (isOps && currentStatus === "pre-ops") {
                        return (
                            <div className="flex flex-col items-end gap-1">
                                <button
                                    onClick={() => _doStatusChange("post-ops")}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-sans text-xs tracking-wider uppercase transition-all hover:scale-105 shadow-xl shadow-emerald-900/10 active:scale-95"
                                    style={{ background: '#052210', color: '#4ade80' }}
                                >
                                    Move to Post Ops <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )
                    }

                    // OPS: Post-Ops → Mark as Completed
                    if (isOps && currentStatus === "post-ops") {
                        return (
                            <div className="flex flex-col items-end gap-1">
                                <button
                                    onClick={() => _doStatusChange("completed")}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-sans text-xs tracking-wider uppercase transition-all hover:scale-105 shadow-xl shadow-emerald-900/10 active:scale-95"
                                    style={{ background: '#052210', color: '#4ade80' }}
                                >
                                    <CheckCircle className="w-4 h-4" /> Mark as Completed
                                </button>
                            </div>
                        )
                    }

                    // OPS: Completed → badge only
                    if (isOps && currentStatus === "completed") {
                        return (
                            <div className="flex justify-end">
                                <span className="flex items-center gap-2 px-4 py-2 rounded-full font-sans text-[11px] font-bold tracking-wider uppercase" style={{ background: 'rgba(52,211,153,0.1)', color: '#059669', border: '1px solid rgba(52,211,153,0.25)' }}>
                                    ✅ Completed
                                </span>
                            </div>
                        )
                    }

                    return null
                })()}

                {/* Confirm Submit to Ops dialog */}
                {showConfirmOps && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={() => setShowConfirmOps(false)}>
                        <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4" style={{ background: '#FFFFFF', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                            <div>
                                <h2 className="font-serif text-xl tracking-wide mb-1" style={{ color: '#052210' }}>Submit to Operations?</h2>
                                <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.6)' }}>Are you sure you want to submit this to the Operations team? You will no longer manage this booking.</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleSubmitToOps}
                                    disabled={stagingOps}
                                    className="flex-1 py-3 rounded-xl font-sans text-xs tracking-wider uppercase font-bold flex items-center justify-center gap-2 transition-all"
                                    style={{ background: '#052210', color: '#4ade80' }}
                                >
                                    {stagingOps ? <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#4ade80', borderTopColor: 'transparent' }} /> : <Send className="w-4 h-4" />}
                                    {stagingOps ? 'Submitting...' : 'Yes, Submit'}
                                </button>
                                <button onClick={() => setShowConfirmOps(false)} className="px-5 py-3 rounded-xl font-sans text-xs tracking-wider uppercase font-semibold" style={{ border: '1.5px solid #e5e7eb', color: 'rgba(5,34,16,0.45)' }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Details grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer info */}
                    <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                        <h3 className="font-serif text-sm tracking-wider uppercase mb-4" style={{ color: '#06a15c' }}>Customer</h3>
                        <div className="space-y-2 font-sans text-sm" style={{ color: 'rgba(5,34,16,0.8)' }}>
                            <p><strong style={{ color: '#052210' }}>{itin.customerName}</strong></p>
                            {itin.customerPhone && <p>{itin.customerPhone}</p>}
                            {itin.customerEmail && <p>{itin.customerEmail}</p>}
                        </div>
                    </div>

                    {/* Trip info */}
                    <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                        <h3 className="font-serif text-sm tracking-wider uppercase mb-4" style={{ color: '#06a15c' }}>Trip</h3>
                        <div className="space-y-2 font-sans text-sm" style={{ color: 'rgba(5,34,16,0.8)' }}>
                            <p>{itin.destination} · {itin.nights}N/{itin.days}D</p>
                            <p>{itin.startDate} → {itin.endDate}</p>
                            <p>{itin.adults} Adults{itin.children > 0 ? `, ${itin.children} Children (${itin.childAge})` : ""}</p>
                            {itin.placesCovered && <p>{itin.placesCovered}</p>}
                        </div>
                    </div>

                    {/* Hotels */}
                    <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                        <h3 className="font-serif text-sm tracking-wider uppercase mb-4" style={{ color: '#06a15c' }}>Hotels ({hotels.length})</h3>
                        {hotels.map((h: any, idx: number) => (
                            <div key={`${h.id}-${idx}`} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(6,161,92,0.05)' }}>
                                <span className="font-sans text-sm" style={{ color: '#052210' }}>{h.name || h.hotelName || "Unnamed Hotel"}</span>
                                <span className="font-sans text-xs" style={{ color: 'rgba(5,34,16,0.6)' }}>{h.category}{h.rating ? ` · ${h.rating}★` : ''}</span>
                            </div>
                        ))}
                    </div>

                    {/* Flights */}
                    {flights.length > 0 && (
                        <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                            <h3 className="font-serif text-sm tracking-wider uppercase mb-4" style={{ color: '#06a15c' }}>Flights ({flights.length})</h3>
                            {flights.map((f: any, idx: number) => (
                                <div key={`${f.id}-${idx}`} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(6,161,92,0.05)' }}>
                                    <div>
                                        <span className="font-sans text-sm block" style={{ color: '#052210' }}>{f.airline} {f.flightNo ? `(${f.flightNo})` : ""}</span>
                                        <span className="font-sans text-xs" style={{ color: 'rgba(5,34,16,0.5)' }}>{f.fromCode} → {f.toCode} · {f.departure} - {f.arrival}</span>
                                    </div>
                                    <span className="font-sans text-xs font-bold self-start mt-1" style={{ color: '#06a15c' }}>{f.flightType}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Activities */}
                    {activities.length > 0 && (
                        <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                            <h3 className="font-serif text-sm tracking-wider uppercase mb-4" style={{ color: '#06a15c' }}>Activities ({activities.length})</h3>
                            {activities.map((a: any, idx: number) => (
                                <div key={`${a.id}-${idx}`} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(6,161,92,0.05)' }}>
                                    <span className="font-sans text-sm" style={{ color: '#052210' }}>{a.name || a.activityName}</span>
                                    <span className="font-sans text-xs" style={{ color: 'rgba(5,34,16,0.6)' }}>{a.category || a.activityType}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Transfers */}
                    {transfers.length > 0 && (
                        <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                            <h3 className="font-serif text-sm tracking-wider uppercase mb-4" style={{ color: '#06a15c' }}>Transfers ({transfers.length})</h3>
                            {transfers.map((t: any, idx: number) => (
                                <div key={idx} className="flex justify-between py-2 items-start" style={{ borderBottom: '1px solid rgba(6,161,92,0.05)' }}>
                                    <div>
                                        <span className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{t.type} {t.vehicleType ? `· ${t.vehicleType}` : ""}</span>
                                        <div className="flex flex-col mt-1 space-y-0.5">
                                            {t.pickup && <span className="font-sans text-xs" style={{ color: 'rgba(5,34,16,0.6)' }}><strong className="font-medium">Pickup:</strong> {t.pickup}</span>}
                                            {t.drop && <span className="font-sans text-xs" style={{ color: 'rgba(5,34,16,0.6)' }}><strong className="font-medium">Drop:</strong> {t.drop}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pricing */}
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(6,161,92,0.05)', border: '1px solid rgba(6,161,92,0.15)' }}>
                        <h3 className="font-serif text-sm tracking-wider uppercase mb-4" style={{ color: '#06a15c' }}>Pricing</h3>
                        {pricing?.[0]?.plans && pricing[0].plans.length > 0 ? (
                            <div className="space-y-3">
                                {pricing[0].plans.map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between items-end border-b pb-2 last:border-0 last:pb-0" style={{ borderColor: 'rgba(6,161,92,0.1)' }}>
                                        <div>
                                            <p className="font-sans text-xs font-bold" style={{ color: '#052210' }}>{p.hotelName}</p>
                                            <p className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.5)' }}>{p.category} | ₹{p.perPersonPrice?.toLocaleString()} pp</p>
                                        </div>
                                        <p className="font-serif text-lg font-bold" style={{ color: '#06a15c' }}>₹{p.total?.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                <p className="font-serif text-3xl font-bold" style={{ color: '#06a15c' }}>₹{Number(itin.totalPrice || 0).toLocaleString()}</p>
                                <p className="font-sans text-xs mt-1" style={{ color: 'rgba(5,34,16,0.6)' }}>₹{Number(itin.perPersonPrice || 0).toLocaleString()} per person</p>
                            </>
                        )}
                    </div>
                </div>

                {/* Day Plans */}
                <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(6,161,92,0.08)' }}>
                        <h3 className="font-serif text-lg tracking-wide" style={{ color: '#06a15c' }}>Day Plans ({days.length})</h3>
                    </div>
                    {[...days].sort((a, b) => {
                        const numA = parseInt((a.day || String(a.dayNumber || "")).replace(/\D/g, '')) || parseInt(a.dayNumber) || 0;
                        const numB = parseInt((b.day || String(b.dayNumber || "")).replace(/\D/g, '')) || parseInt(b.dayNumber) || 0;
                        return numA - numB;
                    }).map((day: any, idx: number) => {
                        // Compute sequential date from startDate + index
                        let displayDate = day.date;
                        if (itin.startDate) {
                            try {
                                const baseDate = new Date(itin.startDate);
                                if (!isNaN(baseDate.getTime())) {
                                    const currentDate = new Date(baseDate);
                                    currentDate.setDate(baseDate.getDate() + idx);
                                    displayDate = currentDate.toLocaleDateString("en-US", {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric"
                                    }).toUpperCase();
                                }
                            } catch { /* fallback to day.date */ }
                        }
                        return (
                        <div key={day.id || idx} className="px-6 py-4" style={{ borderBottom: '1px solid rgba(6,161,92,0.05)' }}>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-2.5 py-0.5 rounded-full font-sans text-[10px] font-bold tracking-wider uppercase" style={{ background: 'rgba(6,161,92,0.12)', color: '#06a15c' }}>{day.day}</span>
                                <span className="font-sans text-xs" style={{ color: 'rgba(5,34,16,0.5)' }}>{displayDate}</span>
                            </div>
                            <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{day.title}</p>
                            {day.description && <p className="font-sans text-xs mt-1" style={{ color: 'rgba(5,34,16,0.7)' }}>{day.description}</p>}
                        </div>
                    )})}
                </div>
            </div>
        )}

        {/* Payment Collection Modal */}
        <PaymentCollectionModal
            isOpen={showPaymentModal}
            onClose={() => { setShowPaymentModal(false); setPendingStatus(null) }}
            onSubmit={handlePaymentSubmit}
            itineraryName={itin?.customerName || "Itinerary"}
            totalPrice={Number(itin?.totalPrice || 0)}
            amountAlreadyPaid={Number(itin?.amountPaid || 0)}
            defaultType="advance"
            title="Collect Advance Payment"
            submitLabel="Save Payment & Move to Handover"
            plans={pricing?.[0]?.plans ?? []}
        />
        </>
    )
}
