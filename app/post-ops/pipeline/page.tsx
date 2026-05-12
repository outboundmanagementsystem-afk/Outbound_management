"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getItinerariesByStatus, updateItineraryStage, updateItineraryStatus } from "@/lib/firestore"
import Link from "next/link"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { MapPin, PlaneTakeoff, Navigation, PlaneLanding, CheckCircle } from "lucide-react"

type PostOpStage = "pre-arrival" | "on-tour" | "trip-ending" | "completed"

const columns: { id: PostOpStage; label: string; color: string; icon: any }[] = [
    { id: "pre-arrival", label: "Pre-Arrival", color: "#60a5fa", icon: PlaneTakeoff },
    { id: "on-tour", label: "On Tour", color: "#f59e0b", icon: Navigation },
    { id: "trip-ending", label: "Trip Ending", color: "#a78bfa", icon: PlaneLanding },
    { id: "completed", label: "Feedback & Closure", color: "#34d399", icon: CheckCircle },
]

const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date(0)
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
}

const getPostOpsStage = (booking: any) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (!booking.startDate || !booking.endDate) return "pre-arrival"

    const start = parseDate(booking.startDate)
    const end = parseDate(booking.endDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)

    // Already manually marked as feedback-closure — respect it
    if (booking.postOpsStatus === 'completed' || booking.status === 'completed' || booking.postOpsStatus === 'feedback-closure') return 'completed'

    // Trip ends today exactly
    if (today.getTime() === end.getTime()) return 'trip-ending'

    // Trip has already ended (past end date) — feedback & closure
    if (today > end) return 'completed'

    // Trip is currently active (started but not ended yet)
    if (today >= start && today < end) return 'on-tour'

    // Trip hasn't started yet
    if (today < start) return 'pre-arrival'

    return 'pre-arrival'
}

export default function PostOpsPipelinePage() {
    return (
        <ProtectedRoute allowedRoles={["post_ops", "admin"]}>
            <PostOpsPipeline />
        </ProtectedRoute>
    )
}

function PostOpsPipeline() {
    const [itineraries, setItineraries] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        try {
            const [preOps, postOps, completed] = await Promise.all([
                getItinerariesByStatus("pre-ops"),
                getItinerariesByStatus("post-ops"),
                getItinerariesByStatus("completed"),
            ])
            const allItins = [...preOps, ...postOps, ...completed]
            
            // Silent sync stages based on dates
            const syncedItins = await Promise.all(allItins.map(async (itin) => {
                const calculatedStage = getPostOpsStage(itin)
                // Use postOpStage or postOpsStatus to check for sync
                const currentStage = itin.postOpsStatus || itin.postOpStage || "pre-arrival"
                if (calculatedStage !== currentStage) {
                    const { updateItinerary } = await import("@/lib/firestore")
                    await updateItinerary(itin.id, { 
                        postOpsStatus: calculatedStage === "completed" ? "feedback-closure" : calculatedStage,
                        postOpStage: calculatedStage,
                        postOpsStatusUpdatedAt: new Date().toISOString()
                    })
                    return { ...itin, postOpsStatus: calculatedStage === "completed" ? "feedback-closure" : calculatedStage, postOpStage: calculatedStage }
                }
                return itin
            }))

            setItineraries(syncedItins)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleDragEnd = async (result: any) => {
        if (!result.destination) return

        const newStage = result.destination.droppableId as PostOpStage
        const itinId = result.draggableId
        const itinerary = itineraries.find(it => it.id === itinId)

        if (!itinerary) return

        // If moving TO completed
        if (newStage === "completed") {
            await updateItineraryStatus(itinId, "completed")
            const { updateItinerary } = await import("@/lib/firestore")
            await updateItinerary(itinId, { 
                postOpsStatus: "feedback-closure",
                postOpStage: "completed",
                postOpsStatusUpdatedAt: new Date().toISOString()
            })
            setItineraries(prev => prev.map(it => it.id === itinId ? { ...it, status: "completed", postOpsStatus: "feedback-closure", postOpStage: "completed" } : it))
        }
        // If moving TO post-ops active stages (pre-arrival, on-tour, trip-ending)
        // Only allow manual move IF the date logic would otherwise put it there, or if we want to allow manual overrides.
        // The user says "only manually movable by the post-ops team" for Feedback & Closure.
        // For other stages, they want it automatic.
        else {
            if (itinerary.status !== "post-ops") {
                await updateItineraryStatus(itinId, "post-ops")
            }
            await updateItineraryStage(itinId, newStage)
            const { updateItinerary } = await import("@/lib/firestore")
            await updateItinerary(itinId, { 
                postOpsStatus: newStage === "completed" ? "feedback-closure" : newStage,
                postOpStage: newStage,
                postOpsStatusUpdatedAt: new Date().toISOString()
            })
            setItineraries(prev => prev.map(it => it.id === itinId ? { ...it, status: "post-ops", postOpsStatus: newStage === "completed" ? "feedback-closure" : newStage, postOpStage: newStage } : it))
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-serif text-2xl sm:text-3xl tracking-wide" style={{ color: '#052210' }}>Post Operation Pipeline</h1>
                <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Manage client status during their trip</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} />
                </div>
            ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '70vh' }}>
                        {columns.map(col => {
                            const colItems = itineraries.filter((it: any) => {
                                return getPostOpsStage(it) === col.id
                            })
                            const Icon = col.icon

                            return (
                                <Droppable droppableId={col.id} key={col.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className="flex-shrink-0 w-72 rounded-2xl flex flex-col"
                                            style={{
                                                background: snapshot.isDraggingOver ? '#f8faf9' : '#FFFFFF',
                                                border: `1px solid ${snapshot.isDraggingOver ? 'rgba(6,161,92,0.2)' : 'rgba(5,34,16,0.06)'}`,
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                                            }}
                                        >
                                            {/* Column header */}
                                            <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(5,34,16,0.04)' }}>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: `${col.color}15` }}>
                                                        <Icon className="w-3.5 h-3.5" style={{ color: col.color }} />
                                                    </div>
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
                                                                <Link href={`/post-ops/booking/${itin.id}`}>
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
                                                                        <span className="font-sans text-[10px] uppercase tracking-wider font-semibold" style={{ color: col.color }}>{itin.startDate}</span>
                                                                    </div>
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
