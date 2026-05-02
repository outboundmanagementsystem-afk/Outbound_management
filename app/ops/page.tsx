"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getItinerariesByStatus } from "@/lib/firestore"
import Link from "next/link"
import { Package, MapPin, Calendar, Users, ChevronRight } from "lucide-react"

export default function OpsDashboard() {
    return (
        <ProtectedRoute allowedRoles={["pre_ops", "pre_ops_lead", "pre_ops_lead", "admin"]}>
            <OpsContent />
        </ProtectedRoute>
    )
}

function OpsContent() {
    const [bookings, setBookings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadBookings() }, [])

    const loadBookings = async () => {
        try {
            const [handover, confirmed, completed] = await Promise.all([
                getItinerariesByStatus("handover"),
                getItinerariesByStatus("confirmed"),
                getItinerariesByStatus("completed"),
            ])
            setBookings([...handover, ...confirmed, ...completed])
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-serif text-2xl sm:text-3xl tracking-wide" style={{ color: '#052210' }}>Pre Operation Dashboard</h1>
                <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Process confirmed bookings</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
                <div className="rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:-translate-y-1" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                            <Package className="w-5 h-5" style={{ color: '#34d399' }} />
                        </div>
                    </div>
                    <p className="font-sans text-[10px] sm:text-xs tracking-wider uppercase font-semibold mb-1" style={{ color: 'rgba(5,34,16,0.6)' }}>Confirmed Awaiting Handover</p>
                    <p className="font-serif text-3xl sm:text-4xl font-extrabold tracking-wide" style={{ color: '#052210' }}>{loading ? "—" : bookings.filter(b => b.status === "confirmed").length}</p>
                </div>
                <div className="rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:-translate-y-1" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
                            <Package className="w-5 h-5" style={{ color: '#a78bfa' }} />
                        </div>
                    </div>
                    <p className="font-sans text-[10px] sm:text-xs tracking-wider uppercase font-semibold mb-1" style={{ color: 'rgba(5,34,16,0.6)' }}>Pending Processing</p>
                    <p className="font-serif text-3xl sm:text-4xl font-extrabold tracking-wide" style={{ color: '#052210' }}>{loading ? "—" : bookings.filter(b => b.status === "handover").length}</p>
                </div>
                <div className="rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:-translate-y-1" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,161,92,0.1)', border: '1px solid rgba(6,161,92,0.2)' }}>
                            <Package className="w-5 h-5" style={{ color: '#06a15c' }} />
                        </div>
                    </div>
                    <p className="font-sans text-[10px] sm:text-xs tracking-wider uppercase font-semibold mb-1" style={{ color: 'rgba(5,34,16,0.6)' }}>Operations Completed</p>
                    <p className="font-serif text-3xl sm:text-4xl font-extrabold tracking-wide" style={{ color: '#052210' }}>{loading ? "—" : bookings.filter(b => b.status === "completed").length}</p>
                </div>
            </div>

            {/* Bookings list */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(248,250,249,1)', border: '1px solid rgba(6,161,92,0.1)' }}>
                <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(6,161,92,0.08)' }}>
                    <h3 className="font-serif text-lg tracking-wide" style={{ color: '#06a15c' }}>Bookings to Process</h3>
                </div>
                {loading ? (
                    <div className="px-6 py-8 text-center"><p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>Loading...</p></div>
                ) : bookings.filter(b => b.status !== "completed").length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Package className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(6,161,92,0.2)' }} />
                        <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No pending bookings</p>
                    </div>
                ) : bookings.filter(b => b.status !== "completed").map((b: any) => (
                    <Link key={b.id} href={`/ops/booking/${b.id}`} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors block" style={{ borderBottom: '1px solid rgba(6,161,92,0.06)' }}>
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-xl flex items-center justify-center" style={{ background: b.status === "handover" ? 'rgba(167,139,250,0.1)' : 'rgba(52,211,153,0.1)' }}>
                                <Package className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: b.status === "handover" ? '#a78bfa' : '#34d399' }} />
                            </div>
                            <div className="min-w-0">
                                <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{b.customerName}</p>
                                <p className="font-sans text-xs truncate" style={{ color: 'rgba(5,34,16,0.45)' }}>{b.destination} · {b.startDate} → {b.endDate}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="px-2 sm:px-3 py-1 rounded-full font-sans text-[9px] sm:text-[10px] font-bold tracking-wider uppercase" style={{ background: `${b.status === "handover" ? '#a78bfa' : '#34d399'}15`, color: b.status === "handover" ? '#a78bfa' : '#34d399' }}>
                                {b.status}
                            </span>
                            <ChevronRight className="w-4 h-4" style={{ color: 'rgba(3,26,12,0.4)' }} />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
