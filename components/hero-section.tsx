"use client"

import Image from "next/image"
import { MapPin, Calendar, Moon, Sun } from "lucide-react"

interface HeroSectionProps {
  customerName?: string
  destination?: string
  nights?: number
  days?: number
  startDate?: string
  endDate?: string
  packageName?: string
  description?: string
}

export function HeroSection({ 
  customerName, 
  destination, 
  nights, 
  days, 
  startDate, 
  endDate,
  packageName,
  description
}: HeroSectionProps = {}) {
  const displayName = customerName || "Guest"
  const displayDest = destination || "Your Destination"
  const displayNights = nights ?? 4
  const displayDays = days ?? 5
  const displayStartDate = startDate || "TBA"
  const displayEndDate = endDate || "TBA"

  let formattedDates = `${displayStartDate} – ${displayEndDate}`
  if (startDate && endDate && startDate !== "TBA" && endDate !== "TBA") {
    try {
      const d1 = new Date(startDate)
      const d2 = new Date(endDate)
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const m1 = d1.toLocaleDateString('en-US', { month: 'short' })
        const day1 = d1.getDate()
        const y1 = d1.getFullYear()
        
        const m2 = d2.toLocaleDateString('en-US', { month: 'short' })
        const day2 = d2.getDate()
        const y2 = d2.getFullYear()
        
        if (y1 === y2) {
          if (m1 === m2) {
            formattedDates = `${m1} ${day1} – ${day2}, ${y1}`
          } else {
            formattedDates = `${m1} ${day1} – ${m2} ${day2}, ${y1}`
          }
        } else {
          formattedDates = `${m1} ${day1}, ${y1} – ${m2} ${day2}, ${y2}`
        }
      }
    } catch (e) {
      // Keep fallback
    }
  }

  return (
    <section className="relative w-full overflow-hidden bg-[#031A0C] avoid-break flex flex-col items-center py-10 px-6 text-center pdf-section" style={{ minHeight: 'auto' }}>
      {/* Background with texture */}
      <div className="absolute inset-0 z-0 opacity-40">
        <Image
          src="/images/bg/page_001.png"
          alt="Background"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#031A0C] via-transparent to-[#031A0C]" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        {/* Logo */}
        <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <img
            src="/images/outbound png.png"
            alt="Outbound Travelers"
            data-pdf-logo="true"
            style={{ 
              width: '160px', 
              height: 'auto', 
              display: 'block', 
              objectFit: 'contain',
              maxWidth: 'none'
            }}
          />
        </div>

        {/* Top Tagline */}
        <div className="flex items-center gap-4 mb-8 w-full justify-center">
          <div className="h-px w-10 bg-[#FFE500]/50" />
          <span className="font-sans text-[10px] tracking-[0.4em] font-black text-[#FFE500] uppercase">
            Curated Just For You
          </span>
          <div className="h-px w-10 bg-[#FFE500]/50" />
        </div>

        {/* Hello Guest */}
        <div className="mb-4">
          <h2 className="font-serif text-4xl text-[#FFE500] italic mb-2">Hello!</h2>
          <h1 className="font-serif text-5xl text-white uppercase font-black leading-tight tracking-[0.05em] break-words max-w-[400px]">
            {displayName}
          </h1>
        </div>

        {/* Package Identity (Package Name + Description) */}
        {(packageName || description) && (
          <div className="mb-8 max-w-[400px]">
            {packageName && (
              <h2 className="font-sans text-[15px] font-bold text-white/90 uppercase tracking-[0.1em] mb-1">
                {packageName}
              </h2>
            )}
            {description && (
              <p className="font-sans text-[12px] text-white/60 leading-relaxed italic">
                {description}
              </p>
            )}
          </div>
        )}

        <div className="w-12 h-1 bg-[#FFE500] rounded-full mb-10 shadow-[0_0_20px_rgba(255,229,0,0.6)]" />

        {/* Destination Card - Matching Image 2 */}
        <div className="w-full max-w-[440px] bg-white rounded-[40px] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.4)] mb-8 overflow-hidden border border-white/10">
          <div className="relative h-64 w-full rounded-[34px] overflow-hidden">
            <Image
              src="/images/landmarks-bg.png"
              alt={displayDest}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/10" />
          </div>

          <div className="pt-6 pb-8 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-[#FFE500] px-5 py-2 rounded-full mb-4 shadow-md">
              <MapPin className="w-4 h-4 text-black" strokeWidth={3} />
              <span className="font-sans text-[10px] font-black uppercase tracking-widest text-black">Destination</span>
            </div>
            <h3 className="font-serif text-[42px] font-black text-[#1A211D] uppercase tracking-tight leading-none px-4 break-words">
              {displayDest}
            </h3>
          </div>
        </div>

        {/* Trip Metadata */}
        <div className="w-full max-w-[400px] grid grid-cols-2 gap-3 mb-8">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-2 mb-1">
              <Moon className="w-4 h-4 text-[#FFE500]" />
              <Sun className="w-4 h-4 text-[#FFE500]" />
            </div>
            <span className="font-sans text-lg font-black text-white">{displayNights}N / {displayDays}D</span>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-1.5 mb-1 opacity-60">
              <Calendar className="w-3.5 h-3.5 text-white" />
              <span className="font-sans text-[9px] font-bold uppercase tracking-[0.15em] text-white">Travel Dates</span>
            </div>
            <span className="font-sans text-[15px] font-black text-white tracking-tight text-center leading-none mt-0.5">
              {formattedDates}
            </span>
          </div>
        </div>

        <p className="font-sans text-[10px] font-black text-[#FFE500]/40 uppercase tracking-[0.5em] mb-4">
          Outbound Travelers Itinerary
        </p>
      </div>
    </section>
  )
}
