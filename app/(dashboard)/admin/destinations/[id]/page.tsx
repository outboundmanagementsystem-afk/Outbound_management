"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
    getDestination, updateDestination,
    getHotels, addHotel, deleteHotel, updateHotel,
    getAttractions, addAttraction, deleteAttraction, updateAttraction,
    getActivities, addActivity, deleteActivity, updateActivity,
    getVehicleRules, addVehicleRule, deleteVehicleRule, updateVehicleRule,
    getTransfers, addTransfer, deleteTransfer, updateTransfer,
    getPresetDays, addPresetDay, deletePresetDay, updatePresetDay,
} from "@/lib/firestore"
import { Hotel, Landmark, Bike, Car, Plus, Trash2, ArrowLeft, Globe, MapPin, FileText, Save, FileEdit, Calendar, Eye, X, Phone, MapPinned, ChevronDown, ChevronUp, Check } from "lucide-react"
import Link from "next/link"

const TABS = [
    { key: "overview", label: "Overview", icon: Globe },
    { key: "attractions", label: "Attractions", icon: Landmark },
    { key: "hotels", label: "Hotels", icon: Hotel },
    { key: "transfers", label: "Transfers", icon: MapPin },
    { key: "vehicleRules", label: "Vehicle Rules", icon: Car },
    { key: "dayPlans", label: "Day Plans", icon: Calendar },
]

const DEFAULT_HOTEL_CATEGORIES = ["5 Star", "4 Star", "3 Star", "Deluxe", "Super Deluxe", "Budget", "Heritage", "Boutique"]
const ATTRACTION_CATEGORIES = ["Sightseeing", "Temple", "Garden", "Lake", "Adventure", "Shopping", "Historical", "Beach", "Other"]
const TRANSFER_TYPES = ["Pickup", "Drop", "Both"]

export default function DestinationEditorPage() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <DestinationEditor />
        </ProtectedRoute>
    )
}

