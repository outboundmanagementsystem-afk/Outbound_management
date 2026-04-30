"use client"

import React, { useState, useEffect, useRef } from "react"
import { 
  GripVertical, 
  CheckSquare, 
  Type, 
  FileUp, 
  Calendar, 
  ChevronDown, 
  Trash2, 
  Edit3, 
  Plus, 
  X, 
  Save, 
  Hash, 
  List, 
  Info,
  Check
} from "lucide-react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { StatusDialog } from "./ui/StatusDialog"

// --- Types ---

export type StepType = 
  | "DATE_PICKER" 
  | "TEXT_INPUT" 
  | "FILE_UPLOAD" 
  | "CHECKBOX_CHECK" 
  | "DROPDOWN" 
  | "NUMBER_INPUT"

export interface ChecklistItem {
  id: string
  name: string
  type: StepType
  notes: string
  subPoints: string[]
  requireAcknowledgement: boolean
  isMandatory: boolean
  dependency?: string
}

const TYPE_CONFIG: Record<StepType, { label: string; icon: any; color: string }> = {
  DATE_PICKER: { label: "Date Picker", icon: Calendar, color: "#3b82f6" },
  TEXT_INPUT: { label: "Text Input", icon: Type, color: "#8b5cf6" },
  FILE_UPLOAD: { label: "File Upload", icon: FileUp, color: "#f59e0b" },
  CHECKBOX_CHECK: { label: "Checkbox Check", icon: CheckSquare, color: "#10b981" },
  DROPDOWN: { label: "Dropdown", icon: List, color: "#ec4899" },
  NUMBER_INPUT: { label: "Number Input", icon: Hash, color: "#6366f1" },
}

// --- Main Component ---

