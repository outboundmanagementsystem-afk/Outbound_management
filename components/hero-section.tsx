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
}

export function HeroSection({ customerName, destination, nights, days, startDate, endDate }: HeroSectionProps = {}) {
  const displayName = customerName || "Guest"
  const displayDest = destination || "Your Destination"
  const displayNights = nights ?? 4
  const displayDays = days ?? 5
  const displayStartDate = startDate || "TBA"
  const displayEndDate = endDate || "TBA"

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
        <div className="relative w-48 h-24 mb-10">
          <Image
            src="/images/outbound png.png"
            alt="Outbound Travelers"
            fill
            className="object-contain"
            priority
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
        <div className="mb-8">
          <h2 className="font-serif text-4xl text-[#FFE500] italic mb-2">Hello!</h2>
          <h1 className="font-serif text-5xl text-white uppercase font-black leading-tight tracking-[0.05em] break-words max-w-[400px]">
            {displayName}
          </h1>
        </div>

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

        {/* Trip Metadata - Subtle but present for functional reasons */}
        <div className="w-full max-w-[400px] grid grid-cols-2 gap-3 mb-8">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-2 mb-1">
              <Moon className="w-4 h-4 text-[#FFE500]" />
              <Sun className="w-4 h-4 text-[#FFE500]" />
            </div>
            <span className="font-sans text-lg font-black text-white">{displayNights}N / {displayDays}D</span>
          </div>

          <div className="bg-[#FFE500]/95 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center justify-center gap-1 shadow-lg">
            <Calendar className="w-4 h-4 text-[#1A211D]" />
            <span className="font-sans text-xs font-black text-[#1A211D] tracking-tighter uppercase text-center leading-tight">
              {displayStartDate}<br/>– {displayEndDate}
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
