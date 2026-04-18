"use client"

import { Star } from "lucide-react"

interface PricingPlan {
  hotelName: string
  category: string
  total: number
  perPersonPrice: number
  image?: string
}

interface PricingSectionProps {
  price?: string
  plans?: PricingPlan[]
  inclusions?: string | string[]
  gstNote?: string
  applyGST?: boolean
  applyTCS?: boolean
}

const defaultImages = [
  "/images/bg/page_003.png",
  "/images/bg/page_004.png",
  "/images/bg/page_006.png"
]

export function PricingSection({ price, plans, inclusions, gstNote, applyGST, applyTCS }: PricingSectionProps = {}) {
  let baseInclusions: string[] = []
  if (typeof inclusions === 'string') {
    baseInclusions = inclusions.split(',').map(item => item.trim()).filter(item => item !== "")
  } else if (Array.isArray(inclusions)) {
    baseInclusions = inclusions
  } else {
    baseInclusions = ['Per Person', 'Hand Baggage 7kg', 'Check-in 15kg']
  }

  const displayInclusions = [...baseInclusions]
  if (applyGST) displayInclusions.push('GST 5% Inclusive')
  if (applyTCS) displayInclusions.push('TCS 2% + GST Inclusive')
  const displayGst = gstNote || (applyGST ? '5% GST applicable on total package cost' : applyTCS ? 'TCS applicable for international trips' : '5% GST applicable on total package cost')

  return (
    <>
      {/* HEADER SECTION */}
      <section
        className="relative py-8 px-4 overflow-hidden page-break-before pdf-section bg-[#051F10]"
        style={{
          backgroundImage: "url('/images/bg/page_008.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#051F10'
        }}
      >
        <div className="absolute inset-0 bg-[#00000088] pointer-events-none" />
        <div className="relative z-10 w-full text-center px-2">
          <p className="font-sans text-[9px] tracking-[0.35em] uppercase mb-3 font-black text-[#FFE500]">
            Investment Details
          </p>
          <h2 className="font-serif text-[2.2rem] tracking-tight font-black uppercase leading-none text-white drop-shadow-2xl">
            Select Your<br /><span className="text-[#FFE500]">Package Plan</span>
          </h2>
          <div className="h-1.5 w-16 bg-[#FFE500] mx-auto mt-6 rounded-full shadow-[0_0_20px_rgba(255,229,0,0.5)]" />
        </div>
      </section>

      {/* PRICING PLANS */}
      <div className="flex flex-col gap-0">
      {plans && plans.length > 0 ? (
        plans.map((plan, idx) => {
          const starCount = parseInt(plan.category) || 3
          return (
            <section
              key={idx}
              className="relative py-3 px-4 avoid-break pdf-section bg-[#051F10]"
              style={{
                backgroundImage: "url('/images/bg/page_008.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: '#051F10'
              }}
            >
              <div className="absolute inset-0 bg-[#00000066] pointer-events-none" />
              <div className="relative z-10 w-full">
                <div className="bg-white rounded-[24px] overflow-hidden flex flex-col relative z-10 shadow-3xl border border-white/5">
                  {/* Top Image */}
                  <div className="w-full h-44 relative">
                    <img
                      src={plan.image || defaultImages[idx % defaultImages.length]}
                      alt={plan.hotelName}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    <div className="absolute top-4 left-4 bg-[#FFE500] px-4 py-1.5 rounded-lg shadow-lg">
                        <span className="font-sans text-[8px] font-black text-[#1A211D] uppercase tracking-widest">
                          OPTION {String(idx + 1).padStart(2, '0')}
                        </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex flex-col items-center text-center">
                    <div className="flex flex-col items-center mb-5">
                        <div className="flex items-center gap-1 mb-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < starCount ? 'fill-[#FFE500] text-[#FFE500]' : 'text-[#E0E0E0] fill-transparent'}`}
                            />
                          ))}
                        </div>
                        <h3 className="font-sans text-xl font-black text-[#1A211D] uppercase tracking-tight leading-tight">
                          {plan.hotelName}
                        </h3>
                    </div>

                    <div className="w-10 h-0.5 bg-gray-100 mb-5 rounded-full" />

                    <div className="mb-6">
                      <div className="flex flex-col items-center">
                        <span className="font-sans text-4xl font-black text-[#1A211D] tracking-tighter leading-none mb-2 price-amount" data-pdf-color="black">
                          ₹{plan.total.toLocaleString()}
                        </span>
                        <span className="font-sans text-[8px] font-black uppercase tracking-[0.35em] text-[#8E918F] per-person-label">
                            NET PRICE PER PERSON
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#051F10] px-4 py-3 rounded-xl flex items-center gap-2 shadow-xl w-full justify-center border border-white/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FFE500] animate-pulse" />
                      <span className="font-sans text-[9px] font-black text-white/80 uppercase tracking-tight" style={{ color: '#ffffff' }} data-pdf-color="white">
                        {displayGst}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )
        })
      ) : (
        <section
          className="relative py-10 px-4 avoid-break pdf-section bg-[#051F10]"
          style={{
            backgroundImage: "url('/images/bg/page_008.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#051F10'
          }}
        >
          <div className="absolute inset-0 bg-[#00000088] pointer-events-none" />
          <div className="relative z-10 text-center w-full">
            <h2 className="font-sans text-5xl font-black text-[#FFE500] tracking-tighter mb-8 drop-shadow-2xl leading-none price-amount" data-pdf-color="yellow">
              {price || '₹44,900'}
            </h2>
            <div className="mt-4 px-4 flex flex-wrap items-center justify-center gap-2">
              {displayInclusions.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 whitespace-nowrap bg-black/10 px-2.5 py-1 rounded-md">
                   <span className="font-sans text-[11px] font-black text-[#FFE500] leading-none" data-pdf-color="yellow">•</span>
                   <span className="font-sans text-[9px] font-black uppercase tracking-[0.2em] text-white/90 leading-none" data-pdf-color="white">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      </div>
    </>
  )
}
