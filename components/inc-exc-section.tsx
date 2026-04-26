"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, XCircle } from "lucide-react"

interface IncExcSectionProps {
    inclusions?: string[]
    exclusions?: string[]
}

export function IncExcSection({ inclusions = [], exclusions = [] }: IncExcSectionProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
            { threshold: 0.1 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    return (
        <section className="relative py-8 px-4 overflow-hidden pdf-section" style={{ background: '#FAF9F6', backgroundColor: '#FAF9F6', overflow: 'visible', pageBreakInside: 'auto', breakInside: 'auto' }}>
            {/* Subtle decorative background line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

            <div ref={ref} className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="flex flex-col gap-8">

                    {/* Inclusions */}
                    {inclusions.length > 0 && (
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-4" style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid' }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-50 border border-emerald-100 shadow-sm">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            </div>
                            <h3 className="font-serif text-2xl text-emerald-950 tracking-wide">Inclusions</h3>
                        </div>

                        <ul className="space-y-2.5">
                            {inclusions.map((item, idx) => (
                                <li key={idx} className="flex gap-3 group">
                                    <span className="text-emerald-500 mt-0.5 font-bold text-sm">✓</span>
                                    <p className="font-sans text-[12px] leading-relaxed text-gray-700 font-medium">{item}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                    )}

                    {inclusions.length > 0 && exclusions.length > 0 && (
                        <div className="h-px w-full bg-gray-100" />
                    )}

                    {/* Exclusions */}
                    {exclusions.length > 0 && (
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-4" style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid' }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-50 border border-red-100 shadow-sm">
                                <XCircle className="w-4 h-4 text-red-500" />
                            </div>
                            <h3 className="font-serif text-2xl text-emerald-950 tracking-wide">Exclusions</h3>
                        </div>

                        <ul className="space-y-2.5">
                            {exclusions.map((item, idx) => (
                                <li key={idx} className="flex gap-3 group">
                                    <span className="text-red-400 mt-0.5 font-bold text-sm">✕</span>
                                    <p className="font-sans text-[12px] leading-relaxed text-gray-700 font-medium">{item}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                    )}

                </div>
            </div>
        </section>
    )
}