function DestinationEditor() {
    const params = useParams()
    const destId = params.id as string
    const [dest, setDest] = useState<any>(null)
    const [activeTab, setActiveTab] = useState("overview")
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [formData, setFormData] = useState<any>({})
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Custom hotel categories (persisted per session + loaded from existing items)
    const [customHotelCategories, setCustomHotelCategories] = useState<string[]>([])
    const [addingCustomCategory, setAddingCustomCategory] = useState(false)
    const [newCategoryInput, setNewCategoryInput] = useState("")
    const [previewingId, setPreviewingId] = useState<string | null>(null)
    const [allHotels, setAllHotels] = useState<any[]>([])
    const [openSubDestDropdown, setOpenSubDestDropdown] = useState(false)
    const [openOvernightDropdown, setOpenOvernightDropdown] = useState(false)
    const [localSubDestSearch, setLocalSubDestSearch] = useState("")
    const [localOvernightSearch, setLocalOvernightSearch] = useState("")

    // Overview form states
    const [destName, setDestName] = useState("")
    const [country, setCountry] = useState("")
    const [state, setState] = useState("")
    const [currency, setCurrency] = useState("INR")
    const [description, setDescription] = useState("")
    const [coverImage, setCoverImage] = useState("")
    const [subDestinationList, setSubDestinationList] = useState<string[]>([])
    const [newSubDestination, setNewSubDestination] = useState("")

    // pdfTemplate states
    const [tagline, setTagline] = useState("")
    const [inclusions, setInclusions] = useState("")
    const [exclusions, setExclusions] = useState("")
    const [importantNotes, setImportantNotes] = useState("")
    const [termsAndConditions, setTermsAndConditions] = useState("")
    const [paymentPolicy, setPaymentPolicy] = useState("")
    const [cancellationPolicy, setCancellationPolicy] = useState("")

    // Compute all hotel categories (defaults + custom)
    const allHotelCategories = [...DEFAULT_HOTEL_CATEGORIES, ...customHotelCategories.filter(c => !DEFAULT_HOTEL_CATEGORIES.includes(c))]

    useEffect(() => { loadDest() }, [destId])
    useEffect(() => { if (activeTab !== "overview") loadItems() }, [activeTab, destId])

    // Extract custom categories from existing hotel items
    useEffect(() => {
        if (activeTab === "hotels" && items.length > 0) {
            const existingCustom = items
                .map(item => item.category)
                .filter(Boolean)
                .filter(cat => !DEFAULT_HOTEL_CATEGORIES.includes(cat))
            setCustomHotelCategories(prev => {
                const merged = new Set([...prev, ...existingCustom])
                return Array.from(merged)
            })
        }
    }, [items, activeTab])

    const loadDest = async () => {
        const d = (await getDestination(destId)) as any
        setDest(d)
        if (d) {
            setDestName(d.destinationName || d.name || "")
            setCountry(d.country || "")
            setState(d.state || "")
            setCurrency(d.currency || "INR")
            setDescription(d.description || "")
            setCoverImage(d.coverImage || "")
            setSubDestinationList(d.subDestinations || [])
            if (d.customHotelCategories) {
                setCustomHotelCategories(prev => Array.from(new Set([...prev, ...d.customHotelCategories])))
            }
            const pdf = d.pdfTemplate || {}
            setTagline(pdf.tagline || "")
            setInclusions((pdf.inclusions || []).join("\n"))
            setExclusions((pdf.exclusions || []).join("\n"))
            setImportantNotes((pdf.importantNotes || []).join("\n"))
            setTermsAndConditions((pdf.termsAndConditions || []).join("\n"))
            setPaymentPolicy((pdf.paymentPolicy || []).join("\n"))
            setCancellationPolicy((pdf.cancellationPolicy || []).join("\n"))

            // Fetch hotels for dropdown usage in dayPlans
            const h = await getHotels(destId)
            setAllHotels(h)
        }
        setLoading(false)
    }

    const loadItems = async () => {
        setLoading(true)
        try {
            let data: any[] = []
            if (activeTab === "hotels") data = await getHotels(destId)
            else if (activeTab === "attractions") data = await getAttractions(destId)
            else if (activeTab === "activities") data = await getActivities(destId)
            else if (activeTab === "vehicleRules") data = await getVehicleRules(destId)
            else if (activeTab === "transfers") data = await getTransfers(destId)
            else if (activeTab === "dayPlans") {
                data = await getPresetDays(destId)
                const h = await getHotels(destId)
                setAllHotels(h)
            }
            setItems(data)
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const handleSaveOverview = async () => {
        setSaving(true)
        try {
            const splitLines = (str: string) => str.split("\n").map(s => s.trim()).filter(Boolean)
            await updateDestination(destId, {
                destinationName: destName,
                name: destName,
                country, state, currency, description, coverImage,
                subDestinations: subDestinationList,
                customHotelCategories,
                pdfTemplate: {
                    tagline,
                    inclusions: splitLines(inclusions),
                    exclusions: splitLines(exclusions),
                    importantNotes: splitLines(importantNotes),
                    termsAndConditions: splitLines(termsAndConditions),
                    paymentPolicy: splitLines(paymentPolicy),
                    cancellationPolicy: splitLines(cancellationPolicy),
                },
            })
            await loadDest()
        } catch (err) { console.error(err) }
        finally { setSaving(false) }
    }

    const handleAddCustomCategory = () => {
        const trimmed = newCategoryInput.trim()
        if (trimmed && !allHotelCategories.includes(trimmed)) {
            setCustomHotelCategories(prev => [...prev, trimmed])
            setFormData({ ...formData, category: trimmed })
            // Persist to destination
            updateDestination(destId, { customHotelCategories: [...customHotelCategories, trimmed] }).catch(console.error)
        } else if (trimmed) {
            setFormData({ ...formData, category: trimmed })
        }
        setNewCategoryInput("")
        setAddingCustomCategory(false)
        setOpenSubDestDropdown(false)
        setOpenOvernightDropdown(false)
    }

    const handleSave = async () => {
        let payload = { ...formData };
        // Clean up any leftover custom category fields
        delete payload.customCategory;

        if (editingId) {
            if (activeTab === "hotels") await updateHotel(destId, editingId, payload)
            else if (activeTab === "attractions") await updateAttraction(destId, editingId, payload)
            else if (activeTab === "activities") await updateActivity(destId, editingId, payload)
            else if (activeTab === "vehicleRules") await updateVehicleRule(destId, editingId, payload)
            else if (activeTab === "transfers") await updateTransfer(destId, editingId, { ...payload, type: payload.type || "Both" })
            else if (activeTab === "dayPlans") await updatePresetDay(destId, editingId, payload)
        } else {
            if (activeTab === "hotels") await addHotel(destId, payload)
            else if (activeTab === "attractions") await addAttraction(destId, payload)
            else if (activeTab === "activities") await addActivity(destId, payload)
            else if (activeTab === "vehicleRules") await addVehicleRule(destId, payload)
            else if (activeTab === "transfers") await addTransfer(destId, { ...payload, type: payload.type || "Both" })
            else if (activeTab === "dayPlans") await addPresetDay(destId, payload)
        }
        setFormData({})
        setEditingId(null)
        setShowForm(false)
        loadItems()
    }

    const handleEdit = (item: any) => {
        setFormData({
            ...item,
            activities: item.activities ? JSON.parse(JSON.stringify(item.activities)) : [],
            roomCategories: item.roomCategories ? JSON.parse(JSON.stringify(item.roomCategories)) : []
        })
        setEditingId(item.id)
        setShowForm(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this item?")) return
        if (activeTab === "hotels") await deleteHotel(destId, id)
        else if (activeTab === "attractions") await deleteAttraction(destId, id)
        else if (activeTab === "activities") await deleteActivity(destId, id)
        else if (activeTab === "vehicleRules") await deleteVehicleRule(destId, id)
        else if (activeTab === "transfers") await deleteTransfer(destId, id)
        else if (activeTab === "dayPlans") await deletePresetDay(destId, id)
        loadItems()
    }

    const inputStyle = { background: '#FFFFFF', color: '#052210', border: '1px solid rgba(5,34,16,0.12)', outline: 'none' }
    const inputClass = "w-full px-4 py-3 rounded-xl font-sans text-sm"
    const labelClass = "font-sans text-xs tracking-wider uppercase mb-2 block"
    const labelStyle = { color: '#06a15c' }

    const renderForm = () => {
        if (activeTab === "hotels") {
            const roomCategories = formData.roomCategories || []

            const addRoomCategory = () => {
                setFormData({
                    ...formData,
                    roomCategories: [...roomCategories, {
                        roomType: "",
                        epPrice: 0,
                        cpPrice: 0,
                        mapPrice: 0,
                        apPrice: 0,
                        cwbPrice: 0,
                        cnbPrice: 0,
                        extraBedPrice: 0,
                    }]
                })
            }

            const updateRoomCategory = (idx: number, field: string, value: any) => {
                const updated = [...roomCategories]
                updated[idx] = { ...updated[idx], [field]: value }
                setFormData({ ...formData, roomCategories: updated })
            }

            const removeRoomCategory = (idx: number) => {
                const updated = roomCategories.filter((_: any, i: number) => i !== idx)
                setFormData({ ...formData, roomCategories: updated })
            }

            return (
                <div className="space-y-6">
                    {/* ── HOTEL DETAILS SECTION ── */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Hotel className="w-4 h-4" style={{ color: '#06a15c' }} />
                            <p className="font-sans text-xs tracking-wider uppercase font-bold" style={{ color: '#052210' }}>Hotel Details</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div><label className={labelClass} style={labelStyle}>Hotel Name *</label><input className={inputClass} style={inputStyle} placeholder="e.g. Grand Mir International" value={formData.hotelName || ""} onChange={e => setFormData({ ...formData, hotelName: e.target.value })} /></div>
                            <div>
                                <label className={labelClass} style={labelStyle}>Hotel Destination</label>
                                <select className={inputClass} style={inputStyle} value={formData.subDestination || ""} onChange={e => setFormData({ ...formData, subDestination: e.target.value })}>
                                    <option value="">Select location</option>
                                    {subDestinationList.map((loc: string) => <option key={loc} value={loc}>{loc}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass} style={labelStyle}>Hotel Category *</label>
                                {addingCustomCategory ? (
                                    <div className="flex gap-2">
                                        <input
                                            className={inputClass}
                                            style={inputStyle}
                                            placeholder="Enter new category"
                                            value={newCategoryInput}
                                            onChange={e => setNewCategoryInput(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') { e.preventDefault(); handleAddCustomCategory(); }
                                                if (e.key === 'Escape') { setAddingCustomCategory(false); setNewCategoryInput(""); }
                                            }}
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddCustomCategory}
                                            className="px-4 rounded-xl font-sans text-xs font-bold uppercase shrink-0 transition-all hover:scale-105"
                                            style={{ background: '#06a15c', color: '#fff' }}
                                        >Add</button>
                                        <button
                                            type="button"
                                            onClick={() => { setAddingCustomCategory(false); setNewCategoryInput(""); }}
                                            className="px-3 rounded-xl font-sans text-xs shrink-0"
                                            style={{ color: 'rgba(5,34,16,0.5)' }}
                                        >✕</button>
                                    </div>
                                ) : (
                                    <select
                                        className={inputClass}
                                        style={inputStyle}
                                        value={formData.category || ""}
                                        onChange={e => {
                                            if (e.target.value === "__add_custom__") {
                                                setAddingCustomCategory(true)
                                            } else {
                                                setFormData({ ...formData, category: e.target.value })
                                            }
                                        }}
                                    >
                                        <option value="">Select category</option>
                                        {allHotelCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                        <option value="__add_custom__">+ Add New Category</option>
                                    </select>
                                )}
                            </div>
                            <div><label className={labelClass} style={labelStyle}>Hotel Address</label><input className={inputClass} style={inputStyle} placeholder="e.g. 123 Main Street, City" value={formData.hotelAddress || ""} onChange={e => setFormData({ ...formData, hotelAddress: e.target.value })} /></div>
                            <div><label className={labelClass} style={labelStyle}>Vendor Contact</label><input className={inputClass} style={inputStyle} placeholder="Phone number" value={formData.vendorContact || ""} onChange={e => setFormData({ ...formData, vendorContact: e.target.value })} /></div>
                        </div>
                    </div>

                    {/* ── ROOM CATEGORIES SECTION ── */}
                    <div className="pt-4" style={{ borderTop: '1px solid rgba(5,34,16,0.1)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" style={{ color: '#06a15c' }} />
                                <p className="font-sans text-xs tracking-wider uppercase font-bold" style={{ color: '#052210' }}>Room Categories & Pricing</p>
                            </div>
                            <button
                                type="button"
                                onClick={addRoomCategory}
                                className="text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Room Category
                            </button>
                        </div>
                        {roomCategories.length === 0 ? (
                            <p className="font-sans text-xs italic py-4" style={{ color: 'rgba(5,34,16,0.4)' }}>No room categories added. Click "Add Room Category" to get started.</p>
                        ) : (
                            <div className="space-y-4">
                                {roomCategories.map((room: any, idx: number) => (
                                    <div key={idx} className="p-5 rounded-xl relative" style={{ background: '#ffffff', border: '1px solid rgba(5,34,16,0.08)' }}>
                                        <button
                                            type="button"
                                            onClick={() => removeRoomCategory(idx)}
                                            className="absolute top-3 right-3 p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="pr-10 mb-4">
                                            <label className="font-sans text-[10px] tracking-wider uppercase mb-1 block font-semibold" style={{ color: '#06a15c' }}>Room Type *</label>
                                            <input className={inputClass} style={inputStyle} placeholder="e.g. Deluxe, Suite, Standard" value={room.roomType || ""} onChange={e => updateRoomCategory(idx, 'roomType', e.target.value)} />
                                        </div>
                                        <p className="font-sans text-[10px] tracking-wider uppercase mb-3 font-medium" style={{ color: 'rgba(5,34,16,0.4)' }}>Pricing (per night)</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div><label className="font-sans text-[10px] tracking-wider uppercase mb-1 block" style={{ color: 'rgba(5,34,16,0.5)' }}>EP Price</label><input type="number" className={inputClass} style={inputStyle} placeholder="₹0" value={room.epPrice || ""} onChange={e => updateRoomCategory(idx, 'epPrice', Number(e.target.value))} /></div>
                                            <div><label className="font-sans text-[10px] tracking-wider uppercase mb-1 block" style={{ color: 'rgba(5,34,16,0.5)' }}>CP Price</label><input type="number" className={inputClass} style={inputStyle} placeholder="₹0" value={room.cpPrice || ""} onChange={e => updateRoomCategory(idx, 'cpPrice', Number(e.target.value))} /></div>
                                            <div><label className="font-sans text-[10px] tracking-wider uppercase mb-1 block" style={{ color: 'rgba(5,34,16,0.5)' }}>MAP Price</label><input type="number" className={inputClass} style={inputStyle} placeholder="₹0" value={room.mapPrice || ""} onChange={e => updateRoomCategory(idx, 'mapPrice', Number(e.target.value))} /></div>
                                            <div><label className="font-sans text-[10px] tracking-wider uppercase mb-1 block" style={{ color: 'rgba(5,34,16,0.5)' }}>AP Price</label><input type="number" className={inputClass} style={inputStyle} placeholder="₹0" value={room.apPrice || ""} onChange={e => updateRoomCategory(idx, 'apPrice', Number(e.target.value))} /></div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                                            <div><label className="font-sans text-[10px] tracking-wider uppercase mb-1 block" style={{ color: 'rgba(5,34,16,0.5)' }}>CWB Price<span className="normal-case ml-1" style={{ color: 'rgba(5,34,16,0.3)' }}>(Child w/ bed)</span></label><input type="number" className={inputClass} style={inputStyle} placeholder="₹0" value={room.cwbPrice || ""} onChange={e => updateRoomCategory(idx, 'cwbPrice', Number(e.target.value))} /></div>
                                            <div><label className="font-sans text-[10px] tracking-wider uppercase mb-1 block" style={{ color: 'rgba(5,34,16,0.5)' }}>CNB Price<span className="normal-case ml-1" style={{ color: 'rgba(5,34,16,0.3)' }}>(Child no bed)</span></label><input type="number" className={inputClass} style={inputStyle} placeholder="₹0" value={room.cnbPrice || ""} onChange={e => updateRoomCategory(idx, 'cnbPrice', Number(e.target.value))} /></div>
                                            <div><label className="font-sans text-[10px] tracking-wider uppercase mb-1 block" style={{ color: 'rgba(5,34,16,0.5)' }}>Extra Bed</label><input type="number" className={inputClass} style={inputStyle} placeholder="₹0" value={room.extraBedPrice || ""} onChange={e => updateRoomCategory(idx, 'extraBedPrice', Number(e.target.value))} /></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )
        }

        if (activeTab === "attractions") return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelClass} style={labelStyle}>Attraction Name *</label><input className={inputClass} style={inputStyle} placeholder="e.g. Mughal Gardens" value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                    <div>
                        <label className={labelClass} style={labelStyle}>Category</label>
                        <select className={inputClass} style={inputStyle} value={formData.category === "custom" ? "custom" : (formData.category || "")} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                            <option value="">Select category</option>
                            {ATTRACTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            {formData.category && !ATTRACTION_CATEGORIES.includes(formData.category) && formData.category !== "custom" && (
                                <option value={formData.category}>{formData.category}</option>
                            )}
                            <option value="custom">Add+ (Custom)</option>
                        </select>
                        {formData.category === "custom" && (
                            <input className={`${inputClass} mt-2`} style={inputStyle} placeholder="Enter custom category" value={formData.customCategory || ""} onChange={e => setFormData({ ...formData, customCategory: e.target.value })} autoFocus />
                        )}
                    </div>
                    <div className="md:col-span-2"><label className={labelClass} style={labelStyle}>Description</label><textarea className={`${inputClass} resize-none`} style={{ ...inputStyle, minHeight: '80px' }} placeholder="Brief description..." value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                    <div><label className={labelClass} style={labelStyle}>Entry Fee (₹)</label><input type="number" className={inputClass} style={inputStyle} placeholder="0" value={formData.entryFee || ""} onChange={e => setFormData({ ...formData, entryFee: Number(e.target.value) })} /></div>
                    <div><label className={labelClass} style={labelStyle}>Time Required</label><input className={inputClass} style={inputStyle} placeholder="e.g. 2 hours" value={formData.timeRequired || ""} onChange={e => setFormData({ ...formData, timeRequired: e.target.value })} /></div>
                </div>

                <div className="pt-4 border-t" style={{ borderColor: 'rgba(5,34,16,0.1)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <label className={labelClass} style={{ ...labelStyle, marginBottom: 0 }}>Activities Inside Attraction</label>
                        <button type="button" onClick={() => {
                            const acts = formData.activities || [];
                            setFormData({ ...formData, activities: [...acts, { name: "", price: 0, vehiclePrice: 0, description: "" }] });
                        }} className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Add Activity
                        </button>
                    </div>
                    {(!formData.activities || formData.activities.length === 0) ? (
                        <p className="font-sans text-xs italic" style={{ color: 'rgba(5,34,16,0.45)' }}>No activities added. Click "Add Activity" above.</p>
                    ) : (
                        <div className="space-y-4">
                            {formData.activities.map((act: any, idx: number) => (
                                <div key={idx} className="p-4 rounded-xl relative" style={{ background: '#ffffff', border: '1px solid rgba(5,34,16,0.08)' }}>
                                    <button type="button" onClick={() => {
                                        const acts = [...formData.activities];
                                        acts.splice(idx, 1);
                                        setFormData({ ...formData, activities: acts });
                                    }} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-10">
                                        <div><label className="font-sans text-[10px] tracking-wider uppercase mb-1 block" style={{ color: 'rgba(5,34,16,0.5)' }}>Activity Name</label><input className={inputClass} style={inputStyle} placeholder="e.g. Boat Ride" value={act.name || ""} onChange={e => { const acts = [...formData.activities]; acts[idx].name = e.target.value; setFormData({ ...formData, activities: acts }) }} /></div>
                                        <div><label className="font-sans text-[10px] tracking-wider uppercase mb-1 block" style={{ color: 'rgba(5,34,16,0.5)' }}>Price (₹)</label><input type="number" className={inputClass} style={inputStyle} placeholder="0" value={act.price || ""} onChange={e => { const acts = [...formData.activities]; acts[idx].price = Number(e.target.value); setFormData({ ...formData, activities: acts }) }} /></div>
                                        <div><label className="font-sans text-[10px] tracking-wider uppercase mb-1 block" style={{ color: 'rgba(5,34,16,0.5)' }}>Vehicle Price (₹)</label><input type="number" className={inputClass} style={inputStyle} placeholder="0" value={act.vehiclePrice || ""} onChange={e => { const acts = [...formData.activities]; acts[idx].vehiclePrice = Number(e.target.value); setFormData({ ...formData, activities: acts }) }} /></div>
                                        <div className="md:col-span-3"><label className="font-sans text-[10px] tracking-wider uppercase mb-1 block" style={{ color: 'rgba(5,34,16,0.5)' }}>Description</label><input className={inputClass} style={inputStyle} placeholder="Brief description..." value={act.description || ""} onChange={e => { const acts = [...formData.activities]; acts[idx].description = e.target.value; setFormData({ ...formData, activities: acts }) }} /></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )

        if (activeTab === "transfers") return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={labelClass} style={labelStyle}>Point Name *</label><input className={inputClass} style={inputStyle} placeholder="e.g. Srinagar Airport" value={formData.pointName || ""} onChange={e => setFormData({ ...formData, pointName: e.target.value })} /></div>
                <div>
                    <label className={labelClass} style={labelStyle}>Type *</label>
                    <select className={inputClass} style={inputStyle} value={formData.type || "Both"} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                        <option value="Both">Pickup & Drop (Both)</option>
                        <option value="Pickup">Pickup Only</option>
                        <option value="Drop">Drop Only</option>
                    </select>
                </div>
            </div>
        )

        if (activeTab === "vehicleRules") return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className={labelClass} style={labelStyle}>Vehicle Name *</label><input className={inputClass} style={inputStyle} placeholder="e.g. Sedan, Innova, Tempo" value={formData.vehicleName || ""} onChange={e => setFormData({ ...formData, vehicleName: e.target.value })} /></div>
                <div><label className={labelClass} style={labelStyle}>Min Passengers</label><input type="number" className={inputClass} style={inputStyle} placeholder="1" value={formData.minPax || ""} onChange={e => setFormData({ ...formData, minPax: Number(e.target.value) })} /></div>
                <div><label className={labelClass} style={labelStyle}>Max Passengers</label><input type="number" className={inputClass} style={inputStyle} placeholder="6" value={formData.maxPax || ""} onChange={e => setFormData({ ...formData, maxPax: Number(e.target.value) })} /></div>
            </div>
        )

        if (activeTab === "activities") return null // Deprecated

        if (activeTab === "dayPlans") return (
            <div className="grid grid-cols-1 gap-4">
                <div><label className={labelClass} style={labelStyle}>Day Title *</label><input className={inputClass} style={inputStyle} placeholder="e.g. Arrival in Dubai" value={formData.title || ""} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
                <div><label className={labelClass} style={labelStyle}>Description</label><textarea className={`${inputClass} resize-none`} style={{ ...inputStyle, minHeight: '80px' }} placeholder="Detailed day plan..." value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <label className={labelClass} style={labelStyle}>Sub Destination</label>
                        <div className="relative group">
                            <input 
                                className={`${inputClass} pr-10`} 
                                style={inputStyle} 
                                placeholder="e.g. Havelock"
                                value={formData.subDestination || ""} 
                                onFocus={() => { setOpenSubDestDropdown(true); setLocalSubDestSearch(""); }}
                                onBlur={() => setTimeout(() => setOpenSubDestDropdown(false), 200)}
                                onChange={e => { 
                                    setFormData({ ...formData, subDestination: e.target.value });
                                    setLocalSubDestSearch(e.target.value);
                                }}
                            />
                            <button 
                                type="button" 
                                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80 transition-opacity"
                                onClick={() => setOpenSubDestDropdown(!openSubDestDropdown)}
                            >
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openSubDestDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {openSubDestDropdown && (
                                <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-56 overflow-auto py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {subDestinationList
                                        .filter((loc: string) => !localSubDestSearch || loc.toLowerCase().includes(localSubDestSearch.toLowerCase()))
                                        .map((loc: string) => (
                                            <div 
                                                key={loc} 
                                                className="px-4 py-2.5 hover:bg-emerald-50 text-sm font-sans cursor-pointer transition-colors flex items-center justify-between"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setFormData({ ...formData, subDestination: loc });
                                                    setOpenSubDestDropdown(false);
                                                }}
                                            >
                                                <span style={{ color: '#052210' }}>{loc}</span>
                                                {formData.subDestination === loc && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                            </div>
                                        ))}
                                    {localSubDestSearch && !subDestinationList.includes(localSubDestSearch) && (
                                        <div 
                                            className="px-4 py-2.5 hover:bg-emerald-50 text-sm font-sans cursor-pointer italic text-emerald-600 flex items-center justify-between"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setFormData({ ...formData, subDestination: localSubDestSearch });
                                                setOpenSubDestDropdown(false);
                                            }}
                                        >
                                            Add "{localSubDestSearch}"
                                            <Plus className="w-3.5 h-3.5" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative">
                        <label className={labelClass} style={labelStyle}>Overnight Stay Location</label>
                        <div className="relative group">
                            <input 
                                className={`${inputClass} pr-10`} 
                                style={inputStyle} 
                                placeholder="e.g. Havelock"
                                value={formData.overnightStay || ""} 
                                onFocus={() => { setOpenOvernightDropdown(true); setLocalOvernightSearch(""); }}
                                onBlur={() => setTimeout(() => setOpenOvernightDropdown(false), 200)}
                                onChange={e => { 
                                    setFormData({ ...formData, overnightStay: e.target.value });
                                    setLocalOvernightSearch(e.target.value);
                                }}
                            />
                            <button 
                                type="button" 
                                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80 transition-opacity"
                                onClick={() => setOpenOvernightDropdown(!openOvernightDropdown)}
                            >
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openOvernightDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {openOvernightDropdown && (
                                <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-56 overflow-auto py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {subDestinationList
                                        .filter((loc: string) => !localOvernightSearch || loc.toLowerCase().includes(localOvernightSearch.toLowerCase()))
                                        .map((loc: string) => (
                                            <div 
                                                key={loc} 
                                                className="px-4 py-2.5 hover:bg-emerald-50 text-sm font-sans cursor-pointer transition-colors flex items-center justify-between"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setFormData({ ...formData, overnightStay: loc });
                                                    setOpenOvernightDropdown(false);
                                                }}
                                            >
                                                <span style={{ color: '#052210' }}>{loc}</span>
                                                {formData.overnightStay === loc && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                            </div>
                                        ))}
                                    {localOvernightSearch && !subDestinationList.includes(localOvernightSearch) && (
                                        <div 
                                            className="px-4 py-2.5 hover:bg-emerald-50 text-sm font-sans cursor-pointer italic text-emerald-600 flex items-center justify-between"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setFormData({ ...formData, overnightStay: localOvernightSearch });
                                                setOpenOvernightDropdown(false);
                                            }}
                                        >
                                            Add "{localOvernightSearch}"
                                            <Plus className="w-3.5 h-3.5" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                


                <div><label className={labelClass} style={labelStyle}>Highlights (comma-separated)</label><input className={inputClass} style={inputStyle} placeholder="Burj Khalifa, Desert Safari" value={Array.isArray(formData.highlights) ? formData.highlights.join(", ") : formData.highlights || ""} onChange={e => setFormData({ ...formData, highlights: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'rgba(5,34,16,0.1)' }}>
                    <div><label className={labelClass} style={labelStyle}>Optional Pricing (₹)</label><input type="number" className={inputClass} style={inputStyle} placeholder="e.g. 5000" value={formData.optionalPrice || ""} onChange={e => setFormData({ ...formData, optionalPrice: Number(e.target.value) })} /></div>
                    <div><label className={labelClass} style={labelStyle}>Optional Pricing Description</label><input className={inputClass} style={inputStyle} placeholder="e.g. VIP Upgrade" value={formData.optionalPriceDescription || ""} onChange={e => setFormData({ ...formData, optionalPriceDescription: e.target.value })} /></div>
                </div>
            </div>
        )
    }

    const renderItemSummary = (item: any) => {
        if (activeTab === "hotels") {
            const roomCount = item.roomCategories?.length || 0
            const roomTypes = (item.roomCategories || []).map((r: any) => r.roomType).filter(Boolean).join(", ")
            const extras = [item.category, item.subDestination].filter(Boolean).join(" · ")
            return `${extras || "—"} · ${roomCount} Room${roomCount !== 1 ? "s" : ""}${roomTypes ? ` (${roomTypes})` : ""}`
        }
        if (activeTab === "attractions") {
            const actCount = item.activities?.length || 0;
            return `${item.category || "—"} · ${item.timeRequired || "—"} · Entry: ₹${item.entryFee || 0} ${actCount > 0 ? `· ${actCount} Activities` : ''}`
        }
        if (activeTab === "activities") return `₹${item.price || 0} · ${item.description?.substring(0, 40) || "—"}`
        if (activeTab === "vehicleRules") return `${item.minPax || 0}-${item.maxPax || 0} pax`
        if (activeTab === "transfers") return `${item.type || "—"}`
        if (activeTab === "dayPlans") return `${item.description?.substring(0, 60) || "—"}`
        return "—"
    }

    const getItemName = (item: any) => {
        if (activeTab === "hotels") return item.hotelName || item.name || "Unnamed"
        if (activeTab === "transfers") return item.pointName || "Unnamed"
        if (activeTab === "vehicleRules") return item.vehicleName || item.vehicleType || "Unnamed"
        if (activeTab === "dayPlans") return item.title || "Unnamed Day"
        return item.name || "Unnamed"
    }

    if (!dest && !loading) return (
        <div className="text-center py-20">
            <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>Destination not found</p>
        </div>
    )

    if (!dest) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} />
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Back + Title */}
            <div>
                <Link href="/admin/destinations" className="inline-flex items-center gap-2 mb-4 font-sans text-xs tracking-wider uppercase" style={{ color: '#06a15c' }}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to destinations
                </Link>
                <h1 className="font-serif text-3xl tracking-wide" style={{ color: '#052210' }}>{destName || dest.name}</h1>
                <p className="font-sans text-sm mt-0.5" style={{ color: 'rgba(5,34,16,0.5)' }}>
                    {[state, country].filter(Boolean).join(", ")}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setShowForm(false); setPreviewingId(null) }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs tracking-wider uppercase whitespace-nowrap transition-all"
                        style={{
                            background: activeTab === tab.key ? 'rgba(6,161,92,0.08)' : 'transparent',
                            color: activeTab === tab.key ? '#052210' : 'rgba(5,34,16,0.45)',
                            border: activeTab === tab.key ? '1px solid rgba(6,161,92,0.2)' : '1px solid transparent',
                            fontWeight: activeTab === tab.key ? '600' : '400',
                        }}
                    >
                        <tab.icon className="w-4 h-4" style={{ color: activeTab === tab.key ? '#06a15c' : undefined }} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* ━━━ OVERVIEW TAB ━━━ */}
            {activeTab === "overview" && (
                <div className="rounded-2xl p-6 md:p-8 space-y-8" style={{ background: '#f8faf9', border: '1px solid rgba(5,34,16,0.08)' }}>
                    <h2 className="font-serif text-xl tracking-wide" style={{ color: '#052210' }}>Destination Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div><label className={labelClass} style={labelStyle}>Destination Name</label><input className={inputClass} style={inputStyle} value={destName} onChange={e => setDestName(e.target.value)} /></div>
                        <div>
                            <label className={labelClass} style={labelStyle}>Currency</label>
                            <select className={inputClass} style={inputStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
                                <option value="INR">INR</option><option value="AED">AED</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
                                <option value="THB">THB</option><option value="SGD">SGD</option><option value="MYR">MYR</option><option value="LKR">LKR</option><option value="MVR">MVR</option>
                            </select>
                        </div>
                        <div><label className={labelClass} style={labelStyle}>Country</label><input className={inputClass} style={inputStyle} value={country} onChange={e => setCountry(e.target.value)} /></div>
                        <div><label className={labelClass} style={labelStyle}>State</label><input className={inputClass} style={inputStyle} value={state} onChange={e => setState(e.target.value)} /></div>
                        <div><label className={labelClass} style={labelStyle}>Cover Image URL</label><input className={inputClass} style={inputStyle} value={coverImage} onChange={e => setCoverImage(e.target.value)} /></div>
                    </div>
                    {coverImage && (
                        <div className="w-60 h-40 rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(5,34,16,0.1)' }}>
                            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label className={labelClass} style={labelStyle}>Sub Destinations</label>
                        <div className="flex gap-2">
                            <input
                                className={inputClass}
                                style={inputStyle}
                                placeholder="e.g. Havelock"
                                value={newSubDestination}
                                onChange={e => setNewSubDestination(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        if (newSubDestination.trim()) {
                                            setSubDestinationList([...subDestinationList, newSubDestination.trim()])
                                            setNewSubDestination("")
                                        }
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (newSubDestination.trim()) {
                                        setSubDestinationList([...subDestinationList, newSubDestination.trim()])
                                        setNewSubDestination("")
                                    }
                                }}
                                className="px-5 rounded-xl font-sans text-xs font-bold uppercase transition-all hover:scale-105"
                                style={{ background: '#052210', color: '#fff' }}
                            >
                                Add
                            </button>
                        </div>
                        {subDestinationList.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {subDestinationList.map((loc, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#ecfdf5', color: '#052210', border: '1px solid #a7f3d0' }}>
                                        <span>{loc}</span>
                                        <button onClick={() => setSubDestinationList(subDestinationList.filter((_, i) => i !== idx))}><Trash2 className="w-3.5 h-3.5 text-red-500 hover:text-red-700" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className={labelClass} style={labelStyle}>Description</label>
                        <textarea className={`${inputClass} resize-none`} style={{ ...inputStyle, minHeight: '100px' }} value={description} onChange={e => setDescription(e.target.value)} />
                    </div>

                    {/* PDF Template Section */}
                    <div className="pt-6 mt-6" style={{ borderTop: '1px solid rgba(5,34,16,0.1)' }}>
                        <div className="flex items-center gap-3 mb-6">
                            <FileText className="w-5 h-5" style={{ color: '#06a15c' }} />
                            <h2 className="font-serif text-xl tracking-wide" style={{ color: '#052210' }}>PDF Template</h2>
                        </div>
                        <p className="font-sans text-xs mb-6" style={{ color: 'rgba(5,34,16,0.45)' }}>
                            Pre-built content for vouchers and PDF exports. Enter each item on a new line.
                        </p>
                        <div className="space-y-5">
                            <div><label className={labelClass} style={labelStyle}>Tagline</label><input className={inputClass} style={inputStyle} placeholder="e.g. A paradise where two hearts find endless romance" value={tagline} onChange={e => setTagline(e.target.value)} /></div>
                            <div><label className={labelClass} style={labelStyle}>Inclusions (one per line)</label><textarea className={`${inputClass} resize-none`} style={{ ...inputStyle, minHeight: '100px' }} placeholder={"Accommodation as per itinerary\nMeals as per selected meal plan\nAll transfers as mentioned"} value={inclusions} onChange={e => setInclusions(e.target.value)} /></div>
                            <div><label className={labelClass} style={labelStyle}>Exclusions (one per line)</label><textarea className={`${inputClass} resize-none`} style={{ ...inputStyle, minHeight: '100px' }} placeholder={"Airfare / Train fare\nPersonal expenses\nTravel insurance"} value={exclusions} onChange={e => setExclusions(e.target.value)} /></div>
                            <div><label className={labelClass} style={labelStyle}>Important Notes (one per line)</label><textarea className={`${inputClass} resize-none`} style={{ ...inputStyle, minHeight: '80px' }} value={importantNotes} onChange={e => setImportantNotes(e.target.value)} /></div>
                            <div><label className={labelClass} style={labelStyle}>Terms & Conditions (one per line)</label><textarea className={`${inputClass} resize-none`} style={{ ...inputStyle, minHeight: '120px' }} value={termsAndConditions} onChange={e => setTermsAndConditions(e.target.value)} /></div>
                            <div><label className={labelClass} style={labelStyle}>Payment Policy (one per line)</label><textarea className={`${inputClass} resize-none`} style={{ ...inputStyle, minHeight: '80px' }} value={paymentPolicy} onChange={e => setPaymentPolicy(e.target.value)} /></div>
                            <div><label className={labelClass} style={labelStyle}>Cancellation Policy (one per line)</label><textarea className={`${inputClass} resize-none`} style={{ ...inputStyle, minHeight: '80px' }} value={cancellationPolicy} onChange={e => setCancellationPolicy(e.target.value)} /></div>
                        </div>
                    </div>

                    <button
                        onClick={handleSaveOverview}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-sans text-xs tracking-wider uppercase transition-all hover:scale-105 disabled:opacity-50"
                        style={{ background: '#06a15c', color: '#FFFFFF' }}
                    >
                        <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            )}

            {/* ━━━ SUB-COLLECTION TABS ━━━ */}
            {activeTab !== "overview" && (
                <>
                    <button
                        onClick={() => { setShowForm(!showForm); setFormData({}); setEditingId(null); }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs tracking-wider uppercase"
                        style={{ background: '#06a15c', color: '#FFFFFF' }}
                    >
                        <Plus className="w-4 h-4" /> Add {activeTab === "vehicleRules" ? "Vehicle Rule" : activeTab === "transfers" ? "Transfer Point" : activeTab.slice(0, -1).replace(/^\w/, c => c.toUpperCase())}
                    </button>

                    {showForm && (
                        <div className="rounded-2xl p-6 space-y-4" style={{ background: '#f8faf9', border: '1px solid rgba(5,34,16,0.08)' }}>
                            {renderForm()}
                            <div className="flex gap-3 pt-2">
                                <button onClick={handleSave} className="px-6 py-2.5 rounded-xl font-sans text-xs tracking-wider uppercase" style={{ background: '#06a15c', color: '#FFFFFF' }}>{editingId ? "Update" : "Save"}</button>
                                <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-6 py-2.5 rounded-xl font-sans text-xs tracking-wider uppercase" style={{ color: 'rgba(5,34,16,0.5)' }}>Cancel</button>
                            </div>
                        </div>
                    )}

                    <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)' }}>
                        {loading ? (
                            <div className="px-6 py-8 text-center"><p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>Loading...</p></div>
                        ) : items.length === 0 ? (
                            <div className="px-6 py-8 text-center"><p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No {activeTab} added yet</p></div>
                        ) : items.map((item: any) => (
                            <div key={item.id} style={{ borderBottom: '1px solid rgba(5,34,16,0.05)' }}>
                                <div
                                    className={`px-6 py-4 flex items-center justify-between transition-colors ${activeTab === "hotels" ? "cursor-pointer" : ""} ${previewingId === item.id ? "bg-emerald-50/50" : "hover:bg-gray-50"}`}
                                    onClick={() => {
                                        if (activeTab === "hotels") {
                                            setPreviewingId(previewingId === item.id ? null : item.id)
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        {activeTab === "hotels" && (
                                            <div className="shrink-0">
                                                {previewingId === item.id
                                                    ? <ChevronUp className="w-4 h-4" style={{ color: '#06a15c' }} />
                                                    : <ChevronDown className="w-4 h-4" style={{ color: 'rgba(5,34,16,0.25)' }} />
                                                }
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{getItemName(item)}</p>
                                            <p className="font-sans text-xs mt-0.5" style={{ color: 'rgba(5,34,16,0.45)' }}>
                                                {renderItemSummary(item)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => handleEdit(item)} className="p-2 rounded-lg hover:bg-black/5 transition-colors">
                                            <FileEdit className="w-4 h-4" style={{ color: 'rgba(5,34,16,0.3)' }} />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
                                            <Trash2 className="w-4 h-4" style={{ color: 'rgba(5,34,16,0.3)' }} />
                                        </button>
                                    </div>
                                </div>

                                {/* ── HOTEL PREVIEW PANEL ── */}
                                {activeTab === "hotels" && previewingId === item.id && (
                                    <div className="px-6 pb-5 pt-1" style={{ background: 'linear-gradient(180deg, rgba(6,161,92,0.03) 0%, rgba(248,250,249,1) 100%)' }}>
                                        <div className="rounded-xl p-5 space-y-5" style={{ background: '#ffffff', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 1px 4px rgba(5,34,16,0.04)' }}>
                                            {/* Hotel Info Header */}
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Hotel className="w-4 h-4" style={{ color: '#06a15c' }} />
                                                        <p className="font-sans text-xs tracking-wider uppercase font-bold" style={{ color: '#052210' }}>Hotel Details</p>
                                                    </div>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); setPreviewingId(null) }} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors">
                                                    <X className="w-4 h-4" style={{ color: 'rgba(5,34,16,0.3)' }} />
                                                </button>
                                            </div>

                                            {/* Hotel Details Grid */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <p className="font-sans text-[10px] tracking-wider uppercase mb-1" style={{ color: 'rgba(5,34,16,0.4)' }}>Category</p>
                                                    <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>
                                                        {item.category ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>{item.category}</span>
                                                        ) : "—"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="font-sans text-[10px] tracking-wider uppercase mb-1" style={{ color: 'rgba(5,34,16,0.4)' }}>Destination</p>
                                                    <p className="font-sans text-sm" style={{ color: '#052210' }}>
                                                        {item.subDestination ? (
                                                            <span className="inline-flex items-center gap-1"><MapPinned className="w-3 h-3" style={{ color: '#06a15c' }} />{item.subDestination}</span>
                                                        ) : "—"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="font-sans text-[10px] tracking-wider uppercase mb-1" style={{ color: 'rgba(5,34,16,0.4)' }}>Address</p>
                                                    <p className="font-sans text-sm" style={{ color: '#052210' }}>{item.hotelAddress || "—"}</p>
                                                </div>
                                                <div>
                                                    <p className="font-sans text-[10px] tracking-wider uppercase mb-1" style={{ color: 'rgba(5,34,16,0.4)' }}>Vendor Contact</p>
                                                    <p className="font-sans text-sm" style={{ color: '#052210' }}>
                                                        {item.vendorContact ? (
                                                            <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" style={{ color: '#06a15c' }} />{item.vendorContact}</span>
                                                        ) : "—"}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Room Categories */}
                                            {item.roomCategories && item.roomCategories.length > 0 ? (
                                                <div className="pt-3" style={{ borderTop: '1px solid rgba(5,34,16,0.06)' }}>
                                                    <p className="font-sans text-xs tracking-wider uppercase font-bold mb-3" style={{ color: '#052210' }}>Room Categories ({item.roomCategories.length})</p>
                                                    <div className="space-y-3">
                                                        {item.roomCategories.map((room: any, idx: number) => (
                                                            <div key={idx} className="rounded-lg p-4" style={{ background: '#f8faf9', border: '1px solid rgba(5,34,16,0.06)' }}>
                                                                <p className="font-sans text-sm font-bold mb-3" style={{ color: '#052210' }}>
                                                                    {room.roomType || `Room Category ${idx + 1}`}
                                                                </p>
                                                                <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                                                                    {[
                                                                        { label: "EP", value: room.epPrice },
                                                                        { label: "CP", value: room.cpPrice },
                                                                        { label: "MAP", value: room.mapPrice },
                                                                        { label: "AP", value: room.apPrice },
                                                                        { label: "CWB", value: room.cwbPrice },
                                                                        { label: "CNB", value: room.cnbPrice },
                                                                        { label: "Extra Bed", value: room.extraBedPrice },
                                                                    ].map(p => (
                                                                        <div key={p.label} className="text-center">
                                                                            <p className="font-sans text-[9px] tracking-wider uppercase mb-0.5" style={{ color: 'rgba(5,34,16,0.4)' }}>{p.label}</p>
                                                                            <p className="font-sans text-sm font-bold" style={{ color: p.value ? '#052210' : 'rgba(5,34,16,0.2)' }}>₹{p.value || 0}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="pt-3" style={{ borderTop: '1px solid rgba(5,34,16,0.06)' }}>
                                                    <p className="font-sans text-xs italic" style={{ color: 'rgba(5,34,16,0.35)' }}>No room categories configured for this hotel.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
