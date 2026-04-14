"use client"

import { useEffect, useRef, useState } from "react"
import { Scale } from "lucide-react"

interface TermsSectionProps {
    title?: string
    terms?: string[]
}

export function TermsSection({ title = "Terms & Conditions", terms = [] }: TermsSectionProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
            { threshold: 0.1 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    return (
        <section className="relative py-6 px-4 overflow-hidden avoid-break page-break-before pdf-section" style={{ background: '#FAF9F6', backgroundColor: '#FAF9F6' }}>
            <div ref={ref} className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-4" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.05))', border: '1px solid rgba(212,175,55,0.2)' }}>
                        <Scale className="w-4 h-4" style={{ color: '#D4AF37' }} />
                    </div>
                    <h2 className="font-serif text-2xl tracking-wide" style={{ color: '#031A0C' }}>{title}</h2>
                    <div className="mt-3 mx-auto w-16 h-px" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                    <ul className="space-y-4">
                        {terms.map((term, idx) => (
                            <li key={idx} className="flex gap-3 group">
                                <span className="font-serif text-lg font-bold flex-shrink-0" style={{ color: 'rgba(212,175,55,0.4)' }}>
                                    {String(idx + 1).padStart(2, '0')}
                                </span>
                                <p className="font-sans text-[11px] leading-relaxed text-gray-600 mt-0.5 group-hover:text-gray-900 transition-colors whitespace-pre-wrap">
                                    {term}
                                </p>
                            </li>
                        ))}
                        {terms.length === 0 && (
                            <p className="text-center text-gray-400 italic text-sm">No terms specified.</p>
                        )}
                    </ul>
                </div>

            </div>
        </section>
    )
}
