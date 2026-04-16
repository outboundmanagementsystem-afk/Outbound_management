"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { PackageSearch, Settings2, Replace, PenTool } from "lucide-react"

export function ItineraryGeneratorsHub() {
    const { userProfile } = useAuth()
    const role = userProfile?.role || "sales"
    
    // Map roles to their base route paths
    const rolePathMap: Record<string, string> = {
        admin: "/admin",
        owner: "/admin",
        sales: "/sales",
        sales_lead: "/sales",
        ops: "/ops",
        ops_lead: "/ops",
        pre_ops: "/ops",
        pre_ops_lead: "/ops",
        post_ops: "/post-ops",
        post_ops_lead: "/post-ops",
        finance: "/finance",
        finance_lead: "/finance",
    }
    
    const basePath = rolePathMap[role] || `/${role}`

    const generators = [
        {
            title: "Ready-Made Itineraries",
            description: "Select from pre-built itinerary packages, enter final rates and generate PDF.",
            icon: PackageSearch,
            href: `${basePath}/itinerary-generator/ready-made`,
            color: "#06a15c",
            bgColor: "rgba(6,161,92,0.1)",
            showAlways: true
        },
        {
            title: "Customized Normal Itinerary",
            description: "Step-by-step wizard tailored to specific customer details.",
            icon: Settings2,
            href: `${basePath}/itinerary-generator/custom`,
            color: "#3b82f6",
            bgColor: "rgba(59,130,246,0.1)",
            showAlways: true
        },
        {
            title: "Build Your Packages",
            description: "Create and publish a reusable tour package template.",
            icon: Replace,
            href: `${basePath}/itinerary-generator/build-package`,
            color: "#8b5cf6",
            bgColor: "rgba(139,92,246,0.1)",
            showAlways: false // Only for admin/ops
        },
        {
            title: "Manual Canvas (PDF)",
            description: "Free-form block based designer for completely custom itineraries.",
            icon: PenTool,
            href: `${basePath}/itinerary-generator/manual`,
            color: "#f59e0b",
            bgColor: "rgba(245,158,11,0.1)",
            showAlways: true
        }
    ]

    const visibleGenerators = generators.filter(g => g.showAlways || role === "admin" || role === "pre_ops" || role === "pre_ops_lead")

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div>
                <h1 className="font-serif text-3xl tracking-wide" style={{ color: '#052210' }}>Itinerary Generators</h1>
                <p className="font-sans text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Select a tool to build or customize travel plans</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visibleGenerators.map((gen, i) => (
                    <Link key={i} href={gen.href} className="flex items-start gap-5 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 group" style={{ background: '#FFFFFF', border: '1px solid rgba(5,34,16,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ background: gen.bgColor }}>
                            <gen.icon className="w-7 h-7" style={{ color: gen.color }} />
                        </div>
                        <div>
                            <h3 className="font-serif text-xl tracking-wide mb-2" style={{ color: '#052210' }}>{gen.title}</h3>
                            <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.6)' }}>{gen.description}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
