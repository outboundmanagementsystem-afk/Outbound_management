"use client"

import { useState } from "react"
import { X, Upload, DollarSign, Wallet, Building2, Smartphone, CheckCircle } from "lucide-react"

export type PaymentMethod = "cash" | "gpay" | "phonepe" | "bank_transfer"
export type PaymentType = "advance" | "balance" | "full"

export interface PaymentFormData {
    type: PaymentType
    amount: number
    method: PaymentMethod
    notes?: string
    screenshotFile?: File
}

interface PaymentCollectionModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: PaymentFormData) => Promise<void>
    itineraryName: string
    totalPrice: number
    amountAlreadyPaid?: number
    defaultType?: PaymentType
    title?: string
    submitLabel?: string
}

const methodIcons: Record<PaymentMethod, any> = {
    cash: Wallet,
    gpay: Smartphone,
    phonepe: Smartphone,
    bank_transfer: Building2,
}

const methodLabels: Record<PaymentMethod, string> = {
    cash: "Cash",
    gpay: "Google Pay",
    phonepe: "PhonePe",
    bank_transfer: "Bank Transfer",
}

const methodColors: Record<PaymentMethod, string> = {
    cash: "#22c55e",
    gpay: "#4285f4",
    phonepe: "#6d28d9",
    bank_transfer: "#0ea5e9",
}

