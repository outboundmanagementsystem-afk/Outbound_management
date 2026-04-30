"use client"

import { useEffect, useRef, useState } from "react"
import { Plane, Clock } from "lucide-react"

interface FlightSegment {
  type: string; from: string; fromCode: string; to: string; toCode: string;
  departure: string; departureDate: string; arrival: string; arrivalDate: string;
  airline: string; duration: string; flightNo: string; price?: number | string;
}
interface FlightDetailsProps { segments?: FlightSegment[]; module?: string; }

const defaultSegments: FlightSegment[] = [
  { type: "Onward", from: "Trivandrum", fromCode: "TRV", to: "Delhi", toCode: "DEL", departure: "06:15", departureDate: "Mon, 23 Dec 2024", arrival: "09:40", arrivalDate: "Mon, 23 Dec 2024", airline: "Indigo", duration: "3h 25m", flightNo: "6E-7201" },
  { type: "Onward", from: "Delhi", fromCode: "DEL", to: "Srinagar", toCode: "SXR", departure: "12:40", departureDate: "Mon, 23 Dec 2024", arrival: "14:05", arrivalDate: "Mon, 23 Dec 2024", airline: "Indigo", duration: "1h 25m", flightNo: "6E-2181" },
  { type: "Return", from: "Srinagar", fromCode: "SXR", to: "Delhi", toCode: "DEL", departure: "15:20", departureDate: "Fri, 27 Dec 2024", arrival: "18:40", arrivalDate: "Fri, 27 Dec 2024", airline: "Air India", duration: "1h 20m", flightNo: "AI-442" },
]

