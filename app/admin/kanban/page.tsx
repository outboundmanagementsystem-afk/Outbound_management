"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getItineraries, updateItineraryStatus } from "@/lib/firestore"
import type { ItineraryStatus } from "@/lib/firestore"
import Link from "next/link"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { FileText, MapPin, DollarSign, Users } from "lucide-react"

const columns: { id: ItineraryStatus; label: string; color: string }[] = [
    { id: "draft", label: "Draft", color: "#9ca3af" },
    { id: "handover", label: "Handover", color: "#a78bfa" },
    { id: "post-ops", label: "Post Ops", color: "#f59e0b" },
    { id: "completed", label: "Completed", color: "#f472b6" },
]

export default function AdminKanbanPage() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <AdminKanbanBoard />
        </ProtectedRoute>
    )
}

function AdminKanbanBoard() {
    const [itineraries, setItineraries] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        const all = await getItineraries()
        setItineraries(all)
        setLoading(false)
    }

    const handleDragEnd = async (result: any) => {
        if (!result.destination) return
        const newStatus = result.destination.droppableId as ItineraryStatus
        const itinId = result.draggableId
        await updateItineraryStatus(itinId, newStatus)
        setItineraries(prev => prev.map(it => it.id === itinId ? { ...it, status: newStatus } : it))
    }

    const totalCount = itineraries.length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-wide" style={{ color: '#052210' }}>Pipeline</h1>
                    <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>All itineraries across all users</p>
                </div>
                <span className="font-sans text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c' }}>
                    {totalCount} Total
                </span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} />
                </div>
            ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '70vh' }}>
                        {columns.map(col => {
                            const colItems = itineraries.filter((it: any) => (it.status || "draft") === col.id)
                            return (
                                <Droppable droppableId={col.id} key={col.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className="flex-shrink-0 w-64 rounded-2xl flex flex-col"
                                            style={{
                                                background: snapshot.isDraggingOver ? '#f8faf9' : '#FFFFFF',
                                                border: `1px solid ${snapshot.isDraggingOver ? 'rgba(6,161,92,0.2)' : 'rgba(5,34,16,0.06)'}`,
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                                            }}
                                        >
                                            {/* Column header */}
                                            <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(5,34,16,0.04)' }}>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                                                    <span className="font-sans text-xs font-bold tracking-wider uppercase" style={{ color: col.color }}>{col.label}</span>
                                                </div>
                                                <span className="font-sans text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${col.color}15`, color: col.color }}>
                                                    {colItems.length}
                                                </span>
                                            </div>

                                            {/* Cards */}
                                            <div className="flex-1 p-3 space-y-2 min-h-[100px]">
                                                {colItems.map((itin: any, idx: number) => (
                                                    <Draggable isDragDisabled={true} key={itin.id} draggableId={itin.id} index={idx}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className="rounded-xl p-3.5 transition-all"
                                                                style={{
                                                                    ...provided.draggableProps.style,
                                                                    background: snapshot.isDragging ? '#f8faf9' : '#FFFFFF',
                                                                    border: `1px solid ${snapshot.isDragging ? 'rgba(6,161,92,0.3)' : 'rgba(5,34,16,0.08)'}`,
                                                                    boxShadow: snapshot.isDragging ? '0 10px 30px rgba(6,161,92,0.1)' : '0 2px 10px rgba(0,0,0,0.02)'
                                                                }}
                                                            >
                                                                <Link href={`/sales/itinerary/${itin.id}`}>
                                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                        <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{itin.customerName || "Unnamed"}</p>
                                                                        {itin.quoteId && <span className="font-sans text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase">{itin.quoteId}</span>}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(6,161,92,0.5)' }} />
                                                                        <span className="font-sans text-[11px] truncate" style={{ color: 'rgba(5,34,16,0.5)' }}>{itin.destination || "—"}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between mt-2">
                                                                        <span className="font-sans text-[11px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{itin.nights || 0}N/{itin.days || 0}D</span>
                                                                        {(itin.plans?.find((p:any) => p.planId === itin.selectedPlanId)?.totalPrice || itin.plans?.[0]?.totalPrice || 0) && <span className="font-sans text-xs font-bold" style={{ color: '#06a15c' }}>₹{Number((itin.plans?.find((p:any) => p.planId === itin.selectedPlanId)?.totalPrice || itin.plans?.[0]?.totalPrice || 0)).toLocaleString()}</span>}
                                                                    </div>
                                                                    {itin.createdByName && (
                                                                        <div className="flex items-center gap-1.5 mt-2 pt-2" style={{ borderTop: '1px solid rgba(5,34,16,0.04)' }}>
                                                                            <Users className="w-3 h-3" style={{ color: 'rgba(5,34,16,0.3)' }} />
                                                                            <span className="font-sans text-[10px] font-medium" style={{ color: 'rgba(5,34,16,0.4)' }}>{itin.createdByName}</span>
                                                                        </div>
                                                                    )}
                                                                </Link>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        </div>
                                    )}
                                </Droppable>
                            )
                        })}
                    </div>
                </DragDropContext>
            )}
        </div>
    )
}
