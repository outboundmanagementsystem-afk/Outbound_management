"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getUsers, getItineraries } from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import { Users, Package, TrendingUp, CheckCircle } from "lucide-react"

export default function PostOpsMyTeamPage() {
    return (
        <ProtectedRoute allowedRoles={["post_ops_lead", "admin"]}>
            <PostOpsTeamContent />
        </ProtectedRoute>
    )
}

function PostOpsTeamContent() {
    const { userProfile } = useAuth()
    const [members, setMembers] = useState<any[]>([])
    const [itineraries, setItineraries] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadData() }, [userProfile])
    const loadData = async () => {
        if (!userProfile) return
        try {
            const [users, itins] = await Promise.all([getUsers(), getItineraries()])
            // Filter to post_ops team members assigned to this lead
            const team = users.filter((u: any) =>
                u.role === "post_ops" && u.leadId === userProfile.uid
            )
            setMembers(team)
            setItineraries(itins.filter((i: any) => i.status === "post-ops" || i.status === "completed"))
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const totalPostOps = itineraries.filter(i => i.status === "post-ops").length
    const totalCompleted = itineraries.filter(i => i.status === "completed").length

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-serif text-3xl tracking-wide" style={{ color: '#052210' }}>My Team</h1>
                <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Post-Operations team performance</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                    { label: "Team Members", value: members.length, icon: Users, color: "#3b82f6" },
                    { label: "Active Post-Ops", value: totalPostOps, icon: Package, color: "#f59e0b" },
                    { label: "Completed", value: totalCompleted, icon: CheckCircle, color: "#06a15c" },
                    { label: "Completion Rate", value: totalPostOps + totalCompleted > 0 ? Math.round((totalCompleted / (totalPostOps + totalCompleted)) * 100) + "%" : "—", icon: TrendingUp, color: "#a78bfa" },
                ].map((s, i) => (
                    <div key={i} className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid rgba(5,34,16,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${s.color}15` }}>
                            <s.icon className="w-4 h-4" style={{ color: s.color }} />
                        </div>
                        <p className="font-sans text-[10px] tracking-wider uppercase font-semibold" style={{ color: 'rgba(5,34,16,0.5)' }}>{s.label}</p>
                        <p className="font-serif text-2xl font-bold mt-1" style={{ color: '#052210' }}>{loading ? "—" : s.value}</p>
                    </div>
                ))}
            </div>

            {/* Team Members */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(5,34,16,0.06)' }}>
                <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(5,34,16,0.04)' }}>
                    <h3 className="font-serif text-lg" style={{ color: '#052210' }}>Team Members</h3>
                </div>
                {loading ? (
                    <div className="px-6 py-8 text-center"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} /></div>
                ) : members.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Users className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(5,34,16,0.15)' }} />
                        <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No team members assigned</p>
                    </div>
                ) : members.map((m: any) => {
                    const memberItins = itineraries.filter((i: any) => i.assignedTo === m.uid || i.postOpsAssignedTo === m.uid)
                    return (
                        <div key={m.uid} className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(5,34,16,0.03)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center font-sans text-xs font-bold" style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c' }}>
                                    {(m.name || "?")[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{m.name}</p>
                                    <p className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{m.employeeCode}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-sans text-xs font-bold" style={{ color: '#f59e0b' }}>{memberItins.filter(i => i.status === "post-ops").length} active</span>
                                <span className="font-sans text-xs font-bold" style={{ color: '#06a15c' }}>{memberItins.filter(i => i.status === "completed").length} done</span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