export function FlightDetails({ segments, module }: FlightDetailsProps = {}) {
  const flightSegments = segments || defaultSegments
  const isBuiltPackage = module === "built-package";
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
    <section
      className={`relative py-8 px-4 avoid-break pdf-section flight-section ${isBuiltPackage ? 'is-built-package' : ''}`}
      style={{
        backgroundImage: "url('/images/bg/page_004.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#051F10'
      }}
    >
      <style jsx>{`
        @media print {
          .flight-section {
            background-image: none !important;
            background-color: #051F10 !important;
          }
          .flight-bg-img {
            display: block !important;
          }
        }
      `}</style>
      
      {/* PDF-only background image to replace CSS background-image */}
      <img 
        src="/images/bg/page_004.png" 
        alt="" 
        className="absolute inset-0 w-full h-full object-cover pointer-events-none hidden flight-bg-img"
        style={{ zIndex: 0 }}
      />
      
      <div className="absolute inset-0 bg-[#00000066] pointer-events-none flight-overlay" style={{ zIndex: 1 }} />

      <div ref={ref} className={`relative z-20 w-full mx-auto transition-all duration-1000 flight-content ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        {isBuiltPackage && (
          <style>{`
            @media print {
              .flight-section.is-built-package {
                background: #051F10 !important;
                background-image: none !important;
                opacity: 1 !important;
                visibility: visible !important;
                transform: none !important;
              }
              .flight-section.is-built-package * {
                color: #ffffff !important;
                opacity: 1 !important;
                visibility: visible !important;
                transform: none !important;
              }
              .flight-section.is-built-package .flight-content {
                position: relative !important;
                z-index: 20 !important;
              }
              .flight-section.is-built-package .flight-overlay {
                display: none !important;
              }
              /* ticket specific colors preserved */
              .flight-section.is-built-package .flight-ticket {
                background: #FDFDFB !important;
              }
              .flight-section.is-built-package .flight-text-dark {
                color: #1A211D !important;
              }
              /* Fix for backdrop filter */
              .flight-section.is-built-package * {
                backdrop-filter: none !important;
                filter: none !important;
              }
            }
          `}</style>
        )}
        {/* Section header */}
        <div className="text-center mb-6 px-2">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="h-[1px] w-6" style={{ background: 'rgba(255,229,0,0.4)' }} />
            <p className="font-sans text-[8px] font-black tracking-[0.35em] uppercase" style={{ color: '#FFE500' }}>Air Journey</p>
            <div className="h-[1px] w-6" style={{ background: 'rgba(255,229,0,0.4)' }} />
          </div>
          <h2 className="font-serif text-[2.5rem] tracking-tight leading-none font-black uppercase text-white drop-shadow-2xl">Flight Details</h2>
          <div className="h-1 w-16 bg-[#FFE500] mx-auto mt-4 rounded-full shadow-[0_0_20px_rgba(255,229,0,0.5)]" />
        </div>

        {/* Flight tickets */}
        <div className="flex flex-col gap-3">
          {flightSegments.map((seg, idx) => {
            const isReturn = seg.type?.toLowerCase() === 'return'
            return (
              <div
                key={idx}
                className="rounded-[24px] overflow-hidden transition-all duration-500 relative shadow-2xl border border-white/5 flight-ticket"
                style={{
                  background: '#FDFDFB',
                  transitionDelay: `${idx * 100}ms`,
                }}
              >
                {/* Ticket header (Dark Green) */}
                <div
                  className="flex items-center justify-between px-5 py-3"
                  style={{ background: '#0B1510' }}
                >
                  <div className="flex items-center gap-3 flex-wrap flex-1">
                    <span
                      className="px-3 py-1 rounded-lg font-sans text-[8px] font-black tracking-[0.1em] uppercase shrink-0"
                      style={{
                        background: isReturn ? 'rgba(100,149,237,0.15)' : 'rgba(255,229,0,0.12)',
                        color: isReturn ? '#87CEEB' : '#FFE500',
                        border: `1px solid ${isReturn ? 'rgba(135,206,235,0.3)' : 'rgba(255,229,0,0.3)'}`,
                      }}
                    >
                      {seg.type || 'Onward'}
                    </span>
                    <span className="font-sans text-[10px] font-bold tracking-widest text-white/40 uppercase whitespace-nowrap">{seg.flightNo || (seg as any).flightNumber || 'TBA'}</span>
                    
                    {seg.airline && (
                      <>
                        <div className="h-3 w-px bg-white/20 mx-1" />
                        <span className="font-sans text-[10px] font-bold tracking-widest text-white/60 uppercase whitespace-nowrap">{seg.airline}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3 h-3 text-[#000000]" />
                    <span className="font-sans text-[10px] font-black text-[#000000] whitespace-nowrap" style={{ overflow: 'visible', textOverflow: 'unset' }}>{seg.duration || '2H'}</span>
                  </div>
                </div>

                {/* Ticket body */}
                <div className="px-5 py-5 relative">
                  {/* Main Flight Path */}
                    <div className="flex items-center justify-between gap-3">
                      {/* FROM */}
                      <div className="flex-1">
                        <p className="font-sans text-[8px] font-black uppercase tracking-[0.2em] text-[#8E918F] mb-1">From</p>
                        <p className="font-serif text-3xl tracking-tighter leading-none font-black text-[#1A211D] flight-text-dark">{(seg.fromCode || (seg as any).origin || 'ORG').toUpperCase()}</p>
                        <p className="font-sans text-[9px] text-gray-400 mt-1 truncate">{seg.from}</p>
                      </div>
  
                      {/* PATH */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <Plane className="w-4 h-4 text-[#1A211D] mb-1 flight-text-dark" />
                        <div className="w-12 h-0.5 border-t border-dashed border-gray-300" />
                      </div>
  
                      {/* TO */}
                      <div className="flex-1 text-right">
                        <p className="font-sans text-[8px] font-black uppercase tracking-[0.2em] text-[#8E918F] mb-1 text-right">To</p>
                        <p className="font-serif text-3xl tracking-tighter leading-none font-black text-[#1A211D] flight-text-dark">{(seg.toCode || (seg as any).destination || 'DST').toUpperCase()}</p>
                        <p className="font-sans text-[9px] text-gray-400 mt-1 truncate">{seg.to}</p>
                      </div>
                    </div>

                  <div className="my-4 h-[1px] bg-gray-100" />

                  {/* Details Row */}
                    <div className="flex justify-between items-center bg-gray-50 rounded-xl p-4">
                      <div>
                        <p className="font-sans text-[7px] font-black uppercase tracking-widest text-[#8E918F] mb-0.5">Departure</p>
                        <p className="font-sans text-xl font-black text-[#1A211D] flight-text-dark">{(seg.departure || (seg as any).originTime || '00:00')}</p>
                        <p className="font-sans text-[8px] text-gray-400">{seg.departureDate}</p>
                      </div>
  
                      <div className="w-px h-8 bg-gray-200" />
  
                      <div className="text-right">
                        <p className="font-sans text-[7px] font-black uppercase tracking-widest text-[#8E918F] mb-0.5">Arrival</p>
                        <p className="font-sans text-xl font-black text-[#1A211D] flight-text-dark">{(seg.arrival || (seg as any).destinationTime || '00:00')}</p>
                        <p className="font-sans text-[8px] text-gray-400">{seg.arrivalDate}</p>
                      </div>
                    </div>

                  {/* Price and Note */}
                  {seg.price && Number(seg.price) > 0 && (
                    <div className="mt-6 text-center pt-4 border-t border-gray-100">
                      <p className="font-sans text-xl font-black text-[#1A211D] flight-text-dark">₹{Number(seg.price).toLocaleString('en-IN')}</p>
                      <div style={{ 
                          background: 'rgba(5, 34, 16, 0.03)', 
                          border: '1px solid rgba(5, 34, 16, 0.1)',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          marginTop: '10px',
                          textAlign: 'center'
                      }}>
                          <p style={{ 
                              color: '#052210', 
                              fontSize: '11px', 
                              fontWeight: '600',
                              fontStyle: 'italic',
                              letterSpacing: '0.02em',
                              margin: 0
                          }}>
                              ⚠ Fare is based on current availability and subject to change due to airline pricing fluctuations. The final price will be confirmed and quoted at the time of booking.
                          </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
