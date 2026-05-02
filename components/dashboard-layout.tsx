"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import {
    LayoutDashboard, MapPin, Users, BarChart3, KanbanSquare,
    Settings, LogOut, Menu, X, ChevronLeft, ClipboardCheck,
    Package, FileText, ClipboardList, CreditCard, DollarSign, Receipt
} from "lucide-react"

const navigation: Record<string, any[]> = {
    admin: [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'KPI Analytics', href: '/admin/kpi', icon: BarChart3 },
        { name: 'Pipeline', href: '/admin/kanban', icon: KanbanSquare },
        { name: 'Pending Tasks', href: '/admin/pending', icon: CreditCard },
        { name: 'Users', href: '/admin/users', icon: Users },
        { name: 'Customers', href: '/admin/customers', icon: ClipboardList },
        { name: 'SOPs', href: '/admin/sops', icon: ClipboardCheck },
        { name: 'Destinations', href: '/admin/destinations', icon: MapPin },
        { name: 'Itinerary Generators', href: '/admin/itinerary-generator', icon: FileText },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
        { divider: true, name: 'Finance', icon: DollarSign },
        { name: 'Finance Dashboard', href: '/finance', icon: DollarSign },
        { name: 'Finance Payments', href: '/finance/payments', icon: Receipt },
        { name: 'Finance Invoices', href: '/finance/invoices', icon: FileText },
    ],
    owner: [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'KPI Analytics', href: '/admin/kpi', icon: BarChart3 },
        { name: 'Pipeline', href: '/admin/kanban', icon: KanbanSquare },
        { name: 'Pending Tasks', href: '/admin/pending', icon: CreditCard },
        { name: 'Users', href: '/admin/users', icon: Users },
        { name: 'Customers', href: '/admin/customers', icon: ClipboardList },
        { name: 'SOPs', href: '/admin/sops', icon: ClipboardCheck },
        { name: 'Destinations', href: '/admin/destinations', icon: MapPin },
        { name: 'Itinerary Generators', href: '/admin/itinerary-generator', icon: FileText },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
        { divider: true, name: 'Finance', icon: DollarSign },
        { name: 'Finance Dashboard', href: '/finance', icon: DollarSign },
        { name: 'Finance Payments', href: '/finance/payments', icon: Receipt },
        { name: 'Finance Invoices', href: '/finance/invoices', icon: FileText },
    ],
    sales_lead: [
        { name: 'Dashboard', href: '/sales', icon: LayoutDashboard },
        { name: 'Pipeline', href: '/sales/kanban', icon: KanbanSquare },
        { name: 'My Team', href: '/sales/my-team', icon: Users },
        { name: 'Customers', href: '/sales/customers', icon: ClipboardList },
        { name: 'Your Drafts', href: '/sales/drafts', icon: FileText },
        { name: 'Itinerary Generators', href: '/sales/itinerary-generator', icon: FileText },
    ],
    sales: [
        { name: 'Dashboard', href: '/sales', icon: LayoutDashboard },
        { name: 'Pipeline', href: '/sales/kanban', icon: KanbanSquare },
        { name: 'Customers', href: '/sales/customers', icon: ClipboardList },
        { name: 'Your Drafts', href: '/sales/drafts', icon: FileText },
        { name: 'Itinerary Generators', href: '/sales/itinerary-generator', icon: FileText },
    ],
    ops_lead: [
        { name: 'Dashboard', href: '/ops', icon: Package },
        { name: 'My KPIs', href: '/ops/kpi', icon: BarChart3 },
        { name: 'My Team', href: '/ops/my-team', icon: Users },
        { name: 'Profile', href: '/ops/profile', icon: Settings },
        { name: 'Pipeline', href: '/ops/pipeline', icon: KanbanSquare },
        { name: 'Customers', href: '/ops/customers', icon: ClipboardList },
    ],
    pre_ops_lead: [
        { name: 'Dashboard', href: '/ops', icon: Package },
        { name: 'Pipeline', href: '/ops/pipeline', icon: KanbanSquare },
        { name: 'Customers', href: '/ops/customers', icon: ClipboardList },
        { name: 'My Team', href: '/ops/my-team', icon: Users },
        { name: 'Itinerary Generators', href: '/ops/itinerary-generator', icon: FileText },
    ],
    pre_ops: [
        { name: 'Dashboard', href: '/ops', icon: Package },
        { name: 'Pipeline', href: '/ops/pipeline', icon: KanbanSquare },
        { name: 'Customers', href: '/ops/customers', icon: ClipboardList },
        { name: 'Itinerary Generators', href: '/ops/itinerary-generator', icon: FileText },
    ],
    ops: [
        { name: 'Dashboard', href: '/ops', icon: Package },
        { name: 'My KPIs', href: '/ops/kpi', icon: BarChart3 },
        { name: 'Customers', href: '/ops/customers', icon: ClipboardList },
        { name: 'Profile', href: '/ops/profile', icon: Settings },
        { name: 'Pipeline', href: '/ops/pipeline', icon: KanbanSquare },
    ],
    post_ops_lead: [
        { name: 'Dashboard', href: '/post-ops', icon: ClipboardCheck },
        { name: 'Pipeline', href: '/post-ops/pipeline', icon: KanbanSquare },
        { name: 'Customers', href: '/post-ops/customers', icon: ClipboardList },
        { name: 'My Team', href: '/post-ops/my-team', icon: Users },
    ],
    post_ops: [
        { name: 'Dashboard', href: '/post-ops', icon: ClipboardCheck },
        { name: 'Pipeline', href: '/post-ops/pipeline', icon: KanbanSquare },
        { name: 'Customers', href: '/post-ops/customers', icon: ClipboardList },
    ],
    finance_lead: [
        { name: 'Dashboard', href: '/finance', icon: DollarSign },
        { name: 'Payments', href: '/finance/payments', icon: Receipt },
        { name: 'Invoices', href: '/finance/invoices', icon: FileText },
        { name: 'My Team', href: '/finance/my-team', icon: Users },
    ],
    finance: [
        { name: 'Dashboard', href: '/finance', icon: DollarSign },
        { name: 'Payments', href: '/finance/payments', icon: Receipt },
        { name: 'Invoices', href: '/finance/invoices', icon: FileText },
    ],
}