export function SopChecklistEditor() {
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: "1",
      name: "Verify customer document validity",
      type: "CHECKBOX_CHECK",
      notes: "Check if the passport is valid for at least 6 months from the travel date.",
      subPoints: ["Passport front page", "Passport back page"],
      requireAcknowledgement: true,
      isMandatory: true,
    },
    {
      id: "2",
      name: "Upload flight ticket confirmation",
      type: "FILE_UPLOAD",
      notes: "Ensure the PNR is clearly visible.",
      subPoints: [],
      requireAcknowledgement: false,
      isMandatory: true,
    },
  ])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ChecklistItem | null>(null)
  const [newSubPoint, setNewSubPoint] = useState("")

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

  // Live Count
  const itemCount = items.length

  // Handlers
  const handleAddStep = () => {
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      name: "",
      type: "CHECKBOX_CHECK",
      notes: "",
      subPoints: [],
      requireAcknowledgement: false,
      isMandatory: true,
    }
    setItems((prev) => [...prev, newItem])
    setEditingId(newItem.id)
    setEditForm({ ...newItem })
  }

  const handleDelete = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this step?")) return
    setItems((prev) => prev.filter((item) => item.id !== id))
    if (editingId === id) setEditingId(null)
    showStatus("success", "Deleted", "Step removed from checklist")
  }

  const handleEdit = (item: ChecklistItem) => {
    if (editingId === item.id) {
      setEditingId(null)
      setEditForm(null)
    } else {
      setEditingId(item.id)
      setEditForm({ ...item })
    }
  }

  const handleSave = () => {
    if (!editForm) return
    setItems((prev) => prev.map((item) => (item.id === editForm.id ? editForm : item)))
    setEditingId(null)
    setEditForm(null)
    showStatus("success", "Saved", "Step changes saved successfully")
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const onDragEnd = (result: any) => {
    if (!result.destination) return
    const reordered = Array.from(items)
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)
    setItems(reordered)
  }

  const addSubPoint = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newSubPoint.trim() && editForm) {
      e.preventDefault()
      setEditForm({
        ...editForm,
        subPoints: [...editForm.subPoints, newSubPoint.trim()],
      })
      setNewSubPoint("")
    }
  }

  const removeSubPoint = (idx: number) => {
    if (!editForm) return
    setEditForm({
      ...editForm,
      subPoints: editForm.subPoints.filter((_, i) => i !== idx),
    })
  }

  return (
    <div className="w-full max-w-4xl mx-auto font-sans" style={{ 
      '--color-bg': '#ffffff',
      '--color-text-main': '#052210',
      '--color-text-muted': 'rgba(5, 34, 16, 0.5)',
      '--color-border': 'rgba(5, 34, 16, 0.1)',
      '--color-accent': '#06a15c',
      '--color-accent-soft': 'rgba(6, 161, 92, 0.08)',
      '--color-warning': '#f59e0b',
      '--color-warning-soft': 'rgba(245, 158, 11, 0.1)',
    } as any}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-main)]">File Handover checklist</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">
              {itemCount} {itemCount === 1 ? 'CHECKLIST ITEM' : 'CHECKLIST ITEMS'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-all">
            <Edit3 className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-lg border border-[var(--color-border)] text-red-500 hover:bg-red-50 transition-all">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* List */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="checklist">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.draggableProps}
                      className="group"
                    >
                      {/* Item Card */}
                      <div className={`flex items-center gap-4 py-6 px-6 rounded-2xl border transition-all ${editingId === item.id ? 'hidden' : 'border-transparent hover:bg-gray-50/50 bg-white'}`}>
                        {/* Drag Handle */}
                        <div {...provided.dragHandleProps} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        
                        {/* Checkbox */}
                        <div className="w-6 h-6 rounded-lg border-2 border-[var(--color-border)] shrink-0" />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col gap-1">
                            <span className="text-lg font-bold text-[var(--color-text-main)]">
                              {item.name || <span className="italic opacity-50">Untitled Step</span>}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 border border-gray-200">
                                {TYPE_CONFIG[item.type].label}
                              </span>
                            </div>
                          </div>
                          
                          {item.notes && (
                            <div className="flex gap-2 mt-3 pl-4 border-l-2 border-gray-200 italic">
                              <p className="text-xs text-[var(--color-text-muted)]">
                                {item.notes}
                              </p>
                            </div>
                          )}

                          {item.subPoints.length > 0 && (
                            <div className="space-y-1 mt-3 pl-4">
                              {item.subPoints.map((p, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                                  <div className="w-1 h-1 rounded-full bg-gray-300" />
                                  <span>{p}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEdit(item)}
                            className="p-2.5 rounded-xl border border-[var(--color-border)] text-gray-400 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2.5 rounded-xl border border-[var(--color-border)] text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Inline Edit Panel (Image 2 style) */}
                      {editingId === item.id && editForm && (
                        <div className="p-8 rounded-[32px] border border-[var(--color-border)] bg-white shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300">
                          {/* Top Row: Handle, Name, Type, Delete */}
                          <div className="flex items-center gap-4">
                            <div {...provided.dragHandleProps} className="text-gray-300">
                              <GripVertical className="w-5 h-5" />
                            </div>
                            <input 
                              value={editForm.name}
                              onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                              className="flex-1 px-5 py-3.5 rounded-2xl border border-[var(--color-border)] text-lg font-bold focus:outline-none focus:border-[var(--color-accent)]"
                              placeholder="Step Name"
                            />
                            <div className="relative w-64">
                              <select 
                                value={editForm.type}
                                onChange={(e) => setEditForm({...editForm, type: e.target.value as StepType})}
                                className="w-full pl-5 pr-10 py-3.5 rounded-2xl border border-[var(--color-border)] text-sm font-medium appearance-none focus:outline-none focus:border-[var(--color-accent)] bg-white"
                              >
                                {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                                  <option key={key} value={key}>{config.label}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                            <button onClick={() => handleDelete(item.id)} className="p-3 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Dependency Row */}
                          <div>
                            <select 
                              value={editForm.dependency || ""}
                              onChange={(e) => setEditForm({...editForm, dependency: e.target.value})}
                              className="w-full px-5 py-3.5 rounded-2xl border border-[var(--color-border)] text-sm font-medium focus:outline-none focus:border-[var(--color-accent)] bg-gray-50/50 text-gray-500 appearance-none"
                            >
                              <option value="">No dependency</option>
                              {items.filter(i => i.id !== item.id).map(i => (
                                <option key={i.id} value={i.id}>{i.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Notes Row */}
                          <div>
                            <textarea 
                              value={editForm.notes}
                              onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                              className="w-full px-5 py-3.5 rounded-2xl border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-accent)] min-h-[60px]"
                              placeholder="Notes / Instructions"
                            />
                          </div>

                          {/* Sub-tasks Row */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Key Points / Sub-tasks</h4>
                              <button 
                                onClick={() => {
                                  if (newSubPoint.trim()) {
                                    setEditForm({...editForm, subPoints: [...editForm.subPoints, newSubPoint.trim()]});
                                    setNewSubPoint("");
                                  }
                                }}
                                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)] hover:opacity-70 transition-all"
                              >
                                <Plus className="w-3 h-3" /> Add Point
                              </button>
                            </div>
                            <div className="space-y-3">
                              <input 
                                value={newSubPoint}
                                onChange={(e) => setNewSubPoint(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && newSubPoint.trim()) {
                                    e.preventDefault();
                                    setEditForm({...editForm, subPoints: [...editForm.subPoints, newSubPoint.trim()]});
                                    setNewSubPoint("");
                                  }
                                }}
                                className="w-full px-5 py-3.5 rounded-2xl border border-[var(--color-border)] text-sm italic focus:outline-none focus:border-[var(--color-accent)] bg-gray-50/50"
                                placeholder="Extra configuration or metadata (Optional)"
                              />
                              <div className="space-y-2">
                                {editForm.subPoints.map((p, i) => (
                                  <div key={i} className="flex items-center gap-3 px-5 py-3 rounded-xl border border-[var(--color-border)] bg-white group/point">
                                    <span className="flex-1 text-sm font-medium text-gray-600">{p}</span>
                                    <button onClick={() => removeSubPoint(i)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover/point:opacity-100">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Acknowledgement Toggle */}
                          <div className="p-5 rounded-2xl border border-[var(--color-border)] flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-[var(--color-text-main)]">Require Acknowledgement</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">User must explicitly tick "Yes, I have done this"</p>
                            </div>
                            <button 
                              onClick={() => setEditForm({...editForm, requireAcknowledgement: !editForm.requireAcknowledgement})}
                              className={`w-12 h-6 rounded-full relative transition-all ${editForm.requireAcknowledgement ? 'bg-[var(--color-accent)]' : 'bg-gray-200'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${editForm.requireAcknowledgement ? 'left-7' : 'left-1'}`} />
                            </button>
                          </div>

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between pt-4">
                            <div className="flex gap-0.5 p-1 rounded-xl bg-gray-100 w-fit">
                              <button 
                                onClick={() => setEditForm({...editForm, isMandatory: true})}
                                className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${editForm.isMandatory ? 'bg-[var(--color-text-main)] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                              >
                                Mandatory
                              </button>
                              <button 
                                onClick={() => setEditForm({...editForm, isMandatory: false})}
                                className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${!editForm.isMandatory ? 'bg-[var(--color-text-main)] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                              >
                                Optional
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={handleSave}
                                className="flex items-center gap-2 px-10 py-3 rounded-2xl bg-[var(--color-accent)] text-white text-sm font-bold uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-emerald-200"
                              >
                                <Check className="w-4 h-4" /> Save
                              </button>
                              <button onClick={() => handleDelete(item.id)} className="p-3 text-red-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Step Button */}
      <button 
        onClick={handleAddStep}
        className="w-full mt-6 py-6 rounded-2xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] group transition-all"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--color-border)] group-hover:bg-[var(--color-accent)] flex items-center justify-center transition-all">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]">
            Add Process Step
          </span>
        </div>
      </button>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in {
          animation: slideIn 0.25s ease-out forwards;
        }
      `}</style>
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
