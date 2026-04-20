"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"

export default function HomePage() {
  const { userProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [timeoutError, setTimeoutError] = useState(false)
  const hasRedirected = useRef(false)

  // 10s timeout fallback to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading || authLoading) {
        setLoading(false)
        setTimeoutError(true)
      }
    }, 10000)

    return () => clearTimeout(timer)
  }, [loading, authLoading])

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // Prevent redirect loop - run only once
    if (hasRedirected.current) return;

    const handleRedirect = async () => {
      try {
        hasRedirected.current = true;
        console.log("Before navigation...");

        if (!userProfile) {
          router.push("/login")
        } else if (userProfile.role === "admin" || userProfile.role === "owner") {
          router.push("/admin")
        } else if (userProfile.role === "sales" || userProfile.role === "sales_lead") {
          router.push("/sales")
        } else if (userProfile.role === "pre_ops" || userProfile.role === "pre_ops_lead") {
          router.push("/ops")
        } else if (userProfile.role === "post_ops" || userProfile.role === "post_ops_lead") {
          router.push("/post-ops")
        } else if (userProfile.role === "finance" || userProfile.role === "finance_lead") {
          router.push("/finance")
        } else {
          router.push("/login")
        }
        
        console.log("After navigation...");
      } catch (error) {
        console.error("Redirect error:", error)
        setTimeoutError(true)
      } finally {
        setLoading(false)
      }
    }

    handleRedirect()
  }, [authLoading, userProfile, router])

  if (timeoutError) {
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

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#031A0C' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} />
        <p className="font-sans text-sm tracking-widest uppercase" style={{ color: 'rgba(212,175,55,0.6)' }}>
          {loading ? "Redirecting..." : "Navigating..."}
        </p>
      </div>
    </div>
  )
}