const roleLabel: Record<string, string> = {
    admin: 'Administrator',
    owner: 'Owner',
    sales: 'Sales',
    sales_lead: 'Sales Lead',
    ops: 'Operations',
    ops_lead: 'Ops Lead',
    pre_ops: 'Pre-Operations',
    pre_ops_lead: 'Pre-Ops Lead',
    post_ops: 'Post-Operations',
    post_ops_lead: 'Post-Ops Lead',
    finance: 'Finance',
    finance_lead: 'Finance Lead',
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { userProfile, loading, signOut } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)

    // Show loading spinner while auth is resolving
    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center" style={{ background: '#F2F4F3' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#06a15c', borderTopColor: 'transparent' }} />
                    <p className="font-sans text-sm tracking-widest uppercase" style={{ color: 'rgba(5,34,16,0.4)' }}>Loading...</p>
                </div>
            </div>
        )
    }

    // Auth loaded but no profile — ProtectedRoute will handle the redirect
    if (!userProfile) return null

    const role = userProfile.role
    const items = navigation[role as keyof typeof navigation] || []

    const handleSignOut = async () => {
        await signOut()
        router.replace("/login")
    }

    return (
        <div className="h-screen overflow-hidden flex" style={{ background: '#F2F4F3' }}>
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside
                className={`
                    fixed lg:relative inset-y-0 left-0 z-50
                    h-full flex flex-col flex-shrink-0
                    transition-all duration-300 ease-in-out
                    lg:translate-x-0
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    ${isCollapsed ? 'w-[72px]' : 'w-64'}
                `}
                style={{
                    background: 'linear-gradient(180deg, #062814 0%, #052210 100%)',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
                }}
            >
                <div className={`flex-shrink-0 flex items-center px-4 ${isCollapsed ? 'justify-center py-5' : 'justify-between py-4'}`}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {isCollapsed ? (
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-serif text-xl font-bold text-white"
                            style={{ background: 'rgba(6,161,92,0.2)', border: '1px solid rgba(6,161,92,0.3)' }}
                        >
                            O
                        </div>
                    ) : (
                        <>
                            <div className="relative w-40 h-[72px]">
                                <Image
                                    src="/images/outbound png.png"
                                    alt="Outbound Travelers"
                                    fill
                                    className="object-contain object-left scale-110 origin-left"
                                />
                            </div>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-4 h-4 text-white/60" />
                            </button>
                        </>
                    )}
                </div>

                {!isCollapsed && (
                    <div className="flex-shrink-0 px-4 pt-4 pb-2">
                        <div
                            className="flex items-center gap-2 px-3 py-2 rounded-lg"
                            style={{ background: 'rgba(6,161,92,0.08)', border: '1px solid rgba(6,161,92,0.15)' }}
                        >
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#06a15c', boxShadow: '0 0 6px #06a15c' }} />
                            <span
                                className="font-sans text-[11px] font-bold tracking-wider uppercase truncate"
                                style={{ color: '#4ade80' }}
                            >
                                {roleLabel[role] || role}
                            </span>
                        </div>
                    </div>
                )}

                {isCollapsed && <div className="flex-shrink-0 h-2" />}

                <nav
                    className={`flex-1 overflow-y-auto py-2 ${isCollapsed ? 'px-2' : 'px-3'}`}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {items.map((item: any) => {
                        if (item.divider) {
                            if (isCollapsed) return (
                                <div key={`divider-${item.name}`} className="my-1 mx-2 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                            )
                            return (
                                <div key={`divider-${item.name}`} className="px-2 pt-4 pb-1 flex items-center gap-2">
                                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                                    <span className="font-sans text-[9px] font-bold tracking-widest uppercase" style={{ color: 'rgba(74,222,128,0.5)' }}>{item.name}</span>
                                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                                </div>
                            )
                        }
                        const isActive = pathname === item.href ||
                            (item.href.split('/').length > 2 && pathname.startsWith(item.href))
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                title={isCollapsed ? item.name : undefined}
                                className={`
                                    flex items-center rounded-xl mb-0.5
                                    font-sans text-[13px] transition-all duration-150
                                    ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-2.5'}
                                `}
                                style={{
                                    background: isActive ? 'rgba(6,161,92,0.15)' : 'transparent',
                                    color: isActive ? '#4ade80' : 'rgba(255,255,255,0.65)',
                                    border: isActive ? '1px solid rgba(6,161,92,0.25)' : '1px solid transparent',
                                    fontWeight: isActive ? '600' : '400',
                                }}
                            >
                                <item.icon
                                    className="w-4 h-4 flex-shrink-0 transition-transform"
                                    style={{ color: isActive ? '#4ade80' : undefined }}
                                />
                                {!isCollapsed && (
                                    <span className="truncate leading-none">{item.name}</span>
                                )}
                                {!isCollapsed && isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#06a15c' }} />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                <div className="flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`
                            w-full flex items-center transition-colors duration-150
                            text-white/30 hover:text-white/70 hover:bg-white/5
                            ${isCollapsed ? 'justify-center py-3.5' : 'gap-3 px-5 py-3'}
                        `}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    >
                        <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                        {!isCollapsed && <span className="font-sans text-xs font-medium">Collapse sidebar</span>}
                    </button>

                    <div className={`flex items-center ${isCollapsed ? 'flex-col justify-center py-4 gap-2' : 'justify-between px-4 py-3'}`}>
                        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                            <div
                                className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                style={{ background: 'linear-gradient(135deg, #06a15c 0%, #059148 100%)' }}
                            >
                                {userProfile.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            {!isCollapsed && (
                                <div className="min-w-0">
                                    <p className="font-sans text-xs font-semibold text-white truncate leading-tight">{userProfile.name}</p>
                                    <p className="font-sans text-[10px] text-white/40 truncate capitalize">{roleLabel[role] || role}</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleSignOut}
                            title="Sign out"
                            className={`
                                flex-shrink-0 flex items-center justify-center rounded-lg transition-all duration-150
                                text-white/30 hover:text-red-400 hover:bg-red-500/10
                                ${isCollapsed ? 'w-8 h-8' : 'w-7 h-7'}
                            `}
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </aside>

            <div className="flex-1 h-full flex flex-col overflow-hidden min-w-0">
                <header
                    className="flex-shrink-0 z-30 flex items-center justify-between px-5 py-3"
                    style={{
                        background: 'rgba(255,255,255,0.97)',
                        borderBottom: '1px solid rgba(5,34,16,0.07)',
                        boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                    }}
                >
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <Menu className="w-5 h-5" style={{ color: '#052210' }} />
                    </button>
                    <div className="ml-auto flex items-center gap-3">
                        <div className="relative h-8">
                            <img
                                src="/images/outbound png.png"
                                alt="Outbound Travelers"
                                className="h-full w-auto object-contain"
                            />
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
