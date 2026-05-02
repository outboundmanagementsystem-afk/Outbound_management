"use client"

import { useEffect, useRef, useState } from "react"
import { toTitleCase } from "@/lib/utils"
import { Map, Ticket } from "lucide-react"

export function AttractionsActivities({ activities, totalPax = 1 }: { activities?: any[], totalPax?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { 
        if (entry.isIntersecting) setIsVisible(true) 
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  if (!activities || activities.length === 0) return null;

  const totalCost = activities.reduce((sum, act) => {
    const basePrice = Number(act.pricePerPerson || act.entryFee || act.price || 0);
    const paxCount = act.pax || totalPax;
    return sum + Number(act.totalPrice || (basePrice * paxCount) || 0);
  }, 0);

  return (
    <>
      {/* HEADER SECTION */}
      <section
        className="relative pt-12 pb-6 px-4 avoid-break page-break-before pdf-section"
        style={{
          backgroundImage: "url('/images/bg/page_006.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#051F10'
        }}
      >
        <div className="absolute inset-0 bg-[#00000044] pointer-events-none" />
        <div className="relative z-20 w-full text-center px-4">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-[1px] w-8 bg-[#FFE500]/60" />
            <p className="font-sans text-[10px] tracking-[0.4em] font-black uppercase text-[#FFE500] flex items-center gap-2">
              <Map className="w-3 h-3" /> Excursions
            </p>
            <div className="h-[1px] w-8 bg-[#FFE500]/60" />
          </div>
          <h2 className="font-serif text-[2.5rem] uppercase leading-none drop-shadow-2xl font-black text-white m-0">
            Attractions & Activities
          </h2>
          <div className="h-1.5 w-20 bg-[#FFE500] mx-auto mt-6 rounded-full shadow-[0_0_20px_rgba(255,229,0,0.5)]" />
        </div>
      </section>

      {/* CARDS SECTION */}
      <section 
        className="relative py-6 px-4 overflow-hidden avoid-break pdf-section" 
        style={{ 
          backgroundImage: "url('/images/bg/page_006.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#051F10' 
        }}
      >
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        <div ref={ref} className={`relative z-10 w-full mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="bg-[#FDFDFB] rounded-[24px] p-6 shadow-2xl border border-white/5 relative max-w-xl mx-auto">
            <div className="flex flex-col gap-0">
              {activities.map((act, idx) => {
                const basePrice = Number(act.pricePerPerson || act.entryFee || act.price || 0);
                const paxCount = act.pax || totalPax;
                const itemTotal = Number(act.totalPrice || (basePrice * paxCount) || 0);

                return (
                  <div key={idx} className="flex flex-col relative py-4 border-b border-gray-200 first:pt-0">
                    <div className="bg-[#f0faf6] border-l-4 border-[#1A4731] rounded-r-xl p-4 flex items-center justify-between gap-4">
                      {/* LEFT SIDE: ICON + DETAILS */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0 border border-[#1A4731]/10">
                          <Ticket className="w-5 h-5 text-[#1A4731]" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <h3 className="font-sans text-[16px] font-black uppercase tracking-tight leading-tight text-[#1A211D] m-0">
                            {act.name || act.activityName || "Unknown Activity"}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-sans text-[9px] font-black uppercase tracking-widest text-[#1A4731] border border-[#1A4731]/30 bg-white px-2 py-0.5 rounded-md">
                              {act.type || "ENTRY TICKET"}
                            </span>
                            <span className="font-sans text-[11px] font-medium text-gray-500">
                              {toTitleCase(act.category || "Historical")}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* RIGHT SIDE: PRICING */}
                      <div className="flex flex-col items-end text-right flex-shrink-0 border-l border-[#1A4731]/10 pl-4">
                        <span className="font-sans text-[10px] font-medium text-gray-500 mb-0.5">
                          ₹{basePrice.toLocaleString()} per person
                        </span>
                        <span className="font-sans text-[18px] font-black text-[#1A4731] leading-none mt-1">
                          ₹{itemTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* SECTION FOOTER: TOTAL COST */}
              <div className="mt-4 flex items-center justify-between bg-[#1A211D] rounded-xl px-5 py-5 shadow-inner">
                <span className="font-sans text-[14px] font-black text-white uppercase tracking-wider">
                  Total Activities Cost
                </span>
                <span className="font-sans text-[22px] font-black text-[#FFE500] leading-none">
                  ₹{totalCost.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
