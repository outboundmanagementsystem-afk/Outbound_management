"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
    getItinerary, getPostOpsChecklist, updatePostOpsItem, updateItineraryStatus, initPostOpsChecklist,
    getItineraryDays, getItineraryHotels, getItineraryTransfers, getItineraryPricing, getItineraryFlights, syncChecklist
} from "@/lib/firestore"
import { storage } from "@/lib/firebase"
import Link from "next/link"
import { ArrowLeft, CheckCircle, Circle, ClipboardCheck, FileText, Eye, Download, Share2, FileEdit, MessageCircle } from "lucide-react"
import { WHATSAPP_TEMPLATES, generateWhatsAppLink } from "@/lib/whatsapp-templates"

export default function PostOpsBookingDetailPage() {
    return (
        <ProtectedRoute allowedRoles={["post_ops", "admin"]}>
            <PostOpsBookingDetail />
        </ProtectedRoute>
    )
}

function PostOpsBookingDetail() {
    const params = useParams()
    const bookingId = params.id as string
    const [booking, setBooking] = useState<any>(null)
    const [checklist, setChecklist] = useState<any[]>([])
    const [days, setDays] = useState<any[]>([])
    const [hotels, setHotels] = useState<any[]>([])
    const [transfers, setTransfers] = useState<any[]>([])
    const [pricing, setPricing] = useState<any[]>([])
    const [flights, setFlights] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [uploadingItemId, setUploadingItemId] = useState<string | null>(null)

    useEffect(() => { loadData() }, [bookingId])

    const loadData = async () => {
        try {
            const bk = await getItinerary(bookingId)
            setBooking(bk)

            const [d, h, t, p, f] = await Promise.all([
                getItineraryDays(bookingId),
                getItineraryHotels(bookingId),
                getItineraryTransfers(bookingId),
                getItineraryPricing(bookingId),
                getItineraryFlights(bookingId),
            ])
            setDays(d)
            setHotels(h)
            setTransfers(t)
            setPricing(p)
            setFlights(f)

            let cl = await getPostOpsChecklist(bookingId)
            let needsSync = true;
            if (cl.length === 0) {
                await initPostOpsChecklist(bookingId)
                cl = await getPostOpsChecklist(bookingId)
                needsSync = false;
            }
            if (needsSync) {
                // Sync any new SOP items added by admin after checklist was created
                try {
                    const changed = await syncChecklist(bookingId, "post_ops", "postOpsChecklist");
                    if (changed) {
                        cl = await getPostOpsChecklist(bookingId);
                    }
                } catch (syncErr) {
                    console.error("Sync failed:", syncErr)
                }
            }
            // Sort to maintain correct SOP order according to ID/creation (which are sequential)
            setChecklist(cl.sort((a, b) => a.id.localeCompare(b.id)))
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const toggleItem = async (itemId: string, currentChecked: boolean) => {
        await updatePostOpsItem(bookingId, itemId, {
            checked: !currentChecked,
            updatedAt: new Date().toISOString(),
        })
        const updatedChecklist = checklist.map(c => c.id === itemId ? { ...c, checked: !currentChecked } : c)
        setChecklist(updatedChecklist)

        // Check if all items are completed
        const allDone = updatedChecklist.every(c => c.checked)
        if (allDone && booking.status !== "completed") {
            await updateItineraryStatus(bookingId, "completed")
            setBooking({ ...booking, status: "completed" })
        }
    }

    const updatePostOpsItemState = async (itemId: string, data: any) => {
        await updatePostOpsItem(bookingId, itemId, data)
        setChecklist(checklist.map(c => c.id === itemId ? { ...c, ...data } : c))
    }

    const handleFileUpload = async (itemId: string, file: File | undefined) => {
        if (!file) return
        setUploadingItemId(itemId)
        try {
            const workerUrl = process.env.NEXT_PUBLIC_R2_WORKER_URL || "https://outbound-storage.outbound-travelers.workers.dev"
            const url = `${workerUrl.replace(/\/$/, '')}/sops/${bookingId}/${itemId}/${encodeURIComponent(file.name)}`
            
            const response = await fetch(url, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type || "application/octet-stream" }
            })
            if (!response.ok) throw new Error("R2 Worker upload failed")
                
            await updatePostOpsItemState(itemId, { fileUrl: url })
        } catch (error) {
            console.error("Upload failed", error)
            alert("File upload failed.")
        } finally {
            setUploadingItemId(null)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} />
        </div>
    )

    if (!booking) return (
        <div className="text-center py-20">
            <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.5)' }}>Booking not found</p>
        </div>
    )

    const requiredChecklist = checklist.filter(c => c.isRequired !== false)
    const completedCount = requiredChecklist.filter(c => c.checked).length
    const progress = requiredChecklist.length > 0 ? Math.round((completedCount / requiredChecklist.length) * 100) : 0

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <Link href="/post-ops" className="inline-flex items-center gap-2 font-sans text-xs tracking-wider uppercase" style={{ color: 'rgba(6,161,92,0.6)' }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Post Operation
            </Link>

            {/* Header */}
            <div className="space-y-3">
                <div>
                    <h1 className="font-serif text-2xl sm:text-3xl tracking-wide" style={{ color: '#052210' }}>{booking.customerName}</h1>
                    <p className="font-sans text-xs sm:text-sm mt-1" style={{ color: 'rgba(5,34,16,0.6)' }}>{booking.destination} · {booking.nights}N/{booking.days}D · {booking.startDate} → {booking.endDate}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href={`/sales/itinerary-generator/${booking?.module === 'built-package' ? 'build-package' : 'custom'}?editId=${bookingId}&returnTo=${encodeURIComponent(`/post-ops/booking/${bookingId}`)}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-sans text-[10px] tracking-wider uppercase transition-all hover:scale-105"
                        style={{ background: 'rgba(52,211,153,0.1)', color: '#06a15c', border: '1px solid rgba(52,211,153,0.2)' }}
                    >
                        <FileEdit className="w-3 h-3" /> Edit
                    </Link>
                    <button
                        onClick={() => window.open(`/voucher/${bookingId}?download=1`, '_blank')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-sans text-[10px] tracking-wider uppercase transition-all hover:scale-105"
                        style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c', border: '1px solid rgba(6,161,92,0.2)' }}
                    >
                        <FileText className="w-3 h-3" /> Voucher
                    </button>
                    <button
                        onClick={() => window.open(`/itinerary/${bookingId}?download=1`, '_blank')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-sans text-[10px] tracking-wider uppercase transition-all hover:scale-105"
                        style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c', border: '1px solid rgba(6,161,92,0.2)' }}
                    >
                        <Download className="w-3 h-3" /> PDF
                    </button>
                    <Link
                        href={`/itinerary/${bookingId}`}
                        target="_blank"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-sans text-[10px] tracking-wider uppercase transition-all hover:scale-105"
                        style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c', border: '1px solid rgba(6,161,92,0.2)' }}
                    >
                        <Eye className="w-3 h-3" /> View
                    </Link>
                </div>
            </div>

            {/* Progress */}
            <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                <div className="flex items-center justify-between mb-3">
                    <span className="font-sans text-xs tracking-wider uppercase" style={{ color: 'rgba(6,161,92,0.6)' }}>Post-Op Progress</span>
                    <span className="font-sans text-sm font-bold" style={{ color: progress === 100 ? '#34d399' : '#06a15c' }}>{progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(5,34,16,0.08)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: progress === 100 ? '#34d399' : 'linear-gradient(90deg, #06a15c, #34d399)' }} />
                </div>
                <p className="font-sans text-xs mt-2" style={{ color: 'rgba(5,34,16,0.5)' }}>{completedCount} of {requiredChecklist.length} mandatory Post-Op tasks completed</p>
                {booking.status === "completed" && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                        <CheckCircle className="w-4 h-4" style={{ color: '#34d399' }} />
                        <span className="font-sans text-xs font-bold" style={{ color: '#34d399' }}>Trip Successfully Closed (Marketing Handover)</span>
                    </div>
                )}
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Customer info */}
                <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <h3 className="font-serif text-sm tracking-wider uppercase mb-4" style={{ color: '#06a15c' }}>Customer</h3>
                    <div className="space-y-2 font-sans text-sm" style={{ color: 'rgba(5,34,16,0.8)' }}>
                        <p><strong style={{ color: '#052210' }}>{booking.customerName}</strong></p>
                        {booking.customerPhone && <p>{booking.customerPhone}</p>}
                        {booking.customerEmail && <p>{booking.customerEmail}</p>}
                    </div>
                </div>

                {/* Trip info */}
                <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <h3 className="font-serif text-sm tracking-wider uppercase mb-4" style={{ color: '#06a15c' }}>Trip</h3>
                    <div className="space-y-2 font-sans text-sm" style={{ color: 'rgba(5,34,16,0.8)' }}>
                        <p>{booking.destination} · {booking.nights}N/{booking.days}D</p>
                        <p>{booking.startDate} → {booking.endDate}</p>
                        <p>{booking.adults} Adults{booking.children > 0 ? `, ${booking.children} Children (${booking.childAge})` : ""}</p>
                        {booking.placesCovered && <p>{booking.placesCovered}</p>}
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
            </div>

            {/* Checklist */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(6,161,92,0.08)' }}>
                    <h3 className="font-serif text-lg tracking-wide" style={{ color: '#06a15c' }}>Post-Op SOP Checklist</h3>
                </div>
                {checklist.map((item: any) => {
                    const hasTemplate = !!WHATSAPP_TEMPLATES[item.name]
                    return (
                        <div key={item.id} className="w-full flex items-start justify-between hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(6,161,92,0.06)' }}>
                            <div className="flex-1 px-6 py-4 flex items-start gap-4 text-left">
                                <button
                                    onClick={() => toggleItem(item.id, item.checked)}
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
                                        className="font-sans text-sm block transition-colors mt-0.5"
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
                                                onChange={(e) => updatePostOpsItemState(item.id, { acknowledged: e.target.checked })}
                                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
                                            />
                                            <span className="font-sans text-xs font-medium" style={{ color: '#052210' }}>Yes, I have done this</span>
                                        </label>
                                    )}

                                    
                                    {/* Dynamic Input Types */}
{["text_input", "Text Input"].includes(item.type) && (<div className="mt-3"><input type="text" disabled={item.checked} value={item.response || ""} onChange={(e) => updatePostOpsItemState(item.id, { response: e.target.value })} placeholder="Enter your answer..." className="w-full px-3 py-2 rounded-lg font-sans text-xs outline-none" style={{ border: "1px solid rgba(5,34,16,0.1)", color: "#052210" }} /></div>)}
{["file_or_text"].includes(item.type) && !item.checked && !item.fileUrl && (<div className="mt-3"><input type="text" disabled={item.checked} value={item.response || ""} onChange={(e) => updatePostOpsItemState(item.id, { response: e.target.value })} placeholder="Enter text answer OR upload a file below..." className="w-full px-3 py-2 rounded-lg font-sans text-xs outline-none" style={{ border: "1px solid rgba(5,34,16,0.1)", color: "#052210" }} /></div>)}
{["date_picker", "Date Picker"].includes(item.type) && (<div className="mt-3"><input type="date" disabled={item.checked} value={item.response || ""} onChange={(e) => updatePostOpsItemState(item.id, { response: e.target.value })} className="px-3 py-2 rounded-lg font-sans text-xs outline-none" style={{ border: "1px solid rgba(5,34,16,0.1)", color: "#052210" }} /></div>)}
{["single_choice", "Single Choice"].includes(item.type) && (item.options || item.points) && (<div className="mt-3 space-y-2">{(item.options || item.points || []).map((opt: any, i: number) => (<label key={i} className="flex items-center gap-2 cursor-pointer"><input type="radio" disabled={item.checked} name={"single-"+item.id} checked={item.response === opt} onChange={() => updatePostOpsItemState(item.id, { response: opt })} className="w-3.5 h-3.5" style={{ accentColor: "#06a15c" }} /><span className="font-sans text-xs" style={{ color: "rgba(5,34,16,0.8)" }}>{opt}</span></label>))}</div>)}
{["multiple_choice", "Multiple Choice", "multiple_select"].includes(item.type) && (item.options || item.points) && (<div className="mt-3 space-y-2">{(item.options || item.points || []).map((opt: any, i: number) => { const currentArr = Array.isArray(item.response) ? item.response : []; return (<label key={i} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={currentArr.includes(opt)} onChange={(e) => { let n = [...currentArr]; if (e.target.checked) n.push(opt); else n = n.filter(x => x !== opt); updatePostOpsItemState(item.id, { response: n }); }} className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600" /><span className="font-sans text-xs" style={{ color: "rgba(5,34,16,0.8)" }}>{opt}</span></label>) })}</div>)}
{["rating", "Rating", "rating_5", "rating_10"].includes(item.type) && (<div className="mt-3 flex items-center gap-1.5">{Array.from({ length: item.type === "rating_10" ? 10 : (parseInt(item.extraInfo || "5") || 5) }).map((_: any, i: number) => (<button key={i} onClick={() => updatePostOpsItemState(item.id, { response: (i + 1).toString() })} className="text-xl transition-colors hover:scale-110" style={{ color: (parseInt(item.response || "0")) > i ? "#f59e0b" : "rgba(5,34,16,0.1)" }}>?</button>))} <span className="ml-2 font-sans text-[10px] text-gray-400">({item.response || 0} / {item.type === "rating_10" ? 10 : (parseInt(item.extraInfo || "5") || 5)})</span></div>)}
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
                                                    <button onClick={() => updatePostOpsItemState(item.id, { fileUrl: '' })} className="px-2 py-1 rounded bg-red-50 text-[10px] uppercase font-bold text-red-500 tracking-wider">Remove</button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* If already checked and has a file, show the file link */}
                                    {item.checked && item.fileUrl && (
                                        <div className="mt-2 text-left">
                                            <a href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-sans text-[11px] opacity-70 hover:opacity-100 transition-opacity" style={{ color: '#06a15c' }}>
                                                <FileText className="w-3 h-3" /> View Uploaded File
                                            </a>
                                        </div>
                                    )}

                                    {(item.notes || (item.points && item.points.length > 0) || item.extraInfo) && (
                                        <div className="mt-3 space-y-2 border-l-2 border-dashed pl-3 text-left" style={{ borderColor: 'rgba(5,34,16,0.1)' }}>
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

                            {hasTemplate && booking?.customerPhone && (
                                <div className="px-6">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const text = WHATSAPP_TEMPLATES[item.name](booking)
                                            window.open(generateWhatsAppLink(booking.customerPhone, text), '_blank')
                                        }}
                                        className="p-2 rounded-full transition-all hover:scale-110"
                                        style={{ background: 'rgba(37,211,102,0.1)' }}
                                        title="Send WhatsApp Template"
                                    >
                                        <MessageCircle className="w-4 h-4" style={{ color: '#25D366' }} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
