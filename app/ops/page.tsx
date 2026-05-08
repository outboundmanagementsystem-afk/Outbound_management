"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getItinerariesByStatus } from "@/lib/firestore"
import Link from "next/link"
import { Package, MapPin, Calendar, Users, ChevronRight, AlertCircle, Clock, CheckCircle2, PlayCircle } from "lucide-react"

export default function OpsDashboard() {
    return (
        <ProtectedRoute allowedRoles={["pre_ops", "pre_ops_lead", "ops", "ops_lead", "admin"]}>
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
            // Fetch all relevant statuses for the dashboard
            const [handover, preOps, postOps, confirmed, completed] = await Promise.all([
                getItinerariesByStatus("handover"),
                getItinerariesByStatus("pre-ops"),
                getItinerariesByStatus("post-ops"),
                getItinerariesByStatus("confirmed"),
                getItinerariesByStatus("completed"),
            ])
            setBookings([...handover, ...preOps, ...postOps, ...confirmed, ...completed])
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const getUrgentCount = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return bookings.filter(b => {
            if (b.status === "post-ops" || b.status === "completed") return false;
            if (!b.startDate) return false;
            const start = new Date(b.startDate);
            start.setHours(0, 0, 0, 0);
            const diffTime = start.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 5;
        }).length;
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-serif text-2xl sm:text-3xl tracking-wide" style={{ color: '#052210' }}>Pre Operation Dashboard</h1>
                <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Process confirmed bookings</p>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Needs Action Now */}
                <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(229,62,62,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(229,62,62,0.1)' }}>
                            <AlertCircle className="w-4 h-4" style={{ color: '#E53E3E' }} />
                        </div>
                        <div>
                            <p className="font-sans text-[10px] uppercase font-bold tracking-wider" style={{ color: 'rgba(5,34,16,0.5)' }}>Needs action now</p>
                            <p className="font-sans text-[9px]" style={{ color: 'rgba(5,34,16,0.4)' }}>Travel within 5 days</p>
                        </div>
                    </div>
                    <p className="font-serif text-3xl font-extrabold" style={{ color: '#E53E3E' }}>{loading ? "—" : getUrgentCount()}</p>
                </div>

                {/* 2. Awaiting Handover */}
                <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(221,107,32,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(221,107,32,0.1)' }}>
                            <Clock className="w-4 h-4" style={{ color: '#DD6B20' }} />
                        </div>
                        <div>
                            <p className="font-sans text-[10px] uppercase font-bold tracking-wider" style={{ color: 'rgba(5,34,16,0.5)' }}>Handover received</p>
                            <p className="font-sans text-[9px]" style={{ color: 'rgba(5,34,16,0.4)' }}>Not yet started</p>
                        </div>
                    </div>
                    <p className="font-serif text-3xl font-extrabold" style={{ color: '#DD6B20' }}>{loading ? "—" : bookings.filter(b => b.status === "handover").length}</p>
                </div>

                {/* 3. In Processing */}
                <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(55,138,221,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(55,138,221,0.1)' }}>
                            <PlayCircle className="w-4 h-4" style={{ color: '#378ADD' }} />
                        </div>
                        <div>
                            <p className="font-sans text-[10px] uppercase font-bold tracking-wider" style={{ color: 'rgba(5,34,16,0.5)' }}>In processing</p>
                            <p className="font-sans text-[9px]" style={{ color: 'rgba(5,34,16,0.4)' }}>Pre-ops in progress</p>
                        </div>
                    </div>
                    <p className="font-serif text-3xl font-extrabold" style={{ color: '#378ADD' }}>{loading ? "—" : bookings.filter(b => b.status === "pre-ops").length}</p>
                </div>

                {/* 4. Handed to Post-Ops */}
                <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(29,158,117,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(29,158,117,0.1)' }}>
                            <CheckCircle2 className="w-4 h-4" style={{ color: '#1D9E75' }} />
                        </div>
                        <div>
                            <p className="font-sans text-[10px] uppercase font-bold tracking-wider" style={{ color: 'rgba(5,34,16,0.5)' }}>Handed to post-ops</p>
                            <p className="font-sans text-[9px]" style={{ color: 'rgba(5,34,16,0.4)' }}>Pre-ops completed</p>
                        </div>
                    </div>
                    <p className="font-serif text-3xl font-extrabold" style={{ color: '#1D9E75' }}>{loading ? "—" : bookings.filter(b => b.status === "post-ops").length}</p>
                </div>
            </div>

            {/* Bookings list - Reverting to previous UI style */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(248,250,249,1)', border: '1px solid rgba(6,161,92,0.1)' }}>
                <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(6,161,92,0.08)' }}>
                    <h3 className="font-serif text-lg tracking-wide" style={{ color: '#06a15c' }}>Bookings to Process</h3>
                </div>
                {loading ? (
                    <div className="px-6 py-8 text-center"><p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>Loading...</p></div>
                ) : bookings.filter(b => b.status !== "completed" && b.status !== "post-ops").length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Package className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(6,161,92,0.2)' }} />
                        <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No pending bookings</p>
                    </div>
                ) : bookings.filter(b => b.status !== "completed" && b.status !== "post-ops").map((b: any) => (
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
                            <span className="px-2 sm:px-3 py-1 rounded-full font-sans text-[9px] sm:text-[10px] font-bold tracking-wider uppercase" style={{ background: `${b.status === "handover" ? '#DD6B20' : '#378ADD'}15`, color: b.status === "handover" ? '#DD6B20' : '#378ADD' }}>
                                {b.status === 'handover' ? 'Handover received' : 'In processing'}
                            </span>
                            <ChevronRight className="w-4 h-4" style={{ color: 'rgba(3,26,12,0.4)' }} />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
