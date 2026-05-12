"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {
    getItinerary, getPostOpsChecklist, updatePostOpsItem, updateItineraryStatus, initPostOpsChecklist,
    getItineraryDays, getItineraryHotels, getItineraryTransfers, getItineraryPricing, getItineraryFlights, 
    getItineraryActivities, getSalesChecklist, syncChecklist, getPostOpsData, updatePostOpsData, addPayment, getItineraryPayments
} from "@/lib/firestore"
import Link from "next/link"
import { 
    ArrowLeft, CheckCircle, Circle, Package, FileText, Eye, Download, 
    FileEdit, X, UploadCloud, AlertCircle, CreditCard, Users, Phone, 
    MapPin, Ticket, Star, ChevronRight, Save, Clock, Calendar
} from "lucide-react"

export default function PostOpsBookingDetailPage() {
    return (
        <ProtectedRoute allowedRoles={["post_ops", "post_ops_lead", "admin"]}>
            <PostOpsBookingDetail />
        </ProtectedRoute>
    )
}

function PostOpsBookingDetail() {
    const params = useParams()
    const { userProfile } = useAuth()
    const bookingId = params.id as string
    const [booking, setBooking] = useState<any>(null)
    const [checklist, setChecklist] = useState<any[]>([])
    const [days, setDays] = useState<any[]>([])
    const [hotels, setHotels] = useState<any[]>([])
    const [transfers, setTransfers] = useState<any[]>([])
    const [pricing, setPricing] = useState<any[]>([])
    const [flights, setFlights] = useState<any[]>([])
    const [activities, setActivities] = useState<any[]>([])
    const [salesChecklist, setSalesChecklist] = useState<any[]>([])
    const [postOpsData, setPostOpsData] = useState<any>(null)
    const [payments, setPayments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [uploadingItemId, setUploadingItemId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'trip'|'ops'|'checklist'>('trip')
    const [showCompletionDialog, setShowCompletionDialog] = useState(false)
    const [showPaymentDialog, setShowPaymentDialog] = useState(false)
    const [lastPayment, setLastPayment] = useState<{ amount: number; method: string; reference: string } | null>(null)
    const [isSavingOps, setIsSavingOps] = useState(false)
    const [showSaveSuccess, setShowSaveSuccess] = useState(false)

    // Checklist Item States for Remarks
    const [itemStates, setItemStates] = useState<Record<string, { checked: boolean; remarks: string }>>({})

    // Ops Info Form State
    const [dmcInfo, setDmcInfo] = useState({
        dmcName: "",
        dmcContact: "",
        guideName: "",
        guideContact: "",
        driverName: "",
        driverContact: "",
        vehicleInfo: "",
        emergencyContact: ""
    })

    // Payment Form State
    const [paymentForm, setPaymentForm] = useState({
        amount: "",
        method: "Bank Transfer",
        reference: ""
    })

    useEffect(() => { loadData() }, [bookingId])

    const loadData = async () => {
        try {
            const [bk, d, h, t, p, f, a, sc, pod, pyms, cl] = await Promise.all([
                getItinerary(bookingId),
                getItineraryDays(bookingId),
                getItineraryHotels(bookingId),
                getItineraryTransfers(bookingId),
                getItineraryPricing(bookingId),
                getItineraryFlights(bookingId),
                getItineraryActivities(bookingId),
                getSalesChecklist(bookingId),
                getPostOpsData(bookingId),
                getItineraryPayments(bookingId),
                getPostOpsChecklist(bookingId)
            ])

            setBooking(bk)
            setDays(d)
            setHotels(h)
            setTransfers(t)
            setPricing(p)
            setFlights(f)
            setActivities(a)
            setSalesChecklist(sc)
            setPostOpsData(pod)
            setPayments(pyms)

            // Initialize form from saved data or sales handover
            const dmcNameItem = sc.find((i: any) => (i.name || i.title || "").toLowerCase().includes("dmc name"));
            const dmcContactItem = sc.find((i: any) => (i.name || i.title || "").toLowerCase().includes("dmc contact"));
            
            const handoverDmcName = bk?.dmcName || dmcNameItem?.response || "";
            const handoverDmcContact = bk?.dmcContact || dmcContactItem?.response || "";

            if (pod) {
                setDmcInfo({
                    dmcName: pod.dmcName || handoverDmcName,
                    dmcContact: pod.dmcContact || handoverDmcContact,
                    guideName: pod.guideName || "",
                    guideContact: pod.guideContact || "",
                    driverName: pod.driverName || "",
                    driverContact: pod.driverContact || "",
                    vehicleInfo: pod.vehicleInfo || "",
                    emergencyContact: pod.emergencyContact || ""
                })
            } else {
                setDmcInfo(prev => ({
                    ...prev,
                    dmcName: handoverDmcName,
                    dmcContact: handoverDmcContact
                }))
            }

            // Checklist logic
            let currentChecklist = cl
            if (currentChecklist.length === 0) {
                await initPostOpsChecklist(bookingId)
                currentChecklist = await getPostOpsChecklist(bookingId)
            } else {
                try {
                    const changed = await syncChecklist(bookingId, "post_ops", "postOpsChecklist")
                    if (changed) currentChecklist = await getPostOpsChecklist(bookingId)
                } catch (e) { console.error("Sync failed", e) }
            }
            
            // Deduplicate and set
            const uniqueCl = currentChecklist.filter((item: any, index: number, self: any[]) =>
                index === self.findIndex((i) => 
                    (i.name || i.title || "").trim().toLowerCase() === 
                    (item.name || item.title || "").trim().toLowerCase()
                )
            )
            setChecklist(uniqueCl)

            // Initialize itemStates
            const initialStates: Record<string, { checked: boolean; remarks: string }> = {}
            uniqueCl.forEach((item: any) => {
                initialStates[item.id] = { 
                    checked: !!item.checked, 
                    remarks: item.notes || "" 
                }
            })
            setItemStates(prev => ({ ...initialStates, ...prev }))

        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const toggleItem = async (itemId: string, currentChecked: boolean) => {
        const item = checklist.find(c => c.id === itemId);
        if (!item) return;

        if (!currentChecked && item.isRequired !== false) {
            const type = (item.type || "").toUpperCase();
            const needsText = (type.includes("TEXT") || type.includes("DATE") || type.includes("NUMBER") || type.includes("CHOICE")) && !item.response;
            const needsFile = type.includes("FILE") && !item.fileUrl;
            const needsAck = (item.requiresAcknowledgement || type.includes("CHECKBOX")) && !item.acknowledged;
            
            if (needsText || needsFile || needsAck) {
                alert(`Please complete the required information before marking this mandatory task as complete.`);
                return;
            }
        }

        const newState = !currentChecked;
        const remarks = itemStates[itemId]?.remarks || "";

        setItemStates(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], checked: newState }
        }))

        try {
            await updatePostOpsItem(bookingId, itemId, {
                checked: newState,
                notes: remarks,
                updatedAt: new Date().toISOString(),
            })
            setChecklist(checklist.map(c => c.id === itemId ? { ...c, checked: newState, notes: remarks } : c))
        } catch (err) {
            console.error(err)
            alert("Failed to update item.")
            setItemStates(prev => ({
                ...prev,
                [itemId]: { ...prev[itemId], checked: currentChecked }
            }))
        }
    }

    const handleRemarks = (itemId: string, value: string) => {
        setItemStates(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], remarks: value }
        }))
    }

    const updateChecklistItemState = async (itemId: string, data: any) => {
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
            if (!response.ok) throw new Error("Upload failed")
            await updateChecklistItemState(itemId, { fileUrl: url })
        } catch (error) {
            console.error(error)
            alert("File upload failed.")
        } finally {
            setUploadingItemId(null)
        }
    }

    const saveOpsInfo = async () => {
        setIsSavingOps(true)
        try {
            await updatePostOpsData(bookingId, dmcInfo)
            setPostOpsData({ ...dmcInfo, updatedAt: new Date().toISOString() })
            setShowSaveSuccess(true)
            setTimeout(() => setShowSaveSuccess(false), 3000)
        } catch (err) {
            console.error(err)
            alert("Failed to save operations info.")
        } finally {
            setIsSavingOps(false)
        }
    }

    const handlePayment = async () => {
        if (!paymentForm.amount || isNaN(Number(paymentForm.amount))) {
            alert("Please enter a valid amount.")
            return
        }
        try {
            const pData = {
                type: "balance" as any,
                amount: Number(paymentForm.amount),
                method: paymentForm.method as any,
                notes: paymentForm.reference ? `Ref: ${paymentForm.reference}` : "",
                collectedBy: userProfile?.uid || "",
                collectedByName: userProfile?.name || "",
                collectedAt: new Date().toISOString()
            }
            await addPayment(bookingId, pData)
            const updatedPayments = await getItineraryPayments(bookingId)
            setPayments(updatedPayments)
            setBooking({ ...booking, amountPaid: (booking.amountPaid || 0) + pData.amount })
            setLastPayment({ amount: pData.amount, method: pData.method, reference: paymentForm.reference })
            setPaymentForm({ amount: "", method: "Bank Transfer", reference: "" })
            setShowPaymentDialog(true)
        } catch (err) {
            console.error(err)
            alert("Failed to record payment.")
        }
    }

    const completeTrip = async () => {
        if (requiredChecklist.some(c => !c.checked)) {
            alert("Please complete all mandatory checklist items.")
            return
        }
        try {
            await updateItineraryStatus(bookingId, "completed")
            setBooking({ ...booking, status: "completed" })
            setShowCompletionDialog(true)
        } catch (err) {
            console.error(err)
            alert("Failed to complete trip.")
        }
    }

    // Calculations
    const today = new Date()
    const start = booking ? new Date(booking.startDate) : null
    const end = booking ? new Date(booking.endDate) : null
    
    let tripStatusText = ""
    let currentDayNum = 0
    if (booking && start && end) {
        if (today < start) {
            const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            tripStatusText = `Pre-arrival · ${diff} days to go`
        } else if (today > end) {
            tripStatusText = "Trip ended"
        } else {
            currentDayNum = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
            tripStatusText = `On trip · Day ${currentDayNum} of ${booking.days}`
        }
    }

    const stages = [
        { id: 'pre', label: 'Pre-arrival', active: booking && start && today < start },
        { id: 'tour', label: 'On tour', active: booking && start && end && today >= start && today <= end },
        { id: 'ending', label: 'Trip ending', active: booking && end && today >= new Date(end.getTime() - 86400000) && today <= new Date(end.getTime() + 86400000) },
        { id: 'feedback', label: 'Feedback & closure', active: booking?.status === 'completed' }
    ]

    const requiredChecklist = checklist.filter(c => c.isRequired !== false)
    const completedCount = requiredChecklist.filter(c => c.checked).length
    const progress = requiredChecklist.length > 0 ? Math.round((completedCount / requiredChecklist.length) * 100) : 0

    // Pricing
    const allPlans = booking?.plans || pricing?.[0]?.plans || []
    const activePlan = booking?.selectedPlanId 
        ? allPlans.find((p: any) => p.planId === booking.selectedPlanId || p.category === booking.selectedPlanId)
        : allPlans[0]
    
    const activeCategory = activePlan?.category || null
    const totalCost = activePlan?.totalPrice || activePlan?.overrideTotal || activePlan?.total || 0
    const uniquePayments = payments.filter((p, index, self) =>
        index === self.findIndex(x => x.id === p.id)
    )
    const totalPaid = uniquePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const balanceDue = totalCost - totalPaid

    const inputClass = "w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 font-sans text-sm outline-none focus:border-emerald-500 transition-all"
    const labelClass = "font-sans text-[10px] font-bold uppercase tracking-wider mb-1.5 block text-gray-500"

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} />
        </div>
    )

    if (!booking) return (
        <div className="text-center py-20">
            <p className="font-sans text-sm text-gray-400 italic">Booking not found or you don't have access.</p>
        </div>
    )

    return (
        <>
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            {/* Navigation */}
            <div className="flex items-center justify-between">
                <Link href="/post-ops" className="inline-flex items-center gap-2 font-sans text-xs tracking-wider uppercase" style={{ color: 'rgba(6,161,92,0.6)' }}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to post-ops pipeline
                </Link>
                {tripStatusText && (
                    <div className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-sans text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{tripStatusText}</span>
                    </div>
                )}
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="font-serif text-2xl sm:text-3xl tracking-wide text-[#052210]">{booking.customerName}</h1>
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-[10px] font-bold text-gray-400 border border-gray-200 uppercase tracking-widest">{booking.quoteId}</span>
                    </div>
                    <p className="font-sans text-xs sm:text-sm text-gray-500">
                        {booking.destination} · {booking.nights}N/{booking.days}D · {booking.startDate} → {booking.endDate} · {booking.adults} Adults {booking.children > 0 ? `+ ${booking.children} Child` : ""}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => window.open(`/voucher/${bookingId}?download=1`, '_blank')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-sans text-[10px] tracking-wider uppercase transition-all border border-emerald-100 bg-emerald-50/50 text-emerald-600 hover:scale-105">
                        <FileText className="w-3 h-3" /> Voucher
                    </button>
                    <button onClick={() => window.open(`/itinerary/${bookingId}?download=1`, '_blank')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-sans text-[10px] tracking-wider uppercase transition-all border border-emerald-100 bg-emerald-50/50 text-emerald-600 hover:scale-105">
                        <Download className="w-3 h-3" /> PDF
                    </button>
                    <Link href={`/itinerary/${bookingId}`} target="_blank" className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-sans text-[10px] tracking-wider uppercase transition-all border border-emerald-100 bg-emerald-50/50 text-emerald-600 hover:scale-105">
                        <Eye className="w-3 h-3" /> View
                    </Link>
                </div>
            </div>

            {/* Trip Stage Pills */}
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-2 no-scrollbar border-y border-gray-50">
                {stages.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2 sm:gap-4 shrink-0">
                        <div className={`px-4 py-2 rounded-full font-sans text-[10px] font-bold uppercase tracking-wider transition-all ${s.active ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20" : "bg-gray-50 text-gray-400"}`}>
                            {s.label}
                        </div>
                        {i < stages.length - 1 && <ChevronRight className="w-3 h-3 text-gray-200" />}
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-gray-100">
                {[
                    { id: 'trip', label: 'Trip Details', icon: MapPin },
                    { id: 'ops', label: 'Ops Info', icon: Ticket },
                    { id: 'checklist', label: 'Post-Ops Checklist', icon: Package }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-5 py-3.5 font-sans text-[11px] font-bold tracking-wider uppercase transition-all flex items-center gap-2 border-b-2 -mb-[2px] ${activeTab === tab.id ? 'text-[#06a15c] border-[#06a15c]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB 1: TRIP DETAILS */}
            {activeTab === 'trip' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Customer card */}
                        <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm">
                            <h3 className="font-serif text-sm tracking-wider uppercase text-emerald-600 mb-5 flex items-center gap-2"><Users className="w-4 h-4" /> Customer</h3>
                            <div className="space-y-4 font-sans">
                                <div>
                                    <p className={labelClass}>Main Contact</p>
                                    <p className="text-sm font-bold text-[#052210]">{booking.customerName}</p>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-2"><Phone className="w-3 h-3" /> {booking.customerPhone}</p>
                                    <p className="text-xs text-gray-500 mt-1">@ {booking.customerEmail}</p>
                                    {(() => {
                                        const nationality = salesChecklist.find(i => (i.name || i.title || "").toLowerCase().includes("nationality"))?.response
                                        if (!nationality) return null
                                        return (
                                            <div className="mt-3 pt-3 border-t border-gray-50">
                                                <p className={labelClass}>Nationality</p>
                                                <p className="text-xs font-bold text-[#052210]">{nationality}</p>
                                            </div>
                                        )
                                    })()}
                                </div>
                                <div className="pt-4 border-t border-gray-50">
                                    <p className={labelClass}>Sales Consultant</p>
                                    <p className="text-sm font-bold text-[#052210]">{booking.salesName || booking.consultantName || "—"}</p>
                                    {booking.consultantPhone && <p className="text-xs text-gray-500 mt-1 flex items-center gap-2"><Phone className="w-3 h-3" /> {booking.consultantPhone}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Trip card */}
                        <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm">
                            <h3 className="font-serif text-sm tracking-wider uppercase text-emerald-600 mb-5 flex items-center gap-2"><MapPin className="w-4 h-4" /> Trip</h3>
                            <div className="grid grid-cols-2 gap-4 font-sans">
                                <div>
                                    <p className={labelClass}>Destination</p>
                                    <p className="text-sm font-bold text-[#052210]">{booking.destination}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>Duration</p>
                                    <p className="text-sm font-bold text-[#052210]">{booking.nights}N / {booking.days}D</p>
                                </div>
                                <div>
                                    <p className={labelClass}>Dates</p>
                                    <p className="text-xs font-bold text-[#052210]">{booking.startDate} → {booking.endDate}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>Pax</p>
                                    <p className="text-xs font-bold text-[#052210]">{booking.adults} Adults {booking.children > 0 ? `+ ${booking.children} Child` : ""}</p>
                                </div>
                                <div className="col-span-2 pt-2">
                                    <p className={labelClass}>Itinerary Code</p>
                                    <p className="text-xs font-bold text-gray-400">{booking.quoteId}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hotels card */}
                    <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
                            <h3 className="font-serif text-sm tracking-wider uppercase text-emerald-600 flex items-center gap-2"><Package className="w-4 h-4" /> Hotels</h3>
                            
                            {(() => {
                                const checkIn = salesChecklist.find(i => (i.name || i.title || "").toLowerCase().includes("check in date"))?.response
                                const checkOut = salesChecklist.find(i => (i.name || i.title || "").toLowerCase().includes("check out date"))?.response
                                if (!checkIn && !checkOut) return null
                                return (
                                    <div className="flex gap-4">
                                        {checkIn && (
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Check In</span>
                                                <span className="text-[11px] font-medium text-gray-600">{checkIn}</span>
                                            </div>
                                        )}
                                        {checkOut && (
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Check Out</span>
                                                <span className="text-[11px] font-medium text-gray-600">{checkOut}</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })()}
                        </div>

                        <div className="space-y-4">
                            {(() => {
                                const numRooms = salesChecklist.find(i => (i.name || i.title || "").toLowerCase().includes("number of rooms"))?.response
                                const extraBeds = salesChecklist.find(i => (i.name || i.title || "").toLowerCase().includes("extra bed"))?.response
                                
                                const filteredHotels = activeCategory 
                                    ? hotels.filter((h: any) => h.category === activeCategory)
                                    : hotels
                                
                                return filteredHotels.map((h: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-start pb-4 border-b last:border-0 last:pb-0 border-gray-50">
                                        <div className="space-y-2">
                                            <p className="font-sans text-sm font-bold text-[#052210]">{h.name || h.hotelName}</p>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="px-2 py-0.5 rounded-full border border-gray-100 bg-gray-50 text-[9px] font-bold text-gray-400 uppercase tracking-tight">Plan: {h.category || "Standard"}</span>
                                                <span className="px-2 py-0.5 rounded-full border border-gray-100 bg-gray-50 text-[9px] font-bold text-gray-400 uppercase tracking-tight">Room: {h.roomCategory || h.roomType || "Room"}</span>
                                                <span className="px-2 py-0.5 rounded-full border border-gray-100 bg-gray-50 text-[9px] font-bold text-gray-400 uppercase tracking-tight">Meal: {h.mealPlan || "EP"}</span>
                                                {numRooms && <span className="px-2 py-0.5 rounded-full border border-teal-100 bg-teal-50 text-[9px] font-bold text-teal-600 uppercase tracking-tight">Rooms: {numRooms}</span>}
                                                {extraBeds && <span className="px-2 py-0.5 rounded-full border border-amber-100 bg-amber-50 text-[9px] font-bold text-amber-600 uppercase tracking-tight">Extra Beds: {extraBeds}</span>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-sans text-[10px] font-bold text-gray-400 italic">{h.nights || 1} Night{h.nights !== 1 ? "s" : ""}</p>
                                            <div className="flex items-center gap-1 justify-end mt-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`w-2.5 h-2.5 ${i < (parseInt(h.rating) || 3) ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            })()}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Transfers card */}
                        <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm">
                            <h3 className="font-serif text-sm tracking-wider uppercase text-emerald-600 mb-5 flex items-center gap-2"><MapPin className="w-4 h-4" /> Transfers</h3>
                            <div className="space-y-4">
                                {transfers.length ? transfers.map((t, i) => (
                                    <div key={i} className="pb-3 border-b last:border-0 border-gray-50">
                                        <p className="font-sans text-xs font-bold text-[#052210]">{t.type} · {t.vehicleType}</p>
                                        <p className="font-sans text-[10px] text-gray-500 mt-1">{t.pickup} → {t.drop}</p>
                                    </div>
                                )) : <p className="text-xs text-gray-400 italic">No transfer data</p>}
                            </div>
                        </div>

                        {/* Activities card */}
                        <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm">
                            <h3 className="font-serif text-sm tracking-wider uppercase text-emerald-600 mb-5 flex items-center gap-2"><Star className="w-4 h-4" /> Activities</h3>
                            <div className="space-y-3">
                                {activities.length ? activities.map((a, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs font-sans">
                                        <span className="font-bold text-[#052210]">{a.name || a.activityName}</span>
                                        <span className="text-gray-400 uppercase tracking-tighter text-[9px] font-bold">{a.category || "Sightseeing"}</span>
                                    </div>
                                )) : <p className="text-xs text-gray-400 italic">No activities listed</p>}
                            </div>
                        </div>
                    </div>

                    {/* Pricing card */}
                    {activePlan && (
                        <div className="rounded-2xl p-6 bg-teal-500/5 border border-teal-500/10 flex items-center justify-between">
                            <div>
                                <p className="font-sans text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 mb-1">{activePlan.category} Plan</p>
                                <p className="font-serif text-lg text-[#052210]">{activePlan.planName || activePlan.hotelName || "Package Price"}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-teal-600 mb-1">Total Package Cost</p>
                                <p className="font-serif text-3xl font-black text-teal-600">₹{totalCost.toLocaleString()}</p>
                            </div>
                        </div>
                    )}

                    {/* Day Plans */}
                    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                            <h3 className="font-serif text-sm tracking-wider uppercase text-emerald-600 flex items-center gap-2"><Calendar className="w-4 h-4" /> Day Plans</h3>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{days.length} Days</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {[...days].sort((a,b) => (parseInt(a.day?.replace(/\D/g,'')) || 0) - (parseInt(b.day?.replace(/\D/g,'')) || 0)).map((day, i) => (
                                <div key={i} className="p-6 flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center shrink-0">
                                        <span className="text-[9px] font-bold text-emerald-400 uppercase leading-none">Day</span>
                                        <span className="text-lg font-black text-emerald-600 leading-none">{parseInt(day.day?.replace(/\D/g,'')) || i+1}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <p className="font-sans text-sm font-bold text-[#052210]">{day.title}</p>
                                            <span className="px-2 py-0.5 rounded bg-gray-50 text-[9px] font-bold text-gray-400">{day.date}</span>
                                        </div>
                                        <p className="font-sans text-xs text-gray-500 leading-relaxed">{day.description}</p>
                                        {day.highlights && day.highlights.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {day.highlights.map((h: string, hi: number) => (
                                                    <span key={hi} className="px-2 py-0.5 rounded-full bg-emerald-50/50 text-[9px] font-medium text-emerald-700 italic">#{h}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: OPS INFO */}
            {activeTab === 'ops' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* DMC & Field Contacts */}
                    <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-serif text-lg tracking-wide text-[#052210]">DMC & Field Contacts</h3>
                            <button 
                                onClick={saveOpsInfo} 
                                disabled={isSavingOps}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-sans text-[10px] font-bold uppercase tracking-widest transition-all ${
                                    showSaveSuccess ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-teal-500 text-white hover:scale-105"
                                }`}
                            >
                                {isSavingOps ? (
                                    <div className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                                ) : showSaveSuccess ? (
                                    <><CheckCircle className="w-3.5 h-3.5" /> Saved!</>
                                ) : (
                                    <><Save className="w-3.5 h-3.5" /> Save Data</>
                                )}
                            </button>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-xl bg-teal-50 border border-teal-100">
                            <AlertCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                            <p className="font-sans text-[11px] text-teal-800 leading-relaxed">DMC name and contact pre-filled from sales handover data. Update if changed.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className={labelClass}>DMC Name</label>
                                <input className={`${inputClass} bg-teal-500/5 border-teal-500/20`} value={dmcInfo.dmcName} onChange={e => setDmcInfo({...dmcInfo, dmcName: e.target.value})} placeholder="e.g. Travel Wonders DMC" />
                            </div>
                            <div>
                                <label className={labelClass}>DMC Contact</label>
                                <input className={`${inputClass} bg-teal-500/5 border-teal-500/20`} value={dmcInfo.dmcContact} onChange={e => setDmcInfo({...dmcInfo, dmcContact: e.target.value})} placeholder="e.g. +91 9876543210" />
                            </div>
                            <div>
                                <label className={labelClass}>Guide Name</label>
                                <input className={inputClass} value={dmcInfo.guideName} onChange={e => setDmcInfo({...dmcInfo, guideName: e.target.value})} placeholder="Name of guide" />
                            </div>
                            <div>
                                <label className={labelClass}>Guide Contact</label>
                                <input className={inputClass} value={dmcInfo.guideContact} onChange={e => setDmcInfo({...dmcInfo, guideContact: e.target.value})} placeholder="+91 ..." />
                            </div>
                            <div>
                                <label className={labelClass}>Driver Name</label>
                                <input className={inputClass} value={dmcInfo.driverName} onChange={e => setDmcInfo({...dmcInfo, driverName: e.target.value})} placeholder="Name of driver" />
                            </div>
                            <div>
                                <label className={labelClass}>Driver Contact</label>
                                <input className={inputClass} value={dmcInfo.driverContact} onChange={e => setDmcInfo({...dmcInfo, driverContact: e.target.value})} placeholder="+91 ..." />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Vehicle Type & Number</label>
                                <input className={inputClass} value={dmcInfo.vehicleInfo} onChange={e => setDmcInfo({...dmcInfo, vehicleInfo: e.target.value})} placeholder="e.g. Toyota Innova (KA 01 AB 1234)" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Local Emergency Contact</label>
                                <input className={inputClass} value={dmcInfo.emergencyContact} onChange={e => setDmcInfo({...dmcInfo, emergencyContact: e.target.value})} placeholder="Secondary emergency phone number" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tickets & Transport card */}
                        <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm">
                            <h3 className="font-serif text-sm tracking-wider uppercase text-emerald-600 mb-5 flex items-center gap-2"><Ticket className="w-4 h-4" /> Tickets & Transport</h3>
                            <div className="space-y-4 font-sans">
                                {flights.length ? (
                                    <>
                                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                                            <p className={labelClass}>Arrival Flight</p>
                                            <p className="text-sm font-bold text-[#052210]">{flights[0].airline} {flights[0].flightNo}</p>
                                            <p className="text-xs text-gray-500 mt-1">{flights[0].fromCode} → {flights[0].toCode} · Arrives {flights[0].arrival}</p>
                                        </div>
                                        {flights.length > 1 && (
                                            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                                                <p className={labelClass}>Departure Flight</p>
                                                <p className="text-sm font-bold text-[#052210]">{flights[flights.length-1].airline} {flights[flights.length-1].flightNo}</p>
                                                <p className="text-xs text-gray-500 mt-1">{flights[flights.length-1].fromCode} → {flights[flights.length-1].toCode} · Departs {flights[flights.length-1].departure}</p>
                                            </div>
                                        )}
                                    </>
                                ) : <p className="text-xs text-gray-400 italic">No flight details found</p>}
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm">
                            <h3 className="font-serif text-sm tracking-wider uppercase text-emerald-600 mb-5 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Additional Info</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-sans">
                                {(() => {
                                    const dmcQuoteItem = salesChecklist.find(i => (i.name || i.title || "").toLowerCase().includes("dmc quote"))
                                    const dmcCost = salesChecklist.find(i => {
                                        const name = (i.name || i.title || "").toLowerCase()
                                        return name.includes("dmc cost") && !name.includes("total package cost")
                                    })?.response
                                    const finalPayment = salesChecklist.find(i => (i.name || i.title || "").toLowerCase().includes("final payment"))?.response
                                    const specReqs = salesChecklist.find(i => (i.name || i.title || "").toLowerCase().includes("special request"))?.response || booking.specialRequests || booking.notes

                                    return (
                                        <>
                                            {/* DMC Quote */}
                                            <div>
                                                <p className={labelClass}>DMC Quote</p>
                                                <div className="space-y-2 mt-1">
                                                    {dmcQuoteItem?.fileUrl && (
                                                        <a href={dmcQuoteItem.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-100 text-xs font-bold text-teal-600 hover:bg-teal-50 transition-all w-full">
                                                            <FileText className="w-3.5 h-3.5" /> View Uploaded Quote
                                                        </a>
                                                    )}
                                                    {dmcQuoteItem?.response && (
                                                        <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs text-[#052210] font-medium leading-relaxed">
                                                            {dmcQuoteItem.response}
                                                        </div>
                                                    )}
                                                    {(!dmcQuoteItem?.fileUrl && !dmcQuoteItem?.response) && (
                                                        <p className="text-xs text-gray-300 italic">Not provided</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* DMC Cost */}
                                            <div>
                                                <p className={labelClass}>DMC Cost</p>
                                                <div className="mt-1 p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs text-[#052210] font-bold">
                                                    {dmcCost ? (dmcCost.toString().includes('₹') ? dmcCost : `₹${Number(dmcCost).toLocaleString()}`) : "—"}
                                                </div>
                                            </div>

                                            {/* Final Payment Date */}
                                            <div>
                                                <p className={labelClass}>Date of Final Payment</p>
                                                <div className="mt-1 p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs text-[#052210] font-medium">
                                                    {finalPayment || "—"}
                                                </div>
                                            </div>

                                            {/* Special Requests */}
                                            <div className="sm:col-span-2">
                                                <p className={labelClass}>Special Requests</p>
                                                <div className="mt-1 p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs text-[#052210] leading-relaxed font-medium min-h-[60px]">
                                                    {specReqs || "No special requests mentioned."}
                                                </div>
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Payment collection */}
                    <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm space-y-6">
                        <h3 className="font-serif text-lg tracking-wide text-[#052210]">Payment Collection</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                <p className={labelClass}>Total Package</p>
                                <p className="text-xl font-black text-[#052210]">₹{totalCost.toLocaleString()}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                <p className={labelClass}>Advance Paid</p>
                                <p className="text-xl font-black text-emerald-600">₹{totalPaid.toLocaleString()}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                                <p className={labelClass}>Balance Due</p>
                                <p className="text-xl font-black text-red-500">₹{balanceDue.toLocaleString()}</p>
                            </div>
                        </div>

                        {balanceDue > 0 && (
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="font-sans text-[11px] text-amber-800 leading-relaxed">Balance must be collected after guest check-in. Post-ops team is responsible for tracking and recording these payments.</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                            <div>
                                <label className={labelClass}>Amount Collected (₹)</label>
                                <input type="number" className={inputClass} value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} placeholder="e.g. 5000" />
                            </div>
                            <div>
                                <label className={labelClass}>Payment Method</label>
                                <select className={inputClass} value={paymentForm.method} onChange={e => setPaymentForm({...paymentForm, method: e.target.value})}>
                                    <option>Bank Transfer</option>
                                    <option>Google Pay</option>
                                    <option>PhonePe</option>
                                    <option>Cash</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Ref / UTR Number</label>
                                <input className={inputClass} value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} placeholder="Transaction ID" />
                            </div>
                            <div className="sm:col-span-3 pt-2">
                                <button onClick={handlePayment} disabled={!paymentForm.amount} className={`w-full py-3.5 rounded-xl font-sans font-bold text-[11px] uppercase tracking-widest transition-all ${!paymentForm.amount ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:scale-[1.01] active:scale-95 shadow-lg shadow-emerald-500/20'}`}>
                                    Mark balance as collected
                                </button>
                            </div>
                        </div>

                        {payments.length > 0 && (
                            <div className="space-y-3">
                                <p className={labelClass}>Payment History</p>
                                <div className="space-y-2">
                                    {payments.map((p, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-50 text-[11px] font-sans">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><CreditCard className="w-4 h-4" /></div>
                                                <div>
                                                    <p className="font-bold text-[#052210]">₹{p.amount?.toLocaleString()}</p>
                                                    <p className="text-gray-400 uppercase text-[9px]">{p.method} · {p.collectedAt?.split('T')[0]}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-gray-500">{p.notes || "No notes"}</p>
                                                <p className="text-[9px] text-gray-300">By {p.collectedByName}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: CHECKLIST */}
            {activeTab === 'checklist' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-serif text-lg tracking-wide text-[#052210]">Post-Ops SOP Checklist</h3>
                                <p className="font-sans text-xs text-gray-400 mt-1">{completedCount} of {requiredChecklist.length} mandatory tasks completed</p>
                            </div>
                            <div className="w-20 h-20 shrink-0 relative">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                                    <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={2 * Math.PI * 32} strokeDashoffset={2 * Math.PI * 32 * (1 - progress / 100)} className="text-teal-500 transition-all duration-1000" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center font-sans text-xs font-black text-teal-600">{progress}%</div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
                        {checklist.length === 0 ? (
                            <div className="p-12 text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto text-gray-200"><Package className="w-8 h-8" /></div>
                                <p className="font-sans text-sm text-gray-400 italic">SOP checklist will appear here once the Post-Ops template is configured in Admin → SOPs</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {(() => {
                                    const grouped: Record<string, any[]> = {}
                                    const sopTitles: Record<string, string> = {}
                                    const ungrouped: any[] = []
                                    
                                    checklist.forEach(item => {
                                        if (item.sopId) {
                                            if (!grouped[item.sopId]) grouped[item.sopId] = []
                                            grouped[item.sopId].push(item)
                                            sopTitles[item.sopId] = item.sopTitle || 'OTHER CHECKS'
                                        } else {
                                            ungrouped.push(item)
                                        }
                                    })
                                    
                                    const sortedGroupKeys = Object.keys(grouped).sort((a, b) => {
                                        const minA = Math.min(...grouped[a].map(i => i.order || 0))
                                        const minB = Math.min(...grouped[b].map(i => i.order || 0))
                                        return minA - minB
                                    })
                                    
                                    const renderChecklistItem = (item: any) => {
                                        const isMandatory = item.isRequired !== false;
                                        const type = (item.type || "").toUpperCase();
                                        const hasText = !!item.response && item.response.toString().trim().length > 0;
                                        const hasFile = !!item.fileUrl;
                                        const hasAck = !!item.acknowledged;
                                        
                                        let isAnswered = false;
                                        if (type.includes("CHOICE")) isAnswered = !!item.response;
                                        else if (type.includes("FILE")) isAnswered = hasFile;
                                        else if (item.requiresAcknowledgement || type.includes("CHECKBOX")) isAnswered = hasAck;
                                        else if (type.includes("TEXT") || type.includes("NUMBER") || type.includes("DATE")) isAnswered = hasText;
                                        else isAnswered = true;

                                        const isChecked = itemStates[item.id]?.checked ?? item.checked;
                                        const remarksValue = itemStates[item.id]?.remarks ?? item.notes ?? "";

                                        return (
                                            <div key={item.id} className="p-6 flex items-start gap-4">
                                                <button
                                                    onClick={() => toggleItem(item.id, isChecked)}
                                                    disabled={!isAnswered && !isChecked}
                                                    className={`mt-1 shrink-0 transition-all ${isChecked ? "scale-95" : isAnswered ? "hover:scale-110" : "opacity-30 cursor-not-allowed"}`}
                                                >
                                                    {isChecked ? <CheckCircle className="w-6 h-6 text-emerald-500" /> : <Circle className="w-6 h-6 text-gray-200" />}
                                                </button>
                                                <div className="flex-1 space-y-4">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div>
                                                            <span className={`font-sans text-sm font-bold block transition-all ${isChecked ? 'text-gray-300 line-through' : 'text-[#052210]'}`}>{item.name || item.title}</span>
                                                            {item.extraInfo && <span className="text-[9px] font-black uppercase text-emerald-600 mt-1 block">{item.extraInfo}</span>}
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${isMandatory ? "bg-red-50 text-red-400" : "bg-gray-50 text-gray-400"}`}>
                                                            {isMandatory ? "Mandatory" : "Optional"}
                                                        </span>
                                                    </div>

                                                    {!isChecked && (
                                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
                                                            {/* SOP Inputs */}
                                                            {type.includes("DATE") && (
                                                                <input type="date" value={item.response || ""} onChange={(e) => updateChecklistItemState(item.id, { response: e.target.value })} className={inputClass} />
                                                            )}
                                                            {(type.includes("TEXT") || type.includes("NUMBER")) && (
                                                                <input type={type.includes("NUMBER") ? "number" : "text"} value={item.response || ""} onChange={(e) => updateChecklistItemState(item.id, { response: e.target.value })} placeholder="Enter response..." className={inputClass} />
                                                            )}
                                                            {type.includes("FILE") && (
                                                                <div>
                                                                    {!item.fileUrl ? (
                                                                        <div className="flex items-center gap-3">
                                                                            <input type="file" id={`f-${item.id}`} className="hidden" onChange={(e) => handleFileUpload(item.id, e.target.files?.[0])} />
                                                                            <label htmlFor={`f-${item.id}`} className="cursor-pointer flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-100 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group w-full">
                                                                                <UploadCloud className="w-5 h-5 text-gray-400 group-hover:text-emerald-500" />
                                                                                <span className="font-sans text-[11px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-emerald-600">Click to upload file</span>
                                                                            </label>
                                                                            {uploadingItemId === item.id && <Clock className="w-4 h-4 text-emerald-500 animate-spin" />}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                                                                            <a href={item.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-emerald-700 hover:underline">
                                                                                <FileText className="w-4 h-4" /> View File
                                                                            </a>
                                                                            <button onClick={() => updateChecklistItemState(item.id, { fileUrl: '' })} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {type.includes("CHOICE") && (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {(item.options || []).map((opt: string) => (
                                                                        <button key={opt} onClick={() => updateChecklistItemState(item.id, { response: opt })} className={`px-4 py-2 rounded-full font-sans text-xs font-bold border transition-all ${item.response === opt ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20" : "bg-white border-gray-100 text-gray-400 hover:border-gray-300"}`}>
                                                                            {opt}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {(item.requiresAcknowledgement || type.includes("CHECKBOX")) && (
                                                                <label className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer group">
                                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${item.acknowledged ? "bg-emerald-500 border-emerald-500" : "border-gray-200 group-hover:border-emerald-400"}`}>
                                                                        {item.acknowledged && <CheckCircle className="w-3 h-3 text-white" />}
                                                                        <input type="checkbox" className="hidden" checked={item.acknowledged || false} onChange={(e) => updateChecklistItemState(item.id, { acknowledged: e.target.checked })} />
                                                                    </div>
                                                                    <span className="font-sans text-[11px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-gray-600">Yes, I have completed this task</span>
                                                                </label>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Remarks - Now visible even when checked so they persist in UI and state */}
                                                    <div className="pt-2">
                                                        <p className={labelClass}>Remarks</p>
                                                        <input className={inputClass} value={remarksValue} onChange={(e) => handleRemarks(item.id, e.target.value)} placeholder="Add notes or remarks..." disabled={isChecked} />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }

                                    return (
                                        <>
                                            {sortedGroupKeys.map(key => (
                                                <div key={key} className="pb-4">
                                                    <div className="bg-emerald-50/50 px-6 py-3 border-b border-gray-50 flex items-center justify-between">
                                                        <h4 className="font-serif text-sm tracking-wider uppercase text-emerald-700 font-bold">{sopTitles[key]}</h4>
                                                    </div>
                                                    <div className="divide-y divide-gray-50">
                                                        {grouped[key].sort((a,b) => (a.order || 0) - (b.order || 0)).map(renderChecklistItem)}
                                                    </div>
                                                </div>
                                            ))}
                                            {ungrouped.length > 0 && (
                                                <div className="pb-4">
                                                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center justify-between">
                                                        <h4 className="font-serif text-sm tracking-wider uppercase text-gray-500 font-bold">OTHER CHECKS</h4>
                                                    </div>
                                                    <div className="divide-y divide-gray-50">
                                                        {ungrouped.sort((a,b) => (a.order || 0) - (b.order || 0)).map(renderChecklistItem)}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )
                                })()}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={completeTrip}
                        disabled={booking.status === 'completed' || progress < 100}
                        className={`w-full py-4 rounded-2xl font-sans font-bold text-sm tracking-[0.2em] uppercase transition-all shadow-xl ${booking.status === 'completed' ? 'bg-emerald-500 text-white opacity-50 cursor-default' : progress < 100 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-emerald-600 text-white hover:scale-[1.01] active:scale-95 shadow-emerald-500/20'}`}
                    >
                        {booking.status === 'completed' ? "Trip Completed" : "Mark trip as completed"}
                    </button>
                </div>
            )}
        </div>

        {/* Trip Completion Success Dialog */}
        {showCompletionDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(5,34,16,0.6)', backdropFilter: 'blur(8px)' }}>
                <div
                    className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-500"
                    style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)' }}
                >
                    {/* Top gradient bar */}
                    <div className="h-2 w-full" style={{ background: 'linear-gradient(90deg, #06a15c, #34d399, #06a15c)' }} />

                    <div className="p-8 text-center space-y-6">
                        {/* Animated checkmark */}
                        <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center relative" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>
                            <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: '#06a15c' }} />
                            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="11" stroke="#06a15c" strokeWidth="1.5" fill="#ecfdf5" />
                                <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#06a15c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>

                        {/* Heading */}
                        <div className="space-y-2">
                            <p className="font-sans text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Post-Ops Complete</p>
                            <h2 className="font-serif text-3xl font-bold text-[#052210]">Trip Completed!</h2>
                            <p className="font-sans text-sm text-gray-500 leading-relaxed">
                                All mandatory checklist items have been completed and the trip has been marked as finished.
                            </p>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)' }}>
                                <p className="font-sans text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Guest</p>
                                <p className="font-sans text-sm font-bold text-[#052210] truncate">{booking?.customerName || '—'}</p>
                            </div>
                            <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)' }}>
                                <p className="font-sans text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Tasks Done</p>
                                <p className="font-sans text-sm font-bold text-[#052210]">{completedCount} / {requiredChecklist.length}</p>
                            </div>
                        </div>

                        {/* Destination + dates */}
                        {booking?.destination && (
                            <div className="flex items-center justify-center gap-2 text-xs font-sans text-gray-400">
                                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <span>{booking.destination}</span>
                                {booking.startDate && booking.endDate && (
                                    <>
                                        <span className="text-gray-200">·</span>
                                        <span>{booking.startDate} → {booking.endDate}</span>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Close button */}
                        <button
                            onClick={() => setShowCompletionDialog(false)}
                            className="w-full py-3.5 rounded-2xl font-sans font-bold text-sm tracking-[0.15em] uppercase text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/30"
                            style={{ background: 'linear-gradient(135deg, #059669, #06a15c)' }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Payment Success Dialog */}
        {showPaymentDialog && lastPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(5,34,16,0.55)', backdropFilter: 'blur(8px)' }}>
                <div
                    className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-400"
                    style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)' }}
                >
                    {/* Top bar */}
                    <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #059669, #34d399, #059669)' }} />

                    <div className="p-7 space-y-5">
                        {/* Icon + heading */}
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>
                                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 12.5l2.5 2.5 4-5" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <rect x="3" y="6" width="18" height="13" rx="2" stroke="#059669" strokeWidth="1.5" />
                                    <path d="M3 10h18" stroke="#059669" strokeWidth="1.5" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-sans text-[9px] font-black uppercase tracking-[0.25em] text-emerald-500">Payment Recorded</p>
                                <h3 className="font-serif text-xl font-bold text-[#052210] mt-0.5">Balance Collected!</h3>
                            </div>
                        </div>

                        {/* Amount highlight */}
                        <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)' }}>
                            <p className="font-sans text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Amount Collected</p>
                            <p className="font-serif text-4xl font-black text-emerald-700">₹{lastPayment.amount.toLocaleString()}</p>
                        </div>

                        {/* Details */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-gray-400">Method</span>
                                <span className="font-sans text-xs font-bold text-[#052210]">{lastPayment.method}</span>
                            </div>
                            {lastPayment.reference && (
                                <div className="flex items-center justify-between px-1">
                                    <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-gray-400">Ref / UTR</span>
                                    <span className="font-sans text-xs font-bold text-[#052210] font-mono">{lastPayment.reference}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between px-1">
                                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-gray-400">Recorded by</span>
                                <span className="font-sans text-xs font-bold text-[#052210]">{userProfile?.name || 'You'}</span>
                            </div>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={() => setShowPaymentDialog(false)}
                            className="w-full py-3.5 rounded-2xl font-sans font-bold text-sm tracking-[0.15em] uppercase text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/30"
                            style={{ background: 'linear-gradient(135deg, #059669, #06a15c)' }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}
