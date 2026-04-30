"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle, Circle, FileText, ChevronRight, X, Calendar as CalendarIcon, UploadCloud, File, AlertCircle } from "lucide-react"

interface SalesChecklistModalProps {
    isOpen: boolean
    onClose: () => void
    checklist: any[]
    onToggleItem: (id: string, checked: boolean) => Promise<void>
    onUpdateItem: (id: string, data: any) => Promise<void>
    onFileUpload: (id: string, file: File | undefined) => Promise<void>
    uploadingItemId: string | null
    onComplete: () => void
}

export default function SalesChecklistModal({
    isOpen,
    onClose,
    checklist,
    onToggleItem,
    onUpdateItem,
    onFileUpload,
    uploadingItemId,
    onComplete
}: SalesChecklistModalProps) {
    const requiredChecklist = useMemo(() => checklist.filter(c => c.isRequired !== false), [checklist]);
    const completedCount = useMemo(() => requiredChecklist.filter(c => c.checked).length, [requiredChecklist]);
    const isAllDone = useMemo(() => completedCount === requiredChecklist.length && requiredChecklist.length > 0, [completedCount, requiredChecklist.length]);

    if (!isOpen) return null;

    return (
        <div className="w-full h-full bg-white flex flex-col animate-in fade-in duration-500 -m-4 sm:-m-6 md:-m-8">
            {/* Header (Fixed) */}
            <header className="px-8 py-8 shrink-0 bg-[#0d3d2b] relative overflow-hidden">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <h2 className="font-serif text-2xl text-white tracking-wide">Sales Pre-Handover Checklist</h2>
                            <p className="font-sans text-[10px] text-[#1D9E75] uppercase tracking-[0.2em] font-black mt-1">
                                {completedCount} / {requiredChecklist.length} MANDATORY COMPLETED
                            </p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2.5 hover:bg-white/10 rounded-full transition-all group border border-white/10"
                        >
                            <X className="w-5 h-5 text-white/70 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
                        </button>
                    </div>
                    {/* Progress bar in header */}
                    <div className="mt-6 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-[#1D9E75] transition-all duration-700 ease-out shadow-[0_0_8px_#1D9E75]"
                            style={{ width: `${(completedCount / requiredChecklist.length) * 100}%` }}
                        />
                    </div>
                </header>

                {/* Scrollable Body */}
                <div 
                    className="flex-1 overflow-y-auto bg-[#fafafa] px-8 py-10 scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    <div className="space-y-12 mb-12">
                        {checklist.map((item) => (
                            <MemoizedChecklistItem 
                                key={item.id}
                                item={item}
                                onToggleItem={onToggleItem}
                                onUpdateItem={onUpdateItem}
                                onFileUpload={onFileUpload}
                                uploadingItemId={uploadingItemId}
                            />
                        ))}
                    </div>

                    {/* Footer (Non-sticky, compact) */}
                    <footer className="mt-10 pt-6 border-t border-gray-200 bg-white px-5 py-4">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-sans text-sm font-semibold text-[#0d3d2b] leading-tight">Ready for Handover?</h3>
                                    <p className="font-sans text-[11px] text-gray-400 uppercase tracking-wider mt-0.5">MANDATORY ITEMS MUST BE CHECKED</p>
                                </div>
                                <div className="text-right">
                                    <span className="font-sans text-[11px] font-bold text-[#1D9E75] bg-[#1D9E75]/10 px-2 py-0.5 rounded">
                                        {completedCount} / {requiredChecklist.length} COMPLETED
                                    </span>
                                </div>
                            </div>
                            
                            <button
                                onClick={onComplete}
                                disabled={!isAllDone}
                                className={`w-full h-10 rounded-lg font-sans text-[12px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                    isAllDone 
                                    ? "bg-[#0d3d2b] text-[#1D9E75] hover:bg-[#0d3d2b]/90 active:scale-[0.98]" 
                                    : "bg-gray-100 text-gray-300 cursor-not-allowed"
                                }`}
                            >
                                {isAllDone ? "PROCEED TO HANDOVER" : "MANDATORY STEPS PENDING"} <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </footer>
                </div>
        </div>
    )
}

// --- SUB-COMPONENTS TO FIX INPUT LAG ---

const MemoizedChecklistItem = React.memo(({ item, onToggleItem, onUpdateItem, onFileUpload, uploadingItemId }: any) => {
    const isMandatory = item.isRequired !== false;
    
    const isAnswered = useMemo(() => {
        const type = item.type?.toLowerCase() || "";
        const hasText = !!item.response && item.response.toString().trim().length > 0;
        const hasFile = !!item.fileUrl;
        const hasAck = !!item.acknowledged;

        if (type === "multiple_choice") return !!item.response;
        
        // Handle hybrid types (e.g. file_or_text)
        const supportsFile = ["file_upload", "file"].some(t => type.includes(t));
        const supportsText = ["text", "number"].some(t => type.includes(t)) && !type.includes("date");

        if (supportsFile && supportsText) return hasFile || hasText;
        if (supportsFile) return hasFile;
        
        if (item.requiresAcknowledgement || ["checkbox_check", "checkbox"].includes(type)) return hasAck;
        
        // Default for text, number, date
        return hasText;
    }, [item.response, item.acknowledged, item.fileUrl, item.type, item.requiresAcknowledgement]);

    return (
        <div className="relative group">
            <div className="flex items-start gap-5">
                {/* Square Checkbox Indicator */}
                <button
                    disabled={!isAnswered}
                    onClick={() => onToggleItem(item.id, item.checked)}
                    className={`mt-1 transition-all ${item.checked ? "scale-95" : isAnswered ? "hover:scale-105 cursor-pointer" : "opacity-40 cursor-not-allowed"}`}
                >
                    {item.checked ? (
                        <div className="w-[18px] h-[18px] rounded-[4px] bg-[#1D9E75] flex items-center justify-center">
                            <span className="text-white text-[12px] font-bold leading-none select-none">✓</span>
                        </div>
                    ) : (
                        <div className="w-[18px] h-[18px] rounded-[4px] border-[1.5px] border-[#d1d5db] bg-white group-hover:border-[#1D9E75]/50 transition-colors" />
                    )}
                </button>

                <div className="flex-1 space-y-4">
                    {/* Title & Badge */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <span className={`font-sans text-[15px] font-bold transition-colors ${item.checked ? "text-gray-300 line-through" : "text-[#0d3d2b]"}`}>
                                {item.name || item.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isMandatory ? "bg-red-50 text-red-500 border border-red-100" : "bg-gray-50 text-gray-400 border border-gray-100"}`}>
                                {isMandatory ? "Mandatory" : "Optional"}
                            </span>
                        </div>
                    </div>

                    {!item.checked && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            {/* 1. Date Picker */}
                            {(item.type?.toLowerCase().includes("date") || item.name?.toLowerCase().includes("date")) && (
                                <div className="relative group/input">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                        <CalendarIcon className="w-4 h-4 text-gray-400 group-focus-within/input:text-[#1D9E75] transition-colors" />
                                    </div>
                                    <input 
                                        type="date" 
                                        value={item.response || ""} 
                                        onChange={(e) => onUpdateItem(item.id, { response: e.target.value })} 
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-[#f3f4f6]/50 font-sans text-sm text-[#0d3d2b] focus:ring-2 focus:ring-[#1D9E75]/10 focus:border-[#1D9E75] outline-none transition-all"
                                    />
                                </div>
                            )}

                            {/* 2. Text/Number Input */}
                            {((item.type?.toLowerCase().includes("text") || item.type?.toLowerCase().includes("number")) && !item.type?.toLowerCase().includes("date")) && (
                                <TextInput
                                    type={item.type?.toLowerCase().includes("number") ? "number" : "text"}
                                    value={item.response || ""}
                                    placeholder={item.placeholder || "Enter details here..."}
                                    onChange={(val: string) => onUpdateItem(item.id, { response: val })}
                                />
                            )}

                            {/* 3. File Upload */}
                            {["file_upload", "file"].some(t => item.type?.toLowerCase().includes(t)) && (
                                <div className="space-y-2">
                                    {!item.fileUrl ? (
                                        <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-gray-200 bg-white hover:bg-[#1D9E75]/5 hover:border-[#1D9E75]/30 cursor-pointer transition-all group/upload">
                                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-3 group-hover/upload:bg-[#1D9E75]/10 transition-colors">
                                                <UploadCloud className="w-5 h-5 text-gray-400 group-hover/upload:text-[#1D9E75]" />
                                            </div>
                                            <p className="font-sans text-xs font-bold text-[#0d3d2b]">Click to upload or drag and drop</p>
                                            <p className="font-sans text-[10px] text-gray-400 mt-1">Accepted formats: JPG, PNG, PDF</p>
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                onChange={(e) => onFileUpload(item.id, e.target.files?.[0])}
                                                disabled={!!uploadingItemId}
                                            />
                                        </label>
                                    ) : (
                                        <div className="flex items-center justify-between p-4 rounded-xl border border-[#1D9E75]/20 bg-[#1D9E75]/5">
                                            <div className="flex items-center gap-3">
                                                <File className="w-4 h-4 text-[#1D9E75]" />
                                                <span className="font-sans text-xs font-medium text-[#1D9E75] truncate max-w-[200px]">Document Selected</span>
                                            </div>
                                            <button 
                                                onClick={() => onUpdateItem(item.id, { fileUrl: '' })}
                                                className="p-1 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <X className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 4. Checkbox Check (Acknowledgement) */}
                            {(item.requiresAcknowledgement || ["checkbox_check", "checkbox"].includes(item.type?.toLowerCase())) && (
                                <label className="flex items-center gap-4 p-4 rounded-xl bg-gray-100/50 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-all group/ack">
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${item.acknowledged ? "bg-[#1D9E75] border-[#1D9E75]" : "border-gray-300 group-hover/ack:border-[#1D9E75]"}`}>
                                        {item.acknowledged && <CheckCircle className="w-3 h-3 text-white" />}
                                        <input 
                                            type="checkbox" 
                                            className="hidden" 
                                            checked={item.acknowledged || false}
                                            onChange={(e) => onUpdateItem(item.id, { acknowledged: e.target.checked })}
                                        />
                                    </div>
                                    <span className="font-sans text-[11px] font-bold text-gray-500 uppercase tracking-wider">Yes, I have completed this step</span>
                                </label>
                            )}

                            {/* 5. Multiple Choice */}
                            {(item.type?.toLowerCase() === "multiple_choice") && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {item.options && item.options.length > 0 ? (
                                        <>
                                            {item.options.map((opt: string) => {
                                                const isSelected = item.response === opt;
                                                return (
                                                    <button
                                                        key={opt}
                                                        onClick={() => onUpdateItem(item.id, { response: opt })}
                                                        className={`flex items-center gap-2.5 px-[20px] py-[6px] rounded-[20px] border transition-all text-left ${
                                                            isSelected 
                                                            ? "bg-[#f0faf6] border-[#1D9E75] text-[#0d3d2b]" 
                                                            : "bg-white border-[#d1d5db] text-gray-500 hover:border-gray-400"
                                                        }`}
                                                    >
                                                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? "border-[#1D9E75] bg-[#1D9E75]" : "border-gray-300"}`}>
                                                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                        </div>
                                                        <span className="font-sans text-[12px] font-semibold leading-none">{opt}</span>
                                                    </button>
                                                )
                                            })}
                                        </>
                                    ) : (
                                        <TextInput
                                            type="text"
                                            value={item.response || ""}
                                            placeholder="Enter response..."
                                            onChange={(val: string) => onUpdateItem(item.id, { response: val })}
                                        />
                                    )}
                                </div>
                            )}

                            {/* Italic Muted Helper Note */}
                            {item.notes && (
                                <p className="font-sans text-[11px] text-gray-400 italic px-1 flex gap-2">
                                    <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                    {item.notes}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

const TextInput = React.memo(({ value, placeholder, onChange, type }: any) => {
    // We use defaultValue for uncontrolled stability against re-renders
    // while still syncing changes to the parent
    return (
        <input 
            type={type}
            defaultValue={value || ""} 
            onChange={(e) => onChange(e.target.value)} 
            placeholder={placeholder}
            className="w-full px-5 py-3 rounded-xl border border-gray-200 bg-white font-sans text-sm text-[#0d3d2b] focus:ring-2 focus:ring-[#1D9E75]/10 focus:border-[#1D9E75] outline-none transition-all shadow-sm"
        />
    );
});

MemoizedChecklistItem.displayName = "MemoizedChecklistItem";
TextInput.displayName = "TextInput";
