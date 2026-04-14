"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getUsers, preRegisterUser, updateUser, deleteUser, generateEmployeeCode } from "@/lib/firestore"
import type { UserRole } from "@/lib/auth-context"
import { Users, Plus, Shield, Briefcase, Wrench, Crown, UserCog, Trash2, Edit3, X, Search, ChevronDown, ChevronRight, Phone, Mail, Hash, Receipt } from "lucide-react"

const roleLabels: Record<string, string> = {
    admin: "Admin", owner: "Owner",
    sales_lead: "Sales Team Lead", sales: "Sales",
    pre_ops_lead: "Pre-Ops Team Lead", post_ops_lead: "Post-Ops Team Lead",
    pre_ops: "Pre Operations", post_ops: "Post Operations",
    finance_lead: "Finance Team Lead", finance: "Finance"
}
const roleColors: Record<string, string> = {
    admin: "#f472b6", owner: "#8b5cf6",
    sales_lead: "#f59e0b", sales: "#06a15c",
    pre_ops_lead: "#0ea5e9", post_ops_lead: "#14b8a6",
    pre_ops: "#0284c7", post_ops: "#14b8a6",
    finance_lead: "#a78bfa", finance: "#7c3aed"
}
const roleIcons: Record<string, any> = {
    admin: Shield, owner: Crown,
    sales_lead: UserCog, sales: Briefcase,
    pre_ops_lead: UserCog, post_ops_lead: UserCog,
    pre_ops: Wrench, post_ops: Wrench,
    finance_lead: UserCog, finance: Receipt
}
const allRoles: UserRole[] = ["admin", "owner", "sales_lead", "sales", "pre_ops_lead", "pre_ops", "post_ops_lead", "post_ops", "finance_lead", "finance"]

export default function UsersPage() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <UsersContent />
        </ProtectedRoute>
    )
}

