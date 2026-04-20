"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Plane } from "lucide-react"

export default function LoginPage() {
    const { user, userProfile, loading, signInWithGoogle } = useAuth()
    const router = useRouter()

    const hasRedirected = useRef(false)
    const [timeoutError, setTimeoutError] = useState(false)

    // 10s timeout fallback to prevent infinite loading
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                setTimeoutError(true)
            }
        }, 10000)
        return () => clearTimeout(timer)
    }, [loading])

    useEffect(() => {
        if (loading || !userProfile || hasRedirected.current) return;

        const handleRedirect = async () => {
            try {
                hasRedirected.current = true;
                console.log("LoginPage: Before navigation...");
                
                if (userProfile.role === "admin" || userProfile.role === "owner") router.push("/admin")
                else if (userProfile.role === "sales_lead" || userProfile.role === "sales") router.push("/sales")
                else if (userProfile.role === "pre_ops_lead" || userProfile.role === "pre_ops") router.push("/ops")
                else if (userProfile.role === "post_ops" || userProfile.role === "post_ops_lead") router.push("/post-ops")
                else if (userProfile.role === "finance" || userProfile.role === "finance_lead") router.push("/finance")
                else {
                    hasRedirected.current = false; // reset if no route matched to allow retry if needed
                    console.error("LoginPage: Unhandled role", userProfile.role)
                }

                console.log("LoginPage: After navigation...");
            } catch (error) {
                console.error("Redirect error:", error)
                setTimeoutError(true)
            }
        }
        
        handleRedirect();
    }, [userProfile, loading, router])

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

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center grain-overlay" style={{ background: 'linear-gradient(180deg, #031A0C 0%, #052210 45%, #0B2E2B 100%)' }}>
            {/* Gold top border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] z-[6]" style={{ background: 'linear-gradient(90deg, transparent 0%, #D4AF37 20%, #D4AF37 80%, transparent 100%)' }} />

            {/* Radial glow */}
            <div className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center">
                <div className="w-[600px] h-[400px] rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(ellipse, #D4AF37 0%, transparent 60%)' }} />
            </div>

            {/* Flight path */}
            <svg className="absolute inset-0 w-full h-full z-[2] pointer-events-none" viewBox="0 0 1200 800">
                <path d="M -50 750 Q 300 400 600 350 T 1250 50" stroke="#D4AF37" strokeWidth="1" fill="none" strokeDasharray="8 6" className="animate-dash-flow" opacity="0.3" />
            </svg>

            {/* Flying planes */}
            <div className="absolute top-16 left-8 z-[3] opacity-25 animate-float-plane">
                <Plane className="w-6 h-6 text-ivory-light -rotate-45" />
            </div>
            <div className="absolute bottom-32 right-12 z-[3] opacity-20">
                <Plane className="w-8 h-8 text-gold rotate-[30deg]" />
            </div>

            {/* Login Card */}
            <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6">
                {/* Logo */}
                <div className="relative w-72 md:w-80 h-36 md:h-40 mb-8">
                    <Image src="/images/outbound png.png" alt="Outbound Travelers" fill className="object-contain" priority />
                </div>

                {/* Card */}
                <div
                    className="w-full rounded-3xl overflow-hidden"
                    style={{ boxShadow: '0 50px 100px rgba(3, 26, 12, 0.6), 0 0 0 1px rgba(212,175,55,0.3), inset 0 1px 0 rgba(212,175,55,0.1)' }}
                >
                    {/* Header */}
                    <div className="relative px-8 py-7 text-center overflow-hidden" style={{ background: 'linear-gradient(160deg, #020D06 0%, #031A0C 50%, #052210 100%)' }}>
                        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(212,175,55,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(212,175,55,0.06) 0%, transparent 50%)' }} />
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-3 mb-3">
                                <div className="h-px w-8" style={{ background: 'rgba(255,255,255,0.3)' }} />
                                <span className="font-sans text-[10px] tracking-[0.35em] uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>Welcome Back</span>
                                <div className="h-px w-8" style={{ background: 'rgba(255,255,255,0.3)' }} />
                            </div>
                            <h1 className="font-serif text-2xl md:text-3xl tracking-widest" style={{ color: '#FFFFFF' }}>Sign In</h1>
                            <div className="mt-3 mx-auto w-16 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-8 py-10" style={{ background: '#FAF9F6' }}>
                        <p className="font-sans text-sm text-center mb-8" style={{ color: '#6B6B6B' }}>
                            Sign in with your Google account to access your dashboard
                        </p>

                        <button
                            onClick={signInWithGoogle}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-sans font-bold text-sm tracking-wider uppercase transition-all duration-300 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: 'linear-gradient(135deg, #031A0C, #052210)',
                                color: '#FFFFFF',
                                border: '1px solid rgba(255,255,255,0.15)',
                                boxShadow: '0 8px 30px rgba(5, 34, 16, 0.3)',
                            }}
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            {loading ? "Signing in..." : "Sign in with Google"}
                        </button>

                        <p className="font-sans text-xs text-center mt-6" style={{ color: '#9B8B6E' }}>
                            Contact your admin if you don&apos;t have access
                        </p>
                    </div>

                    {/* Gold footer bar */}
                    <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #6B4F11, #D4AF37, #F0D060, #D4AF37, #6B4F11)' }} />
                </div>
            </div>
        </div>
    )
}
