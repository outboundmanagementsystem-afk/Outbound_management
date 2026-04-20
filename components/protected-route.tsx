"use client"

import { useAuth, UserRole } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

export function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: UserRole[] }) {
    const { userProfile, loading } = useAuth()
    const router = useRouter()
    const hasRedirected = useRef(false)
    const [timeoutError, setTimeoutError] = useState(false)

    // 10s timeout fallback
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                setTimeoutError(true)
            }
        }, 10000)
        return () => clearTimeout(timer)
    }, [loading])

    useEffect(() => {
        if (loading || hasRedirected.current) return;

        if (!userProfile) {
            hasRedirected.current = true;
            console.log("ProtectedRoute: No userProfile, redirecting to /login...");
            router.push("/login")
        } else {
            // Owner can access admin pages
            const effectiveRoles = [...allowedRoles]
            if (effectiveRoles.includes("admin") && !effectiveRoles.includes("owner")) {
                effectiveRoles.push("owner")
            }
            if (!effectiveRoles.includes(userProfile.role)) {
                hasRedirected.current = true;
                console.log(`ProtectedRoute: Role ${userProfile.role} not in [${effectiveRoles.join(",")}]. Redirecting...`);
                // Redirect to appropriate dashboard
                if (userProfile.role === "admin" || userProfile.role === "owner") router.push("/admin")
                else if (userProfile.role === "sales_lead" || userProfile.role === "sales") router.push("/sales")
                else if (userProfile.role === "pre_ops_lead" || userProfile.role === "pre_ops") router.push("/ops")
                else if (userProfile.role === "post_ops" || userProfile.role === "post_ops_lead") router.push("/post-ops")
                else router.push("/login")
            }
        }
    }, [userProfile, loading, router]) // Removed allowedRoles from deps to prevent re-triggering if passed inline

    if (timeoutError && loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center" style={{ background: '#031A0C' }}>
                <p className="font-sans text-sm tracking-widest uppercase mb-4" style={{ color: '#ef4444' }}>
                    Something went wrong. Please refresh.
                </p>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 rounded-lg text-white font-sans text-xs tracking-widest uppercase transition-all hover:bg-white/10"
                    style={{ border: '1px solid rgba(212,175,55,0.5)', color: '#D4AF37' }}
                >
                    Refresh Page
                </button>
            </div>
        )
    }

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
