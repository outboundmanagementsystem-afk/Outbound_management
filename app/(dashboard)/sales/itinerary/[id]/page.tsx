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
import Link from "next/link"
import { ArrowLeft, Clock, Send, FileEdit, CheckCircle, XCircle, ChevronRight, Share2, Eye, Download, FileText, Hotel, Car, DollarSign, MapPin, Calendar, Users, Map, Circle } from "lucide-react"

const statusFlow: ItineraryStatus[] = ["draft", "handover", "completed"]
const statusColors: Record<string, string> = {
    draft: "#9ca3af", sent: "#60a5fa", confirmed: "#34d399",
    handover: "#a78bfa", completed: "#f472b6",
}

export default function ItineraryDetailPage() {
    return (
        <ProtectedRoute allowedRoles={["sales", "sales_lead", "admin", "owner"]}>
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
    const [pendingStatus, setPendingStatus] = useState<ItineraryStatus | null>(null)

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
        // When moving to "handover", show payment collection modal first
        if (newStatus === "handover") {
            setPendingStatus("handover")
            setShowPaymentModal(true)
            return
        }
        await _doStatusChange(newStatus)
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

    return (
        <>
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Back */}
            <Link href="/sales" className="inline-flex items-center gap-2 font-sans text-xs tracking-wider uppercase" style={{ color: 'rgba(6,161,92,0.6)' }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
            </Link>

            {/* Header */}
            <div className="space-y-3">
                <div>
                    <h1 className="font-serif text-2xl sm:text-3xl tracking-wide" style={{ color: '#052210' }}>{itin.customerName || "Unnamed Itinerary"}</h1>
                    <p className="font-sans text-xs sm:text-sm mt-1" style={{ color: 'rgba(5,34,16,0.6)' }}>{itin.destination} · {itin.nights}N/{itin.days}D</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href={`/sales/itinerary-generator/custom?editId=${itinId}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-sans text-[10px] tracking-wider uppercase transition-all hover:scale-105"
                        style={{ background: 'rgba(52,211,153,0.1)', color: '#06a15c', border: '1px solid rgba(52,211,153,0.2)' }}
                    >
                        <FileEdit className="w-3 h-3" /> Edit
                    </Link>
                    <button
                        onClick={() => window.open(`/voucher/${itinId}?download=1`, '_blank')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-sans text-[10px] tracking-wider uppercase transition-all hover:scale-105"
                        style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c', border: '1px solid rgba(6,161,92,0.2)' }}
                    >
                        <FileText className="w-3 h-3" /> Voucher
                    </button>
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
                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/itinerary/${itinId}`) }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-sans text-[10px] tracking-wider uppercase transition-all hover:scale-105"
                        style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c', border: '1px solid rgba(6,161,92,0.2)' }}
                    >
                        <Share2 className="w-3 h-3" /> Share
                    </button>
                </div>
            </div>

            {/* Status pipeline */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {statusFlow.map((status, i) => {
                    const isActive = i <= currentStatusIdx
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
                            {i < statusFlow.length - 1 && <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(5,34,16,0.3)' }} />}
                        </div>
                    )
                })}
            </div>

            {/* Advance status button */}
            {nextStatus && (
                <div className="flex flex-col items-end gap-1">
                    <button
                        onClick={() => handleStatusChange(nextStatus)}
                        disabled={salesChecklist.length > 0 && salesChecklist.some(c => !c.checked)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-sans text-xs tracking-wider uppercase transition-all ${salesChecklist.length > 0 && salesChecklist.some(c => !c.checked) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                        style={{ background: statusColors[nextStatus] + '20', color: statusColors[nextStatus], border: `1px solid ${statusColors[nextStatus]}40` }}
                    >
                        Move to {nextStatus} <ChevronRight className="w-4 h-4" />
                    </button>
                    {salesChecklist.length > 0 && salesChecklist.some(c => !c.checked) && (
                        <span className="font-sans text-[10px] text-red-500 font-bold uppercase tracking-wider">
                            Complete all Sales Pre-Handover Checklist tracking items to proceed
                        </span>
                    )}
                </div>
            )}

            {/* Sales SOP Checklist */}
            {salesChecklist.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(6,161,92,0.08)' }}>
                        <h3 className="font-serif text-lg tracking-wide" style={{ color: '#06a15c' }}>Sales Pre-Handover Checklist</h3>
                        <span className="font-sans text-xs font-bold" style={{ color: 'rgba(6,161,92,0.8)' }}>
                            {salesChecklist.filter(c => c.checked).length} / {salesChecklist.length} Completed
                        </span>
                    </div>
                    {salesChecklist.map((item: any) => (
                        <div key={item.id} className="w-full px-6 py-4 flex flex-col gap-3" style={{ borderBottom: '1px solid rgba(6,161,92,0.06)' }}>
                            <div className="flex items-start gap-4">
                                <button
                                    onClick={() => toggleSalesItem(item.id, item.checked)}
                                    disabled={(item.requiresAcknowledgement && !item.acknowledged && !item.checked) || (["file_upload", "File Upload"].includes(item.type) && !item.fileUrl && !item.checked) || (["file_or_text"].includes(item.type) && !item.fileUrl && !item.response && !item.checked) || (item.isRequired && ["text_input", "Text Input", "single_choice", "Single Choice", "multiple_choice", "Multiple Choice", "rating", "Rating", "rating_5", "rating_10"].includes(item.type) && !item.response && !item.checked) || (item.isRequired && ["multiple_select", "Multiple Select"].includes(item.type) && (!item.response || item.response.length === 0) && !item.checked)}
                                    className={`mt-0.5 transition-colors ${((item.requiresAcknowledgement && !item.acknowledged && !item.checked) || (["file_upload", "File Upload"].includes(item.type) && !item.fileUrl && !item.checked) || (["file_or_text"].includes(item.type) && !item.fileUrl && !item.response && !item.checked)) ? "opacity-50 cursor-not-allowed" : "hover:scale-110"}`}
                                >
                                    {item.checked ? (
                                        <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#34d399' }} />
                                    ) : (
                                        <Circle className="w-5 h-5 flex-shrink-0" style={{ color: 'rgba(5,34,16,0.4)' }} />
                                    )}
                                </button>
                                <div className="flex-1">
                                    <span
                                        className="font-sans text-sm block transition-colors"
                                        style={{
                                            color: item.checked ? 'rgba(5,34,16,0.5)' : '#052210',
                                            textDecoration: item.checked ? 'line-through' : 'none',
                                        }}
                                    >
                                        {item.name || item.title}
                                    </span>

                                    {/* Acknowledgement section */}
                                    {item.requiresAcknowledgement && !item.checked && (
                                        <label className="flex items-center gap-2 mt-3 p-3 rounded-lg cursor-pointer w-fit" style={{ background: 'rgba(5,34,16,0.03)', border: '1px solid rgba(5,34,16,0.08)' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={item.acknowledged || false}
                                                onChange={(e) => updateSalesItemState(item.id, { acknowledged: e.target.checked })}
                                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
                                            />
                                            <span className="font-sans text-xs font-medium" style={{ color: '#052210' }}>Yes, I have done this</span>
                                        </label>
                                    )}

                                    
                                    {/* Dynamic Input Types */}
{["text_input", "Text Input"].includes(item.type) && (<div className="mt-3"><input type="text" disabled={item.checked} value={item.response || ""} onChange={(e) => updateSalesItemState(item.id, { response: e.target.value })} placeholder="Enter your answer..." className="w-full px-3 py-2 rounded-lg font-sans text-xs outline-none" style={{ border: "1px solid rgba(5,34,16,0.1)", color: "#052210" }} /></div>)}
{["file_or_text"].includes(item.type) && !item.checked && !item.fileUrl && (<div className="mt-3"><input type="text" disabled={item.checked} value={item.response || ""} onChange={(e) => updateSalesItemState(item.id, { response: e.target.value })} placeholder="Enter text answer OR upload a file below..." className="w-full px-3 py-2 rounded-lg font-sans text-xs outline-none" style={{ border: "1px solid rgba(5,34,16,0.1)", color: "#052210" }} /></div>)}
{["date_picker", "Date Picker"].includes(item.type) && (<div className="mt-3"><input type="date" disabled={item.checked} value={item.response || ""} onChange={(e) => updateSalesItemState(item.id, { response: e.target.value })} className="px-3 py-2 rounded-lg font-sans text-xs outline-none" style={{ border: "1px solid rgba(5,34,16,0.1)", color: "#052210" }} /></div>)}
{["single_choice", "Single Choice"].includes(item.type) && (item.options || item.points) && (<div className="mt-3 space-y-2">{(item.options || item.points || []).map((opt: string, i: number) => (<label key={i} className="flex items-center gap-2 cursor-pointer"><input type="radio" disabled={item.checked} name={"single-"+item.id} checked={item.response === opt} onChange={() => updateSalesItemState(item.id, { response: opt })} className="w-3.5 h-3.5" style={{ accentColor: "#06a15c" }} /><span className="font-sans text-xs" style={{ color: "rgba(5,34,16,0.8)" }}>{opt}</span></label>))}</div>)}
{["multiple_choice", "Multiple Choice", "multiple_select"].includes(item.type) && (item.options || item.points) && (<div className="mt-3 space-y-2">{(item.options || item.points || []).map((opt: string, i: number) => { const currentArr = Array.isArray(item.response) ? item.response : []; return (<label key={i} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={currentArr.includes(opt)} onChange={(e) => { let n = [...currentArr]; if (e.target.checked) n.push(opt); else n = n.filter((x: string) => x !== opt); updateSalesItemState(item.id, { response: n }); }} className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600" /><span className="font-sans text-xs" style={{ color: "rgba(5,34,16,0.8)" }}>{opt}</span></label>) })}</div>)}
{["rating", "Rating", "rating_5", "rating_10"].includes(item.type) && (<div className="mt-3 flex items-center gap-1.5">{Array.from({ length: item.type === "rating_10" ? 10 : (parseInt(item.extraInfo || "5") || 5) }).map((_: any, i: number) => (<button key={i} onClick={() => updateSalesItemState(item.id, { response: (i + 1).toString() })} className="text-xl transition-colors hover:scale-110" style={{ color: (parseInt(item.response || "0")) > i ? "#f59e0b" : "rgba(5,34,16,0.1)" }}>?</button>))} <span className="ml-2 font-sans text-[10px] text-gray-400">({item.response || 0} / {item.type === "rating_10" ? 10 : (parseInt(item.extraInfo || "5") || 5)})</span></div>)}
{item.checked && item.response && (<div className="mt-2 bg-emerald-50/50 px-3 py-2 rounded-lg border border-emerald-100"><span className="font-sans text-[10px] font-bold uppercase tracking-wider block text-emerald-600 mb-1">Response:</span><span className="font-sans text-xs text-emerald-900 font-medium">{Array.isArray(item.response) ? item.response.join(", ") : item.response}</span></div>)}

{/* File upload section */}
                                    {['file_upload', 'File Upload', 'file_or_text'].includes(item.type) && !item.checked && (
                                        <div className="mt-3 p-3 rounded-lg w-fit" style={{ background: 'rgba(5,34,16,0.03)', border: '1px solid rgba(5,34,16,0.08)' }}>
                                            {!item.fileUrl ? (
                                                <div className="flex items-center gap-3">
                                                    <input 
                                                        type="file" 
                                                        id={`file-${item.id}`}
                                                        className="hidden" 
                                                        onChange={(e) => handleFileUpload(item.id, e.target.files?.[0])}
                                                    />
                                                    <label htmlFor={`file-${item.id}`} className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-md font-sans text-[10px] font-bold tracking-wider uppercase transition-colors" style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c', border: '1px dashed rgba(6,161,92,0.3)' }}>
                                                        <FileText className="w-3.5 h-3.5" /> Upload File
                                                    </label>
                                                    {uploadingItemId === item.id && <span className="font-sans text-[10px] text-gray-500 animate-pulse">Uploading...</span>}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <a href={item.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-sans text-xs hover:underline" style={{ color: '#06a15c' }}>
                                                        <FileText className="w-3.5 h-3.5" /> View Uploaded File
                                                    </a>
                                                    <button onClick={() => updateSalesItemState(item.id, { fileUrl: '' })} className="px-2 py-1 rounded bg-red-50 text-[10px] uppercase font-bold text-red-500 tracking-wider">Remove</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {/* If already checked and has a file, show the file link */}
                                    {item.checked && item.fileUrl && (
                                        <div className="mt-2">
                                            <a href={item.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-sans text-[11px] opacity-70 hover:opacity-100 transition-opacity" style={{ color: '#06a15c' }}>
                                                <FileText className="w-3 h-3" /> View Uploaded File
                                            </a>
                                        </div>
                                    )}

                                    {/* Existing Notes/Points Display */}
                                    {(item.notes || (item.points && item.points.length > 0) || item.extraInfo) && (
                                        <div className="mt-2 space-y-2 border-l-2 border-dashed pl-3" style={{ borderColor: 'rgba(5,34,16,0.1)' }}>
                                            {item.extraInfo && (
                                                <div className="inline-flex items-center px-1.5 py-0.5 rounded font-bold font-sans text-xs" style={{ background: 'rgba(5,34,16,0.06)', color: '#052210' }}>
                                                    {item.extraInfo}
                                                </div>
                                            )}
                                            {item.notes && <p className="font-sans text-[11px] italic leading-relaxed" style={{ color: 'rgba(5,34,16,0.5)' }}>{item.notes}</p>}
                                            {item.points && item.points.length > 0 && (
                                                <ul className="space-y-1">
                                                    {item.points.map((p: string, k: number) => (
                                                        <li key={k} className="font-sans text-[10px] flex items-start gap-1.5" style={{ color: 'rgba(5,34,16,0.6)' }}>
                                                            <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'rgba(5,34,16,0.3)' }} />
                                                            {p}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
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
        />
        </>
    )
}
