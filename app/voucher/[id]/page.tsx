"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getItinerary, getItineraryDays, getItineraryHotels } from "@/lib/firestore"
import Image from "next/image"
import { Download, Loader2, MapPin, Calendar, Users, Phone, Mail, FileText, Hotel } from "lucide-react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

export default function VoucherPage() {
    const params = useParams()
    const itinId = params.id as string
    const [itin, setItin] = useState<any>(null)
    const [days, setDays] = useState<any[]>([])
    const [hotels, setHotels] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [downloading, setDownloading] = useState(false)

    useEffect(() => {
        loadData()
    }, [itinId])

    const loadData = async () => {
        try {
            const [it, d, h] = await Promise.all([
                getItinerary(itinId),
                getItineraryDays(itinId),
                getItineraryHotels(itinId),
            ])
            setItin(it)
            // Sort days by day number to ensure correct order
            setDays(d.sort((a: any, b: any) => (a.day || "").localeCompare(b.day || "")))
            setHotels(h)

            if (typeof window !== 'undefined' && window.location.search.includes('download=1')) {
                setTimeout(() => handleDownloadPDF(), 1500)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleDownloadPDF = async () => {
        const element = document.getElementById("voucher-content")
        if (!element) return

        try {
            setDownloading(true)

            const buttons = document.querySelectorAll('.print\\:hidden')
            buttons.forEach((el: any) => el.style.display = 'none')

            const canvas = await html2canvas(element, {
                scale: 2, // Higher quality for text-heavy documents
                useCORS: true,
                logging: false,
                windowWidth: 1000, // Fixed width for consistent layout
            })

            const imgData = canvas.toDataURL("image/jpeg", 0.95)

            const pdfWidth = 210 // A4 width in mm
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width

            const pdf = new jsPDF("p", "mm", [pdfWidth, pdfHeight])

            pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight)
            pdf.save(`Voucher-${itin?.customerName || 'Outbound'}.pdf`)
        } catch (error) {
            console.error("Error generating PDF:", error)
        } finally {
            const buttons = document.querySelectorAll('.print\\:hidden')
            buttons.forEach((el: any) => el.style.display = '')
            setDownloading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} />
                    <p className="font-sans text-sm tracking-widest uppercase" style={{ color: 'rgba(0,0,0,0.6)' }}>Loading Voucher...</p>
                </div>
            </div>
        )
    }

    if (!itin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <p className="font-sans text-sm text-gray-400">Voucher not found</p>
            </div>
        )
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return ""
        try {
            const d = new Date(dateStr)
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        } catch { return dateStr }
    }

    // Dynamic inclusions / exclusions falling back to standard
    const inclusions = itin.pdfTemplate?.inclusions || itin.inclusions || [
        "Accommodation as per itinerary",
        "Meals as per selected meal plan",
        "All transfers as mentioned",
        "Sightseeing as per itinerary"
    ]

    const exclusions = itin.pdfTemplate?.exclusions || itin.exclusions || [
        "Airfare / Train fare",
        "Personal expenses",
        "Any tips or gratuities",
        "Travel insurance",
        "Anything not mentioned in inclusions"
    ]

    return (
        <main className="min-h-screen relative flex justify-center py-10" style={{ scrollBehavior: 'smooth', backgroundColor: '#f9fafb' }}>
            <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-6 py-4 rounded-full font-sans text-sm font-bold tracking-wider uppercase transition-all hover:scale-105 print:hidden disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#06a15c', color: '#FFFFFF', boxShadow: '0 8px 32px rgba(6,161,92,0.4)', border: 'none' }}
            >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {downloading ? "Generating PDF..." : "Download Voucher"}
            </button>

            {/* Voucher Document Container - White Paper Style */}
            <div id="voucher-content" className="w-full max-w-[1000px] shadow-2xl overflow-hidden relative" style={{ minHeight: '1414px', backgroundColor: '#ffffff', color: '#111827' }}>

                {/* Header Strip */}
                <div className="h-4 w-full" style={{ background: 'linear-gradient(90deg, #052210 0%, #06a15c 50%, #052210 100%)' }} />

                <div className="p-12 md:p-16">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-12 pb-8" style={{ borderBottom: '1px solid rgba(6,161,92,0.3)' }}>
                        <div className="relative w-72 h-28">
                            <div className="absolute inset-0 flex items-center">
                                <img src="/images/outbound png 3.png" alt="Outbound Travelers" className="h-full w-auto object-contain" />
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="font-serif text-4xl mb-2" style={{ color: '#06a15c' }}>TRAVEL VOUCHER</h2>
                            <p className="font-sans text-sm font-bold tracking-wider" style={{ color: '#031A0C' }}>REF: OT-{new Date().getFullYear()}-{itin.destination?.substring(0, 3).toUpperCase() || 'TRV'}-{itinId.substring(0, 4).toUpperCase()}</p>
                            <p className="font-sans text-xs mt-1" style={{ color: '#6b7280' }}>Issued Date: {formatDate(new Date().toISOString())}</p>
                        </div>
                    </div>

                    {/* Guest Details */}
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(6,161,92,0.1)' }}>
                                <Users className="w-4 h-4" style={{ color: '#06a15c' }} />
                            </div>
                            <h3 className="font-serif text-xl font-bold" style={{ color: '#031A0C' }}>1. Guest Details</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 font-sans text-base p-6 rounded-xl" style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}>
                            <div><span className="block text-sm uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Guest Name</span> <strong className="text-lg" style={{ color: '#111827' }}>{itin.customerName}</strong></div>
                            <div><span className="block text-sm uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Destination</span> <strong className="text-lg" style={{ color: '#111827' }}>{itin.destination}</strong></div>

                            <div className="flex items-center gap-2"><Phone className="w-4 h-4" style={{ color: '#9ca3af' }} /> <span style={{ color: '#111827' }}>{itin.customerPhone || "—"}</span></div>
                            <div><span className="block text-sm uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Travel Dates</span> <span className="font-semibold" style={{ color: '#1f2937' }}>{formatDate(itin.startDate)} to {formatDate(itin.endDate)}</span></div>

                            <div className="flex items-center gap-2"><Mail className="w-4 h-4" style={{ color: '#9ca3af' }} /> <span style={{ color: '#111827' }}>{itin.customerEmail || "—"}</span></div>
                            <div><span className="block text-sm uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Duration</span> <span className="font-semibold" style={{ color: '#1f2937' }}>{itin.days} Days / {itin.nights} Nights</span></div>

                            <div className="col-span-2 mt-2 pt-4" style={{ borderTop: '1px solid #e5e7eb' }}>
                                <span className="block text-sm uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Passengers</span>
                                <span className="font-semibold text-lg" style={{ color: '#1f2937' }}>{itin.adults} Adults{itin.children > 0 ? `, ${itin.children} Children (${itin.childAge || 'Age not specified'})` : ''}</span>
                            </div>
                        </div>
                    </div>

                    {/* Brief Itinerary */}
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(6,161,92,0.1)' }}>
                                <Calendar className="w-4 h-4" style={{ color: '#06a15c' }} />
                            </div>
                            <h3 className="font-serif text-xl font-bold" style={{ color: '#031A0C' }}>2. Brief Itinerary</h3>
                        </div>

                        <div className="space-y-4 font-sans text-base border-l-2 ml-4 pl-6 relative" style={{ borderColor: 'rgba(6,161,92,0.3)' }}>
                            {days.length > 0 ? days.map((day, idx) => (
                                <div key={idx} className="relative">
                                    <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2" style={{ backgroundColor: '#ffffff', borderColor: '#06a15c' }} />
                                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                                        <span className="font-bold min-w-[70px]" style={{ color: '#06a15c' }}>{day.day}:</span>
                                        <span className="font-semibold" style={{ color: '#1f2937' }}>{day.title || day.description?.substring(0, 50) + "..."}</span>
                                    </div>
                                </div>
                            )) : (
                                <p className="italic" style={{ color: '#6b7280' }}>Itinerary details not available.</p>
                            )}
                        </div>
                    </div>

                    {/* Hotel Accommodation */}
                    {hotels.length > 0 && (
                        <div className="mb-12">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(6,161,92,0.1)' }}>
                                    <Hotel className="w-4 h-4" style={{ color: '#06a15c' }} />
                                </div>
                                <h3 className="font-serif text-xl font-bold" style={{ color: '#031A0C' }}>Hotel Accommodation</h3>
                            </div>
                            <div className="space-y-3">
                                {hotels.map((hotel: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-5 rounded-xl font-sans" style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}>
                                        <div>
                                            <p className="font-bold text-lg" style={{ color: '#111827' }}>{hotel.name}</p>
                                            <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>{hotel.category || 'Standard'} · {hotel.rating ? `${hotel.rating}★` : ''} Or Similar Property</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold" style={{ color: '#06a15c' }}>{itin.nights || 0} Nights</p>
                                            {hotel.ratePerNight && <p className="text-sm" style={{ color: '#6b7280' }}>₹{hotel.ratePerNight}/night</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Inclusions & Exclusions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                        {/* Inclusions */}
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <h3 className="font-serif text-xl font-bold uppercase tracking-wider" style={{ color: '#031A0C' }}>3. Inclusions</h3>
                            </div>
                            <ul className="space-y-3 font-sans text-base" style={{ color: '#374151' }}>
                                {inclusions.map((item: string, idx: number) => (
                                    <li key={idx} className="flex gap-2 items-start">
                                        <span style={{ color: '#06a15c' }}>✓</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Exclusions */}
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <h3 className="font-serif text-xl font-bold uppercase tracking-wider" style={{ color: '#031A0C' }}>4. Exclusions</h3>
                            </div>
                            <ul className="space-y-3 font-sans text-base" style={{ color: '#374151' }}>
                                {exclusions.map((item: string, idx: number) => (
                                    <li key={idx} className="flex gap-2 items-start">
                                        <span style={{ color: '#ef4444' }}>✗</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Terms & Conditions */}
                    <div className="mt-16 pt-12" style={{ borderTop: '1px solid #e5e7eb' }}>
                        <div className="prose max-w-none font-sans text-sm text-justify space-y-4 leading-relaxed" style={{ color: '#4b5563' }}>
                            {itin.pdfTemplate?.importantNotes?.length > 0 && (
                                <>
                                    <h3 className="font-serif text-2xl font-bold mb-6 uppercase tracking-wider" style={{ color: '#031A0C' }}>Important Notes</h3>
                                    <ul className="list-disc pl-4 space-y-2">
                                        {itin.pdfTemplate.importantNotes.map((term: string, idx: number) => (
                                            <li key={idx} className="whitespace-pre-wrap">{term}</li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            
                            <h3 className="font-serif text-2xl font-bold mb-6 uppercase tracking-wider" style={{ color: '#031A0C' }}>Terms & Conditions</h3>
                            {itin.pdfTemplate?.termsAndConditions?.length > 0 ? (
                                <ul className="list-disc pl-4 space-y-2">
                                    {itin.pdfTemplate.termsAndConditions.map((term: string, idx: number) => (
                                        <li key={idx} className="whitespace-pre-wrap">{term}</li>
                                    ))}
                                </ul>
                            ) : (
                                <ul className="list-disc pl-4 space-y-2">
                                    <li>Outbound Travelers have listed the maximum number of sightseeing that can be covered in a day. However, few places may not be possible to visit due to restrictions by the Govt/ strikes/ heavy snowfall / traffic jams/ limited time /closed roads or monuments/ unforeseen incidents then Outbound Travelers is not liable to provide any kind of claim on above mentioned or similar scenarios.</li>
                                    <li>Guests are requested to have every discussion in written as verbal communications will not be entertained.</li>
                                    <li>Meals Timings must be followed as per the instructed time of the hotels. For any un-availed meals we shall not be responsible.</li>
                                    <li>Final confirmation acceptance should be only written basis & No discount will be provided after the issuance of confirmation letter.</li>
                                    <li>To ensure smooth services, Company can also make alternations in the tour. The reasons for such changes can be acts of god, natural calamity, technical problems, sudden service issues, government policies or any other similar situation.</li>
                                    <li>Extra cost may be applied for any unexpected event. Any cost arising out of natural calamity or political disturbances are born by the passenger directly on the spot.</li>
                                    <li>We may have to re-schedule the sightseeing days due to closing of any monument during that particular day as to ensure smooth execution of tours.</li>
                                    <li>Package will not be considered booked until advance amount have not been received by us.</li>
                                    <li>Travel dates of DND (Date not decided) packages should be affirmed within 3 Months of invoice issuance date. Delays may lead to certain inconveniences.</li>
                                    <li>To give better experiences to our guests, our company also rolls out special offers. This includes upgraded Hotels, Room Category, and Vehicle Type. No additional cost will be levied for such upgrades and this exciting news will be shared with you either before or during the trip.</li>
                                    <li>Check in & Check out time will be according to Hotel Policy. Also, early check in and late check-out scenarios will be subject to availability.</li>
                                    <li>In every package, base category rooms will be reserved in hotels unless until specified by executives.</li>
                                    <li>Due to geographical differences, few places may not have as lavish facilities as that of developed tourist destinations. In such places, Hotels are categorized on the basis of location, services and costing and not as 3 star, 4 Star and so on. The vehicle types are limited and may not be of latest models. Also general infrastructure such as hospitals, petrol pumps, ATMs etc may also be missing. Thus, Guests are requested to be well-prepared for such destinations in advance.</li>
                                    <li>In Hill stations Ac will not be used. (Mostly for the North India & North East Region)</li>
                                    <li>All vehicles hired are on a point to point basis and not on disposal.</li>
                                    <li>Flights, trains, stay arrangements, certain sightseeing, adventure activities or similar services will be subject to ideal weather conditions or Season period.</li>
                                    <li>Any complimentary services (If not provided) cannot be claimed in form of cash or alternative services.</li>
                                    <li>For No Shows or any un-availed service, Outbound Travelers shall not be responsible. This includes missed flights, meals, transfer or any other booked services. For alternative arrangements extra cost will be levied.</li>
                                    <li>Outbound Travelers shall not be responsible for any delays or cancellations due to Heavy Traffic Jams, blocked roads, technical faults, strikes, natural disasters or any unforeseen event. Such situations may also demand for some extra services vis-a-vis extra cost.</li>
                                    <li>Please notify about your complaints or claims within 7 days of "See Off" dates as beyond these period issues may not be promptly resolved.</li>
                                </ul>
                            )}

                            <h4 className="font-bold mt-6 mb-2 uppercase" style={{ color: '#1f2937' }}>PAYMENT POLICY :-</h4>
                            {itin.pdfTemplate?.paymentPolicy?.length > 0 ? (
                                <ul className="list-disc pl-4 space-y-1">
                                    {itin.pdfTemplate.paymentPolicy.map((term: string, idx: number) => (
                                        <li key={idx} className="whitespace-pre-wrap">{term}</li>
                                    ))}
                                </ul>
                            ) : (
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>For Package booking 70% advance payment required. According to hotel policy especially in 4* and 5* we required 100% payment at the time of booking.</li>
                                    <li>Remaining 30% of the package cost will be collected on arrival (First day of the Tour).</li>
                                    <li>For international packages 100% advance payment required at the time of booking.</li>
                                    <li>For Train and Flight 100% advance payment required at the time of booking.</li>
                                    <li>In case of non-payment either advance or remaining the company has full right to stop the Services.</li>
                                </ul>
                            )}

                            <h4 className="font-bold mt-6 mb-2 uppercase" style={{ color: '#1f2937' }}>CANCELLATION AND REFUND POLICY :-</h4>
                            {itin.pdfTemplate?.cancellationPolicy?.length > 0 ? (
                                <ul className="list-disc pl-4 space-y-1">
                                    {itin.pdfTemplate.cancellationPolicy.map((term: string, idx: number) => (
                                        <li key={idx} className="whitespace-pre-wrap">{term}</li>
                                    ))}
                                </ul>
                            ) : (
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>All the cancellations must be communicated in written.</li>
                                    <li>Token amount is non refundable in any cases. Cancellations made 15 Days prior to travel date will attract cancellation charges.</li>
                                    <li>Cancellations charges will vary from 25 % - 50% of the total tour package cost.</li>
                                    <li>100 % Retention charges will be levied for bookings cancelled within 15 days of travel date or No show scenarios.</li>
                                    <li>No refunds will be given in case of missed or unused services. This includes Flights, Trains Hotel stays, meals, sightseeing, transfers, entry ticket, permits or any other services.</li>
                                    <li>Outbound Travelers have the right to cancel your Invoice due to insufficient Advance Amount i.e. 50% of the total tour Package Cost.</li>
                                    <li>In case of unforeseen weather conditions or government restrictions, certain activities may be cancelled and, in such cases, we will try our best to provide an alternate feasible activity. However, no refund will be provided for the same.</li>
                                    <li>100% cancelation would be charged from the total booking amount in case of last-minute booking cancellation due to flight cancellation, any natural calamity, and change in flight schedule/ferry due to technical/weather and high tides and sea conditions.</li>
                                </ul>
                            )}

                            <div className="mt-12 mb-8 font-bold" style={{ color: '#1f2937' }}>
                                <p>THANKS AND REGARDS,</p>
                                <p>Operations Team,</p>
                                <p style={{ color: '#06a15c' }}>Outbound Travelers</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
