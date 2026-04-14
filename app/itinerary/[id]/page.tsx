"use client" // Trigger HMR fix 3

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getItinerary, getItineraryDays, getItineraryHotels, getItineraryTransfers, getItineraryPricing, getItineraryFlights, getItineraryActivities } from "@/lib/firestore"
import { HeroSection } from "@/components/hero-section"
import { TripSummary } from "@/components/trip-summary"
import { FlightDetails } from "@/components/flight-details"
import { HotelDetails } from "@/components/hotel-details"
import { TransferDetails } from "@/components/transfer-details"
import { DayItinerary } from "@/components/day-itinerary"
import { PricingSection } from "@/components/pricing-section"
import { IncExcSection } from "@/components/inc-exc-section"
import { TermsSection } from "@/components/terms-section"
import { FooterSection } from "@/components/footer-section"
import { Download } from "lucide-react"
import Image from "next/image"

export default function PublicItineraryPage() {
    const params = useParams()
    const itinId = params.id as string
    const [itin, setItin] = useState<any>(null)
    const [days, setDays] = useState<any[]>([])
    const [hotels, setHotels] = useState<any[]>([])
    const [transfers, setTransfers] = useState<any[]>([])
    const [pricing, setPricing] = useState<any[]>([])
    const [flights, setFlights] = useState<any[]>([])
    const [activities, setActivities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [itinId])

    const [downloading, setDownloading] = useState(false)

    const handleDownloadPDF = async () => {
        try {
            setDownloading(true)
            const rootElement = document.getElementById("itinerary-content")
            if (!rootElement) {
                setDownloading(false)
                return
            }

            const { jsPDF } = await import('jspdf');
            const html2canvas = (await import('html2canvas')).default;
            const { toJpeg } = await import('html-to-image');

            // Force all animations/visibility
            const allElements = rootElement.querySelectorAll('*');
            allElements.forEach(el => {
                const e = el as HTMLElement;
                if (e.classList.contains('opacity-0')) e.style.opacity = '1';
                if (e.style.transform && e.style.transform !== 'none') e.style.transform = 'none';
                if (e.style.transition) e.style.transition = 'none';
            });

            // Wait for images
            const images = Array.from(rootElement.querySelectorAll('img'));
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(r => { 
                    img.onload = r; 
                    img.onerror = r; 
                    const s = img.src; img.src = ""; img.src = s;
                });
            }));

            await new Promise(r => setTimeout(r, 2000));
            await new Promise(r => setTimeout(r, 2000));

            const widthPx = Math.floor(rootElement.offsetWidth) || 480;
            const chunks = Array.from(rootElement.querySelectorAll('.pdf-chunk')) as HTMLElement[];
            
            if (chunks.length === 0) {
                setDownloading(false);
                alert("Error: PDF chunks not found.");
                return;
            }

            // Capture precise heights once to prevent desync during rendering
            const chunkData = chunks.map((chunk, i) => ({
                index: i,
                height: Math.floor(chunk.offsetHeight),
                isFooter: chunk.tagName.toLowerCase() === 'footer',
                isDarkBg: chunk.classList.contains('pdf-dark-bg'),
                enforceBreak: chunk.classList.contains('pdf-page-break'),
                chunk: chunk
            })).filter(c => c.height > 0);

            if (chunkData.length === 0) {
                setDownloading(false);
                alert("Error: No visible content found to generate PDF.");
                return;
            }

            // A strict limitation of the PDF format is a hard maximum page height of 14,400 points.
            const MAX_PAGE_HEIGHT = 14000;
            const pagesHeights: number[] = [];
            let currentPageHeight = 0;

            for (const item of chunkData) {
                if (item.enforceBreak || (currentPageHeight + item.height > MAX_PAGE_HEIGHT && currentPageHeight > 0)) {
                    pagesHeights.push(currentPageHeight);
                    currentPageHeight = 0;
                }
                currentPageHeight += item.height;
            }
            if (currentPageHeight > 0) {
                pagesHeights.push(currentPageHeight);
            }

            // Use 'px' units to match the design exactly as rendered
            const pdf = new jsPDF('p', 'px', [widthPx, pagesHeights[0]]);
            let pageIndex = 0;
            let currentY = 0;
            let currentAccumulator = 0;

            for (const item of chunkData) {
                const chunkHeight = item.height;
                
                // Switch to a new PDF page if this chunk exceeds the current calculated page height
                if (item.enforceBreak || (currentAccumulator + chunkHeight > pagesHeights[pageIndex] && currentAccumulator > 0)) {
                    pageIndex++;
                    const nextHeight = pagesHeights[pageIndex] || chunkHeight;
                    pdf.addPage([widthPx, nextHeight], 'p');
                    currentY = 0;
                    currentAccumulator = 0;
                }

                // Determine background color based on content
                const bgColor = (item.isFooter || item.isDarkBg) ? '#031A0C' : '#ffffff';

                const canvas = await html2canvas(item.chunk, {
                    scale: 2,
                    useCORS: true,
                    windowWidth: widthPx,
                    width: widthPx,
                    backgroundColor: bgColor,
                    logging: false
                });

                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                pdf.addImage(dataUrl, 'JPEG', 0, currentY, widthPx, chunkHeight, undefined, 'FAST');
                
                currentY += chunkHeight;
                currentAccumulator += chunkHeight;
            }

            pdf.save(`Itinerary-${itin?.customerName || "Outbound"}.pdf`);
        } catch (err) {
            console.error(err);
            alert("Error generating PDF. Please retry.");
        } finally {
            setDownloading(false)
        }
    }

    const loadData = async () => {
        try {
            const [it, d, h, t, p, f, a] = await Promise.all([
                getItinerary(itinId),
                getItineraryDays(itinId),
                getItineraryHotels(itinId),
                getItineraryTransfers(itinId),
                getItineraryPricing(itinId),
                getItineraryFlights(itinId),
                getItineraryActivities(itinId),
            ])
            setItin(it)
            setDays(d)
            setHotels(h)
            setTransfers(t)
            setPricing(p)
            setFlights(f)
            setActivities(a)

            if (typeof window !== 'undefined' && window.location.search.includes('download=1')) {
                // Wait a moment for images to render
                setTimeout(() => {
                    handleDownloadPDF()
                }, 1500)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#031A0C' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} />
                    <p className="font-sans text-sm tracking-widest uppercase" style={{ color: 'rgba(212,175,55,0.6)' }}>Loading your itinerary...</p>
                </div>
            </div>
        )
    }

    if (!itin) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#031A0C' }}>
                <p className="font-sans text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Itinerary not found</p>
            </div>
        )
    }

    // Format dates for display
    const formatDate = (dateStr: string) => {
        if (!dateStr) return ""
        try {
            const d = new Date(dateStr)
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        } catch { return dateStr }
    }

    // Build trip summary fields from itinerary data
    const summaryFields = [
        { label: "Consultant", value: `${itin.consultantName || "—"}${itin.consultantPhone ? `, ${itin.consultantPhone}` : ""}`, icon: "👤" },
        { label: "Name", value: itin.customerName || "—", icon: "👤" },
        ...(itin.customerPhone ? [{ label: "Phone", value: itin.customerPhone, icon: "📞" }] : []),
        ...(itin.customerEmail ? [{ label: "Email", value: itin.customerEmail, icon: "✉️" }] : []),
        { label: "Trip To", value: itin.destination || "—", icon: "📍" },
        { label: "No. of Nights", value: `${itin.nights || 0}N / ${itin.days || 0}D`, icon: "🌙" },
        { label: "Start Date", value: formatDate(itin.startDate), icon: "📅" },
        { label: "End Date", value: formatDate(itin.endDate), icon: "📅" },
        { label: "Total Adults", value: String(itin.adults || 0), icon: "👥" },
        ...(itin.cwb ? [{ label: "CWB (Child With Bed)", value: String(itin.cwb), icon: "🛏️" }] : []),
        ...(itin.cnb ? [{ label: "CNB (Child No Bed)", value: String(itin.cnb), icon: "👶" }] : []),
        ...(itin.childAge ? [{ label: "Kid's Age", value: itin.childAge, icon: "✦" }] : []),
        ...(activities && activities.length > 0 ? [{ label: "Experiences", value: activities.map(a => a.name || a.activityName).join(" · "), icon: "🎟️" }] : []),
    ]

    // Build hotel list for the component - include all details
    const hotelList = hotels.map((h: any) => ({
        name: h.hotelName || h.name || "Hotel",
        subtitle: h.subtitle || "Or Similar Property",
        location: h.location || `${h.subDestination || itin.destination || "—"}`,
        rating: h.rating || h.starRating || 3,
        tag: h.tag || null,
        nights: `${h.nights || itin.nights || 0} Nights`,
        amenities: h.amenities ? (typeof h.amenities === "string" ? h.amenities.split(",").map((a: string) => a.trim()) : h.amenities) : ["Breakfast Included"],
        mealPlan: h.mealPlan || "",
        roomCategory: h.roomCategory || h.roomType || "",
    }))

    // Build day plans for the component
    const dayPlans = days.map((d: any) => ({
        day: d.day || `Day ${String(d.dayNumber || 1).padStart(2, '0')}`,
        date: d.date || "",
        title: d.title || "",
        description: d.description || "",
        highlights: d.highlights || [],
        subDestination: d.subDestination || "",
        overnightStay: d.overnightStay || ""
    }))

    // Check if flights exist
    const hasFlights = flights && flights.length > 0
    const hasHotels = hotelList.length > 0
    const hasTransfers = transfers && transfers.length > 0
    const hasDayPlans = dayPlans.length > 0
    const hasInclExcl = itin.pdfTemplate?.inclusions?.length > 0 || itin.pdfTemplate?.exclusions?.length > 0

    return (
        <div className="bg-gray-100 min-h-screen flex justify-center w-full" style={{ '--font-sans': 'var(--font-poppins), sans-serif', '--font-serif': 'var(--font-charmonman), serif' } as React.CSSProperties}>
            <button
                id="download-pdf-btn"
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-6 py-4 rounded-full font-sans text-sm font-bold tracking-wider uppercase transition-all hover:scale-105 print:hidden disabled:opacity-70 disabled:cursor-wait"
                style={{ background: '#D4AF37', color: '#031A0C', boxShadow: '0 8px 32px rgba(212,175,55,0.4)' }}
            >
                {downloading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#031A0C', borderTopColor: 'transparent' }} />
                        Generating...
                    </>
                ) : (
                    <>
                        <Download className="w-4 h-4" />
                        Download PDF
                    </>
                )}
            </button>
            <main id="itinerary-content" className="relative bg-[#FDFDFB] shadow-2xl w-full max-w-[480px] mx-auto overflow-hidden border-x border-gray-100/50" style={{ scrollBehavior: 'smooth' }}>
                {/* HERO */}
                <div className="pdf-chunk w-full">
                    <HeroSection
                        customerName={itin.customerName}
                        destination={itin.destination}
                        nights={itin.nights}
                        days={itin.days}
                        startDate={formatDate(itin.startDate)}
                        endDate={formatDate(itin.endDate)}
                    />
                </div>
                
                {/* STATIC BRAND PAGE */}
                <section className="relative w-full bg-white overflow-hidden flex-shrink-0 pdf-chunk">
                    <img src="/images/bg/pages_002.png" alt="Static Design" style={{ width: '100%', display: 'block' }} />
                </section>
                
                {/* TRIP SUMMARY */}
                <div className="pdf-chunk w-full">
                    <TripSummary fields={summaryFields} />
                </div>
                
                {/* FLIGHTS - Individual chunk */}
                {hasFlights && (
                    <div className="pdf-chunk w-full">
                        <FlightDetails segments={flights} />
                    </div>
                )}

                {/* HOTELS - Individual chunk - Always show when hotels exist */}
                {hasHotels && (
                    <div className="pdf-chunk pdf-dark-bg w-full">
                        <HotelDetails hotelList={hotelList} />
                    </div>
                )}

                {/* TRANSFERS - Individual chunk */}
                {hasTransfers && (
                    <div className="pdf-chunk pdf-dark-bg w-full">
                        <TransferDetails transfers={transfers} />
                    </div>
                )}

                {/* DAY WISE ITINERARY */}
                {hasDayPlans && (
                    <div className="pdf-chunk pdf-dark-bg w-full">
                        <DayItinerary dayPlans={dayPlans} destination={itin.destination} totalDays={itin.days} />
                    </div>
                )}
                
                {/* PRICING */}
                <div className="pdf-chunk pdf-dark-bg w-full">
                    <PricingSection
                        price={`₹${Number(pricing?.[0]?.perPersonPrice || pricing?.[0]?.totalPrice || itin.perPersonPrice || itin.totalPrice || 0).toLocaleString()}`}
                        plans={pricing?.[0]?.plans || itin.plans}
                        inclusions={['Per Person']}
                        gstNote="5% GST applicable on total package cost"
                    />
                </div>

                {/* INCLUSIONS & EXCLUSIONS */}
                {hasInclExcl && (
                    <div className="pdf-chunk w-full">
                        <IncExcSection inclusions={itin.pdfTemplate.inclusions || []} exclusions={itin.pdfTemplate.exclusions || []} />
                    </div>
                )}

                {/* IMPORTANT NOTES */}
                {itin.pdfTemplate?.importantNotes?.length > 0 && (
                    <div className="pdf-chunk w-full">
                        <TermsSection title="Important Notes" terms={itin.pdfTemplate.importantNotes} />
                    </div>
                )}

                {/* TERMS & CONDITIONS */}
                {itin.pdfTemplate?.termsAndConditions?.length > 0 && (
                    <div className="pdf-chunk w-full">
                        <TermsSection title="Terms & Conditions" terms={itin.pdfTemplate.termsAndConditions} />
                    </div>
                )}

                {/* PAYMENT POLICY */}
                {itin.pdfTemplate?.paymentPolicy?.length > 0 && (
                    <div className="pdf-chunk w-full">
                        <TermsSection title="Payment Policy" terms={itin.pdfTemplate.paymentPolicy} />
                    </div>
                )}

                {/* CANCELLATION POLICY */}
                {itin.pdfTemplate?.cancellationPolicy?.length > 0 && (
                    <div className="pdf-chunk w-full">
                        <TermsSection title="Cancellation Policy" terms={itin.pdfTemplate.cancellationPolicy} />
                    </div>
                )}

                {/* PAYMENT STATIC PAGE */}
                <section className="relative w-full bg-white overflow-hidden flex-shrink-0 pdf-chunk pdf-page-break">
                    <img src="/images/bg/page_payment.png" alt="Payment Details" style={{ width: '100%', display: 'block' }} />
                </section>

                {/* ENDING STATIC PAGE */}
                <section className="relative w-full bg-white overflow-hidden flex-shrink-0 pdf-chunk">
                    <img src="/images/bg/page_ending.png" alt="Thank You" style={{ width: '100%', display: 'block' }} />
                </section>

                {/* FOOTER */}
                <footer className="pdf-chunk w-full px-4 py-8" style={{ background: '#031A0C', textAlign: 'center' }}>
                    <div className="flex items-center justify-center gap-3 mb-4 transition-all hover:scale-105">
                        <div className="w-8 h-8 rounded-full bg-[#FFE500]/10 flex items-center justify-center border border-[#FFE500]/20 shadow-[0_0_20px_rgba(255,229,0,0.1)]">
                             <span className="text-base">✈</span>
                        </div>
                        <span className="font-sans text-[13px] font-black tracking-[0.35em] text-[#FFE500] uppercase">
                            Outbound Travelers
                        </span>
                    </div>
                    <div className="h-[1.5px] w-10 bg-[#FFE500]/30 mx-auto mb-4" />
                    <p className="font-sans text-[10px] text-white/30 uppercase tracking-[0.15em] font-medium">
                        www.outboundtravelers.com
                    </p>
                    <p className="font-sans text-[9px] text-white/20 mt-4 uppercase tracking-widest">
                        © {new Date().getFullYear()} Outbound Travelers. All Rights Reserved.
                    </p>
                </footer>
            </main>
        </div>
    )
}
