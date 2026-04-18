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
        const rootElement = document.getElementById("itinerary-content")
        try {
            setDownloading(true)
            if (!rootElement) {
                setDownloading(false)
                return
            }
            if (!rootElement) {
                setDownloading(false)
                return
            }

            const { jsPDF } = await import('jspdf');
            const html2canvas = (await import('html2canvas')).default;
            const { toJpeg } = await import('html-to-image');

            // Wait for full render before capture
            await new Promise(resolve => setTimeout(resolve, 1500));

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
            
            // Additional delay to ensure PDF styles are fully applied
            await new Promise(r => setTimeout(r, 500));

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
                    scale: 3,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: bgColor,
                    scrollY: -window.scrollY,
                    windowWidth: item.chunk.scrollWidth,
                    windowHeight: item.chunk.scrollHeight,
                    onclone: function(clonedDoc) {
                        // --- PHASE 1: Baseline Style Inlining ---
                        // Inline computed styles to ensure they persist in the canvas
                        clonedDoc.querySelectorAll('*').forEach(el => {
                            const element = el as HTMLElement;
                            const computed = clonedDoc.defaultView?.getComputedStyle(el);
                            if (!computed) return;
                            const color = computed.getPropertyValue('color');
                            const bg = computed.getPropertyValue('background-color');
                            const fontSize = computed.getPropertyValue('font-size');
                            const fontWeight = computed.getPropertyValue('font-weight');

                            if (color) element.style.setProperty('color', color, 'important');
                            if (bg && bg !== 'rgba(0, 0, 0, 0)') element.style.setProperty('background-color', bg, 'important');
                            if (fontSize) element.style.setProperty('font-size', fontSize, 'important');
                            if (fontWeight) element.style.setProperty('font-weight', fontWeight, 'important');
                        });

                        // --- PHASE 2: Global Context & Visibility Logic ---
                        
                        // Rule A: General Visibility for Dark Sections (Hero, Dark Footers, etc.)
                        clonedDoc.querySelectorAll('section[class*="bg-[#031A0C]"], section[class*="bg-[#051F10]"], div[class*="bg-[#051F10]"]').forEach(section => {
                            section.querySelectorAll('p, span, h1, h2, h3, div').forEach(el => {
                                const element = el as HTMLElement;
                                // Only set to white if NOT inside a white nested card or explicitly yellow
                                if (!element.closest('.bg-white') && !element.closest('.bg-gray-50') && 
                                    !element.classList.contains('text-[#FFE500]') && !element.getAttribute('data-pdf-color')) {
                                    element.style.setProperty('color', '#ffffff', 'important');
                                }
                            });
                        });

                        // Rule B: Enforce Dark Text on Light Backgrounds (Inclusions, Summary, etc.)
                        clonedDoc.querySelectorAll('.bg-white, .bg-gray-50, section[style*="#FAF9F6"], section[style*="#faf9f6"], section[style*="rgb(250, 249, 246)"]').forEach(container => {
                           container.querySelectorAll('p, h1, h2, h3, span:not(.text-white), li').forEach(el => {
                               const element = el as HTMLElement;
                               // CRITICAL: Skip elements that are inside a dark sub-container (badge, overnight box)
                               if (!element.closest('[class*="bg-[#051F10]"]') && !element.closest('[class*="day-marker-badge"]')) {
                                   element.style.setProperty('color', '#1a211d', 'important');
                               }
                           });
                        });

                        // --- PHASE 3: Targeted Component Recovery ---

                        // 1. Day Itinerary Specific Fixes
                        clonedDoc.querySelectorAll('[class*="day-marker-badge"]').forEach(badge => {
                            (badge as HTMLElement).style.setProperty('background-color', '#051f10', 'important');
                            (badge as HTMLElement).style.setProperty('color', '#ffe500', 'important');
                            badge.querySelectorAll('*').forEach(child => {
                                (child as HTMLElement).style.setProperty('color', '#ffe500', 'important');
                            });
                        });

                        clonedDoc.querySelectorAll('.overnight-stay-label').forEach(el => {
                            (el as HTMLElement).style.setProperty('color', '#ffe500', 'important');
                            (el as HTMLElement).style.setProperty('opacity', '1', 'important');
                        });
                        clonedDoc.querySelectorAll('.overnight-stay-value').forEach(el => {
                            (el as HTMLElement).style.setProperty('color', '#ffffff', 'important');
                            (el as HTMLElement).style.setProperty('opacity', '1', 'important');
                        });

                        // 2. Hotels, Flights & Inclusions Fixes
                        clonedDoc.querySelectorAll('h3[class*="emerald-950"]').forEach(el => {
                            (el as HTMLElement).style.setProperty('color', '#052e16', 'important');
                        });
                        clonedDoc.querySelectorAll('p[class*="text-gray-700"]').forEach(el => {
                            (el as HTMLElement).style.setProperty('color', '#374151', 'important');
                        });
                        clonedDoc.querySelectorAll('[class*="hotel-name"], [class*="hotel-title"]').forEach(el => {
                            (el as HTMLElement).style.setProperty('color', '#1a1a1a', 'important');
                        });
                        clonedDoc.querySelectorAll('[class*="hotel-location"], [class*="location-text"]').forEach(el => {
                            (el as HTMLElement).style.setProperty('color', '#6b7280', 'important');
                        });
                        clonedDoc.querySelectorAll('[class*="nights-badge"]').forEach(el => {
                            (el as HTMLElement).style.setProperty('background-color', '#f5c518', 'important');
                            (el as HTMLElement).style.setProperty('color', '#1a1a1a', 'important');
                        });

                        // 3. Trip Summary Fixes
                        clonedDoc.querySelectorAll('.trip-summary-label').forEach(el => {
                            const element = el as HTMLElement;
                            element.style.setProperty('color', '#8E918F', 'important');
                            element.style.setProperty('font-size', '14px', 'important');
                            element.style.setProperty('font-weight', '400', 'important');
                            element.style.setProperty('letter-spacing', '0.1em', 'important');
                        });
                        clonedDoc.querySelectorAll('.trip-summary-value').forEach(el => {
                            const element = el as HTMLElement;
                            element.style.setProperty('color', '#1A211D', 'important');
                            element.style.setProperty('font-size', '14px', 'important');
                            element.style.setProperty('font-weight', '400', 'important');
                        });

                        // 4. Pricing & Amount Recovery
                        clonedDoc.querySelectorAll('[class*="price-amount"], [class*="amount"]').forEach(el => {
                            (el as HTMLElement).style.setProperty('color', '#ffe500', 'important');
                        });

                        // 4. Footer Recovery
                        clonedDoc.querySelectorAll('footer').forEach(footer => {
                            (footer as HTMLElement).style.setProperty('background-color', '#031a0c', 'important');
                            footer.querySelectorAll('*').forEach(el => {
                                const element = el as HTMLElement;
                                if (!element.hasAttribute('data-pdf-color') && !element.classList.contains('text-[#FFE500]')) {
                                    element.style.setProperty('color', '#ffffff', 'important');
                                }
                            });
                        });

                        clonedDoc.querySelectorAll('[data-pdf-logo]').forEach(el => {
                            const element = el as HTMLElement;
                            element.style.setProperty('width', '160px', 'important');
                            element.style.setProperty('height', 'auto', 'important');
                            element.style.setProperty('display', 'block', 'important');
                            element.style.setProperty('object-fit', 'contain', 'important');
                            element.style.setProperty('max-width', 'none', 'important');
                        });

                        clonedDoc.querySelectorAll('[data-pdf-color]').forEach(el => {
                            const element = el as HTMLElement;
                            const pdfColor = element.getAttribute('data-pdf-color');
                            if (pdfColor === 'yellow') {
                                element.style.setProperty('color', '#FFE500', 'important');
                            } else if (pdfColor === 'white') {
                                element.style.setProperty('color', '#FFFFFF', 'important');
                            } else if (pdfColor === 'black') {
                                element.style.setProperty('color', '#1a211d', 'important');
                            }
                        });

                        // Repaint delay for canvas stability
                        return new Promise(resolve => setTimeout(resolve, 1500));
                    }
                });

                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                pdf.addImage(dataUrl, 'JPEG', 0, currentY, widthPx, chunkHeight, undefined, 'FAST');
                
                currentY += chunkHeight;
                currentAccumulator += chunkHeight;
            }

            pdf.save(`Itinerary-${itin?.customerName || "Outbound"}.pdf`);
            
            // Remove pdf-render class after PDF generation
            if (rootElement) rootElement.classList.remove('pdf-render');
        } catch (err) {
            console.error(err);
            alert("Error generating PDF. Please retry.");
            // Ensure cleanup even on error
            if (rootElement) rootElement.classList.remove('pdf-render');
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

    // Build day plans for the component with sequential dates
    console.log("=== MAIN ITINERARY PAGE DATE CALCULATION ===");
    console.log("Start Date:", itin.startDate);
    console.log("Raw Days:", days);
    
    const dayPlans = days.map((d: any, index: number) => {
        // Generate sequential date based on start date
        const currentDate = new Date(itin.startDate);
        currentDate.setDate(currentDate.getDate() + index);
        const formattedDate = currentDate.toLocaleDateString("en-US", { 
            weekday: "short", 
            month: "short", 
            day: "numeric" 
        }).toUpperCase();
        
        console.log(`Day ${index + 1}: ${formattedDate} (was: ${d.date})`);
        
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

    // Check if flights exist
    const hasFlights = flights && flights.length > 0
    const hasHotels = hotelList.length > 0
    const hasTransfers = transfers && transfers.length > 0
    const hasDayPlans = dayPlans.length > 0
    const hasInclExcl = itin.pdfTemplate?.inclusions?.length > 0 || itin.pdfTemplate?.exclusions?.length > 0
    
    // Debug PDF template data
    console.log("=== ITINERARY PDF DEBUG ===");
    console.log("Itinerary ID:", itinId);
    console.log("PDF Template:", itin.pdfTemplate);
    console.log("Has Incl/Excl:", hasInclExcl);
    console.log("Inclusions:", itin.pdfTemplate?.inclusions);
    console.log("Exclusions:", itin.pdfTemplate?.exclusions);
    console.log("Terms:", itin.pdfTemplate?.termsAndConditions);
    console.log("Important Notes:", itin.pdfTemplate?.importantNotes);

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
                        <DayItinerary dayPlans={dayPlans} destination={itin.destination} totalDays={itin.days} startDate={itin.startDate} />
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
                        info@outboundtravelers.com · www.outboundtravelers.com
                    </p>
                    <p className="font-sans text-[9px] text-white/20 mt-4 uppercase tracking-widest">
                        © {new Date().getFullYear()} Outbound Travelers. All Rights Reserved.
                    </p>
                </footer>
            </main>
        </div>
    )
}
