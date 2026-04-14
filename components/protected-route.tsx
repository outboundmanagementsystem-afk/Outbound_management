"use client"

import { useAuth, UserRole } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: UserRole[] }) {
    const { userProfile, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading) {
            if (!userProfile) {
                router.push("/login")
            } else {
                // Owner can access admin pages
                const effectiveRoles = [...allowedRoles]
                if (effectiveRoles.includes("admin") && !effectiveRoles.includes("owner")) {
                    effectiveRoles.push("owner")
                }
                if (!effectiveRoles.includes(userProfile.role)) {
                    // Redirect to appropriate dashboard
                    if (userProfile.role === "admin" || userProfile.role === "owner") router.push("/admin")
                    else if (userProfile.role === "sales_lead" || userProfile.role === "sales") router.push("/sales")
                    else if (userProfile.role === "pre_ops_lead" || userProfile.role === "pre_ops") router.push("/ops")
                    else if (userProfile.role === "post_ops" || userProfile.role === "post_ops_lead") router.push("/post-ops")
                }
            }
        }
    }, [userProfile, loading, allowedRoles, router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#031A0C' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} />
                    <p className="font-sans text-sm tracking-widest uppercase" style={{ color: 'rgba(212,175,55,0.6)' }}>Loading...</p>
                </div>
            </div>
        )
    }

    const effectiveAllowed = [...allowedRoles]
    if (effectiveAllowed.includes("admin" as UserRole) && !effectiveAllowed.includes("owner" as UserRole)) {
        effectiveAllowed.push("owner" as UserRole)
    }

    if (!userProfile || !effectiveAllowed.includes(userProfile.role)) {
        return null
    }

    return <>{children}</>
}
