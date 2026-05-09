"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
    getItinerary, getPostOpsChecklist, updatePostOpsItem, updateItineraryStatus, initPostOpsChecklist,
    getItineraryDays, getItineraryHotels, getItineraryTransfers, getItineraryPricing, getItineraryFlights, getItineraryActivities, getSopChecklist, getSalesChecklist, syncChecklist
} from "@/lib/firestore"
import { storage } from "@/lib/firebase"
import Link from "next/link"
import { ArrowLeft, CheckCircle, Circle, ClipboardCheck, FileText, Eye, Download, Share2, FileEdit, MessageCircle, Package, Calendar } from "lucide-react"
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
    const [activities, setActivities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [uploadingItemId, setUploadingItemId] = useState<string | null>(null)
    const [salesChecklist, setSalesChecklist] = useState<any[]>([])
    const [preOpsChecklist, setPreOpsChecklist] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'trip'|'handover'|'checklist'>('trip')

    useEffect(() => { loadData() }, [bookingId])

    const loadData = async () => {
        try {
            const bk = await getItinerary(bookingId)
            setBooking(bk)

            const [d, h, t, p, f, a] = await Promise.all([
                getItineraryDays(bookingId),
                getItineraryHotels(bookingId),
                getItineraryTransfers(bookingId),
                getItineraryPricing(bookingId),
                getItineraryFlights(bookingId),
                getItineraryActivities(bookingId),
            ])
            setDays(d)
            setHotels(h)
            setTransfers(t)
            setPricing(p)
            setFlights(f)
            setActivities(a)

            try { 
                const [sc, pc] = await Promise.all([
                    getSalesChecklist(bookingId),
                    getSopChecklist(bookingId)
                ])
                setSalesChecklist(sc)
                setPreOpsChecklist(pc)
            } catch(e) { console.error('handover data load', e) }

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

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 border-b" style={{ borderColor: 'rgba(5,34,16,0.08)' }}>
                {[
                    { id: 'trip', label: 'Trip Details' },
                    { id: 'handover', label: 'Handover Data' },
                    { id: 'checklist', label: 'Post-Ops Checklist' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-3 font-sans text-[11px] font-bold tracking-wider uppercase transition-all border-b-2 -mb-[px] ${activeTab === tab.id ? 'text-[#06a15c] border-[#06a15c]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab 1: Trip Details */}
            {activeTab === 'trip' && (
                <div className="space-y-6">
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
                            </div>
                        </div>

                        {/* Hotels */}
                        <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                            <h3 className="font-serif text-sm tracking-wider uppercase mb-4" style={{ color: '#06a15c' }}>Hotels ({hotels.length})</h3>
                            <div className="space-y-4">
                                {hotels.map((h: any, idx: number) => {
                                    const planLabel = h.category || "Standard";
                                    const roomLabel = h.roomCategory || h.roomType || h.room || "Room";
                                    const mealLabel = h.mealPlan || "EP";
                                    const nights = h.nights || 1;

                                    return (
                                        <div key={`${h.id}-${idx}`} className="flex justify-between items-start pb-4 last:pb-0 last:border-0" style={{ borderBottom: '1px solid rgba(6,161,92,0.05)' }}>
                                            <div className="space-y-2">
                                                <p className="font-sans text-sm font-bold" style={{ color: '#052210' }}>{h.name || h.hotelName || "Unnamed Hotel"}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-[rgba(5,34,16,0.08)] bg-[rgba(5,34,16,0.03)] text-[11px]">
                                                        <span className="text-[rgba(5,34,16,0.4)]">Plan:</span>
                                                        <span className="text-[rgba(5,34,16,0.7)] font-medium">{planLabel}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-[rgba(5,34,16,0.08)] bg-[rgba(5,34,16,0.03)] text-[11px]">
                                                        <span className="text-[rgba(5,34,16,0.4)]">Room:</span>
                                                        <span className="text-[rgba(5,34,16,0.7)] font-medium">{roomLabel}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-[rgba(5,34,16,0.08)] bg-[rgba(5,34,16,0.03)] text-[11px]">
                                                        <span className="text-[rgba(5,34,16,0.4)]">Meal:</span>
                                                        <span className="text-[rgba(5,34,16,0.7)] font-medium">{mealLabel}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end shrink-0 pt-1">
                                                <span className="font-sans text-[10px] text-gray-400 font-medium italic">{nights} night{nights !== 1 ? 's' : ''}</span>
                                                {h.rating && <span className="font-sans text-[10px] text-amber-500 font-bold mt-0.5">{h.rating}★</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
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
                                        <span className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{t.type}{t.vehicleType ? ` · ${t.vehicleType}` : ''}</span>
                                        <div className="flex flex-col mt-1 space-y-0.5">
                                            {t.pickup && <span className="font-sans text-xs" style={{ color: 'rgba(5,34,16,0.6)' }}><strong className="font-medium">Pickup:</strong> {t.pickup}</span>}
                                            {t.drop && <span className="font-sans text-xs" style={{ color: 'rgba(5,34,16,0.6)' }}><strong className="font-medium">Drop:</strong> {t.drop}</span>}
                                        </div>
                                    </div>
                                    {t.price > 0 && (
                                        <span className="font-sans text-xs font-bold self-start mt-1" style={{ color: '#06a15c' }}>₹{Number(t.price).toLocaleString()}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pricing */}
                    {(booking.plans?.length > 0 || pricing?.[0]?.plans?.length > 0) && (
                        <div className="rounded-2xl p-5" style={{ background: 'rgba(6,161,92,0.05)', border: '1px solid rgba(6,161,92,0.15)' }}>
                            <h3 className="font-serif text-sm tracking-wider uppercase mb-4" style={{ color: '#06a15c' }}>Pricing</h3>
                            <div className="space-y-3">
                                {(booking.plans || pricing?.[0]?.plans || []).map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between items-end border-b pb-2 last:border-0 last:pb-0" style={{ borderColor: 'rgba(6,161,92,0.1)' }}>
                                        <div>
                                            <p className="font-sans text-xs font-bold" style={{ color: '#052210' }}>{p.planName || p.hotelName || "Option"}</p>
                                            <p className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.5)' }}>{p.category || "Standard"} | ₹{(p.perPersonPrice || 0).toLocaleString()} pp</p>
                                        </div>
                                        <p className="font-serif text-lg font-bold" style={{ color: '#06a15c' }}>₹{(p.totalPrice ?? p.overrideTotal ?? p.total ?? 0).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Day Plans */}
                    {days.length > 0 && (
                        <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                            <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(6,161,92,0.08)' }}>
                                <h3 className="font-serif text-lg tracking-wide" style={{ color: '#06a15c' }}>Day Plans ({days.length})</h3>
                            </div>
                            {[...days].sort((a, b) => {
                                const numA = parseInt((a.day || String(a.dayNumber || '')).replace(/\D/g, '')) || 0
                                const numB = parseInt((b.day || String(b.dayNumber || '')).replace(/\D/g, '')) || 0
                                return numA - numB
                            }).map((day: any, idx: number) => (
                                <div key={day.id || idx} className="px-6 py-4" style={{ borderBottom: '1px solid rgba(6,161,92,0.05)' }}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="px-2.5 py-0.5 rounded-full font-sans text-[10px] font-bold tracking-wider uppercase" style={{ background: 'rgba(6,161,92,0.12)', color: '#06a15c' }}>{day.day}</span>
                                    </div>
                                    <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{day.title}</p>
                                    {day.description && <p className="font-sans text-xs mt-1" style={{ color: 'rgba(5,34,16,0.7)' }}>{day.description}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Handover Data (Sales & Pre-Ops) */}
            {activeTab === 'handover' && (
                <div className="space-y-8">
                    {/* Sales Handover */}
                    <div>
                        <h3 className="font-serif text-lg mb-4 px-2" style={{ color: '#052210' }}>Sales Handover</h3>
                        {salesChecklist.length > 0 ? (
                            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                                {salesChecklist.map((item: any, idx: number) => (
                                    <div key={idx} className="px-6 py-4 border-b last:border-0" style={{ borderColor: 'rgba(5,34,16,0.05)' }}>
                                        <p className="font-sans text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(5,34,16,0.6)' }}>{item.name || item.title}</p>
                                        <p className="font-sans text-sm" style={{ color: '#052210' }}>{Array.isArray(item.response) ? item.response.join(", ") : (item.response || (item.checked ? "Yes" : "N/A"))}</p>
                                        {item.fileUrl && (
                                            <a href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-2 font-sans text-[11px] text-emerald-600 hover:underline">
                                                <FileText className="w-3 h-3" /> View Attachment
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-center py-10 text-gray-400 italic">No Sales handover data</p>}
                    </div>

                    {/* Pre-Ops Handover */}
                    <div>
                        <h3 className="font-serif text-lg mb-4 px-2" style={{ color: '#052210' }}>Pre-Ops Handover</h3>
                        {preOpsChecklist.length > 0 ? (
                            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                                {preOpsChecklist.map((item: any, idx: number) => (
                                    <div key={idx} className="px-6 py-4 border-b last:border-0" style={{ borderColor: 'rgba(5,34,16,0.05)' }}>
                                        <p className="font-sans text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(5,34,16,0.6)' }}>{item.name || item.title}</p>
                                        <p className="font-sans text-sm" style={{ color: '#052210' }}>{Array.isArray(item.response) ? item.response.join(", ") : (item.response || (item.checked ? "Yes" : "N/A"))}</p>
                                        {item.fileUrl && (
                                            <a href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-2 font-sans text-[11px] text-emerald-600 hover:underline">
                                                <FileText className="w-3 h-3" /> View Attachment
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-center py-10 text-gray-400 italic">No Pre-Ops handover data</p>}
                    </div>
                </div>
            )}

            {/* Tab 3: Post-Ops Checklist */}
            {activeTab === 'checklist' && (
                <div className="space-y-6">
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
                    </div>

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
                                            disabled={(item.requiresAcknowledgement && !item.acknowledged && !item.checked) || (["file_upload", "File Upload"].includes(item.type) && !item.fileUrl && !item.checked)}
                                            className={`mt-0.5 transition-colors ${((item.requiresAcknowledgement && !item.acknowledged && !item.checked) || (["file_upload", "File Upload"].includes(item.type) && !item.fileUrl && !item.checked)) ? "opacity-50 cursor-not-allowed" : "hover:scale-110"}`}
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

                                            {['file_upload', 'File Upload'].includes(item.type) && !item.checked && (
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

                                            {(item.notes || (item.points && item.points.length > 0) || item.extraInfo) && (
                                                <div className="mt-3 space-y-2 border-l-2 border-dashed pl-3 text-left" style={{ borderColor: 'rgba(5,34,16,0.1)' }}>
                                                    {item.extraInfo && <div className="inline-flex items-center px-1.5 py-0.5 rounded font-bold font-sans text-xs" style={{ background: 'rgba(5,34,16,0.06)', color: '#052210' }}>{item.extraInfo}</div>}
                                                    {item.notes && <p className="font-sans text-[11px] italic leading-relaxed" style={{ color: 'rgba(5,34,16,0.5)' }}>{item.notes}</p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}


        </div>
    )
}
