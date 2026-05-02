"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getItineraries } from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { FileText, Plus, TrendingUp, CheckCircle, DollarSign, BarChart3 } from "lucide-react"

export default function SalesDashboard() {
    return (
        <ProtectedRoute allowedRoles={["sales", "sales_lead", "admin"]}>
            <SalesContent />
        </ProtectedRoute>
    )
}

function SalesContent() {
  const { userProfile } = useAuth()
  const [itineraries, setItineraries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!userProfile?.uid) {
        console.log("User profile not ready, skipping itinerary load")
        setLoading(false)
        return
      }
      console.log("Filtering itineraries for:", userProfile.uid)
      const allItins = await getItineraries(userProfile.uid)
      setItineraries(allItins)
      setLoading(false)
    }
    loadData()
  }, [userProfile])

    const total = itineraries.length
    const confirmed = itineraries.filter((i: any) => ["handover", "completed"].includes(i.status)).length
    const drafts = itineraries.filter((i: any) => ["draft", "negotiation"].includes(i.status)).length
    const conversion = total > 0 ? Math.round((confirmed / total) * 100) : 0
    const revenue = itineraries.filter((i: any) => ["handover", "completed"].includes(i.status)).reduce((s: number, i: any) => s + Math.round((Number(i.totalPrice) || 0) * ((Number(i.margin) || 15) / (100 + (Number(i.margin) || 15)))), 0)

    const kpis = [
        { label: "Total Itineraries", value: loading ? "—" : total, icon: FileText, color: "#06a15c" },
        { label: "Draft / Neg", value: loading ? "—" : drafts, icon: BarChart3, color: "#a78bfa" },
        { label: "Confirmed", value: loading ? "—" : confirmed, icon: CheckCircle, color: "#34d399" },
        { label: "Conversion", value: loading ? "—" : `${conversion}%`, icon: TrendingUp, color: "#60a5fa" },
        { label: "Revenue", value: loading ? "—" : `₹${revenue.toLocaleString()}`, icon: DollarSign, color: "#f472b6" },
    ]

    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="font-serif text-2xl sm:text-3xl tracking-wide" style={{ color: '#052210' }}>Sales Dashboard</h1>
                    <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Welcome, {userProfile?.name}</p>
                </div>
                <Link
                    href="/sales/itinerary/new"
                    className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-sans text-xs tracking-wider uppercase transition-all duration-200 hover:scale-105"
                    style={{ background: '#06a15c', color: '#FFFFFF' }}
                >
                    <Plus className="w-4 h-4" /> New Itinerary
                </Link>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className="rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:-translate-y-1" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}15`, border: `1px solid ${kpi.color}25` }}>
                                <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
                            </div>
                        </div>
                        <p className="font-sans text-[10px] sm:text-xs tracking-wider uppercase font-semibold mb-1" style={{ color: 'rgba(5,34,16,0.6)' }}>{kpi.label}</p>
                        <p className="font-serif text-3xl sm:text-4xl font-extrabold tracking-wide" style={{ color: '#052210' }}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Recent Itineraries Table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(248,250,249,1)', border: '1px solid rgba(6,161,92,0.1)' }}>
                <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(6,161,92,0.08)' }}>
                    <h3 className="font-serif text-lg tracking-wide" style={{ color: '#06a15c' }}>Recent Itineraries</h3>
                    <Link href="/sales/kanban" className="font-sans text-xs tracking-wider uppercase" style={{ color: 'rgba(6,161,92,0.6)' }}>View Kanban →</Link>
                </div>
                {loading ? (
                    <div className="px-6 py-8 text-center"><p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>Loading...</p></div>
                ) : itineraries.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(6,161,92,0.2)' }} />
                        <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No itineraries yet. Create your first one!</p>
                    </div>
                ) : itineraries.slice(0, 10).map((itin: any) => (
                    <Link key={itin.id} href={`/sales/itinerary/${itin.id}`} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors block" style={{ borderBottom: '1px solid rgba(6,161,92,0.06)' }}>
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,161,92,0.08)' }}>
                                <FileText className="w-4 h-4" style={{ color: '#06a15c' }} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{itin.customerName || "Unnamed"}</p>
                                    {itin.quoteId && <span className="font-sans text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase">{itin.quoteId}</span>}
                                </div>
                                <p className="font-sans text-xs truncate" style={{ color: 'rgba(5,34,16,0.45)' }}>{itin.destination || "—"} · {itin.nights || 0}N/{itin.days || 0}D</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {itin.totalPrice && <span className="hidden sm:block font-sans text-sm font-bold" style={{ color: '#06a15c' }}>₹{Number(itin.totalPrice).toLocaleString()}</span>}
                            <span className="px-2 sm:px-3 py-1 rounded-full font-sans text-[9px] sm:text-[10px] font-bold tracking-wider uppercase" style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c', border: '1px solid rgba(6,161,92,0.2)' }}>
                                {itin.status}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