function UsersContent() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [showModal, setShowModal] = useState(false)
    const [editUser, setEditUser] = useState<any | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        owners: true, sales: true, operations: true, finance: true
    })

    // Form state
    const [formName, setFormName] = useState("")
    const [formEmail, setFormEmail] = useState("")
    const [formPhone, setFormPhone] = useState("")
    const [formRole, setFormRole] = useState<UserRole>("sales")
    const [formLeadId, setFormLeadId] = useState("")
    const [formCode, setFormCode] = useState("")
    const [codeLoading, setCodeLoading] = useState(false)

    useEffect(() => { loadUsers() }, [])

    const loadUsers = async () => {
        const u = await getUsers()
        setUsers(u)
        setLoading(false)
    }

    const getDepartment = (role: UserRole): "sales" | "operations" | "finance" | "" => {
        if (role === "sales_lead" || role === "sales") return "sales"
        if (role === "pre_ops" || role === "post_ops" || role === "pre_ops_lead" || role === "post_ops_lead") return "operations"
        if (role === "finance" || role === "finance_lead") return "finance"
        return ""
    }

    const openAddModal = () => {
        setEditUser(null)
        setFormName(""); setFormEmail(""); setFormPhone("")
        setFormRole("sales"); setFormLeadId(""); setFormCode("")
        setShowModal(true)
    }

    const openEditModal = (u: any) => {
        setEditUser(u)
        setFormName(u.name || ""); setFormEmail(u.email || ""); setFormPhone(u.phone || "")
        setFormRole(u.role || "sales"); setFormLeadId(u.leadId || ""); setFormCode(u.employeeCode || "")
        setShowModal(true)
    }

    const handleRoleChange = async (role: UserRole) => {
        setFormRole(role)
        if (formName.trim()) {
            setCodeLoading(true)
            const code = await generateEmployeeCode(role, formName)
            setFormCode(code)
            setCodeLoading(false)
        }
    }

    const handleNameBlur = async () => {
        if (formName.trim() && !editUser) {
            setCodeLoading(true)
            const code = await generateEmployeeCode(formRole, formName)
            setFormCode(code)
            setCodeLoading(false)
        }
    }

    const handleSave = async () => {
        if (!formName.trim() || !formEmail.trim()) return

        const department = getDepartment(formRole)

        if (editUser) {
            await updateUser(editUser.uid, {
                name: formName, email: formEmail, phone: formPhone, role: formRole,
                department, leadId: formLeadId, employeeCode: formCode
            })
        } else {
            await preRegisterUser(formEmail, formRole, formName, formCode, (department || undefined) as any, formLeadId || undefined, formPhone || undefined)
        }

        setShowModal(false)
        setEditUser(null)
        setLoading(true)
        await loadUsers()
    }

    const handleDelete = async (uid: string) => {
        await deleteUser(uid)
        setDeleteConfirm(null)
        setLoading(true)
        await loadUsers()
    }

    const toggleSection = (key: string) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
    }

    // Filter users
    const filtered = users.filter((u: any) =>
        (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.employeeCode || "").toLowerCase().includes(search.toLowerCase())
    )

    // Categorize users
    const admins = filtered.filter((u: any) => u.role === "admin")
    const owners = filtered.filter((u: any) => u.role === "owner")
    const salesLeads = filtered.filter((u: any) => u.role === "sales_lead")
    const salesMembers = filtered.filter((u: any) => u.role === "sales")
    const opsLeads = filtered.filter((u: any) => u.role === "pre_ops_lead" || u.role === "post_ops_lead")
    const opsMembers = filtered.filter((u: any) => u.role === "pre_ops" || u.role === "post_ops")

    // Get leads for assignment dropdown
    const leadsForRole = (role: UserRole) => {
        if (role === "sales") return salesLeads
        if (role === "pre_ops" || role === "post_ops") return opsLeads
        return []
    }

    const inputStyle = { background: 'rgba(5,34,16,0.04)', color: '#052210', border: '1px solid rgba(6,161,92,0.15)', outline: 'none' }

    const renderUserCard = (u: any) => {
        const Icon = roleIcons[u.role] || Users
        const color = roleColors[u.role] || "#06a15c"
        const leadName = u.leadId ? users.find((l: any) => l.uid === u.leadId)?.name : null

        return (
            <div key={u.uid} className="px-5 py-4 flex items-center justify-between hover:bg-white/50 transition-colors" style={{ borderBottom: '1px solid rgba(6,161,92,0.06)' }}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-sans text-sm font-bold flex-shrink-0" style={{ background: `${color}15`, color }}>
                        {u.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{u.name || "Pre-registered"}</p>
                            <span className="px-2 py-0.5 rounded-full font-sans text-[9px] font-bold tracking-wider uppercase whitespace-nowrap" style={{ background: `${color}15`, color }}>
                                {roleLabels[u.role] || u.role}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 font-sans text-[11px]" style={{ color: 'rgba(5,34,16,0.45)' }}>
                                <Mail className="w-3 h-3" /> {u.email}
                            </span>
                            {u.phone && (
                                <span className="flex items-center gap-1 font-sans text-[11px]" style={{ color: 'rgba(5,34,16,0.45)' }}>
                                    <Phone className="w-3 h-3" /> {u.phone}
                                </span>
                            )}
                            {u.employeeCode && (
                                <span className="flex items-center gap-1 font-sans text-[11px] font-medium" style={{ color: 'rgba(5,34,16,0.55)' }}>
                                    <Hash className="w-3 h-3" /> {u.employeeCode}
                                </span>
                            )}
                            {leadName && (
                                <span className="font-sans text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                                    Lead: {leadName}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <button onClick={() => openEditModal(u)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-blue-50" title="Edit">
                        <Edit3 className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
                    </button>
                    {u.role !== "admin" && (
                        <button onClick={() => setDeleteConfirm(u.uid)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                        </button>
                    )}
                </div>
            </div>
        )
    }

    const renderSection = (key: string, title: string, color: string, icon: any, userList: any[], subGroups?: { lead: any, members: any[] }[]) => {
        const Icon = icon
        const isOpen = expandedSections[key] !== false
        const total = subGroups ? subGroups.reduce((acc, g) => acc + 1 + g.members.length, 0) : userList.length

        if (total === 0 && !subGroups?.length) return null

        return (
            <div className="rounded-2xl overflow-hidden mb-5" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <button
                    onClick={() => toggleSection(key)}
                    className="w-full px-5 py-4 flex items-center justify-between"
                    style={{ borderBottom: isOpen ? '1px solid rgba(6,161,92,0.08)' : 'none' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                            <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <span className="font-serif text-sm tracking-wider uppercase" style={{ color }}>{title}</span>
                        <span className="font-sans text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}10`, color }}>{total}</span>
                    </div>
                    {isOpen ? <ChevronDown className="w-4 h-4" style={{ color: 'rgba(5,34,16,0.3)' }} /> : <ChevronRight className="w-4 h-4" style={{ color: 'rgba(5,34,16,0.3)' }} />}
                </button>
                {isOpen && (
                    <div>
                        {subGroups ? subGroups.map(g => (
                            <div key={g.lead.uid}>
                                {renderUserCard(g.lead)}
                                {g.members.length > 0 && (
                                    <div className="pl-8" style={{ background: 'rgba(5,34,16,0.015)' }}>
                                        {g.members.map(m => renderUserCard(m))}
                                    </div>
                                )}
                            </div>
                        )) : userList.map(u => renderUserCard(u))}
                    </div>
                )}
            </div>
        )
    }

    // Build grouped structures
    const salesGroups = salesLeads.map(lead => ({
        lead,
        members: salesMembers.filter((m: any) => m.leadId === lead.uid)
    }))
    const unassignedSales = salesMembers.filter((m: any) => !m.leadId || !salesLeads.find((l: any) => l.uid === m.leadId))

    const opsGroups = opsLeads.map(lead => ({
        lead,
        members: opsMembers.filter((m: any) => m.leadId === lead.uid)
    }))
    const unassignedOps = opsMembers.filter((m: any) => !m.leadId || !opsLeads.find((l: any) => l.uid === m.leadId))

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="font-serif text-3xl tracking-wide" style={{ color: '#052210' }}>Users</h1>
                    <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>
                        Manage team members and organizational hierarchy
                    </p>
                </div>
                <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-sans text-xs tracking-wider uppercase transition-all hover:scale-105" style={{ background: '#052210', color: '#FFFFFF' }}>
                    <Plus className="w-4 h-4" /> Add User
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(5,34,16,0.3)' }} />
                <input
                    type="text" placeholder="Search users by name, email, or employee code..."
                    className="w-full pl-11 pr-4 py-3 rounded-xl font-sans text-sm"
                    style={inputStyle}
                    value={search} onChange={e => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} />
                </div>
            ) : (
                <>
                    {/* Admin */}
                    {admins.length > 0 && renderSection("admin", "Admin", "#f472b6", Shield, admins)}

                    {/* Owners */}
                    {owners.length > 0 && renderSection("owners", "Owners", "#8b5cf6", Crown, owners)}

                    {/* Sales Department */}
                    {(salesLeads.length > 0 || salesMembers.length > 0) && (
                        renderSection("sales", "Sales Department", "#06a15c", Briefcase, unassignedSales, salesGroups.length > 0 ? salesGroups : undefined)
                    )}

                    {/* Unassigned sales (not under any lead) */}
                    {salesGroups.length > 0 && unassignedSales.length > 0 && (
                        <div className="rounded-2xl overflow-hidden mb-5 ml-8" style={{ background: '#FFFFFF', border: '1px dashed rgba(6,161,92,0.2)' }}>
                            <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(6,161,92,0.06)' }}>
                                <span className="font-sans text-[10px] font-bold tracking-wider uppercase" style={{ color: 'rgba(5,34,16,0.4)' }}>Unassigned Sales</span>
                            </div>
                            {unassignedSales.map(u => renderUserCard(u))}
                        </div>
                    )}

                    {/* Operations Department */}
                    {(opsLeads.length > 0 || opsMembers.length > 0) && (
                        renderSection("operations", "Operations Department", "#3b82f6", Wrench, unassignedOps, opsGroups.length > 0 ? opsGroups : undefined)
                    )}

                    {/* Unassigned ops */}
                    {opsGroups.length > 0 && unassignedOps.length > 0 && (
                        <div className="rounded-2xl overflow-hidden mb-5 ml-8" style={{ background: '#FFFFFF', border: '1px dashed rgba(59,130,246,0.2)' }}>
                            <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(59,130,246,0.06)' }}>
                                <span className="font-sans text-[10px] font-bold tracking-wider uppercase" style={{ color: 'rgba(5,34,16,0.4)' }}>Unassigned Operations</span>
                            </div>
                            {unassignedOps.map(u => renderUserCard(u))}
                        </div>
                    )}

                    {filtered.length === 0 && (
                        <div className="text-center py-16">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.4)' }}>No users found</p>
                        </div>
                    )}
                </>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="w-full max-w-lg rounded-2xl p-6 space-y-5" style={{ background: '#FFFFFF', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="font-serif text-xl tracking-wide" style={{ color: '#052210' }}>
                                {editUser ? "Edit User" : "Add User"}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                                <X className="w-4 h-4" style={{ color: 'rgba(5,34,16,0.4)' }} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="font-sans text-[10px] font-semibold tracking-wider uppercase mb-1.5 block" style={{ color: 'rgba(5,34,16,0.5)' }}>Full Name *</label>
                                <input className="w-full px-4 py-3 rounded-xl font-sans text-sm" style={inputStyle} placeholder="e.g. Ahamed Shafeek" value={formName} onChange={e => setFormName(e.target.value)} onBlur={handleNameBlur} />
                            </div>
                            <div>
                                <label className="font-sans text-[10px] font-semibold tracking-wider uppercase mb-1.5 block" style={{ color: 'rgba(5,34,16,0.5)' }}>Email *</label>
                                <input className="w-full px-4 py-3 rounded-xl font-sans text-sm" style={inputStyle} placeholder="user@email.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} disabled={!!editUser} />
                            </div>
                            <div>
                                <label className="font-sans text-[10px] font-semibold tracking-wider uppercase mb-1.5 block" style={{ color: 'rgba(5,34,16,0.5)' }}>Phone</label>
                                <input className="w-full px-4 py-3 rounded-xl font-sans text-sm" style={inputStyle} placeholder="+91 9876543210" value={formPhone} onChange={e => setFormPhone(e.target.value)} />
                            </div>
                            <div>
                                <label className="font-sans text-[10px] font-semibold tracking-wider uppercase mb-1.5 block" style={{ color: 'rgba(5,34,16,0.5)' }}>Role *</label>
                                <select className="w-full px-4 py-3 rounded-xl font-sans text-sm" style={inputStyle} value={formRole} onChange={e => handleRoleChange(e.target.value as UserRole)}>
                                    {allRoles.map(r => (
                                        <option key={r} value={r}>{roleLabels[r]}</option>
                                    ))}
                                </select>
                            </div>
                            {(formRole === "sales" || formRole === "pre_ops" || formRole === "post_ops") && (
                                <div>
                                    <label className="font-sans text-[10px] font-semibold tracking-wider uppercase mb-1.5 block" style={{ color: 'rgba(5,34,16,0.5)' }}>Assign to Lead</label>
                                    <select className="w-full px-4 py-3 rounded-xl font-sans text-sm" style={inputStyle} value={formLeadId} onChange={e => setFormLeadId(e.target.value)}>
                                        <option value="">No Lead Assigned</option>
                                        {leadsForRole(formRole).map((l: any) => (
                                            <option key={l.uid} value={l.uid}>{l.name} ({l.employeeCode})</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className={formRole === "sales" || formRole === "pre_ops" || formRole === "post_ops" ? "" : "col-span-2"}>
                                <label className="font-sans text-[10px] font-semibold tracking-wider uppercase mb-1.5 block" style={{ color: 'rgba(5,34,16,0.5)' }}>Employee Code (Auto)</label>
                                <div className="relative">
                                    <input className="w-full px-4 py-3 rounded-xl font-sans text-sm font-bold" style={{ ...inputStyle, background: 'rgba(6,161,92,0.06)', color: '#06a15c' }} value={formCode} readOnly />
                                    {codeLoading && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Department indicator */}
                        {getDepartment(formRole) && (
                            <div className="px-4 py-2.5 rounded-xl flex items-center gap-2" style={{ background: getDepartment(formRole) === "sales" ? 'rgba(6,161,92,0.08)' : 'rgba(59,130,246,0.08)', border: `1px solid ${getDepartment(formRole) === "sales" ? 'rgba(6,161,92,0.15)' : 'rgba(59,130,246,0.15)'}` }}>
                                <span className="font-sans text-[10px] font-bold tracking-wider uppercase" style={{ color: getDepartment(formRole) === "sales" ? '#06a15c' : '#3b82f6' }}>
                                    Department: {getDepartment(formRole) === "sales" ? "Sales" : "Operations"}
                                </span>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button onClick={handleSave} className="flex-1 py-3 rounded-xl font-sans text-xs tracking-wider uppercase font-bold transition-all hover:scale-[1.02]" style={{ background: '#052210', color: '#FFFFFF' }}>
                                {editUser ? "Update User" : "Add User"}
                            </button>
                            <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl font-sans text-xs tracking-wider uppercase" style={{ color: 'rgba(5,34,16,0.55)', border: '1px solid rgba(5,34,16,0.1)' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
                    <div className="w-full max-w-sm rounded-2xl p-6 text-center space-y-4" style={{ background: '#FFFFFF', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
                        <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                            <Trash2 className="w-6 h-6" style={{ color: '#ef4444' }} />
                        </div>
                        <h3 className="font-serif text-lg" style={{ color: '#052210' }}>Delete User?</h3>
                        <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.6)' }}>
                            This action cannot be undone. The user will be permanently removed.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-3 rounded-xl font-sans text-xs tracking-wider uppercase font-bold" style={{ background: '#ef4444', color: '#FFFFFF' }}>
                                Delete
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-xl font-sans text-xs tracking-wider uppercase" style={{ color: 'rgba(5,34,16,0.55)', border: '1px solid rgba(5,34,16,0.1)' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
