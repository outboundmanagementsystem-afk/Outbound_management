"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getDestinations, createDestination, deleteDestination } from "@/lib/firestore"
import Link from "next/link"
import { MapPin, Plus, Trash2, ChevronRight, Globe, Search } from "lucide-react"

export default function DestinationsPage() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <DestinationsContent />
        </ProtectedRoute>
    )
}

function DestinationsContent() {
    const [destinations, setDestinations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [search, setSearch] = useState("")

    // New destination form fields
    const [newDestName, setNewDestName] = useState("")
    const [newCountry, setNewCountry] = useState("")
    const [newState, setNewState] = useState("")
    const [newCurrency, setNewCurrency] = useState("INR")
    const [newDescription, setNewDescription] = useState("")
    const [newCoverImage, setNewCoverImage] = useState("")

    useEffect(() => { loadDestinations() }, [])

    const loadDestinations = async () => {
        try {
            const dests = await getDestinations()
            setDestinations(dests)
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const handleAdd = async () => {
        if (!newDestName.trim()) return
        await createDestination({
            destinationName: newDestName.trim(),
            country: newCountry.trim(),
            state: newState.trim(),
            currency: newCurrency.trim(),
            description: newDescription.trim(),
            coverImage: newCoverImage.trim(),
            name: newDestName.trim(),
        })
        setNewDestName("")
        setNewCountry("")
        setNewState("")
        setNewCurrency("INR")
        setNewDescription("")
        setNewCoverImage("")
        setShowAdd(false)
        loadDestinations()
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this destination?")) return
        await deleteDestination(id)
        loadDestinations()
    }

    const filtered = destinations.filter((d) => {
        const q = search.toLowerCase()
        return (d.destinationName || d.name || "").toLowerCase().includes(q) ||
            (d.country || "").toLowerCase().includes(q) ||
            (d.state || "").toLowerCase().includes(q)
    })

    const inputStyle = { background: '#f8faf9', color: '#052210', border: '1px solid rgba(5,34,16,0.12)', outline: 'none' }
    const inputClass = "w-full px-4 py-3 rounded-xl font-sans text-sm"

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="font-serif text-2xl sm:text-3xl tracking-wide truncate" style={{ color: '#052210' }}>Destination Database</h1>
                    <p className="font-sans text-xs sm:text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Manage your travel destinations with hotels, attractions, and more.</p>
                </div>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs tracking-wider uppercase transition-all duration-200 hover:scale-105 shrink-0 self-start sm:self-auto"
                    style={{ background: '#06a15c', color: '#FFFFFF' }}
                >
                    <Plus className="w-4 h-4" /> Add Destination
                </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(5,34,16,0.3)' }} />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search destinations..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl font-sans text-sm"
                    style={inputStyle}
                />
            </div>

            {/* Add form */}
            {showAdd && (
                <div className="rounded-2xl p-6" style={{ background: '#f8faf9', border: '1px solid rgba(5,34,16,0.08)' }}>
                    <h3 className="font-serif text-lg mb-4" style={{ color: '#06a15c' }}>New Destination</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input className={inputClass} style={{ ...inputStyle, background: '#FFFFFF' }} placeholder="Destination Name (e.g. Kashmir)" value={newDestName} onChange={(e) => setNewDestName(e.target.value)} />
                        <input className={inputClass} style={{ ...inputStyle, background: '#FFFFFF' }} placeholder="Country (e.g. India)" value={newCountry} onChange={(e) => setNewCountry(e.target.value)} />
                        <input className={inputClass} style={{ ...inputStyle, background: '#FFFFFF' }} placeholder="State (e.g. Jammu & Kashmir)" value={newState} onChange={(e) => setNewState(e.target.value)} />
                        <select className={inputClass} style={{ ...inputStyle, background: '#FFFFFF' }} value={newCurrency} onChange={(e) => setNewCurrency(e.target.value)}>
                            <option value="INR">INR — Indian Rupee</option>
                            <option value="AED">AED — UAE Dirham</option>
                            <option value="USD">USD — US Dollar</option>
                            <option value="EUR">EUR — Euro</option>
                            <option value="GBP">GBP — British Pound</option>
                            <option value="THB">THB — Thai Baht</option>
                            <option value="SGD">SGD — Singapore Dollar</option>
                            <option value="MYR">MYR — Malaysian Ringgit</option>
                            <option value="LKR">LKR — Sri Lankan Rupee</option>
                            <option value="MVR">MVR — Maldivian Rufiyaa</option>
                        </select>
                        <input className={inputClass} style={{ ...inputStyle, background: '#FFFFFF' }} placeholder="Cover Image URL (optional)" value={newCoverImage} onChange={(e) => setNewCoverImage(e.target.value)} />
                        <textarea className={`${inputClass} resize-none`} style={{ ...inputStyle, background: '#FFFFFF', minHeight: '80px' }} placeholder="Description" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={handleAdd} className="px-6 py-2.5 rounded-xl font-sans text-xs tracking-wider uppercase" style={{ background: '#06a15c', color: '#FFFFFF' }}>Save</button>
                        <button onClick={() => setShowAdd(false)} className="px-6 py-2.5 rounded-xl font-sans text-xs tracking-wider uppercase" style={{ color: 'rgba(5,34,16,0.5)' }}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {loading ? (
                    <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>Loading...</p>
                ) : filtered.length === 0 ? (
                    <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No destinations found.</p>
                ) : filtered.map((dest) => (
                    <div
                        key={dest.id}
                        className="rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 w-full min-w-0"
                        style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
                    >
                        {/* Cover image or placeholder */}
                        {dest.coverImage ? (
                            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                                <img src={dest.coverImage} alt={dest.destinationName || dest.name} className="absolute inset-0 w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-full flex items-center justify-center" style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #f0f7f3, #e8f5ed, #dff0e6)' }}>
                                <Globe className="w-10 h-10" style={{ color: 'rgba(6,161,92,0.25)' }} />
                            </div>
                        )}
                        <div className="p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-2 min-w-0">
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-serif text-lg sm:text-xl tracking-wide truncate" style={{ color: '#052210' }}>{dest.destinationName || dest.name}</h3>
                                    <p className="font-sans text-xs mt-0.5 truncate" style={{ color: 'rgba(5,34,16,0.5)' }}>
                                        {[dest.state, dest.country].filter(Boolean).join(", ") || "—"}
                                    </p>
                                </div>
                                <button onClick={() => handleDelete(dest.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0">
                                    <Trash2 className="w-4 h-4" style={{ color: 'rgba(5,34,16,0.3)' }} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between mt-4 gap-2">
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full font-sans text-[10px] tracking-wider uppercase shrink-0"
                                    style={{ background: 'rgba(6,161,92,0.08)', color: '#06a15c', border: '1px solid rgba(6,161,92,0.15)' }}>
                                    <Globe className="w-3 h-3" /> {dest.currency || "INR"}
                                </span>
                                <Link
                                    href={`/admin/destinations/${dest.id}`}
                                    className="flex items-center gap-1 font-sans text-xs tracking-wider uppercase transition-colors shrink-0"
                                    style={{ color: '#06a15c' }}
                                >
                                    Manage <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
