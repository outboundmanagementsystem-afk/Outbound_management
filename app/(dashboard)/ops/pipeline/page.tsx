"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getItinerariesByStatus, updateItineraryStatus, getSopChecklist } from "@/lib/firestore"
import type { ItineraryStatus } from "@/lib/firestore"
import Link from "next/link"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { MapPin, FileText, Package, ClipboardCheck, CheckCircle2 } from "lucide-react"
import { StatusDialog } from "@/components/ui/StatusDialog"

const columns: { id: ItineraryStatus; label: string; color: string; icon: any }[] = [
    { id: "handover", label: "Handover Received", color: "#a78bfa", icon: FileText },
    { id: "pre-ops", label: "Pre-Ops Processing", color: "#2563eb", icon: Package },
    { id: "post-ops", label: "Handed to Post-Ops", color: "#10b981", icon: ClipboardCheck },
]

export default function PreOpsPipelinePage() {
    return (
        <ProtectedRoute allowedRoles={["pre_ops", "pre_ops_lead", "admin"]}>
            <PreOpsPipeline />
        </ProtectedRoute>
    )
}

function PreOpsPipeline() {
    const [itineraries, setItineraries] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false)
    const [dialogType, setDialogType] = useState<"success" | "error" | "warning">("success")
    const [dialogTitle, setDialogTitle] = useState("")
    const [dialogMessage, setDialogMessage] = useState("")

    const showStatus = (type: "success" | "error" | "warning", title: string, message: string) => {
        setDialogType(type)
        setDialogTitle(title)
        setDialogMessage(message)
        setDialogOpen(true)
    }

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        try {
            const [handover, preOps, postOps] = await Promise.all([
                getItinerariesByStatus("handover"),
                getItinerariesByStatus("pre-ops"),
                getItinerariesByStatus("post-ops"),
            ])
            setItineraries([...handover, ...preOps, ...postOps])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleDragEnd = async (result: any) => {
        if (!result.destination) return
        const newStatus = result.destination.droppableId as ItineraryStatus
        const itinId = result.draggableId
        const itinerary = itineraries.find(it => it.id === itinId)
        if (!itinerary || itinerary.status === newStatus) return

        // Gate: if moving to post-ops, check all SOP tasks are done
        if (newStatus === "post-ops") {
            try {
                const checklist = await getSopChecklist(itinId)
                if (checklist.length > 0) {
                    const allChecked = checklist.every((c: any) => c.checked)
                    if (!allChecked) {
                        showStatus("warning", "SOP Incomplete", "Please complete all Pre-Ops SOP tasks in the booking view before handing over to Post-Ops.")
                        return
                    }
                }
            } catch (e) { console.error(e) }
        }

        await updateItineraryStatus(itinId, newStatus)
        setItineraries(prev => prev.map(it => it.id === itinId ? { ...it, status: newStatus } : it))
    }

    const filteredItins = itineraries.filter(it => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (it.customerName || "").toLowerCase().includes(q)
            || (it.quoteId || "").toLowerCase().includes(q)
            || (it.customerPhone || "").includes(q)
            || (it.destination || "").toLowerCase().includes(q)
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="font-serif text-2xl sm:text-3xl tracking-wide" style={{ color: '#052210' }}>Pre-Operation Pipeline</h1>
                    <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Track bookings through pre-operation processing</p>
                </div>
                <div className="relative w-full sm:w-auto">
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2.5 rounded-xl font-sans text-sm w-full sm:w-64"
                        placeholder="Search name, phone, destination..."
                        style={{ border: '1px solid rgba(5,34,16,0.08)', outline: 'none', background: '#fff' }}
                    />
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(5,34,16,0.3)' }} />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} />
                </div>
            ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '70vh' }}>
                        {columns.map(col => {
                            const colItems = filteredItins.filter((it: any) => (it.status || "handover") === col.id)
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
                                                                <Link href={`/ops/booking/${itin.id}`}>
                                                                    <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{itin.customerName || "Unnamed"}</p>
                                                                    {itin.quoteId && <p className="font-sans text-[9px] font-bold tracking-wider mt-0.5" style={{ color: '#06a15c' }}>{itin.quoteId}</p>}
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(6,161,92,0.5)' }} />
                                                                        <span className="font-sans text-[11px] truncate" style={{ color: 'rgba(5,34,16,0.5)' }}>{itin.destination || "—"}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between mt-2">
                                                                        <span className="font-sans text-[11px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{itin.nights || 0}N/{itin.days || 0}D</span>
                                                                        {itin.startDate && <span className="font-sans text-[10px] uppercase tracking-wider font-semibold" style={{ color: col.color }}>{itin.startDate}</span>}
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

            <StatusDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                type={dialogType}
                title={dialogTitle}
                message={dialogMessage}
            />
        </div>
    )
}
