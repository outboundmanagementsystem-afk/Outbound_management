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
    <section className="relative w-full overflow-hidden bg-[#031A0C] avoid-break flex flex-col items-center py-8 px-4 text-center pdf-section" style={{ minHeight: 'auto' }}>
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
        <div className="relative w-36 h-16 mb-6 transition-transform hover:scale-105 duration-700">
          <Image
            src="/images/outbound png.png"
            alt="Outbound Travelers"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Top Tagline */}
        <div className="flex items-center gap-2 mb-5">
          <div className="h-[1px] w-6 bg-[#FFE500]/40" />
          <span className="font-sans text-[8px] tracking-[0.35em] font-black text-[#FFE500] uppercase">
            Curated Just For You
          </span>
          <div className="h-[1px] w-6 bg-[#FFE500]/40" />
        </div>

        {/* Hello Guest */}
        <div className="mb-6">
          <h2 className="font-serif text-3xl text-[#FFE500] italic mb-1">Hello!</h2>
          <h1 className="font-serif text-4xl text-white uppercase font-black leading-tight tracking-tighter break-words max-w-[360px]">
            {displayName}
          </h1>
        </div>

        <div className="w-10 h-1 bg-[#FFE500] rounded-full mb-6 shadow-[0_0_15px_rgba(255,229,0,0.5)]" />

        {/* Destination Card */}
        <div className="w-full bg-white/95 backdrop-blur-sm rounded-[28px] p-3 shadow-2xl mb-6 overflow-hidden border border-white/20">
          <div className="relative h-36 w-full rounded-[22px] overflow-hidden mb-4">
            <Image
              src="/images/landmarks-bg.png"
              alt={displayDest}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>

          <div className="px-3 pb-4">
            <div className="inline-flex items-center gap-1.5 bg-[#FFE500] px-3 py-1 rounded-full mb-3">
              <MapPin className="w-3 h-3 text-black" />
              <span className="font-sans text-[8px] font-black uppercase text-black">Destination</span>
            </div>
            <h3 className="font-serif text-3xl font-black text-[#1A211D] uppercase tracking-tighter leading-none break-words">
              {displayDest}
            </h3>
          </div>
        </div>

        {/* Trip Metadata */}
        <div className="w-full space-y-2">
          <div className="bg-white/10 border border-white/10 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-[#FFE500]" />
              <span className="font-sans text-base font-black text-white">{displayNights} Nights</span>
            </div>
            <div className="w-px h-5 bg-white/20" />
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-[#FFE500]" />
              <span className="font-sans text-base font-black text-white">{displayDays} Days</span>
            </div>
          </div>

          <div className="bg-[#FFE500] rounded-xl p-4 flex items-center justify-center gap-2 shadow-lg">
            <Calendar className="w-4 h-4 text-[#1A211D]" />
            <span className="font-sans text-sm font-black text-[#1A211D] tracking-tighter uppercase whitespace-nowrap">
              {displayStartDate} – {displayEndDate}
            </span>
          </div>
        </div>

        <p className="mt-6 font-sans text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">
          Outbound Travelers Itinerary
        </p>
      </div>
    </section>
  )
}
