"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { getRoleDashboard } from "@/lib/role-utils"

export default function HomePage() {
  const { userProfile, loading, authError, retryAuth } = useAuth()
  const router = useRouter()
  const hasNavigated = useRef(false)

  useEffect(() => {
    if (loading) return
    if (hasNavigated.current) return

    hasNavigated.current = true

    if (!userProfile) {
      router.replace("/login")
    } else {
      const target = getRoleDashboard(userProfile.role)
      router.replace(target)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userProfile])

  if (authError && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center" style={{ background: '#031A0C' }}>
        <p className="font-sans text-sm tracking-widest uppercase mb-2" style={{ color: '#ef4444' }}>
          Something went wrong
        </p>
        <p className="font-sans text-xs mb-6 max-w-md" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {authError}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { hasNavigated.current = false; retryAuth() }}
            className="px-6 py-2 rounded-lg font-sans text-xs tracking-widest uppercase transition-all hover:bg-white/10"
            style={{ border: '1px solid rgba(212,175,55,0.5)', color: '#D4AF37' }}
          >
            Retry
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-lg font-sans text-xs tracking-widest uppercase transition-all hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)' }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#031A0C' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} />
        <p className="font-sans text-sm tracking-widest uppercase" style={{ color: 'rgba(212,175,55,0.6)' }}>
          Redirecting...
        </p>
      </div>
    </div>
  )
}
