"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { toTitleCase } from "@/lib/utils"

interface TripSummaryProps {
  fields?: { label: string; value: string; icon?: string }[]
}

export function TripSummary({ fields }: TripSummaryProps = {}) {
  const defaultFields = [
    { label: "Consultant Name", value: "" },
    { label: "Consultant Phone", value: "" },
    { label: "Name", value: "" },
    { label: "Phone", value: "" },
    { label: "Email", value: "" },
    { label: "Trip To", value: "" },
    { label: "Dates", value: "" },
    { label: "Duration", value: "" },
    { label: "Total Adults", value: "" },
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

  // Grouping logic
  const contactLabels = ["Consultant Name", "Consultant Phone", "Name", "Phone", "Email"]
  const tripLabels = ["Trip To", "Dates", "Duration", "No. of Nights", "Total Adults", "CWB (Child With Bed)", "CNB (Child No Bed)", "Kid's Age", "Experiences", "Start Date", "End Date"]

  const contactDetails = summaryFields.filter(f => contactLabels.includes(f.label))
  const tripDetails = summaryFields.filter(f => tripLabels.includes(f.label) || (!contactLabels.includes(f.label) && !tripLabels.includes(f.label)))

  const renderField = (field: { label: string; value: string }, idx: number) => {
    // Format Email to lowercase, others to Title Case if not already handled
    let displayValue = field.value || "—"
    const isEmail = field.label.toLowerCase().includes("email")
    if (isEmail) {
      displayValue = displayValue.toLowerCase()
    }

    return (
      <div key={idx} className="flex items-start gap-4 group transition-all duration-300 w-full mb-3 last:mb-0">
        <span className="font-poppins text-[13px] font-bold tracking-[0.02em] text-[#8E918F] min-w-[140px] shrink-0 text-left trip-summary-label">
            {toTitleCase(field.label)}
        </span>
        <span 
            className="font-poppins font-normal text-[#1A211D] leading-tight tracking-tight flex-1 min-w-0 trip-summary-value"
            style={{ 
                wordBreak: 'break-word', 
                overflowWrap: 'break-word',
                fontSize: isEmail && displayValue.length > 25 ? '12px' : '13px'
            }}
        >
            {displayValue}
        </span>
      </div>
    )
  }

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex flex-col gap-2 mb-6 mt-4 first:mt-0">
      <span className="font-poppins text-[15px] font-bold tracking-[0.02em] text-[#051F10] uppercase">{title}</span>
      <div className="h-[1px] bg-[#051F10]/10 w-full" />
    </div>
  )

  return (
    <section className="relative py-10 px-4 overflow-hidden avoid-break flex flex-col justify-center items-center pdf-section" 
        style={{ minHeight: 'auto', backgroundColor: '#051F10' }}>
      <div className="absolute inset-0 z-0">
        <Image src="/images/bg/page_007.png" alt="Background" fill className="object-cover object-top opacity-100" />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div ref={ref} className={`relative z-10 w-full mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

        {/* Top Dark Card */}
        <div className="bg-[#051F10] rounded-t-[32px] pt-8 pb-6 text-center shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative z-20 flex flex-col items-center justify-center border-b border-white/5">
          <div className="flex items-center justify-center gap-2 mb-4 w-full px-4">
            <div className="h-px bg-[#FFE500] opacity-30 flex-1 max-w-[40px]" />
            <span className="font-poppins text-[9px] font-black tracking-[0.4em] text-[#FFE500] uppercase mx-1 whitespace-nowrap">Premium Itinerary</span>
            <div className="h-px bg-[#FFE500] opacity-30 flex-1 max-w-[40px]" />
          </div>
          <h2 className="font-poppins text-4xl tracking-tight uppercase text-white leading-none font-black">
            Trip Summary
          </h2>
        </div>

        {/* Bottom Light Card */}
        <div className="bg-[#FDFDFB] rounded-b-[32px] px-10 py-10 relative z-10 shadow-2xl border-x border-b border-gray-100 max-w-xl mx-auto">
          
          {/* Contact Details Section */}
          {contactDetails.length > 0 && (
            <div className="mb-10">
              <SectionHeader title="Contact Details" />
              <div className="flex flex-col">
                {contactDetails.map((field, idx) => renderField(field, idx))}
              </div>
            </div>
          )}

          {/* Trip Details Section */}
          {tripDetails.length > 0 && (
            <div>
              <SectionHeader title="Trip Details" />
              <div className="flex flex-col">
                {tripDetails.map((field, idx) => renderField(field, idx))}
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  )
}
