"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function HomePage() {
  const { userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!userProfile) {
        router.push("/login")
      } else if (userProfile.role === "admin") {
        router.push("/admin")
      } else if (userProfile.role === "sales" || userProfile.role === "sales_lead") {
        router.push("/sales")
      } else if (userProfile.role === "pre_ops" || userProfile.role === "pre_ops_lead") {
        router.push("/ops")
      } else if (userProfile.role === "post_ops" || userProfile.role === "post_ops_lead") {
        router.push("/post-ops")
      }
    }
  }, [userProfile, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#031A0C' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} />
        <p className="font-sans text-sm tracking-widest uppercase" style={{ color: 'rgba(212,175,55,0.6)' }}>Redirecting...</p>
      </div>
    </div>
  )
}
