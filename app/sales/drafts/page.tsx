"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getDrafts, deleteDraft } from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { FileText, Trash2, MapPin, Calendar, Clock } from "lucide-react"

export default function DraftsPage() {
    return (
        <ProtectedRoute allowedRoles={["sales", "sales_lead", "admin"]}>
            <DraftsContent />
        </ProtectedRoute>
    )
}

function DraftsContent() {
    const { userProfile } = useAuth()
    const [drafts, setDrafts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { if (userProfile) loadDrafts() }, [userProfile])
    const loadDrafts = async () => {
        try { setDrafts(await getDrafts(userProfile!.uid)) } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this draft?")) return
        try { await deleteDraft(id); loadDrafts() } catch (e) { console.error(e) }
    }

    const timeAgo = (dateStr: string) => {
        const d = new Date(dateStr)
        const now = new Date()
        const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
        if (diff < 1) return "Just now"
        if (diff < 60) return `${diff}m ago`
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
        return `${Math.floor(diff / 1440)}d ago`
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="font-serif text-3xl tracking-wide" style={{ color: '#052210' }}>Your Drafts</h1>
                <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Resume where you left off</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} /></div>
            ) : drafts.length === 0 ? (
                <div className="text-center py-20 rounded-2xl" style={{ background: '#fff', border: '1px solid rgba(5,34,16,0.06)' }}>
                    <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(5,34,16,0.1)' }} />
                    <h3 className="font-serif text-lg mb-1" style={{ color: '#052210' }}>No drafts yet</h3>
                    <p className="font-sans text-xs" style={{ color: 'rgba(5,34,16,0.4)' }}>When you start creating an itinerary and leave midway, it'll be saved here automatically</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {drafts.map(d => (
                        <div key={d.id} className="rounded-2xl p-5 flex items-center justify-between group transition-all hover:-translate-y-0.5" style={{ background: '#fff', border: '1px solid rgba(5,34,16,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,161,92,0.08)' }}>
                                    <FileText className="w-4 h-4" style={{ color: '#06a15c' }} />
                                </div>
                                <div>
                                    <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{d.customerName || "Untitled Draft"}</p>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        {d.destination && <span className="font-sans text-[11px] flex items-center gap-1" style={{ color: 'rgba(5,34,16,0.4)' }}><MapPin className="w-3 h-3" />{d.destination}</span>}
                                        {d.nights && <span className="font-sans text-[11px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{d.nights}N/{d.days || 0}D</span>}
                                        <span className="font-sans text-[11px] flex items-center gap-1" style={{ color: 'rgba(5,34,16,0.3)' }}><Clock className="w-3 h-3" />{timeAgo(d.updatedAt)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link href={`/sales/itinerary-generator/manual?draft=${d.id}`} className="px-4 py-2 rounded-xl font-sans text-[10px] font-bold tracking-wider uppercase" style={{ background: '#052210', color: '#fff' }}>
                                    Resume
                                </Link>
                                <button onClick={() => handleDelete(d.id)} className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50" style={{ border: '1px solid rgba(239,68,68,0.1)' }}>
                                    <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
