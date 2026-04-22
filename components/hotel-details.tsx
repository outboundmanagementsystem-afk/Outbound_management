"use client"

import { useEffect, useRef, useState } from "react"
import { Star, MapPin, Building2, BedDouble, UtensilsCrossed } from "lucide-react"

interface HotelData { name?: string; hotelName?: string; subtitle: string; location: string; rating: number; tag: string | null; nights: string; amenities: string[] | string; mealPlan?: string; roomCategory?: string }
interface HotelDetailsProps { hotelList?: HotelData[] }

const defaultHotels: HotelData[] = [
  { name: "Grand Mir International", subtitle: "Or Similar Property", location: "Srinagar, Kashmir", rating: 3, tag: null, nights: "4 Nights", amenities: ["Breakfast Included", "Housekeeping", "WiFi"] },
  { name: "The Sarai", subtitle: "Or Deewan By Royal Naqash", location: "Srinagar, Kashmir", rating: 4, tag: "Recommended", nights: "4 Nights", amenities: ["All Meals", "Concierge", "Spa Access"] },
]

export function HotelDetails({ hotelList }: HotelDetailsProps = {}) {
  const hotels = hotelList || defaultHotels

  return (
    <>
      {/* SECTION HEADER */}
      <section
        className="relative py-8 px-4 avoid-break page-break-before pdf-section"
        style={{
          backgroundImage: "url('/images/bg/page_005.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#051F10'
        }}
      >
        <div className="absolute inset-0 bg-[#00000022] pointer-events-none" />
          <div className="relative z-20 w-full text-center px-4">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="h-[1px] w-6 bg-white/40" />
              <p className="font-sans text-[8px] tracking-[0.3em] font-black uppercase text-white/90">
                Curated Stays
              </p>
              <div className="h-[1px] w-6 bg-white/40" />
            </div>
            <h2 className="font-serif text-[2.5rem] uppercase leading-none drop-shadow-2xl font-black text-[#FFE500]">
              Hotel Details
            </h2>
          </div>
      </section>

      {/* INDIVIDUAL HOTEL CARDS */}
      {hotels.map((hotel, idx) => (
        <section
          key={idx}
          className="relative py-3 px-4 avoid-break pdf-section"
          style={{
            backgroundImage: "url('/images/bg/page_005.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#051F10'
          }}
        >
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />
          <div className="relative z-20 w-full">
            <div className="bg-white rounded-[24px] p-5 flex flex-col relative overflow-hidden shadow-2xl border border-white/5">
              {/* Top Row: Nights + Location */}
              <div className="flex items-center justify-between mb-4">
                <div className="bg-[#FFE500] px-3 py-1 rounded-full">
                   <span className="font-sans text-[8px] font-black text-black uppercase tracking-widest">{hotel.nights}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-[#4B5563]" />
                    <p className="font-sans text-[10px] font-bold text-[#4B5563] uppercase tracking-wider opacity-60">
                        {hotel.location?.split(',')[0]}
                    </p>
                </div>
              </div>

              {/* Hotel Name */}
              <h3 className="font-sans text-[20px] font-black uppercase tracking-tight leading-tight mb-1 text-[#1A211D]">
                  {hotel.name || hotel.hotelName || "Unnamed Hotel"}
              </h3>
              <p className="font-sans text-[11px] text-gray-400 italic mb-4">{hotel.subtitle || "Or Similar Property"}</p>

              <div className="w-12 h-1 bg-[#FFE500] mb-4 rounded-full" />

              {/* Star Rating */}
              {hotel.rating && (
                <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                            key={i}
                            className={`w-4 h-4 ${i < hotel.rating ? 'fill-[#FFE500] text-[#FFE500]' : 'fill-[#E5E7EB] text-[#E5E7EB]'}`}
                        />
                    ))}
                    <span className="font-sans text-[9px] font-black text-[#6B7280] uppercase tracking-widest ml-1">{hotel.rating}-Star</span>
                </div>
              )}

              {/* Meal Plan if available */}
              {hotel.mealPlan && (
                <div className="flex items-center gap-2 mb-4 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-sans text-[10px] font-black text-emerald-700 uppercase tracking-wider">{hotel.mealPlan}</span>
                </div>
              )}

              {/* Room Category if available */}
              {hotel.roomCategory && (
                <div className="flex items-center gap-2 mb-4 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100">
                    <BedDouble className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-sans text-[10px] font-black text-blue-700 uppercase tracking-wider">{hotel.roomCategory}</span>
                </div>
              )}

              {/* Amenities */}
              <div className="flex flex-wrap gap-1.5">
                {(typeof hotel.amenities === 'string' ? hotel.amenities.split(',') : (hotel.amenities || [])).map((amenity, aIdx) => {
                  const trimmed = typeof amenity === 'string' ? amenity.trim() : amenity;
                  if (!trimmed) return null;
                  return (
                    <span key={aIdx} className="px-3 py-1.5 rounded-lg font-sans text-[8px] font-black uppercase tracking-wider bg-gray-50 text-[#1A211D] border border-gray-100">
                        {trimmed}
                    </span>
                  )
                })}
              </div>

            </div>
          </div>
        </section>
      ))}
    </>
  )
}
