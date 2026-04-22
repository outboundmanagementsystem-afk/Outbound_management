"use client"

import { useEffect, useRef, useState } from "react"
import { Calendar, Moon, MapPin } from "lucide-react"

interface DayData { 
  day: string; 
  date: string; 
  title: string; 
  description: string; 
  highlights: string[]; 
  overnightStay?: string; 
  subDestination?: string 
}

interface DayItineraryProps { 
  dayPlans?: DayData[]; 
  destination?: string; 
  totalDays?: number;
  startDate?: string 
}

const defaultDays: DayData[] = [
  { day: "Day 01", date: "Mon, 23 Dec", title: "Arrival / Srinagar", description: "Arrival in Srinagar, transfer to hotel/houseboat. Visit Mughal Gardens, Shalimar Garden, Chashmashahi. Evening Shikara ride on Dal Lake. Dinner & Overnight stay.", highlights: ["Mughal Gardens", "Shalimar Garden", "Shikara Ride", "Dal Lake"], overnightStay: "Srinagar" },
  { day: "Day 02", date: "Tue, 24 Dec", title: "Srinagar to Sonamarg", description: "After breakfast, drive to Sonamarg (Meadow of Gold). Visit Thajiwas Glacier, enjoy the stunning views of snow-covered mountains and pristine valleys. Return to Srinagar for overnight stay.", highlights: ["Thajiwas Glacier", "Meadow of Gold", "Snow Mountains"], overnightStay: "Srinagar" },
]

/**
 * Compute a sequential date string from a base start date + day index.
 * Returns formatted uppercase string like "TUE, MAY 5".
 */
function computeSequentialDate(startDateStr: string, index: number): string {
  try {
    const baseDate = new Date(startDateStr);
    if (isNaN(baseDate.getTime())) return "";
    const currentDate = new Date(baseDate);
    currentDate.setDate(baseDate.getDate() + index);
    return currentDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    }).toUpperCase();
  } catch {
    return "";
  }
}

export function DayItinerary({ dayPlans, destination, totalDays, startDate }: DayItineraryProps = {}) {
  const days = [...(dayPlans || defaultDays)].sort((a, b) => {
    const numA = parseInt(a.day.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.day.replace(/\D/g, '')) || 0;
    return numA - numB;
  });
  const dest = destination || "Kashmir"
  const daysCount = totalDays ?? days.length
  
  return (
    <>
      {/* HEADER SECTION */}
      <section
        className="relative py-8 px-4 flex flex-col items-center justify-center text-center overflow-hidden page-break-before pdf-section"
        style={{
          backgroundImage: "url('/images/bg/page_007.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#051F10'
        }}
      >
        <div className="absolute inset-0 bg-[#00000066] pointer-events-none" />
        <div className="relative z-20 w-full text-center px-2">
            <h2 className="font-serif text-[2.5rem] uppercase leading-none drop-shadow-2xl font-black text-[#FFE500]">
                Day Wise Itinerary
            </h2>
            <p className="font-sans text-[9px] font-black uppercase tracking-[0.35em] text-white/70 mt-4">
                {dest} • {daysCount} Day Adventure
            </p>
            <div className="h-1.5 w-20 bg-[#FFE500] mx-auto mt-6 rounded-full shadow-[0_0_30px_rgba(255,229,0,0.6)]" />
        </div>
      </section>

      {/* DAYS */}
      {days.map((day, idx) => {
        const dayLabel = day.day.toLowerCase().includes('day') ? day.day : `Day ${day.day}`;
        
        return (
          <section
            key={idx}
            className="relative py-4 px-4 avoid-break pdf-section"
            style={{
              backgroundImage: "url('/images/bg/page_003.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: '#051F10'
            }}
          >
            <div className="absolute inset-0 bg-black/10 pointer-events-none" />
            <div className="relative z-20 w-full">
              <div className={`p-5 rounded-[24px] shadow-2xl transition-all duration-400 relative overflow-hidden border border-white/5 bg-white`}>
                  
                  {/* Day Marker */}
                  <div className="flex items-center justify-between mb-5">
                      <div className="bg-[#051F10] text-[#FFE500] px-5 py-2 rounded-[14px] font-sans text-lg font-black uppercase tracking-tighter shadow-lg day-marker-badge" style={{ color: '#FFD700', fontWeight: 'bold' }} data-pdf-color="yellow">
                          {dayLabel}
                      </div>
                  </div>

                  {/* Title and Date */}
                  <div className="mb-4">
                      <h3 className="font-sans text-[20px] font-black uppercase tracking-tight leading-tight mb-2 text-[#1A211D]">
                          {day.title}
                      </h3>
                      {(() => {
                        const displayDate = startDate ? computeSequentialDate(startDate, idx) : day.date;
                        return displayDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 stroke-[3]" style={{ color: '#FFE500' }} />
                            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#6B7280', opacity: 0.8 }}>
                                {displayDate}
                            </p>
                          </div>
                        ) : null;
                      })()}
                  </div>

                  <div className="w-16 h-1.5 bg-[#FFE500] rounded-full mb-5" />

                  {/* Content Area */}
                  <div className="space-y-5">
                      {/* Description */}
                      <div className="relative">
                          <p className="font-sans text-[13px] leading-[1.65] text-[#4B5563] font-medium whitespace-pre-wrap">
                              {day.description}
                          </p>
                      </div>

                      {/* Highlights */}
                      {day.highlights && day.highlights.length > 0 && (
                          <div className="bg-gray-50 rounded-[20px] p-5 border border-gray-100 shadow-sm">
                               <h4 className="font-sans text-[9px] font-black uppercase tracking-[0.35em] text-[#8E918F] mb-4">Daily Highlights</h4>
                               <div className="flex flex-col gap-2.5">
                                  {day.highlights.map((h, hi) => (
                                      <div key={hi} className="flex items-start gap-3 group">
                                          <div className="w-2 h-2 rounded-full bg-[#FFE500] mt-1.5 flex-shrink-0 shadow-[0_0_8px_rgba(255,229,0,0.8)]" />
                                          <span className="font-sans text-[13px] font-bold text-[#1A211D] leading-tight">{h}</span>
                                      </div>
                                  ))}
                               </div>
                          </div>
                      )}

                      {/* Overnight Stay - Hidden for last day */}
                      {idx < days.length - 1 && (
                        <div className="bg-[#051F10] rounded-[20px] p-5 flex items-center gap-4 shadow-xl border border-white/5">
                            <div className="w-12 h-12 rounded-[16px] bg-[#FFE500]/10 flex items-center justify-center flex-shrink-0 border border-[#FFE500]/20">
                                <Moon className="w-6 h-6 text-[#FFE500]" />
                            </div>
                            <div>
                                <p className="font-sans font-black uppercase tracking-[0.25em] block mb-1 overnight-stay-label" style={{ color: '#FFD700', fontSize: '12px' }} data-pdf-color="yellow">Overnight Stay</p>
                                <h3 className="font-sans text-base font-black uppercase tracking-tight overnight-stay-value" style={{ color: '#FFFFFF', fontWeight: '600' }} data-pdf-color="white">
                                    {day.overnightStay || day.subDestination || dest}
                                </h3>
                            </div>
                        </div>
                      )}
                  </div>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
