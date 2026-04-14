"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getItinerariesByStatus, getSOPs } from "@/lib/firestore"
import Link from "next/link"
import { ClipboardCheck, Package, ChevronRight, Users, CalendarCheck, Plane, Phone, MessageSquare, X, Send } from "lucide-react"

export default function PostOpsDashboard() {
    return (
        <ProtectedRoute allowedRoles={["post_ops", "post_ops_lead", "admin"]}>
            <PostOpsContent />
        </ProtectedRoute>
    )
}

function PostOpsContent() {
    const [bookings, setBookings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [sops, setSOPs] = useState<any[]>([])
    const [sopFillModal, setSopFillModal] = useState<any>(null)
    const [sopFormData, setSopFormData] = useState<Record<string, string>>({})
    const [whatsappMsg, setWhatsappMsg] = useState("")

    useEffect(() => { loadBookings() }, [])

    const loadBookings = async () => {
        try {
            const [postOps, completed] = await Promise.all([
                getItinerariesByStatus("post-ops"),
                getItinerariesByStatus("completed"),
            ])
            setBookings([...postOps, ...completed])
            const postOpsSops = await getSOPs("post_ops")
            setSOPs(postOpsSops)
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const today = new Date().toISOString().split("T")[0]
    const onTrip = bookings.filter(b => b.status === "post-ops")
    const endingToday = bookings.filter(b => {
        if (!b.endDate) return false
        const end = new Date(b.endDate).toISOString().split("T")[0]
        return end === today
    })
    const totalCompleted = bookings.filter(b => b.status === "completed")

    const openSopFill = (sop: any) => {
        setSopFillModal(sop)
        setSopFormData({})
        // Build WhatsApp template with placeholders
        setWhatsappMsg(sop.whatsappTemplate || "")
    }

    const buildWhatsappUrl = () => {
        let msg = whatsappMsg
        Object.entries(sopFormData).forEach(([key, val]) => {
            msg = msg.replace(new RegExp(`\\{${key}\\}`, 'g'), val)
        })
        return `https://wa.me/?text=${encodeURIComponent(msg)}`
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-serif text-2xl sm:text-3xl tracking-wide" style={{ color: '#052210' }}>Post Operation Dashboard</h1>
                <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Manage active trips, SOPs, and final handovers</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: "On-Trip Clients", value: onTrip.length, icon: Plane, color: "#f59e0b", desc: "Currently travelling" },
                    { label: "Ending Today", value: endingToday.length, icon: CalendarCheck, color: "#ef4444", desc: "Trips ending today" },
                    { label: "Active Trips", value: onTrip.length, icon: Package, color: "#34d399", desc: "Post-ops pipeline" },
                    { label: "Completed", value: totalCompleted.length, icon: ClipboardCheck, color: "#06a15c", desc: "Marketing handover" },
                ].map((s, i) => (
                    <div key={i} className="rounded-2xl p-4 sm:p-5 transition-all hover:-translate-y-1" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
                                <s.icon className="w-5 h-5" style={{ color: s.color }} />
                            </div>
                            {s.label === "Ending Today" && endingToday.length > 0 && (
                                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#ef4444' }} />
                            )}
                        </div>
                        <p className="font-sans text-[10px] tracking-wider uppercase font-semibold" style={{ color: 'rgba(5,34,16,0.5)' }}>{s.label}</p>
                        <p className="font-serif text-3xl font-extrabold mt-1" style={{ color: '#052210' }}>{loading ? "—" : s.value}</p>
                        <p className="font-sans text-[10px] mt-1" style={{ color: 'rgba(5,34,16,0.35)' }}>{s.desc}</p>
                    </div>
                ))}
            </div>

            {/* Trips Ending Today */}
            {endingToday.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: '#FFF5F5', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
                        <CalendarCheck className="w-4 h-4" style={{ color: '#ef4444' }} />
                        <h3 className="font-serif text-base tracking-wide" style={{ color: '#ef4444' }}>Trips Ending Today</h3>
                        <span className="ml-auto px-2 py-0.5 rounded-full font-sans text-[10px] font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{endingToday.length}</span>
                    </div>
                    {endingToday.map(b => (
                        <Link key={b.id} href={`/post-ops/booking/${b.id}`} className="px-6 py-3 flex items-center justify-between hover:bg-white/50 transition-colors block" style={{ borderBottom: '1px solid rgba(239,68,68,0.05)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-sans text-xs font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                                    {(b.customerName || "?")[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{b.customerName}</p>
                                    <p className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{b.destination} · {b.quoteId || ""}</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4" style={{ color: 'rgba(5,34,16,0.3)' }} />
                        </Link>
                    ))}
                </div>
            )}

            {/* SOP Templates — Fill & Send */}
            {sops.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(5,34,16,0.06)' }}>
                    <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(5,34,16,0.04)' }}>
                        <h3 className="font-serif text-lg" style={{ color: '#052210' }}>Post-Ops SOPs</h3>
                        <p className="font-sans text-[10px] mt-0.5" style={{ color: 'rgba(5,34,16,0.4)' }}>Fill details and send WhatsApp to customer</p>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sops.map((sop: any) => (
                            <button key={sop.id} onClick={() => openSopFill(sop)} className="text-left p-4 rounded-xl hover:-translate-y-0.5 transition-all" style={{ background: 'rgba(5,34,16,0.02)', border: '1px solid rgba(5,34,16,0.06)' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare className="w-3.5 h-3.5" style={{ color: '#25D366' }} />
                                    <span className="font-sans text-xs font-bold" style={{ color: '#052210' }}>{sop.title}</span>
                                </div>
                                <p className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{(sop.items || []).length} checklist items</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Trips */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(248,250,249,1)', border: '1px solid rgba(6,161,92,0.1)' }}>
                <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(6,161,92,0.08)' }}>
                    <h3 className="font-serif text-lg tracking-wide" style={{ color: '#06a15c' }}>Active Trips (Post-Op)</h3>
                    <span className="font-sans text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c' }}>{onTrip.length}</span>
                </div>
                {loading ? (
                    <div className="px-6 py-8 text-center"><p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>Loading...</p></div>
                ) : onTrip.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Package className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(6,161,92,0.2)' }} />
                        <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No active trips in Post-Operation</p>
                    </div>
                ) : onTrip.map((b: any) => (
                    <Link key={b.id} href={`/post-ops/booking/${b.id}`} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors block" style={{ borderBottom: '1px solid rgba(6,161,92,0.06)' }}>
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-xl flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.1)' }}>
                                <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#34d399' }} />
                            </div>
                            <div className="min-w-0">
                                <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{b.customerName}</p>
                                <p className="font-sans text-xs truncate" style={{ color: 'rgba(5,34,16,0.45)' }}>{b.destination} · {b.startDate} → {b.endDate}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {b.quoteId && <span className="hidden sm:block font-sans text-[9px] font-bold tracking-wider" style={{ color: '#06a15c' }}>{b.quoteId}</span>}
                            <span className="px-2 sm:px-3 py-1 rounded-full font-sans text-[9px] sm:text-[10px] font-bold tracking-wider uppercase" style={{ background: '#34d39915', color: '#34d399' }}>
                                {b.status}
                            </span>
                            <ChevronRight className="w-4 h-4" style={{ color: 'rgba(3,26,12,0.4)' }} />
                        </div>
                    </Link>
                ))}
            </div>

            {/* SOP Fill Modal */}
            {sopFillModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-6" style={{ background: '#fff' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-serif text-xl" style={{ color: '#052210' }}>{sopFillModal.title}</h2>
                            <button onClick={() => setSopFillModal(null)}><X className="w-5 h-5" style={{ color: 'rgba(5,34,16,0.3)' }} /></button>
                        </div>

                        <div className="space-y-3 mb-5">
                            <div>
                                <label className="font-sans text-[10px] font-bold tracking-wider uppercase block mb-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Driver Name</label>
                                <input value={sopFormData.driver_name || ""} onChange={e => setSopFormData(p => ({ ...p, driver_name: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl font-sans text-sm" placeholder="Enter driver name" style={{ border: '1px solid rgba(5,34,16,0.1)', outline: 'none' }} />
                            </div>
                            <div>
                                <label className="font-sans text-[10px] font-bold tracking-wider uppercase block mb-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Driver Phone Number</label>
                                <input value={sopFormData.driver_phone || ""} onChange={e => setSopFormData(p => ({ ...p, driver_phone: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl font-sans text-sm" placeholder="+91 XXXXX XXXXX" style={{ border: '1px solid rgba(5,34,16,0.1)', outline: 'none' }} />
                            </div>
                            <div>
                                <label className="font-sans text-[10px] font-bold tracking-wider uppercase block mb-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Hotel Details</label>
                                <textarea value={sopFormData.hotel_details || ""} onChange={e => setSopFormData(p => ({ ...p, hotel_details: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl font-sans text-sm resize-none" rows={3} placeholder="Hotel name, address, check-in details..." style={{ border: '1px solid rgba(5,34,16,0.1)', outline: 'none' }} />
                            </div>
                            <div>
                                <label className="font-sans text-[10px] font-bold tracking-wider uppercase block mb-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Customer Name</label>
                                <input value={sopFormData.customer_name || ""} onChange={e => setSopFormData(p => ({ ...p, customer_name: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl font-sans text-sm" placeholder="Customer name" style={{ border: '1px solid rgba(5,34,16,0.1)', outline: 'none' }} />
                            </div>
                        </div>

                        {/* Message Preview */}
                        <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(37,211,102,0.05)', border: '1px solid rgba(37,211,102,0.15)' }}>
                            <p className="font-sans text-[9px] font-bold tracking-wider uppercase mb-2" style={{ color: '#25D366' }}>WhatsApp Message Preview</p>
                            <p className="font-sans text-xs whitespace-pre-wrap" style={{ color: 'rgba(5,34,16,0.7)' }}>
                                {whatsappMsg
                                    .replace(/\{driver_name\}/g, sopFormData.driver_name || "[Driver Name]")
                                    .replace(/\{driver_phone\}/g, sopFormData.driver_phone || "[Driver Phone]")
                                    .replace(/\{hotel_details\}/g, sopFormData.hotel_details || "[Hotel Details]")
                                    .replace(/\{customer_name\}/g, sopFormData.customer_name || "[Customer Name]")
                                }
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setSopFillModal(null)} className="flex-1 py-2.5 rounded-xl font-sans text-xs font-bold tracking-wider uppercase" style={{ border: '1px solid rgba(5,34,16,0.1)', color: 'rgba(5,34,16,0.5)' }}>Cancel</button>
                            <a href={buildWhatsappUrl()} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-sans text-xs font-bold tracking-wider uppercase" style={{ background: '#25D366', color: '#fff' }}>
                                <Send className="w-3.5 h-3.5" /> Send via WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
