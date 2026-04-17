"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

interface TripSummaryProps {
  fields?: { label: string; value: string; icon?: string }[]
}

export function TripSummary({ fields }: TripSummaryProps = {}) {
  const defaultFields = [
    { label: "CONSULTANT", value: "" },
    { label: "NAME", value: "" },
    { label: "TRIP TO", value: "" },
    { label: "NO. OF NIGHTS", value: "" },
    { label: "START DATE", value: "" },
    { label: "END DATE", value: "" },
    { label: "TOTAL ADULTS", value: "" },
    { label: "EXPERIENCES", value: "" },
  ]
  const summaryFields = fields || defaultFields

  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // We still use the observer for the entry animation on scroll, 
    // but we default to true to ensure it's visible in PDF generation 
    // where the observer might not trigger.
    const observer = new IntersectionObserver(
      ([entry]) => { 
        if (entry.isIntersecting) setIsVisible(true) 
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="relative py-6 px-4 overflow-hidden avoid-break flex flex-col justify-center items-center pdf-section" 
        style={{ minHeight: 'auto', backgroundColor: '#051F10' }}>
      <div className="absolute inset-0 z-0">
        <Image src="/images/bg/page_007.png" alt="Background" fill className="object-cover object-top opacity-100" />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div ref={ref} className={`relative z-10 w-full mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

        {/* Top Dark Card */}
        <div className="bg-[#051F10] rounded-t-[28px] pt-6 text-center shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative z-20 flex flex-col items-center justify-center pb-4 border-b border-white/5">
          <div className="flex items-center justify-center gap-2 mb-3 w-full px-4">
            <div className="h-px bg-[#FFE500] opacity-40 flex-1 max-w-[40px]" />
            <span className="font-sans text-[8px] font-black tracking-[0.35em] text-[#FFE500] uppercase mx-1 whitespace-nowrap">Premium Itinerary</span>
            <div className="h-px bg-[#FFE500] opacity-40 flex-1 max-w-[40px]" />
          </div>
          <h2 className="font-serif text-3xl tracking-tight uppercase text-white leading-none font-black">
            Trip Summary
          </h2>
        </div>

        {/* Bottom Light Card */}
        <div className="bg-[#FDFDFB] rounded-b-[28px] px-8 py-6 relative z-10 shadow-2xl border-x border-b border-gray-100 max-w-xl mx-auto">
          <div className="flex flex-col gap-5 mt-1">
            {summaryFields.filter(f => f.label !== "Booking ID" && f.label !== "Kid's Age").map((field, idx) => (
              <div key={idx} className="flex items-center gap-4 group transition-all duration-300 w-full">
                <span className="font-sans text-[9px] font-black uppercase tracking-[0.35em] text-[#8E918F] min-w-[120px] text-left">
                    {field.label}:
                </span>
                <span className="font-sans text-[15px] font-black text-[#1A211D] break-words leading-tight uppercase tracking-tight flex-1">
                    {field.value || "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
