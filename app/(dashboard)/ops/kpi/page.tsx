"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getItinerariesByStatus } from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts"
import { Target, Award, Clock, Zap, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react"
import dynamic from "next/dynamic"

const RechartsBarChart = dynamic(() => import("recharts").then(mod => {
    const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } = mod
    return function Chart({ data }: { data: any[] }) {
        return (
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip cursor={{ fill: 'rgba(6,161,92,0.04)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                    <Bar dataKey="completed" name="Completed" fill="#06a15c" radius={[4, 4, 0, 0]} barSize={30} />
                    <Bar dataKey="pending" name="Pending" fill="#a78bfa" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
            </ResponsiveContainer>
        )
    }
}), { ssr: false })

export default function OpsKpiPage() {
    return (
        <ProtectedRoute allowedRoles={["pre_ops", "pre_ops_lead", "pre_ops_lead", "admin"]}>
            <OpsKpiContent />
        </ProtectedRoute>
    )
}

function OpsKpiContent() {
    const { userProfile } = useAuth()
    const [bookings, setBookings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
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

    // Filter bookings belonging to this user (if ops) or all if lead/admin
    const myBookings = bookings // In a real app we'd filter by assignedOps == userProfile.uid

    const completedCount = myBookings.filter(b => b.status === "completed").length
    const pendingCount = myBookings.filter(b => b.status === "handover" || b.status === "confirmed").length

    // Mock data for charts
    const processingData = [
        { label: "Mon", completed: Math.floor(Math.random() * 5) + 1, pending: Math.floor(Math.random() * 3) },
        { label: "Tue", completed: Math.floor(Math.random() * 8) + 2, pending: Math.floor(Math.random() * 4) },
        { label: "Wed", completed: Math.floor(Math.random() * 6) + 1, pending: Math.floor(Math.random() * 2) },
        { label: "Thu", completed: Math.floor(Math.random() * 10) + 3, pending: Math.floor(Math.random() * 5) },
        { label: "Fri", completed: Math.floor(Math.random() * 7) + 2, pending: Math.floor(Math.random() * 3) },
        { label: "Sat", completed: Math.floor(Math.random() * 4) + 1, pending: Math.floor(Math.random() * 1) },
        { label: "Sun", completed: Math.floor(Math.random() * 2), pending: Math.floor(Math.random() * 1) },
    ]

    return (
        <div className="space-y-8 pb-16 max-w-6xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="font-serif text-3xl tracking-wide" style={{ color: '#052210' }}>My Performance</h1>
                <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Pre-Operations KPIs & Analytics</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} /></div>
            ) : (
                <>
                    {/* Top Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                            <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center bg-emerald-50">
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                            </div>
                            <p className="font-sans text-[10px] tracking-widest uppercase font-bold text-gray-400 mb-1">Processed</p>
                            <p className="font-serif text-3xl font-bold text-emerald-950">{completedCount}</p>
                        </div>

                        <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                            <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center bg-purple-50">
                                <Clock className="w-5 h-5 text-purple-600" />
                            </div>
                            <p className="font-sans text-[10px] tracking-widest uppercase font-bold text-gray-400 mb-1">Pending</p>
                            <p className="font-serif text-3xl font-bold text-emerald-950">{pendingCount}</p>
                        </div>

                        <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                            <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center bg-blue-50">
                                <Zap className="w-5 h-5 text-blue-600" />
                            </div>
                            <p className="font-sans text-[10px] tracking-widest uppercase font-bold text-gray-400 mb-1">Avg Time</p>
                            <p className="font-serif text-3xl font-bold text-emerald-950">1.2h</p>
                        </div>

                        <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                            <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center bg-orange-50">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                            </div>
                            <p className="font-sans text-[10px] tracking-widest uppercase font-bold text-gray-400 mb-1">Error Rate</p>
                            <p className="font-serif text-3xl font-bold text-emerald-950">0.5%</p>
                        </div>
                    </div>

                    {/* Chart & Insights */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 rounded-3xl p-6 relative overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                            <h3 className="font-serif text-lg tracking-wide text-emerald-950 mb-6 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-600" /> Weekly Processing Volume
                            </h3>
                            <RechartsBarChart data={processingData} />
                        </div>

                        <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #052210 0%, #0a3f1d 100%)', boxShadow: '0 10px 30px rgba(5,34,16,0.2)' }}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-[60px] opacity-20 transform translate-x-10 -translate-y-10"></div>

                            <h3 className="font-serif text-lg tracking-wide text-white mb-6 flex items-center gap-2">
                                <Award className="w-5 h-5 text-yellow-500" /> Quality Metrics
                            </h3>

                            <div className="space-y-6 relative z-10">
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <p className="font-sans text-[11px] font-bold tracking-widest uppercase text-emerald-300">Accuracy Score</p>
                                        <p className="font-serif text-xl font-bold text-white">98%</p>
                                    </div>
                                    <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: '98%' }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <p className="font-sans text-[11px] font-bold tracking-widest uppercase text-emerald-300">SLA Compliance</p>
                                        <p className="font-serif text-xl font-bold text-white">100%</p>
                                    </div>
                                    <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-400 rounded-full" style={{ width: '100%' }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <p className="font-sans text-[11px] font-bold tracking-widest uppercase text-emerald-300">Vendor Comms</p>
                                        <p className="font-serif text-xl font-bold text-white">95%</p>
                                    </div>
                                    <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-400 rounded-full" style={{ width: '95%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
