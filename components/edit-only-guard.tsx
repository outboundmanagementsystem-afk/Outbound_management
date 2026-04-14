"use client"

import { useAuth } from "@/lib/auth-context"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

export function EditOnlyGuard({ children }: { children: React.ReactNode }) {
    const { userProfile, loading } = useAuth()
    const searchParams = useSearchParams()
    const router = useRouter()
    const [isAuthorized, setIsAuthorized] = useState(false)

    useEffect(() => {
        if (!loading && userProfile) {
            const role = userProfile.role
            const isOpsRole = role === "pre_ops" || role === "pre_ops_lead"

            // If they are Ops, they MUST have a draft, itinId, or editId in the URL to proceed
            if (isOpsRole) {
                const hasEditParam = searchParams.get("draft") || searchParams.get("editId") || searchParams.get("itinId")
                if (!hasEditParam) {
                    router.push("/ops")
                } else {
                    setIsAuthorized(true)
                }
            } else {
                // Not ops, so freely allowed
                setIsAuthorized(true)
            }
        }
    }, [loading, userProfile, searchParams, router])

    if (loading || (!isAuthorized && userProfile)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
        )
    }

    if (!userProfile) return null

    return <>{children}</>
}
