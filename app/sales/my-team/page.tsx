"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getUsers, getItineraries } from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import {
    Users, FileText, TrendingUp, CheckCircle, DollarSign, BarChart3,
    MapPin, Clock, ChevronRight, UserCheck, Target, Award
} from "lucide-react"

export default function MyTeamPage() {
    return (
        <ProtectedRoute allowedRoles={["sales_lead", "admin"]}>
            <MyTeamContent />
        </ProtectedRoute>
    )
}

function MyTeamContent() {
    const { userProfile } = useAuth()
    const [teamMembers, setTeamMembers] = useState<any[]>([])
    const [allItineraries, setAllItineraries] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedMember, setSelectedMember] = useState<string | null>(null)

    useEffect(() => { loadData() }, [userProfile])

    const loadData = async () => {
        if (!userProfile) return
        try {
            const [users, itins] = await Promise.all([getUsers(), getItineraries()])
            // Filter users assigned to this lead
            const members = users.filter((u: any) => u.leadId === userProfile.uid)
            setTeamMembers(members)
            setAllItineraries(itins)
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    // Team-wide KPIs
    const memberUids = teamMembers.map((m: any) => m.uid)
    const teamItins = allItineraries.filter((i: any) => memberUids.includes(i.createdBy))
    const teamTotal = teamItins.length
    const teamConfirmed = teamItins.filter((i: any) => ["confirmed", "handover", "completed"].includes(i.status)).length
    const teamDrafts = teamItins.filter((i: any) => ["draft", "sent"].includes(i.status)).length
    const teamConversion = teamTotal > 0 ? Math.round((teamConfirmed / teamTotal) * 100) : 0
    const teamRevenue = teamItins
        .filter((i: any) => ["confirmed", "handover", "completed"].includes(i.status))
        .reduce((sum: number, i: any) => sum + Math.round((Number((i.plans?.find((p:any) => p.planId === i.selectedPlanId)?.totalPrice || i.plans?.[0]?.totalPrice || 0)) || 0) * ((Number(i.margin) || 15) / (100 + (Number(i.margin) || 15)))), 0)

    // Per-member stats
    const getMemberStats = (uid: string) => {
        const memberItins = allItineraries.filter((i: any) => i.createdBy === uid)
        const total = memberItins.length
        const confirmed = memberItins.filter((i: any) => ["confirmed", "handover", "completed"].includes(i.status)).length
        const drafts = memberItins.filter((i: any) => ["draft", "sent"].includes(i.status)).length
        const conversion = total > 0 ? Math.round((confirmed / total) * 100) : 0
        const revenue = memberItins
            .filter((i: any) => ["confirmed", "handover", "completed"].includes(i.status))
            .reduce((sum: number, i: any) => sum + Math.round((Number((i.plans?.find((p:any) => p.planId === i.selectedPlanId)?.totalPrice || i.plans?.[0]?.totalPrice || 0)) || 0) * ((Number(i.margin) || 15) / (100 + (Number(i.margin) || 15)))), 0)
        return { total, confirmed, drafts, conversion, revenue, itineraries: memberItins }
    }

    const selectedMemberData = selectedMember ? teamMembers.find((m: any) => m.uid === selectedMember) : null
    const selectedStats = selectedMember ? getMemberStats(selectedMember) : null

    const teamKpis = [
        { label: "Team Members", value: loading ? "—" : teamMembers.length, icon: Users, color: "#8b5cf6" },
        { label: "Total Itineraries", value: loading ? "—" : teamTotal, icon: FileText, color: "#06a15c" },
        { label: "Confirmed", value: loading ? "—" : teamConfirmed, icon: CheckCircle, color: "#34d399" },
        { label: "Conversion Rate", value: loading ? "—" : `${teamConversion}%`, icon: TrendingUp, color: "#60a5fa" },
        { label: "Team Revenue", value: loading ? "—" : `₹${teamRevenue.toLocaleString()}`, icon: DollarSign, color: "#f472b6" },
    ]

    const statusColors: Record<string, string> = {
        draft: "#9ca3af", sent: "#60a5fa", confirmed: "#34d399",
        handover: "#a78bfa", "post-ops": "#f59e0b", completed: "#f472b6"
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div>
                <h1 className="font-serif text-3xl tracking-wide" style={{ color: '#052210' }}>My Team</h1>
                <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>
                    Monitor your team&apos;s performance and itineraries
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} />
                </div>
            ) : (
                <>
                    {/* Team KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {teamKpis.map((kpi) => (
                            <div key={kpi.label} className="rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}12` }}>
                                        <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                                    </div>
                                </div>
                                <p className="font-sans text-[10px] tracking-wider uppercase font-semibold mb-1" style={{ color: 'rgba(5,34,16,0.5)' }}>{kpi.label}</p>
                                <p className="font-serif text-2xl font-bold" style={{ color: '#052210' }}>{kpi.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Team Members Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Member List */}
                        <div className="lg:col-span-1 space-y-3">
                            <h3 className="font-serif text-sm tracking-wider uppercase px-1" style={{ color: '#06a15c' }}>Team Members</h3>
                            {teamMembers.length === 0 ? (
                                <div className="rounded-2xl p-8 text-center" style={{ background: '#FFFFFF', border: '1px dashed rgba(5,34,16,0.15)' }}>
                                    <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No members assigned yet</p>
                                    <p className="font-sans text-xs mt-1" style={{ color: 'rgba(5,34,16,0.3)' }}>Ask your admin to assign sales members to you</p>
                                </div>
                            ) : teamMembers.map((member: any) => {
                                const stats = getMemberStats(member.uid)
                                const isSelected = selectedMember === member.uid
                                return (
                                    <button
                                        key={member.uid}
                                        onClick={() => setSelectedMember(isSelected ? null : member.uid)}
                                        className="w-full text-left rounded-2xl p-4 transition-all duration-200"
                                        style={{
                                            background: isSelected ? 'rgba(6,161,92,0.06)' : '#FFFFFF',
                                            border: `1px solid ${isSelected ? 'rgba(6,161,92,0.3)' : 'rgba(5,34,16,0.08)'}`,
                                            boxShadow: isSelected ? '0 4px 12px rgba(6,161,92,0.1)' : '0 2px 8px rgba(0,0,0,0.02)'
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-sans text-sm font-bold flex-shrink-0" style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c' }}>
                                                {member.name?.charAt(0)?.toUpperCase() || "?"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{member.name}</p>
                                                <p className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{member.employeeCode || member.email}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: isSelected ? '#06a15c' : 'rgba(5,34,16,0.2)' }} />
                                        </div>

                                        {/* Mini KPIs */}
                                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(5,34,16,0.06)' }}>
                                            <div className="text-center">
                                                <p className="font-sans text-[9px] tracking-wider uppercase" style={{ color: 'rgba(5,34,16,0.4)' }}>Total</p>
                                                <p className="font-sans text-sm font-bold" style={{ color: '#052210' }}>{stats.total}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-sans text-[9px] tracking-wider uppercase" style={{ color: 'rgba(5,34,16,0.4)' }}>Conv.</p>
                                                <p className="font-sans text-sm font-bold" style={{ color: stats.conversion >= 50 ? '#06a15c' : stats.conversion >= 25 ? '#f59e0b' : '#ef4444' }}>{stats.conversion}%</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-sans text-[9px] tracking-wider uppercase" style={{ color: 'rgba(5,34,16,0.4)' }}>Rev.</p>
                                                <p className="font-sans text-xs font-bold" style={{ color: '#06a15c' }}>₹{(stats.revenue / 1000).toFixed(0)}k</p>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Selected Member Detail / All Itineraries */}
                        <div className="lg:col-span-2">
                            {selectedMemberData && selectedStats ? (
                                <div className="space-y-5">
                                    {/* Member Header */}
                                    <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                                        <div className="flex items-center gap-4 mb-5">
                                            <div className="w-14 h-14 rounded-full flex items-center justify-center font-serif text-xl font-bold" style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c' }}>
                                                {selectedMemberData.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-serif text-xl tracking-wide" style={{ color: '#052210' }}>{selectedMemberData.name}</h3>
                                                <p className="font-sans text-xs" style={{ color: 'rgba(5,34,16,0.5)' }}>{selectedMemberData.email} · {selectedMemberData.employeeCode}</p>
                                            </div>
                                        </div>

                                        {/* Member KPIs */}
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                            {[
                                                { label: "Total", value: selectedStats.total, icon: FileText, color: "#06a15c" },
                                                { label: "Drafts", value: selectedStats.drafts, icon: BarChart3, color: "#a78bfa" },
                                                { label: "Confirmed", value: selectedStats.confirmed, icon: CheckCircle, color: "#34d399" },
                                                { label: "Conv.", value: `${selectedStats.conversion}%`, icon: Target, color: "#60a5fa" },
                                                { label: "Revenue", value: `₹${selectedStats.revenue.toLocaleString()}`, icon: DollarSign, color: "#f472b6" },
                                            ].map(k => (
                                                <div key={k.label} className="rounded-xl p-3 text-center" style={{ background: `${k.color}08`, border: `1px solid ${k.color}15` }}>
                                                    <k.icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: k.color }} />
                                                    <p className="font-sans text-[9px] tracking-wider uppercase" style={{ color: 'rgba(5,34,16,0.4)' }}>{k.label}</p>
                                                    <p className="font-sans text-sm font-bold mt-0.5" style={{ color: '#052210' }}>{k.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Member Itineraries */}
                                    <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)' }}>
                                        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(6,161,92,0.08)' }}>
                                            <h4 className="font-serif text-sm tracking-wider uppercase" style={{ color: '#06a15c' }}>
                                                {selectedMemberData.name}&apos;s Itineraries ({selectedStats.total})
                                            </h4>
                                        </div>
                                        {selectedStats.itineraries.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No itineraries created yet</p>
                                            </div>
                                        ) : selectedStats.itineraries.slice(0, 15).map((itin: any) => (
                                            <Link key={itin.id} href={`/sales/itinerary/${itin.id}`} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors block" style={{ borderBottom: '1px solid rgba(5,34,16,0.04)' }}>
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(6,161,92,0.06)' }}>
                                                        <FileText className="w-3.5 h-3.5" style={{ color: '#06a15c' }} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{itin.customerName || "Unnamed"}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{itin.destination || "—"}</span>
                                                            <span className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.3)' }}>·</span>
                                                            <span className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{itin.nights || 0}N/{itin.days || 0}D</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                                                    {(itin.plans?.find((p:any) => p.planId === itin.selectedPlanId)?.totalPrice || itin.plans?.[0]?.totalPrice || 0) && <span className="font-sans text-xs font-bold" style={{ color: '#06a15c' }}>₹{Number((itin.plans?.find((p:any) => p.planId === itin.selectedPlanId)?.totalPrice || itin.plans?.[0]?.totalPrice || 0)).toLocaleString()}</span>}
                                                    <span className="px-2 py-0.5 rounded-full font-sans text-[9px] font-bold tracking-wider uppercase" style={{ background: `${statusColors[itin.status] || '#9ca3af'}15`, color: statusColors[itin.status] || '#9ca3af' }}>
                                                        {itin.status}
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                /* Default: show all team itineraries */
                                <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                                    <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(6,161,92,0.08)' }}>
                                        <h4 className="font-serif text-sm tracking-wider uppercase" style={{ color: '#06a15c' }}>
                                            All Team Itineraries ({teamItins.length})
                                        </h4>
                                    </div>
                                    {teamItins.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <Target className="w-12 h-12 mx-auto mb-3 opacity-15" />
                                            <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No team itineraries yet</p>
                                            <p className="font-sans text-xs mt-1" style={{ color: 'rgba(5,34,16,0.3)' }}>Select a team member to view their details, or itineraries will appear here as your team creates them</p>
                                        </div>
                                    ) : teamItins.slice(0, 20).map((itin: any) => {
                                        const creator = teamMembers.find((m: any) => m.uid === itin.createdBy)
                                        return (
                                            <Link key={itin.id} href={`/sales/itinerary/${itin.id}`} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors block" style={{ borderBottom: '1px solid rgba(5,34,16,0.04)' }}>
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(6,161,92,0.06)' }}>
                                                        <FileText className="w-3.5 h-3.5" style={{ color: '#06a15c' }} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{itin.customerName || "Unnamed"}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {creator && <span className="font-sans text-[10px] font-medium" style={{ color: '#8b5cf6' }}>{creator.name}</span>}
                                                            <span className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.3)' }}>·</span>
                                                            <span className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{itin.destination || "—"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                                                    {(itin.plans?.find((p:any) => p.planId === itin.selectedPlanId)?.totalPrice || itin.plans?.[0]?.totalPrice || 0) && <span className="font-sans text-xs font-bold" style={{ color: '#06a15c' }}>₹{Number((itin.plans?.find((p:any) => p.planId === itin.selectedPlanId)?.totalPrice || itin.plans?.[0]?.totalPrice || 0)).toLocaleString()}</span>}
                                                    <span className="px-2 py-0.5 rounded-full font-sans text-[9px] font-bold tracking-wider uppercase" style={{ background: `${statusColors[itin.status] || '#9ca3af'}15`, color: statusColors[itin.status] || '#9ca3af' }}>
                                                        {itin.status}
                                                    </span>
                                                </div>
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
