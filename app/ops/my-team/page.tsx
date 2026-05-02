"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getUsers, getItineraries } from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import {
    Users, FileText, TrendingUp, CheckCircle, DollarSign,
    ChevronRight, Target, BarChart3, Wrench, Clock
} from "lucide-react"

export default function OpsMyTeamPage() {
    return (
        <ProtectedRoute allowedRoles={["pre_ops_lead", "admin"]}>
            <OpsTeamContent />
        </ProtectedRoute>
    )
}

function OpsTeamContent() {
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
            const members = users.filter((u: any) => u.leadId === userProfile.uid)
            setTeamMembers(members)
            setAllItineraries(itins)
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const memberUids = teamMembers.map((m: any) => m.uid)
    // Ops team works on itineraries in handover/post-ops/completed statuses
    const teamItins = allItineraries.filter((i: any) =>
        memberUids.includes(i.assignedOps) || memberUids.includes(i.createdBy)
    )
    const teamTotal = teamItins.length
    const teamHandover = teamItins.filter((i: any) => i.status === "handover").length
    const teamPostOps = teamItins.filter((i: any) => i.status === "post-ops").length
    const teamCompleted = teamItins.filter((i: any) => i.status === "completed").length
    const completionRate = teamTotal > 0 ? Math.round((teamCompleted / teamTotal) * 100) : 0

    const getMemberStats = (uid: string) => {
        const memberItins = allItineraries.filter((i: any) => i.assignedOps === uid || i.createdBy === uid)
        const total = memberItins.length
        const handover = memberItins.filter((i: any) => i.status === "handover").length
        const postOps = memberItins.filter((i: any) => i.status === "post-ops").length
        const completed = memberItins.filter((i: any) => i.status === "completed").length
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0
        return { total, handover, postOps, completed, rate, itineraries: memberItins }
    }

    const selectedMemberData = selectedMember ? teamMembers.find((m: any) => m.uid === selectedMember) : null
    const selectedStats = selectedMember ? getMemberStats(selectedMember) : null

    const teamKpis = [
        { label: "Team Members", value: loading ? "—" : teamMembers.length, icon: Users, color: "#8b5cf6" },
        { label: "Total Assigned", value: loading ? "—" : teamTotal, icon: FileText, color: "#3b82f6" },
        { label: "In Handover", value: loading ? "—" : teamHandover, icon: Clock, color: "#f59e0b" },
        { label: "Post-Ops", value: loading ? "—" : teamPostOps, icon: Wrench, color: "#60a5fa" },
        { label: "Completed", value: loading ? "—" : `${teamCompleted} (${completionRate}%)`, icon: CheckCircle, color: "#34d399" },
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
                    Monitor your operations team&apos;s performance
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#3b82f6', borderTopColor: 'transparent' }} />
                </div>
            ) : (
                <>
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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-3">
                            <h3 className="font-serif text-sm tracking-wider uppercase px-1" style={{ color: '#3b82f6' }}>Team Members</h3>
                            {teamMembers.length === 0 ? (
                                <div className="rounded-2xl p-8 text-center" style={{ background: '#FFFFFF', border: '1px dashed rgba(5,34,16,0.15)' }}>
                                    <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No members assigned yet</p>
                                </div>
                            ) : teamMembers.map((member: any) => {
                                const stats = getMemberStats(member.uid)
                                const isSelected = selectedMember === member.uid
                                return (
                                    <button key={member.uid} onClick={() => setSelectedMember(isSelected ? null : member.uid)}
                                        className="w-full text-left rounded-2xl p-4 transition-all duration-200"
                                        style={{
                                            background: isSelected ? 'rgba(59,130,246,0.06)' : '#FFFFFF',
                                            border: `1px solid ${isSelected ? 'rgba(59,130,246,0.3)' : 'rgba(5,34,16,0.08)'}`,
                                        }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-sans text-sm font-bold" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                                                {member.name?.charAt(0)?.toUpperCase() || "?"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{member.name}</p>
                                                <p className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{member.employeeCode}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4" style={{ color: isSelected ? '#3b82f6' : 'rgba(5,34,16,0.2)' }} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(5,34,16,0.06)' }}>
                                            <div className="text-center">
                                                <p className="font-sans text-[9px] uppercase" style={{ color: 'rgba(5,34,16,0.4)' }}>Total</p>
                                                <p className="font-sans text-sm font-bold" style={{ color: '#052210' }}>{stats.total}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-sans text-[9px] uppercase" style={{ color: 'rgba(5,34,16,0.4)' }}>Done</p>
                                                <p className="font-sans text-sm font-bold" style={{ color: '#34d399' }}>{stats.completed}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-sans text-[9px] uppercase" style={{ color: 'rgba(5,34,16,0.4)' }}>Rate</p>
                                                <p className="font-sans text-sm font-bold" style={{ color: stats.rate >= 50 ? '#34d399' : '#f59e0b' }}>{stats.rate}%</p>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="lg:col-span-2">
                            {selectedMemberData && selectedStats ? (
                                <div className="space-y-5">
                                    <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)' }}>
                                        <div className="flex items-center gap-4 mb-5">
                                            <div className="w-14 h-14 rounded-full flex items-center justify-center font-serif text-xl font-bold" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                                                {selectedMemberData.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-serif text-xl" style={{ color: '#052210' }}>{selectedMemberData.name}</h3>
                                                <p className="font-sans text-xs" style={{ color: 'rgba(5,34,16,0.5)' }}>{selectedMemberData.email} · {selectedMemberData.employeeCode}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {[
                                                { label: "Total", value: selectedStats.total, color: "#3b82f6" },
                                                { label: "Handover", value: selectedStats.handover, color: "#a78bfa" },
                                                { label: "Post-Ops", value: selectedStats.postOps, color: "#f59e0b" },
                                                { label: "Completed", value: selectedStats.completed, color: "#34d399" },
                                            ].map(k => (
                                                <div key={k.label} className="rounded-xl p-3 text-center" style={{ background: `${k.color}08`, border: `1px solid ${k.color}15` }}>
                                                    <p className="font-sans text-[9px] uppercase" style={{ color: 'rgba(5,34,16,0.4)' }}>{k.label}</p>
                                                    <p className="font-sans text-lg font-bold mt-0.5" style={{ color: '#052210' }}>{k.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)' }}>
                                        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
                                            <h4 className="font-serif text-sm tracking-wider uppercase" style={{ color: '#3b82f6' }}>Itineraries ({selectedStats.total})</h4>
                                        </div>
                                        {selectedStats.itineraries.length === 0 ? (
                                            <div className="p-8 text-center"><p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No itineraries</p></div>
                                        ) : selectedStats.itineraries.slice(0, 15).map((itin: any) => (
                                            <div key={itin.id} className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(5,34,16,0.04)' }}>
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#3b82f6' }} />
                                                    <div className="min-w-0">
                                                        <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{itin.customerName || "Unnamed"}</p>
                                                        <p className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{itin.destination || "—"} · {itin.nights || 0}N/{itin.days || 0}D</p>
                                                    </div>
                                                </div>
                                                <span className="px-2 py-0.5 rounded-full font-sans text-[9px] font-bold uppercase" style={{ background: `${statusColors[itin.status] || '#9ca3af'}15`, color: statusColors[itin.status] || '#9ca3af' }}>{itin.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)' }}>
                                    <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
                                        <h4 className="font-serif text-sm tracking-wider uppercase" style={{ color: '#3b82f6' }}>All Team Itineraries ({teamItins.length})</h4>
                                    </div>
                                    {teamItins.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <Target className="w-12 h-12 mx-auto mb-3 opacity-15" />
                                            <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No team itineraries yet</p>
                                        </div>
                                    ) : teamItins.slice(0, 20).map((itin: any) => {
                                        const creator = teamMembers.find((m: any) => m.uid === itin.createdBy || m.uid === itin.assignedOps)
                                        return (
                                            <div key={itin.id} className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(5,34,16,0.04)' }}>
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#3b82f6' }} />
                                                    <div className="min-w-0">
                                                        <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{itin.customerName || "Unnamed"}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {creator && <span className="font-sans text-[10px] font-medium" style={{ color: '#8b5cf6' }}>{creator.name}</span>}
                                                            <span className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{itin.destination || "—"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="px-2 py-0.5 rounded-full font-sans text-[9px] font-bold uppercase" style={{ background: `${statusColors[itin.status] || '#9ca3af'}15`, color: statusColors[itin.status] || '#9ca3af' }}>{itin.status}</span>
                                            </div>
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
