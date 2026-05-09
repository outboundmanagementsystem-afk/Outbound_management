"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getSOPs, createSOP, updateSOP, deleteSOP } from "@/lib/firestore"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { GripHorizontal, GripVertical, Plus, Trash2, Edit3, X, Save, MessageSquare, ClipboardList, ChevronDown, FileUp, CheckSquare, Type, Calendar, Link2, List, Star, FileText } from "lucide-react"
import { StatusDialog } from "@/components/ui/StatusDialog"

const departments = [
    { id: "sales", label: "Sales", color: "#06a15c" },
    { id: "pre_ops", label: "Pre-Operations", color: "#3b82f6" },
    { id: "post_ops", label: "Post-Operations", color: "#f59e0b" },
]

const stepTypes = [
    { id: "checkbox", label: "Checkbox Check", icon: CheckSquare },
    { id: "file_upload", label: "File Upload", icon: FileUp },
    { id: "text_input", label: "Text Input", icon: Type },
    { id: "file_or_text", label: "Upload or Enter Text", icon: FileText },
    { id: "date_picker", label: "Date Picker", icon: Calendar },
    { id: "multiple_choice", label: "Multiple Choice", icon: List },
    { id: "multiple_select", label: "Multiple Select", icon: List },
    { id: "rating_5", label: "1-5 Star Rating", icon: Star },
    { id: "rating_10", label: "1-10 Star Rating", icon: Star },
]

interface SOPItem {
    id: string
    title: string
    type: string
    isRequired: boolean
    dependsOn?: string
    notes?: string
    points?: string[]
    extraInfo?: string
    requiresAcknowledgement?: boolean
    options?: string[]
}

const newItem = (): SOPItem => ({
    id: crypto.randomUUID(),
    title: "",
    type: "checkbox",
    isRequired: true,
    dependsOn: "",
    notes: "",
    points: [],
    extraInfo: "",
    requiresAcknowledgement: false,
})

const typeLabel = (t: string) => stepTypes.find(s => s.id === t)?.label || t.replace(/_/g, ' ').toUpperCase()

export default function SOPsPage() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <SOPsContent />
        </ProtectedRoute>
    )
}

