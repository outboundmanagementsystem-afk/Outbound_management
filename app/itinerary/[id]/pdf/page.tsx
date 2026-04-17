"use client"

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
import Image from "next/image"

export default function PDFPrintPage() {
    console.log("=== PDF PRINT PAGE LOADED ===");
    
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

    useEffect(() => { loadData() }, [itinId])

    const loadData = async () => {
        try {
            const [it, d, h, t, p, f, a] = await Promise.all([
                getItinerary(itinId), getItineraryDays(itinId), getItineraryHotels(itinId),
                getItineraryTransfers(itinId), getItineraryPricing(itinId),
                getItineraryFlights(itinId), getItineraryActivities(itinId),
            ])
            setItin(it); setDays(d); setHotels(h); setTransfers(t); setPricing(p); setFlights(f); setActivities(a)
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const handleDownloadPDF = async () => {
        try {
            const element = document.getElementById("pdf-root")
            if (!element) return

            // Force opacity for any intersection observers
            document.querySelectorAll('.opacity-0').forEach(el => {
                el.classList.remove('opacity-0', 'translate-y-10');
                el.classList.add('opacity-100', 'translate-y-0');
            });

            // Scroll through to trigger lazy images
            const scrollContainer = document.scrollingElement || document.documentElement;
            const origScroll = scrollContainer.scrollTop;
            for (let y = 0; y < element.scrollHeight; y += 500) {
                scrollContainer.scrollTop = y;
                await new Promise(r => setTimeout(r, 50));
            }
            scrollContainer.scrollTop = origScroll;

            // Wait for images
            const images = element.querySelectorAll('img');
            await Promise.all(Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(r => { img.onload = r; img.onerror = r; });
            }));
            await new Promise(r => setTimeout(r, 1000));

            const { jsPDF } = await import('jspdf');
            const html2canvas = (await import('html2canvas')).default;
            const totalWidth = element.scrollWidth;

            // Use chunk-based rendering matching the mobile page approach
            const chunks = Array.from(element.querySelectorAll('.pdf-chunk')) as HTMLElement[];
            
            if (chunks.length === 0) {
                alert("Error: No PDF chunks found.");
                return;
            }

            const chunkData = chunks.map((chunk, i) => ({
                index: i,
                height: Math.floor(chunk.offsetHeight),
                isFooter: chunk.tagName.toLowerCase() === 'footer',
                isDarkBg: chunk.classList.contains('pdf-dark-bg'),
                chunk: chunk
            })).filter(c => c.height > 0);

            const totalHeight = chunkData.reduce((sum, c) => sum + c.height, 0);
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [totalWidth, totalHeight] });

            let currentY = 0;
            for (const item of chunkData) {
                const bgColor = (item.isFooter || item.isDarkBg) ? '#031A0C' : '#ffffff';
                const canvas = await html2canvas(item.chunk, {
                    scale: 2,
                    useCORS: true,
                    windowWidth: totalWidth,
                    width: totalWidth,
                    backgroundColor: bgColor,
                    logging: false,
                    onclone: function(clonedDoc) {
                        const allElements = clonedDoc.querySelectorAll('*');
                        allElements.forEach(el => {
                            const element = el as HTMLElement;
                            
                            // Branding colors - Ultimate Enforcement
                            const pdfColor = element.getAttribute('data-pdf-color');
                            if (pdfColor === 'yellow') {
                                element.style.setProperty('color', '#FFD700', 'important');
                            } else if (pdfColor === 'white') {
                                element.style.setProperty('color', '#FFFFFF', 'important');
                            }
                        });
                    }
                });
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                pdf.addImage(dataUrl, 'JPEG', 0, currentY, totalWidth, item.height, undefined, 'FAST');
                currentY += item.height;
            }

            pdf.save(`Itinerary-${itin?.customerName || "Outbound"}.pdf`);
        } catch (err) { console.error(err) }
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return ""
        try { return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } catch { return dateStr }
    }

    // Debug component state
    console.log("=== COMPONENT STATE DEBUG ===");
    console.log("Loading:", loading);
    console.log("Itinerary:", itin);
    console.log("Days:", days);
    console.log("Hotels:", hotels);
    console.log("Transfers:", transfers);
    console.log("Flights:", flights);
    console.log("Activities:", activities);
    console.log("Pricing:", pricing);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#031A0C]">
            <p className="text-white text-sm">Preparing PDF Layout...</p>
        </div>
    )
    if (!itin) return <div className="min-h-screen flex items-center bg-[#031A0C]"><p className="text-white">Not found</p></div>

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

    // Debug day plans data
    console.log("=== DAY PLANS DEBUG ===");
    console.log("Itinerary Start Date:", itin.startDate);
    console.log("Raw Days Data:", days);
    console.log("Days Length:", days.length);
    
    const dayPlans = days.map((d: any, index: number) => { 
        // Generate sequential date based on start date
        const currentDate = new Date(itin.startDate);
        currentDate.setDate(currentDate.getDate() + index);
        const formattedDate = currentDate.toLocaleDateString("en-US", { 
            weekday: "short", 
            month: "short", 
            day: "numeric" 
        }).toUpperCase();
        
        // Debug logging
        console.log(`Day ${index + 1}: Start Date: ${itin.startDate}, Calculated Date: ${formattedDate}, Original Date: ${d.date}`);
        
        return {
            day: d.day || `Day ${String(d.dayNumber || index + 1).padStart(2, '0')}`, 
            date: formattedDate, 
            title: d.title || "", 
            description: d.description || "", 
            highlights: d.highlights || [],
            subDestination: d.subDestination || "",
            overnightStay: d.overnightStay || ""
        };
    })
    
    console.log("Final Day Plans:", dayPlans);

    const hasFlights = flights && flights.length > 0
    const hasHotels = hotelList.length > 0
    const hasTransfers = transfers && transfers.length > 0
    const hasDayPlans = dayPlans.length > 0

    return (
        <div style={{ background: "#e5e7eb", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", '--font-sans': 'var(--font-poppins), sans-serif', '--font-serif': 'var(--font-charmonman), serif' } as React.CSSProperties}>
            <style jsx global>{`
                @page { size: A4; margin: 0; }
                .opacity-0 { opacity: 1 !important; transform: none !important; }
                @media print {
                    .no-print { display: none !important; }
                    body { margin: 0; padding: 0; }
                }
            `}</style>

            <div className="no-print" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", gap: 12, padding: "12px 20px", background: "rgba(3,26,12,0.95)", backdropFilter: "blur(10px)" }}>
                <button onClick={() => window.print()} style={{ padding: "8px 20px", background: "transparent", border: "1px solid rgba(212,175,55,0.3)", color: "#fff", cursor: "pointer", borderRadius: 8 }}>🖨️ Print PDF</button>
                <button onClick={handleDownloadPDF} style={{ padding: "8px 20px", background: "#D4AF37", color: "#031A0C", fontWeight: "bold", border: "none", cursor: "pointer", borderRadius: 8 }}>⬇ Download PDF</button>
                <button onClick={() => window.close()} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.5)", cursor: "pointer", borderRadius: 8 }}>✕ Close</button>
            </div>

            <div style={{ paddingTop: 60 }} className="no-print-pad">
                <main id="pdf-root" className="relative bg-white shadow-2xl w-full max-w-[480px] mx-auto overflow-hidden">
                    <div className="pdf-chunk w-full">
                        <HeroSection customerName={itin.customerName} destination={itin.destination} nights={itin.nights} days={itin.days} startDate={formatDate(itin.startDate)} endDate={formatDate(itin.endDate)} />
                    </div>
                    
                    <section className="relative w-full bg-white overflow-hidden flex-shrink-0 pdf-chunk">
                        <img src="/images/bg/pages_002.png" alt="Static Design" style={{ width: '100%', display: 'block' }} />
                    </section>
                    
                    <div className="pdf-chunk w-full">
                        <TripSummary fields={summaryFields} />
                    </div>

                    {hasFlights && (
                        <div className="pdf-chunk w-full">
                            <FlightDetails segments={flights} />
                        </div>
                    )}

                    {hasHotels && (
                        <div className="pdf-chunk pdf-dark-bg w-full">
                            <HotelDetails hotelList={hotelList} />
                        </div>
                    )}

                    {hasTransfers && (
                        <div className="pdf-chunk pdf-dark-bg w-full">
                            <TransferDetails transfers={transfers} />
                        </div>
                    )}

                    {hasDayPlans && (
                        <div className="pdf-chunk pdf-dark-bg w-full">
                            <DayItinerary dayPlans={dayPlans} destination={itin.destination} totalDays={itin.days} startDate={itin.startDate} />
                        </div>
                    )}

                    <div className="pdf-chunk pdf-dark-bg w-full">
                        <PricingSection
                            price={`₹${Number(pricing?.[0]?.perPersonPrice || pricing?.[0]?.totalPrice || itin.perPersonPrice || itin.totalPrice || 0).toLocaleString()}`}
                            plans={pricing?.[0]?.plans || itin.plans}
                            inclusions={['Per Person']}
                            gstNote="5% GST applicable on total package cost"
                        />
                    </div>

                    {/* Inclusions & Exclusions from destination */}
                    {(itin.pdfTemplate?.inclusions?.length > 0 || itin.pdfTemplate?.exclusions?.length > 0) && (
                        <div className="pdf-chunk w-full">
                            <IncExcSection inclusions={itin.pdfTemplate.inclusions || []} exclusions={itin.pdfTemplate.exclusions || []} />
                        </div>
                    )}

                    {/* Important Notes from destination */}
                    {itin.pdfTemplate?.importantNotes?.length > 0 && <div className="pdf-chunk w-full"><TermsSection title="Important Notes" terms={itin.pdfTemplate.importantNotes} /></div>}
                    
                    {/* Terms & Conditions from destination */}
                    {itin.pdfTemplate?.termsAndConditions?.length > 0 && <div className="pdf-chunk w-full"><TermsSection title="Terms & Conditions" terms={itin.pdfTemplate.termsAndConditions} /></div>}
                    
                    {/* Legacy pdfTemplate sections (fallback) */}
                    {itin.pdfTemplate?.paymentPolicy?.length > 0 && <div className="pdf-chunk w-full"><TermsSection title="Payment Policy" terms={itin.pdfTemplate.paymentPolicy} /></div>}
                    {itin.pdfTemplate?.cancellationPolicy?.length > 0 && <div className="pdf-chunk w-full"><TermsSection title="Cancellation Policy" terms={itin.pdfTemplate.cancellationPolicy} /></div>}

                    <section className="relative w-full bg-white overflow-hidden flex-shrink-0 pdf-chunk">
                        <img src="/images/bg/page_payment.png" alt="Payment Details" style={{ width: '100%', display: 'block' }} />
                    </section>

                    <section className="relative w-full bg-white overflow-hidden flex-shrink-0 pdf-chunk">
                        <img src="/images/bg/page_ending.png" alt="Thank You" style={{ width: '100%', display: 'block' }} />
                    </section>

                    <footer className="pdf-chunk w-full px-4 py-8" style={{ background: '#031A0C', textAlign: 'center' }}>
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-[#FFE500]/10 flex items-center justify-center border border-[#FFE500]/20">
                                 <span className="text-base">✈</span>
                            </div>
                            <span className="font-sans text-[13px] font-black tracking-[0.35em] text-[#FFE500] uppercase">
                                Outbound Travelers
                            </span>
                        </div>
                        <div className="h-[1.5px] w-10 bg-[#FFE500]/30 mx-auto mb-4" />
                        <p className="font-sans text-[10px] text-white/30 uppercase tracking-[0.15em] font-medium">
                            info@outboundtravelers.com · www.outboundtravelers.com
                        </p>
                        <p className="font-sans text-[9px] text-white/20 mt-4 uppercase tracking-widest">
                            © {new Date().getFullYear()} Outbound Travelers. All Rights Reserved.
                        </p>
                    </footer>
                </main>
            </div>
        </div>
    )
}
