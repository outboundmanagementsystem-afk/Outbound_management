"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getCustomers, createCustomer, getCustomerByPhone, getItineraries } from "@/lib/firestore"
import { Search, Plus, X, Phone, Mail, User, FileText, MapPin, Calendar } from "lucide-react"

export default function CustomersPage() {
    return (
        <ProtectedRoute allowedRoles={["admin", "sales", "sales_lead"]}>
            <CustomersContent />
        </ProtectedRoute>
    )
}

function CustomersContent() {
    const [customers, setCustomers] = useState<any[]>([])
    const [itineraries, setItineraries] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [newForm, setNewForm] = useState({ name: "", phone: "", email: "" })

    useEffect(() => { loadData() }, [])
    const loadData = async () => {
        try {
            const [c, i] = await Promise.all([getCustomers(), getItineraries()])
            setCustomers(c); setItineraries(i)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    // Merge itineraries with customers by phone
    const enrichedCustomers = customers.map(c => {
        const trips = itineraries.filter((i: any) => i.customerPhone === c.phone || i.customerId === c.id)
        return { ...c, tripCount: trips.length, totalRevenue: trips.reduce((s: number, i: any) => s + Math.round((Number(i.totalPrice) || 0) * ((Number(i.margin) || 15) / (100 + (Number(i.margin) || 15)))), 0), trips }
    })

    const filtered = enrichedCustomers.filter(c => {
        const q = search.toLowerCase()
        return !q || (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q) || (c.email || "").toLowerCase().includes(q)
    })

    const handleAdd = async () => {
        if (!newForm.name.trim() || !newForm.phone.trim()) return
        try {
            const existing = await getCustomerByPhone(newForm.phone)
            if (existing) { alert("Customer with this phone already exists!"); return }
            await createCustomer(newForm)
            setShowAddModal(false)
            setNewForm({ name: "", phone: "", email: "" })
            loadData()
        } catch (e) { console.error(e) }
    }

    const selectCustomer = (c: any) => {
        const trips = itineraries.filter((i: any) => i.customerPhone === c.phone || i.customerId === c.id)
        setSelectedCustomer({ ...c, trips })
    }

    return (
        <div className="space-y-6 max-w-6xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="font-serif text-3xl tracking-wide" style={{ color: '#052210' }}>Customers</h1>
                    <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>CRM · {customers.length} total customers</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-sans text-xs font-bold tracking-wider uppercase" style={{ background: '#052210', color: '#fff' }}>
                    <Plus className="w-3.5 h-3.5" /> Add Customer
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(5,34,16,0.3)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-2xl font-sans text-sm" placeholder="Search by name, phone, or email..." style={{ border: '1px solid rgba(5,34,16,0.08)', outline: 'none', background: '#fff' }} />
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} /></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Customer List */}
                    <div className="lg:col-span-2 space-y-3">
                        {filtered.length === 0 ? (
                            <div className="text-center py-16 rounded-2xl" style={{ background: '#fff', border: '1px solid rgba(5,34,16,0.06)' }}>
                                <User className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(5,34,16,0.15)' }} />
                                <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>{search ? "No customers match your search" : "No customers yet"}</p>
                            </div>
                        ) : filtered.map(c => (
                            <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left rounded-2xl p-5 transition-all hover:-translate-y-0.5" style={{ background: selectedCustomer?.id === c.id ? 'rgba(6,161,92,0.04)' : '#fff', border: `1px solid ${selectedCustomer?.id === c.id ? 'rgba(6,161,92,0.2)' : 'rgba(5,34,16,0.06)'}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-sans text-sm font-bold" style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c' }}>
                                            {(c.name || "?")[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{c.name}</p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="font-sans text-[11px] flex items-center gap-1" style={{ color: 'rgba(5,34,16,0.4)' }}><Phone className="w-3 h-3" />{c.phone}</span>
                                                {c.email && <span className="font-sans text-[11px] flex items-center gap-1" style={{ color: 'rgba(5,34,16,0.4)' }}><Mail className="w-3 h-3" />{c.email}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-sans text-xs font-bold" style={{ color: '#06a15c' }}>{c.tripCount} trips</p>
                                        {c.totalRevenue > 0 && <p className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>₹{c.totalRevenue.toLocaleString()}</p>}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Customer Detail Panel */}
                    <div className="lg:col-span-1">
                        {selectedCustomer ? (
                            <div className="rounded-2xl p-6 sticky top-6" style={{ background: '#fff', border: '1px solid rgba(5,34,16,0.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 font-serif text-xl font-bold" style={{ background: 'rgba(6,161,92,0.1)', color: '#06a15c' }}>
                                        {(selectedCustomer.name || "?")[0]?.toUpperCase()}
                                    </div>
                                    <h3 className="font-serif text-lg" style={{ color: '#052210' }}>{selectedCustomer.name}</h3>
                                    <p className="font-sans text-xs mt-1" style={{ color: 'rgba(5,34,16,0.4)' }}>{selectedCustomer.phone}</p>
                                </div>

                                <h4 className="font-sans text-[10px] font-bold tracking-wider uppercase mb-3" style={{ color: 'rgba(5,34,16,0.4)' }}>Trip History</h4>
                                {selectedCustomer.trips?.length === 0 ? (
                                    <p className="font-sans text-xs text-center py-6" style={{ color: 'rgba(5,34,16,0.3)' }}>No trips yet</p>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedCustomer.trips?.map((t: any) => (
                                            <div key={t.id} className="p-3 rounded-xl" style={{ background: 'rgba(5,34,16,0.02)', border: '1px solid rgba(5,34,16,0.04)' }}>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-sans text-xs font-semibold" style={{ color: '#052210' }}>{t.destination || "—"}</span>
                                                    <span className="px-2 py-0.5 rounded-full font-sans text-[9px] font-bold uppercase" style={{ background: `${t.status === 'confirmed' ? '#34d399' : t.status === 'completed' ? '#06a15c' : '#9ca3af'}15`, color: t.status === 'confirmed' ? '#34d399' : t.status === 'completed' ? '#06a15c' : '#9ca3af' }}>{t.status}</span>
                                                </div>
                                                <div className="flex gap-3 mt-1">
                                                    <span className="font-sans text-[10px]" style={{ color: 'rgba(5,34,16,0.4)' }}>{t.nights}N/{t.days}D</span>
                                                    {t.quoteId && <span className="font-sans text-[10px] font-bold" style={{ color: '#06a15c' }}>{t.quoteId}</span>}
                                                    {t.totalPrice && <span className="font-sans text-[10px] font-bold" style={{ color: '#052210' }}>₹{Number(t.totalPrice).toLocaleString()}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-2xl p-8 text-center" style={{ background: '#fff', border: '1px solid rgba(5,34,16,0.06)' }}>
                                <User className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(5,34,16,0.15)' }} />
                                <p className="font-sans text-xs" style={{ color: 'rgba(5,34,16,0.3)' }}>Select a customer to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add Customer Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#fff' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-serif text-xl" style={{ color: '#052210' }}>Add Customer</h2>
                            <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" style={{ color: 'rgba(5,34,16,0.3)' }} /></button>
                        </div>
                        <div className="space-y-3">
                            <input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl font-sans text-sm" placeholder="Customer Name" style={{ border: '1px solid rgba(5,34,16,0.1)', outline: 'none' }} />
                            <input value={newForm.phone} onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl font-sans text-sm" placeholder="Phone Number" style={{ border: '1px solid rgba(5,34,16,0.1)', outline: 'none' }} />
                            <input value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl font-sans text-sm" placeholder="Email (optional)" style={{ border: '1px solid rgba(5,34,16,0.1)', outline: 'none' }} />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl font-sans text-xs font-bold tracking-wider uppercase" style={{ border: '1px solid rgba(5,34,16,0.1)', color: 'rgba(5,34,16,0.5)' }}>Cancel</button>
                            <button onClick={handleAdd} className="flex-1 py-2.5 rounded-xl font-sans text-xs font-bold tracking-wider uppercase" style={{ background: '#052210', color: '#fff' }}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