function SOPsContent() {
    const [sops, setSOPs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeDept, setActiveDept] = useState("sales")
    const [showModal, setShowModal] = useState(false)
    const [editSOP, setEditSOP] = useState<any>(null)
    const [formTitle, setFormTitle] = useState("")
    const [formItems, setFormItems] = useState<SOPItem[]>([newItem()])
    const [formWhatsapp, setFormWhatsapp] = useState("")
    const [isMounted, setIsMounted] = useState(false)
    const [editingItemId, setEditingItemId] = useState<string | null>(null)
    const [stepEditForm, setStepEditForm] = useState<SOPItem | null>(null)
    const [newPoint, setNewPoint] = useState("")
    
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

    useEffect(() => { setIsMounted(true) }, [])

    useEffect(() => { loadSOPs() }, [])
    const loadSOPs = async () => {
        try { setSOPs(await getSOPs()) } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const filtered = sops.filter(s => s.department === activeDept)

    const openNew = () => {
        setEditSOP(null)
        setFormTitle("")
        setFormItems([newItem()])
        setFormWhatsapp("")
        setShowModal(true)
    }

    const openEdit = (sop: any) => {
        setEditSOP(sop)
        setFormTitle(sop.title || "")
        setFormWhatsapp(sop.whatsappTemplate || "")
        // Convert items — handle both old string format and new object format
        const items = (sop.items || []).map((i: any) => {
            if (typeof i === 'string') return { ...newItem(), title: i }
            return {
                id: i.id || crypto.randomUUID(),
                title: i.title || '',
                type: i.type || 'checkbox',
                isRequired: i.isRequired !== false,
                requiresAcknowledgement: i.requiresAcknowledgement || false,
                dependsOn: i.dependsOn || '',
                notes: i.notes || '',
                points: i.points || [],
                extraInfo: i.extraInfo || '',
                options: i.options || [],
            }
        })
        setFormItems(items.length ? items : [newItem()])
        setShowModal(true)
    }

    
    const onDragEnd = (result: any) => {
        if (!result.destination) return;
        const newItems = Array.from(formItems);
        const [movedItem] = newItems.splice(result.source.index, 1);
        newItems.splice(result.destination.index, 0, movedItem);
        setFormItems(newItems);
    }
    
    const addFormItem = () => setFormItems(f => [...f, newItem()])
    const updateFormItem = (idx: number, updates: Partial<SOPItem>) =>
        setFormItems(f => f.map((item, j) => j === idx ? { ...item, ...updates } : item))
    const removeFormItem = (idx: number) =>
        setFormItems(f => f.length > 1 ? f.filter((_, j) => j !== idx) : f)

    
    const onListDragEnd = async (result: any) => {
        if (!result.destination) return;
        
        const [sopId] = result.source.droppableId.split('||');
        const sopIndex = sops.findIndex(s => s.id === sopId);
        if (sopIndex === -1) return;
        
        const sop = sops[sopIndex];
        const newItems = Array.from(sop.items || []);
        const [movedItem] = newItems.splice(result.source.index, 1);
        newItems.splice(result.destination.index, 0, movedItem);
        
        const newSops = [...sops];
        newSops[sopIndex] = { ...sop, items: newItems };
        setSOPs(newSops);
        
        try {
            await updateSOP(sop.id, { items: newItems });
        } catch (e) {
            console.error(e);
        }
    }
    
    const handleSave = async () => {
        if (!formTitle.trim()) {
            showStatus("error", "Title Required", "Please enter a title for this SOP Template")
            return
        }

        const items = formItems.filter(i => i.title.trim()).map(i => ({
            id: i.id,
            title: i.title.trim(),
            type: i.type,
            isRequired: i.isRequired,
            requiresAcknowledgement: i.requiresAcknowledgement || false,
            ...(i.dependsOn ? { dependsOn: i.dependsOn } : {}),
            notes: i.notes || '',
            points: i.points || [],
            extraInfo: i.extraInfo || '',
            ...(i.options ? { options: i.options } : {}),
        }))

        if (items.length === 0) {
            showStatus("error", "Steps Required", "Please add at least one process step with a title")
            return
        }

        try {
            if (editSOP) {
                await updateSOP(editSOP.id, { title: formTitle, items, whatsappTemplate: formWhatsapp })
                showStatus("success", "Updated", "SOP Template updated successfully")
            } else {
                await createSOP({ title: formTitle, department: activeDept, items, whatsappTemplate: formWhatsapp })
                showStatus("success", "Created", "New SOP Template created successfully")
            }
            setShowModal(false)
            loadSOPs()
        } catch (e) { 
            console.error(e)
            showStatus("error", "Error", "Failed to save SOP template")
        }
    }

    const handleDelete = async (id: string) => {
        showStatus("warning", "Confirm Delete", "Are you sure you want to delete this SOP? This cannot be undone.")
        if (!confirm("Delete this SOP?")) return
        try { 
            await deleteSOP(id); 
            loadSOPs() 
            showStatus("success", "Deleted", "SOP Template deleted successfully")
        } catch (e) { 
            console.error(e)
            showStatus("error", "Error", "Failed to delete SOP template")
        }
    }

    const startEditingItem = (sopId: string, item: SOPItem) => {
        setEditingItemId(`${sopId}-${item.id}`)
        setStepEditForm({ ...item })
    }

    const saveStepInline = async (sopId: string) => {
        if (!stepEditForm) return
        const sop = sops.find(s => s.id === sopId)
        if (!sop) return

        const newItems = (sop.items || []).map((i: any) => i.id === stepEditForm.id ? stepEditForm : i)
        
        try {
            await updateSOP(sopId, { items: newItems })
            const newSops = [...sops]
            const idx = newSops.findIndex(s => s.id === sopId)
            newSops[idx] = { ...sop, items: newItems }
            setSOPs(newSops)
            setEditingItemId(null)
            setStepEditForm(null)
            showStatus("success", "Saved", "Step changes saved successfully")
        } catch (e) { 
            console.error(e)
            showStatus("error", "Error", "Failed to save step")
        }
    }

    const deleteStepInline = async (sopId: string, itemId: string) => {
        if (!confirm("Delete this step?")) return
        const sop = sops.find(s => s.id === sopId)
        if (!sop) return

        const newItems = (sop.items || []).filter((i: any) => i.id !== itemId)
        
        try {
            await updateSOP(sopId, { items: newItems })
            const newSops = [...sops]
            const idx = newSops.findIndex(s => s.id === sopId)
            newSops[idx] = { ...sop, items: newItems }
            setSOPs(newSops)
            showStatus("success", "Deleted", "Step removed successfully")
        } catch (e) { 
            console.error(e)
            showStatus("error", "Error", "Failed to remove step")
        }
    }

    const addNewStepInline = async (sopId: string) => {
        const sop = sops.find(s => s.id === sopId)
        if (!sop) return

        const newItemId = Math.random().toString(36).substring(7)
        const newItem: SOPItem = {
            id: newItemId,
            title: "",
            type: "checkbox",
            isRequired: true,
            notes: "",
            points: [],
            dependsOn: ""
        }

        const newItems = [...(sop.items || []), newItem]
        
        try {
            await updateSOP(sopId, { items: newItems })
            const newSops = [...sops]
            const idx = newSops.findIndex(s => s.id === sopId)
            newSops[idx] = { ...sop, items: newItems }
            setSOPs(newSops)
            setEditingItemId(`${sopId}-${newItemId}`)
            setStepEditForm(newItem)
        } catch (e) { 
            console.error(e)
            showStatus("error", "Error", "Failed to add new step")
        }
    }

    const deptColor = departments.find(d => d.id === activeDept)?.color || "#06a15c"

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="font-serif text-3xl tracking-wide" style={{ color: '#052210' }}>SOP Templates</h1>
                    <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Create advanced checklists for each department</p>
                </div>
                <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-sans text-xs font-bold tracking-wider uppercase transition-all hover:scale-105" style={{ background: '#052210', color: '#fff' }}>
                    <Plus className="w-3.5 h-3.5" /> New SOP
                </button>
            </div>

            {/* Department Tabs */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(5,34,16,0.1)' }}>
                {departments.map(d => (
                    <button key={d.id} onClick={() => setActiveDept(d.id)}
                        className="flex-1 px-4 py-3 font-sans text-xs tracking-wider uppercase font-semibold transition-all"
                        style={{ background: activeDept === d.id ? d.color : 'transparent', color: activeDept === d.id ? '#fff' : 'rgba(5,34,16,0.5)' }}>
                        {d.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: deptColor, borderTopColor: 'transparent' }} /></div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.06)' }}>
                    <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(5,34,16,0.15)' }} />
                    <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No SOPs for this department yet</p>
                </div>
            ) : (
                isMounted ? (
                <DragDropContext onDragEnd={onListDragEnd}>
                <div className="space-y-4">
                    {filtered.map((sop: any) => (
                        <div key={sop.id} className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                                <div>
                                    <h3 className="text-2xl font-bold text-[#052210]">{sop.title}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                            {sop.items?.length || 0} {sop.items?.length === 1 ? 'CHECKLIST ITEM' : 'CHECKLIST ITEMS'}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(sop.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                            <Droppable droppableId={`${sop.id}||items`}>
                                {(provided) => (
                            <div className="space-y-2" ref={provided.innerRef} {...provided.droppableProps}>
                                {(sop.items || []).map((item: any, idx: number) => {
                                    const isObj = typeof item === 'object' && item !== null
                                    const title = isObj ? (item.title || '') : String(item)
                                    const type = isObj ? (item.type || 'checkbox') : 'checkbox'
                                    const isRequired = isObj ? item.isRequired !== false : true
                                    const dependsOn = isObj ? (item.dependsOn || '') : ''

                                    const isEditing = editingItemId === `${sop.id}-${item.id || idx}`

                                    if (isEditing && stepEditForm) {
                                        return (
                                            <div key={`${sop.id}-${item.id || idx}`} className="p-8 rounded-[32px] border border-emerald-100 bg-white shadow-xl space-y-6 my-4">
                                                {/* Edit Header */}
                                                <div className="flex items-center gap-4">
                                                    <input 
                                                        value={stepEditForm.title}
                                                        onChange={e => setStepEditForm({...stepEditForm, title: e.target.value})}
                                                        className="flex-1 px-5 py-3.5 rounded-2xl border border-gray-100 text-lg font-bold focus:outline-none focus:border-emerald-500"
                                                        placeholder="Step Title"
                                                    />
                                                    <div className="relative w-64">
                                                        <select 
                                                            value={stepEditForm.type}
                                                            onChange={e => setStepEditForm({...stepEditForm, type: e.target.value})}
                                                            className="w-full pl-5 pr-10 py-3.5 rounded-2xl border border-gray-100 text-sm font-medium appearance-none focus:outline-none focus:border-emerald-500 bg-white"
                                                        >
                                                            {stepTypes.map(t => (
                                                                <option key={t.id} value={t.id}>{t.label}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                    </div>
                                                    <button onClick={() => deleteStepInline(sop.id, item.id)} className="p-3 text-gray-300 hover:text-red-500 transition-colors">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                {/* Dependency */}
                                                <div>
                                                    <select 
                                                        value={stepEditForm.dependsOn || ""}
                                                        onChange={e => setStepEditForm({...stepEditForm, dependsOn: e.target.value})}
                                                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-100 text-sm font-medium focus:outline-none focus:border-emerald-500 bg-gray-50/50 text-gray-500 appearance-none"
                                                    >
                                                        <option value="">No dependency</option>
                                                        {sop.items.filter((i: any) => i.id !== item.id).map((i: any) => (
                                                            <option key={i.id} value={i.id}>{i.title}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Notes */}
                                                <div>
                                                    <textarea 
                                                        value={stepEditForm.notes || ""}
                                                        onChange={e => setStepEditForm({...stepEditForm, notes: e.target.value})}
                                                        className="w-full px-5 py-3.5 rounded-2xl border border-gray-100 text-sm focus:outline-none focus:border-emerald-500 min-h-[60px]"
                                                        placeholder="Notes / Instructions"
                                                    />
                                                </div>

                                                {/* Sub-tasks */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Key Points / Sub-tasks</h4>
                                                        <button 
                                                            onClick={() => {
                                                                if (newPoint.trim()) {
                                                                    setStepEditForm({...stepEditForm, points: [...(stepEditForm.points || []), newPoint.trim()]})
                                                                    setNewPoint("")
                                                                }
                                                            }}
                                                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:opacity-70 transition-all"
                                                        >
                                                            <Plus className="w-3 h-3" /> Add Point
                                                        </button>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <input 
                                                            value={newPoint}
                                                            onChange={e => setNewPoint(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === "Enter" && newPoint.trim()) {
                                                                    e.preventDefault()
                                                                    setStepEditForm({...stepEditForm, points: [...(stepEditForm.points || []), newPoint.trim()]})
                                                                    setNewPoint("")
                                                                }
                                                            }}
                                                            className="w-full px-5 py-3.5 rounded-2xl border border-gray-100 text-sm italic focus:outline-none focus:border-emerald-500 bg-gray-50/50"
                                                            placeholder="Extra configuration or metadata (Optional)"
                                                        />
                                                        <div className="space-y-2">
                                                            {(stepEditForm.points || []).map((p, i) => (
                                                                <div key={i} className="flex items-center gap-3 px-5 py-3 rounded-xl border border-gray-50 bg-white group/point">
                                                                    <span className="flex-1 text-sm font-medium text-gray-600">{p}</span>
                                                                    <button onClick={() => setStepEditForm({...stepEditForm, points: (stepEditForm.points || []).filter((_, k) => k !== i)})} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover/point:opacity-100">
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Acknowledgement Toggle */}
                                                <div className="p-5 rounded-2xl border border-gray-100 flex items-center justify-between bg-gray-50/30">
                                                    <div>
                                                        <p className="text-sm font-bold text-[#052210]">Require Acknowledgement</p>
                                                        <p className="text-[11px] text-gray-400 mt-0.5">User must explicitly tick "Yes, I have done this"</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => setStepEditForm({...stepEditForm, requiresAcknowledgement: !stepEditForm.requiresAcknowledgement})}
                                                        className={`w-12 h-6 rounded-full relative transition-all ${stepEditForm.requiresAcknowledgement ? 'bg-emerald-600' : 'bg-gray-200'}`}
                                                    >
                                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${stepEditForm.requiresAcknowledgement ? 'left-7' : 'left-1'}`} />
                                                    </button>
                                                </div>

                                                {/* Options (for choice types) */}
                                                {(stepEditForm.type === 'multiple_choice' || stepEditForm.type === 'multiple_select') && (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Options</h4>
                                                            <button 
                                                                onClick={() => setStepEditForm({...stepEditForm, options: [...(stepEditForm.options || []), ""]})}
                                                                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:opacity-70 transition-all"
                                                            >
                                                                <Plus className="w-3 h-3" /> Add Option
                                                            </button>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {(stepEditForm.options || []).map((o, i) => (
                                                                <div key={i} className="flex gap-2 items-center">
                                                                    <input 
                                                                        value={o}
                                                                        onChange={e => {
                                                                            const newOpts = [...(stepEditForm.options || [])]
                                                                            newOpts[i] = e.target.value
                                                                            setStepEditForm({...stepEditForm, options: newOpts})
                                                                        }}
                                                                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-100 text-xs focus:outline-none focus:border-emerald-500"
                                                                        placeholder={`Option ${i + 1}`}
                                                                    />
                                                                    <button onClick={() => setStepEditForm({...stepEditForm, options: (stepEditForm.options || []).filter((_, k) => k !== i)})} className="text-gray-300 hover:text-red-500">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Footer */}
                                                <div className="flex items-center justify-between pt-4">
                                                    <div className="flex gap-0.5 p-1 rounded-xl bg-gray-100 w-fit">
                                                        <button 
                                                            onClick={() => setStepEditForm({...stepEditForm, isRequired: true})}
                                                            className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${stepEditForm.isRequired ? 'bg-[#052210] text-white' : 'text-gray-400'}`}
                                                        >Mandatory</button>
                                                        <button 
                                                            onClick={() => setStepEditForm({...stepEditForm, isRequired: false})}
                                                            className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${!stepEditForm.isRequired ? 'bg-[#052210] text-white' : 'text-gray-400'}`}
                                                        >Optional</button>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <button 
                                                            onClick={() => saveStepInline(sop.id)}
                                                            className="px-10 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-bold uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-emerald-100"
                                                        >Save</button>
                                                        <button onClick={() => setEditingItemId(null)} className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Cancel</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }

                                    return (
                                        <Draggable key={`${sop.id}-${item.id || idx}`} draggableId={`${sop.id}||${item.id || idx}`} index={idx}>
                                            {(provided) => (
                                        <div 
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className="flex items-center gap-3 py-4 px-6 rounded-2xl transition-all group" 
                                            style={{ background: 'rgba(5,34,16,0.02)', ...provided.draggableProps.style }}>
                                            <div {...provided.dragHandleProps} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
                                                <GripVertical className="w-5 h-5" />
                                            </div>
                                            <div className="w-5 h-5 rounded-lg border-2 flex-shrink-0" style={{ borderColor: 'rgba(5,34,16,0.1)' }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-sans text-base font-bold" style={{ color: '#052210' }}>{title}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-sans text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-white text-gray-400 border border-gray-100">
                                                            {typeLabel(type)}
                                                        </span>
                                                        {!isRequired && (
                                                            <span className="font-sans text-[9px] font-bold tracking-wider uppercase text-orange-400">Optional</span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {(item.notes || (item.points && item.points.length > 0)) && (
                                                    <div className="mt-3 space-y-2 border-l-2 border-gray-100 pl-4 italic">
                                                        {item.notes && <p className="font-sans text-xs" style={{ color: 'rgba(5,34,16,0.5)' }}>{item.notes}</p>}
                                                        {item.points && item.points.length > 0 && (
                                                            <div className="space-y-1">
                                                                {item.points.map((p: string, k: number) => (
                                                                    <div key={k} className="flex items-center gap-2 text-[11px]" style={{ color: 'rgba(5,34,16,0.5)' }}>
                                                                        <div className="w-1 h-1 rounded-full bg-gray-300" />
                                                                        <span>{p}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Step Actions */}
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => startEditingItem(sop.id, item)}
                                                    className="p-2 rounded-lg border border-gray-100 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => deleteStepInline(sop.id, item.id)}
                                                    className="p-2 rounded-lg border border-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        )}
                                        </Draggable>
                                    )
                                })}
                                {provided.placeholder}
                                
                                {/* Add Step Button */}
                                <button 
                                    onClick={() => addNewStepInline(sop.id)}
                                    className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-100 text-gray-400 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all flex items-center justify-center gap-2 mt-4 group"
                                >
                                    <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-bold uppercase tracking-wider">Add Process Step</span>
                                </button>
                            </div>
                            )}
                            </Droppable>
                            {sop.whatsappTemplate && (
                                <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(37,211,102,0.05)', border: '1px solid rgba(37,211,102,0.15)' }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <MessageSquare className="w-3 h-3" style={{ color: '#25D366' }} />
                                        <span className="font-sans text-[9px] font-bold tracking-wider uppercase" style={{ color: '#25D366' }}>WhatsApp Template</span>
                                    </div>
                                    <p className="font-sans text-xs whitespace-pre-wrap" style={{ color: 'rgba(5,34,16,0.6)' }}>{sop.whatsappTemplate}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                </DragDropContext>
                ) : null
            )}

            {/* Advanced Builder Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6" style={{ background: '#FFFFFF' }}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(5,34,16,0.06)' }}>
                                    <ClipboardList className="w-5 h-5" style={{ color: '#052210' }} />
                                </div>
                                <div>
                                    <h2 className="font-serif text-xl" style={{ color: '#052210' }}>{editSOP ? "Edit SOP" : "Create SOP"}</h2>
                                    <p className="font-sans text-[10px] tracking-wider uppercase" style={{ color: 'rgba(5,34,16,0.4)' }}>Advanced Builder</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-50"><X className="w-4 h-4" /></button>
                        </div>

                        {/* SOP Title */}
                        <div className="mb-6">
                            <label className="font-sans text-[10px] font-bold tracking-wider uppercase block mb-1.5" style={{ color: 'rgba(5,34,16,0.5)' }}>SOP Template Title</label>
                            <input value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl font-sans text-sm" placeholder="e.g. Sales Handover Checklist" style={{ border: '1px solid rgba(5,34,16,0.1)', outline: 'none' }} />
                        </div>

                        {/* Process Steps */}
                        <div className="mb-6">
                            <label className="font-sans text-[10px] font-bold tracking-wider uppercase block mb-3" style={{ color: 'rgba(5,34,16,0.5)' }}>Process Steps</label>
                            
                            {isMounted ? (
                                <DragDropContext onDragEnd={onDragEnd}>
                                    <Droppable droppableId="modal-process-steps">
                                        {(provided) => (
                                            <div className="space-y-3" {...provided.droppableProps} ref={provided.innerRef}>
                                                {formItems.map((item, idx) => (
                                                    <Draggable key={item.id} draggableId={item.id} index={idx}>
                                                        {(provided) => (
                                                            <div 
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                className="rounded-xl p-4 relative" 
                                                                style={{ 
                                                                    ...provided.draggableProps.style,
                                                                    border: '1px solid rgba(5,34,16,0.08)', 
                                                                    background: 'rgba(5,34,16,0.01)' 
                                                                }}
                                                            >
                                                                {/* Step title + type row */}
                                                                <div className="flex gap-2 mb-3">
                                                                    <div {...provided.dragHandleProps} className="flex items-center justify-center p-1 -ml-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
                                                                        <GripVertical className="w-4 h-4" />
                                                                    </div>
                                                                    <input
                                                                        value={item.title}
                                                                        onChange={e => updateFormItem(idx, { title: e.target.value })}
                                                                        className="flex-1 px-4 py-2.5 rounded-xl font-sans text-sm bg-white"
                                                                        placeholder={`Step ${idx + 1} Question / Task`}
                                                                        style={{ border: '1px solid rgba(5,34,16,0.1)', outline: 'none' }}
                                                                    />
                                                                    <div className="relative">
                                                                        <select
                                                                            value={item.type}
                                                                            onChange={e => updateFormItem(idx, { type: e.target.value })}
                                                                            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl font-sans text-xs font-medium cursor-pointer"
                                                                            style={{ border: '1px solid rgba(5,34,16,0.1)', outline: 'none', background: '#fff', color: '#052210' }}
                                                                        >
                                                                            {stepTypes.map(t => (
                                                                                <option key={t.id} value={t.id}>{t.label}</option>
                                                                            ))}
                                                                        </select>
                                                                        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(5,34,16,0.4)' }} />
                                                                    </div>
                                                                    <button onClick={() => removeFormItem(idx)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>

                                        {/* Depends on */}
                                        {formItems.length > 1 && (
                                            <div className="mb-3">
                                                <select
                                                    value={item.dependsOn || ''}
                                                    onChange={e => updateFormItem(idx, { dependsOn: e.target.value })}
                                                    className="appearance-none w-full px-3 py-2 rounded-lg font-sans text-xs"
                                                    style={{ border: '1px solid rgba(5,34,16,0.06)', outline: 'none', background: 'rgba(5,34,16,0.02)', color: 'rgba(5,34,16,0.6)' }}
                                                >
                                                    <option value="">No dependency</option>
                                                    {formItems.filter((_, j) => j !== idx).map(other => (
                                                        <option key={other.id} value={other.id}>{other.title || `Step ${formItems.indexOf(other) + 1}`}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        
                                        {/* Notes */}
                                        <div className="mb-3">
                                            <textarea
                                                value={item.notes || ""}
                                                onChange={e => updateFormItem(idx, { notes: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg font-sans text-xs resize-none"
                                                placeholder="Add notes or detailed instructions..."
                                                rows={2}
                                                style={{ border: '1px solid rgba(5,34,16,0.06)', outline: 'none', background: '#fff', color: '#052210' }}
                                            />
                                        </div>

                                        {/* Options for Multiple Choice/Select */}
                                        {(item.type === 'multiple_choice' || item.type === 'multiple_select') && (
                                            <div className="mb-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="font-sans text-[9px] font-bold tracking-wider uppercase text-gray-400">Options</label>
                                                    <button
                                                        onClick={() => {
                                                            const newOptions = [...(item.options || []), ""]
                                                            updateFormItem(idx, { options: newOptions })
                                                        }}
                                                        className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-tighter"
                                                    >
                                                        <Plus className="w-2.5 h-2.5" /> Add Option
                                                    </button>
                                                </div>
                                                {(item.options || []).map((o, oIdx) => (
                                                    <div key={oIdx} className="flex gap-2 items-center">
                                                        {item.type === 'multiple_choice' ? (
                                                            <div className="w-3 h-3 rounded-full border border-gray-300" />
                                                        ) : (
                                                            <div className="w-3 h-3 rounded-[3px] border border-gray-300" />
                                                        )}
                                                        <input
                                                            value={o}
                                                            onChange={e => {
                                                                const newOptions = [...(item.options || [])]
                                                                newOptions[oIdx] = e.target.value
                                                                updateFormItem(idx, { options: newOptions })
                                                            }}
                                                            className="flex-1 px-3 py-1.5 rounded-lg font-sans text-[11px]"
                                                            placeholder={`Option ${oIdx + 1}`}
                                                            style={{ border: '1px solid rgba(5,34,16,0.04)', outline: 'none', background: '#fff', color: '#052210' }}
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const newOptions = (item.options || []).filter((_, k) => k !== oIdx)
                                                                updateFormItem(idx, { options: newOptions })
                                                            }}
                                                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Points */}
                                        <div className="mb-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="font-sans text-[9px] font-bold tracking-wider uppercase text-gray-400">Key Points / Sub-tasks</label>
                                                <button 
                                                    onClick={() => {
                                                        const newPoints = [...(item.points || []), ""]
                                                        updateFormItem(idx, { points: newPoints })
                                                    }}
                                                    className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-tighter"
                                                >
                                                    <Plus className="w-2.5 h-2.5" /> Add Point
                                                </button>
                                            </div>
                                            {(item.points || []).map((p, pIdx) => (
                                                <div key={pIdx} className="flex gap-2">
                                                    <div className="mt-2 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'rgba(5,34,16,0.2)' }} />
                                                    <input
                                                        value={p}
                                                        onChange={e => {
                                                            const newPoints = [...(item.points || [])]
                                                            newPoints[pIdx] = e.target.value
                                                            updateFormItem(idx, { points: newPoints })
                                                        }}
                                                        className="flex-1 px-3 py-1.5 rounded-lg font-sans text-[11px]"
                                                        placeholder={`Detail point ${pIdx + 1}`}
                                                        style={{ border: '1px solid rgba(5,34,16,0.04)', outline: 'none', background: '#fff', color: '#052210' }}
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            const newPoints = (item.points || []).filter((_, k) => k !== pIdx)
                                                            updateFormItem(idx, { points: newPoints })
                                                        }}
                                                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Extra Info */}
                                        <div className="mb-3">
                                            <input
                                                value={item.extraInfo || ""}
                                                onChange={e => updateFormItem(idx, { extraInfo: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg font-sans text-[10px]"
                                                placeholder="Extra configuration or metadata (Optional)"
                                                style={{ border: '1px solid rgba(5,34,16,0.06)', outline: 'none', background: '#fff', color: '#052210' }}
                                            />
                                        </div>

                                        {/* Acknowledgement Toggle */}
                                        <div className="mb-3 flex items-center justify-between px-3 py-2.5 outline-none rounded-lg" style={{ border: '1px solid rgba(5,34,16,0.06)', background: 'rgba(5,34,16,0.01)' }}>
                                            <div className="flex flex-col">
                                                <span className="font-sans text-[11px] font-bold text-gray-700">Require Acknowledgement</span>
                                                <span className="font-sans text-[9px] text-gray-500">User must explicitly tick "Yes, I have done this"</span>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer" 
                                                    checked={item.requiresAcknowledgement || false}
                                                    onChange={(e) => updateFormItem(idx, { requiresAcknowledgement: e.target.checked })}
                                                />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                            </label>
                                        </div>

                                        {/* Required/Optional + Delete */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(5,34,16,0.1)' }}>
                                                <button
                                                    onClick={() => updateFormItem(idx, { isRequired: true })}
                                                    className="px-3 py-1.5 font-sans text-[10px] font-bold tracking-wider uppercase transition-all"
                                                    style={{ background: item.isRequired ? '#052210' : 'transparent', color: item.isRequired ? '#fff' : 'rgba(5,34,16,0.4)' }}
                                                >Mandatory</button>
                                                <button
                                                    onClick={() => updateFormItem(idx, { isRequired: false })}
                                                    className="px-3 py-1.5 font-sans text-[10px] font-bold tracking-wider uppercase transition-all"
                                                    style={{ background: !item.isRequired ? '#052210' : 'transparent', color: !item.isRequired ? '#fff' : 'rgba(5,34,16,0.4)' }}
                                                >Optional</button>
                                            </div>
                                            {formItems.length > 1 && (
                                                <button onClick={() => removeFormItem(idx)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50">
                                                    <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                            )}
                            </Droppable>
                            </DragDropContext>
                            ) : null}
                            <button onClick={addFormItem} className="mt-3 w-full py-2.5 rounded-xl font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all hover:bg-gray-50" style={{ color: '#06a15c', border: '1px dashed rgba(6,161,92,0.3)' }}>
                                <Plus className="w-3.5 h-3.5" /> Add Process Step
                            </button>
                        </div>

                        {/* WhatsApp Template */}
                        <div className="mb-6">
                            <label className="font-sans text-[10px] font-bold tracking-wider uppercase block mb-1.5" style={{ color: 'rgba(5,34,16,0.5)' }}>WhatsApp Message Template (Optional)</label>
                            <textarea value={formWhatsapp} onChange={e => setFormWhatsapp(e.target.value)} className="w-full px-4 py-2.5 rounded-xl font-sans text-sm resize-none" rows={3} placeholder="Variables allowed depending on pipeline stage, e.g. {customer_name}, {destination}..." style={{ border: '1px solid rgba(5,34,16,0.1)', outline: 'none' }} />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 rounded-xl font-sans text-xs font-bold tracking-wider uppercase" style={{ border: '1px solid rgba(5,34,16,0.1)', color: 'rgba(5,34,16,0.5)' }}>Cancel</button>
                            <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-sans text-xs font-bold tracking-wider uppercase transition-all hover:scale-[1.01]" style={{ background: '#052210', color: '#fff' }}>
                                <Save className="w-3.5 h-3.5" /> Save Template
                            </button>
                        </div>
                    </div>
                </div>
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