export default function PaymentCollectionModal({
    isOpen,
    onClose,
    onSubmit,
    itineraryName,
    totalPrice,
    amountAlreadyPaid = 0,
    defaultType = "advance",
    title = "Record Payment",
    submitLabel = "Save Payment & Continue",
}: PaymentCollectionModalProps) {
    const [amount, setAmount] = useState<string>("")
    const [method, setMethod] = useState<PaymentMethod | "">("")
    const [paymentType, setPaymentType] = useState<PaymentType>(defaultType)
    const [notes, setNotes] = useState("")
    const [screenshotFile, setScreenshotFile] = useState<File | undefined>()
    const [previewUrl, setPreviewUrl] = useState<string | undefined>()
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const balance = totalPrice - amountAlreadyPaid
    const numAmount = Number(amount)
    const isValid = numAmount > 0 && !!method && !!screenshotFile

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setScreenshotFile(file)
        setPreviewUrl(URL.createObjectURL(file))
    }

    const handleSubmit = async () => {
        setError("")
        if (numAmount <= 0) { setError("Please enter a valid amount."); return }
        if (!method) { setError("Please select a payment method."); return }
        if (!screenshotFile) { setError("Please upload a payment screenshot."); return }
        
        setSaving(true)
        try {
            await onSubmit({
                type: paymentType,
                amount: numAmount,
                method: method as PaymentMethod,
                notes: notes.trim() || undefined,
                screenshotFile,
            })
            // Reset form
            setAmount("")
            setMethod("")
            setNotes("")
            setScreenshotFile(undefined)
            setPreviewUrl(undefined)
            setPaymentType(defaultType)
        } catch (e: any) {
            setError(e?.message || "Failed to save payment. Please try again.")
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
                style={{
                    background: '#FFFFFF',
                    boxShadow: '0 32px 96px rgba(0,0,0,0.25)',
                    maxHeight: 'calc(100vh - 40px)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div
                    className="flex-shrink-0 px-6 py-4 flex items-center justify-between"
                    style={{ background: 'linear-gradient(135deg, #062814 0%, #052210 100%)' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(6,161,92,0.2)', border: '1px solid rgba(6,161,92,0.3)' }}>
                            <DollarSign className="w-5 h-5" style={{ color: '#4ade80' }} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-serif text-lg tracking-wide text-white leading-tight">{title}</h2>
                            <p className="font-sans text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{itineraryName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-white/10 transition-colors ml-2"
                    >
                        <X className="w-4 h-4 text-white/60" />
                    </button>
                </div>

                {/* ── Summary Bar ── */}
                {totalPrice > 0 && (
                    <div className="flex-shrink-0 grid grid-cols-3 divide-x" style={{ background: '#f0fdf4', borderBottom: '1px solid rgba(6,161,92,0.12)' }}>
                        {[
                            { label: "Total Package", value: `₹${Number(totalPrice).toLocaleString()}`, color: '#052210' },
                            { label: "Already Paid", value: `₹${Number(amountAlreadyPaid).toLocaleString()}`, color: '#06a15c' },
                            { label: "Remaining", value: `₹${Number(balance).toLocaleString()}`, color: balance > 0 ? '#d97706' : '#06a15c' },
                        ].map(item => (
                            <div key={item.label} className="px-4 py-3 text-center">
                                <p className="font-sans text-[9px] font-bold tracking-wider uppercase mb-0.5" style={{ color: 'rgba(5,34,16,0.4)' }}>{item.label}</p>
                                <p className="font-serif text-sm font-bold" style={{ color: item.color }}>{item.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Scrollable Body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5" style={{ scrollbarWidth: 'none' }}>

                    {/* Payment Type */}
                    <div>
                        <label className="font-sans text-[10px] font-bold tracking-wider uppercase mb-2 block" style={{ color: 'rgba(5,34,16,0.5)' }}>
                            Payment Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(["advance", "balance", "full"] as PaymentType[]).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setPaymentType(t)}
                                    className="py-2.5 px-3 rounded-xl font-sans text-xs font-bold capitalize transition-all"
                                    style={{
                                        background: paymentType === t ? '#052210' : '#f9fafb',
                                        color: paymentType === t ? '#4ade80' : 'rgba(5,34,16,0.5)',
                                        border: paymentType === t ? '1.5px solid rgba(6,161,92,0.3)' : '1.5px solid #e5e7eb',
                                    }}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="font-sans text-[10px] font-bold tracking-wider uppercase mb-2 block" style={{ color: 'rgba(5,34,16,0.5)' }}>
                            Amount Received ₹ <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-serif font-bold text-lg" style={{ color: '#06a15c' }}>₹</span>
                            <input
                                type="number"
                                min="1"
                                placeholder="e.g. 10000"
                                className="w-full pl-9 pr-4 py-3.5 rounded-xl font-sans text-sm font-bold focus:ring-2"
                                style={{
                                    background: '#f9fafb',
                                    border: error && !isValid ? '1.5px solid #ef4444' : '1.5px solid #e5e7eb',
                                    color: '#052210',
                                    outline: 'none',
                                }}
                                value={amount}
                                onChange={e => { setAmount(e.target.value); setError("") }}
                                autoFocus
                            />
                        </div>
                        {error && <p className="font-sans text-xs text-red-500 mt-1">{error}</p>}
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="font-sans text-[10px] font-bold tracking-wider uppercase mb-2 block" style={{ color: 'rgba(5,34,16,0.5)' }}>
                            Payment Method <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {(Object.keys(methodLabels) as PaymentMethod[]).map(m => {
                                const Icon = methodIcons[m]
                                const color = methodColors[m]
                                const isActive = method === m
                                return (
                                    <button
                                        key={m}
                                        onClick={() => setMethod(m)}
                                        className="flex items-center gap-2.5 px-4 py-3 rounded-xl transition-all font-sans text-sm font-semibold"
                                        style={{
                                            background: isActive ? `${color}12` : '#f9fafb',
                                            border: isActive ? `1.5px solid ${color}60` : '1.5px solid #e5e7eb',
                                            color: isActive ? color : 'rgba(5,34,16,0.5)',
                                            boxShadow: isActive ? `0 0 0 3px ${color}10` : 'none',
                                        }}
                                    >
                                        <Icon className="w-4 h-4 flex-shrink-0" />
                                        {methodLabels[m]}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Screenshot Upload */}
                    <div>
                        <label className="font-sans text-[10px] font-bold tracking-wider uppercase mb-2 block" style={{ color: 'rgba(5,34,16,0.5)' }}>
                            Payment Screenshot <span className="text-red-500">*</span>
                        </label>
                        {previewUrl ? (
                            <div className="relative rounded-xl overflow-hidden" style={{ border: '1.5px solid rgba(6,161,92,0.25)' }}>
                                <img src={previewUrl} alt="Payment screenshot" className="w-full h-28 object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
                                    <button
                                        onClick={() => { setScreenshotFile(undefined); setPreviewUrl(undefined) }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans text-xs font-bold text-white"
                                        style={{ background: 'rgba(239,68,68,0.85)' }}
                                    >
                                        <X className="w-3.5 h-3.5" /> Remove
                                    </button>
                                </div>
                                <div className="px-3 py-1.5" style={{ background: '#f0fdf4', borderTop: '1px solid rgba(6,161,92,0.15)' }}>
                                    <p className="font-sans text-[10px] font-semibold" style={{ color: '#06a15c' }}>✓ {screenshotFile?.name}</p>
                                </div>
                            </div>
                        ) : (
                            <label
                                className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl cursor-pointer transition-all hover:border-green-400"
                                style={{ border: '1.5px dashed #d1d5db', background: '#fafafa' }}
                            >
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,161,92,0.08)' }}>
                                    <Upload className="w-4 h-4" style={{ color: '#06a15c' }} />
                                </div>
                                <div className="text-center">
                                    <span className="font-sans text-sm font-semibold block" style={{ color: '#052210' }}>Click to upload</span>
                                    <span className="font-sans text-xs" style={{ color: 'rgba(5,34,16,0.4)' }}>GPay / PhonePe screenshots, receipts…</span>
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="font-sans text-[10px] font-bold tracking-wider uppercase mb-2 block" style={{ color: 'rgba(5,34,16,0.5)' }}>
                            Notes <span className="font-normal normal-case" style={{ color: 'rgba(5,34,16,0.3)' }}>(optional)</span>
                        </label>
                        <textarea
                            rows={2}
                            placeholder="e.g. 'Paid via WhatsApp transfer', 'Cash given at office'..."
                            className="w-full px-4 py-3 rounded-xl font-sans text-sm resize-none"
                            style={{
                                background: '#f9fafb',
                                border: '1.5px solid #e5e7eb',
                                color: '#052210',
                                outline: 'none',
                            }}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                {/* ── Footer ── */}
                <div
                    className="flex-shrink-0 px-6 py-4 flex gap-3"
                    style={{ borderTop: '1px solid #f3f4f6', background: '#fafafa' }}
                >
                    <button
                        onClick={handleSubmit}
                        disabled={!isValid || saving}
                        className="flex-1 py-3.5 rounded-xl font-sans text-xs tracking-wider uppercase font-bold transition-all flex items-center justify-center gap-2"
                        style={{
                            background: isValid && !saving ? '#052210' : '#e5e7eb',
                            color: isValid && !saving ? '#4ade80' : '#9ca3af',
                            cursor: isValid && !saving ? 'pointer' : 'not-allowed',
                            boxShadow: isValid && !saving ? '0 4px 16px rgba(5,34,16,0.25)' : 'none',
                        }}
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#4ade80', borderTopColor: 'transparent' }} />
                        ) : (
                            <CheckCircle className="w-4 h-4" />
                        )}
                        {saving ? 'Saving...' : submitLabel}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-5 py-3.5 rounded-xl font-sans text-xs tracking-wider uppercase font-semibold transition-all"
                        style={{ border: '1.5px solid #e5e7eb', color: 'rgba(5,34,16,0.45)', background: '#fff' }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}
