"use client"

import { useEffect, useRef, useState } from "react"
import { Star, MapPin, Building2, BedDouble, UtensilsCrossed } from "lucide-react"

interface HotelData { 
  name?: string; 
  hotelName?: string; 
  subtitle: string; 
  location: string; 
  rating: number; 
  tag: string | null; 
  nights: string; 
  amenities: string[] | string; 
  mealPlan?: string; 
  roomCategory?: string;
  category?: string;
}

interface HotelDetailsProps { 
  hotelList?: HotelData[];
  baseUrl?: string;
  showCustomImage?: boolean;
}

const defaultHotels: HotelData[] = [
  { name: "Grand Mir International", subtitle: "Or Similar Property", location: "Srinagar, Kashmir", rating: 3, tag: null, nights: "4 Nights", amenities: ["Breakfast Included", "Housekeeping", "WiFi"], category: "BUDGET" },
  { name: "The Sarai", subtitle: "Or Deewan By Royal Naqash", location: "Srinagar, Kashmir", rating: 4, tag: "Recommended", nights: "4 Nights", amenities: ["All Meals", "Concierge", "Spa Access"], category: "DELUXE" },
]

export function HotelDetails({ hotelList, baseUrl, showCustomImage }: HotelDetailsProps = {}) {
  const hotels = hotelList || defaultHotels
  const categories = Array.from(new Set(hotels.map(h => h.category || "STANDARD")))

  return (
    <>
      {/* SECTION HEADER */}
      <section
        className="relative py-12 px-4 avoid-break page-break-before pdf-section"
        style={{
          backgroundImage: "url('/images/bg/page_005.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#051F10'
        }}
      >
        <div className="absolute inset-0 bg-[#00000044] pointer-events-none" />
          <div className="relative z-20 w-full text-center px-4">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="h-[1px] w-8 bg-[#FFE500]/60" />
              <p className="font-sans text-[10px] tracking-[0.4em] font-black uppercase text-[#FFE500]">
                Curated Stays
              </p>
              <div className="h-[1px] w-8 bg-[#FFE500]/60" />
            </div>
            <h2 className="font-serif text-[3.5rem] uppercase leading-none drop-shadow-2xl font-black text-white">
              Hotel Details
            </h2>
            <div className="h-1.5 w-20 bg-[#FFE500] mx-auto mt-6 rounded-full" />
          </div>
      </section>

      {/* RENDER BY TIER/PLAN */}
      {categories.map((cat, pIdx) => {
        const tierHotels = hotels.filter(h => (h.category || "STANDARD") === cat)
        
        return (
          <div 
            key={cat} 
            className={`pdf-section overflow-hidden ${pIdx === 0 ? 'mt-4' : 'mt-5'} mb-8`} 
            style={{ background: '#000000', border: '1.5px solid #000000', borderRadius: '16px' }}
          >
            {/* Plan Header */}
            <div className="relative py-6 px-8 bg-black border-b border-white/10 flex flex-row items-center justify-between gap-4">
               <div className="flex items-center gap-3 relative z-10 flex-wrap">
                 <span className="font-sans text-[14px] font-black text-white uppercase tracking-[0.15em] whitespace-nowrap">Option {pIdx + 1}</span>
                 <div className="h-4 w-px bg-white/20" />
                 <h3 className="font-serif text-xl sm:text-2xl font-black text-white uppercase tracking-widest whitespace-nowrap">{cat}</h3>
               </div>
               <div className="relative z-10 shrink-0">
                 <span className="hotel-count-badge font-sans text-[9px] font-black text-black uppercase tracking-widest bg-[#FFE500] px-3 py-1 rounded-full whitespace-nowrap">
                   {tierHotels.length} {tierHotels.length === 1 ? 'Hotel' : 'Hotels'}
                 </span>
               </div>
            </div>

            <div className="p-6 space-y-6">
            


            {tierHotels.map((hotel, hIdx) => (
              <section
                key={hIdx}
                className="relative avoid-break"
              >
                <div className="relative z-20 w-full">
                  <div className="bg-white rounded-xl p-6 flex flex-col relative overflow-hidden border border-gray-200 shadow-sm">
                    {/* Top Row: Nights + Location */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="bg-black px-4 py-1.5 rounded-lg">
                         <span className="font-sans text-[9px] font-black text-white uppercase tracking-widest">{hotel.nights}</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <p className="font-sans text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                              {hotel.location?.split(',')[0]}
                          </p>
                      </div>
                    </div>

                    {/* Hotel Name */}
                    <h3 className="font-sans text-[24px] font-black uppercase tracking-tight leading-tight mb-1 text-[#051F10]">
                        {hotel.name || hotel.hotelName || "Unnamed Hotel"}
                    </h3>
                    <p className="font-sans text-[12px] text-gray-400 italic mb-6">{hotel.subtitle || "Or Similar Property"}</p>

                    <div className="w-16 h-1 bg-[#FFE500] mb-6 rounded-full shadow-sm" />

                    {/* Meta Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">


                        {/* Meal Plan */}
                        {hotel.mealPlan && (
                          <div className="flex flex-col gap-2 p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                              <span className="font-sans text-[8px] font-black text-emerald-600/60 uppercase tracking-[0.2em]">Board</span>
                              <div className="flex items-center gap-2">
                                <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="font-sans text-[10px] font-black text-emerald-700 uppercase tracking-tight">{hotel.mealPlan}</span>
                              </div>
                          </div>
                        )}

                        {/* Room Category */}
                        {hotel.roomCategory && (
                          <div className="flex flex-col gap-2 p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
                              <span className="font-sans text-[8px] font-black text-blue-600/60 uppercase tracking-[0.2em]">Room</span>
                              <div className="flex items-center gap-2">
                                <BedDouble className="w-3.5 h-3.5 text-blue-600" />
                                <span className="font-sans text-[10px] font-black text-blue-700 uppercase tracking-tight">{hotel.roomCategory}</span>
                              </div>
                          </div>
                        )}
                    </div>

                    {/* Amenities */}
                    <div className="flex flex-wrap gap-2">
                      {(typeof hotel.amenities === 'string' ? hotel.amenities.split(',') : (hotel.amenities || [])).map((amenity, aIdx) => {
                        const trimmed = typeof amenity === 'string' ? amenity.trim() : amenity;
                        if (!trimmed) return null;
                        return (
                          <span key={aIdx} className="px-3 py-1.5 rounded-lg font-sans text-[8px] font-black uppercase tracking-wider bg-gray-50 text-gray-500 border border-gray-100/50">
                              {trimmed}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </section>
            ))}
            </div>
          </div>
        )
      })}
    </>
  )
}
