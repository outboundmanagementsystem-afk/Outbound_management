"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {
    getDestinations, getHotels, getAttractions, getActivities, getVehicleRules, getPresetDays,
    createItinerary, addItineraryDay, addItineraryHotel, addItineraryTransfer, addItineraryPricing, addItineraryFlight, addItineraryActivity,
    getItinerary, getItineraryDays, getItineraryFlights, getItineraryHotels, getItineraryTransfers, getItineraryPricing, getItineraryActivities, updateItinerary, clearItinerarySubcollections, getTransfers,
    createPackage, addPackageDay, addPackageFlight, addPackageHotel, addPackageTransfer, addPackageActivity, addPackagePricing, getPackage, getPackageDays, getPackageHotels, getPackageTransfers, getPackagePricing, getPackageFlights, getPackageActivities, updatePackage, clearPackageSubcollections, getCustomers, createCustomer
} from "@/lib/firestore"
import {
    User, MapPin, Calendar, Users, Hotel, Car, Sun, DollarSign,
    ChevronRight, ChevronLeft, Check, Plus, Trash2, Eye, Plane, Upload, Loader2, Sparkles, Map, PackageSearch, ChevronDown, X, Search
} from "lucide-react"
import { createWorker } from "tesseract.js"
import { preprocessImageForOCR } from "@/lib/image-processing"
import { extractFlightDetailsFromText } from "@/lib/flight-parser"

const STEPS = [
    { label: "Customer & Trip", icon: User },
    { label: "Flights", icon: Plane },
    { label: "Hotels", icon: Hotel },
    { label: "Transfers", icon: Car },
    { label: "Activities", icon: Map },
    { label: "Day Plan", icon: Sun },
    { label: "Pricing", icon: DollarSign },
    { label: "Preview", icon: Eye },
]

export interface ItineraryWizardProps {
    mode?: "custom" | "package"
    onSave?: (id: string) => void
}

export function ItineraryWizard({ mode = "custom", onSave }: ItineraryWizardProps) {
    const { userProfile } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const editId = searchParams.get("editId")
    const [step, setStep] = useState(0)
    const [saving, setSaving] = useState(false)
    const [calMonth, setCalMonth] = useState(() => new Date())
    const [pickingEnd, setPickingEnd] = useState(false)

    // Destination data
    const [destinations, setDestinations] = useState<any[]>([])
    const [destHotels, setDestHotels] = useState<any[]>([])
    const [destAttractions, setDestAttractions] = useState<any[]>([])
    const [destActivities, setDestActivities] = useState<any[]>([])
    const [destVehicles, setDestVehicles] = useState<any[]>([])
    const [destTransfers, setDestTransfers] = useState<any[]>([])
    const [destPresetDays, setDestPresetDays] = useState<any[]>([])
    const [customers, setCustomers] = useState<any[]>([])

    // Step 1: Customer & Trip
    const [customerName, setCustomerName] = useState("")
    const [customerPhone, setCustomerPhone] = useState("")
    const [customerEmail, setCustomerEmail] = useState("")
    const [destinationId, setDestinationId] = useState("")
    const [destinationName, setDestinationName] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [nights, setNights] = useState(0)
    const [totalDays, setTotalDays] = useState(0)
    const [adults, setAdults] = useState(2)
    const [children, setChildren] = useState(0)
    const [childAges, setChildAges] = useState<string[]>([])
    const [consultantName, setConsultantName] = useState("")
    const [consultantPhone, setConsultantPhone] = useState("")

    // Hotel Search
    const [hotelSearchTerm, setHotelSearchTerm] = useState("")
    const [expandedHotelId, setExpandedHotelId] = useState<string | null>(null)

    // Step 2: Hotels
    const [selectedHotels, setSelectedHotels] = useState<any[]>([])
    const [selectedHotelCategory, setSelectedHotelCategory] = useState<string>("All")
    const [customHotelName, setCustomHotelName] = useState("")
    const [customHotelCategory, setCustomHotelCategory] = useState("")
    const [customRoomCategory, setCustomRoomCategory] = useState("")

    // Step 3: Transfers
    const [transfers, setTransfers] = useState<any[]>([{ type: "Arrival", pickup: "", drop: "", vehicleType: "", price: 0 }])

    // Step 4: Activities
    const [selectedActivities, setSelectedActivities] = useState<any[]>([])

    // Step 5: Day Plan
    const [dayPlans, setDayPlans] = useState<any[]>([])

    // Step 6: Pricing & Plans
    const [margin, setMargin] = useState(15)
    // Legacy single-price fallbacks
    const [totalPrice, setTotalPrice] = useState(0)
    const [perPersonPrice, setPerPersonPrice] = useState(0)
    // Manual Cost Overrides - Defaulting to 0 for a clean slate as requested
    const [manualHotelCost, setManualHotelCost] = useState<number | null>(0)
    const [manualTransferCost, setManualTransferCost] = useState<number | null>(0)
    const [manualActivityCost, setManualActivityCost] = useState<number | null>(0)

    // New Multi-Plan Architecture
    const [plans, setPlans] = useState<any[]>([])
    const [tierPlans, setTierPlans] = useState<any[]>([
        { name: "BUDGET", stops: [{ location: "", hotelId: "", hotelName: "", nights: 2, mealPlan: "CP (Breakfast)", roomType: "", ratePerNight: 0 }] }
    ])

    const MEAL_PLANS = [
        { label: "EP (No Meals)", value: "EP" },
        { label: "CP (Breakfast)", value: "CP" },
        { label: "MAP (Breakfast + Dinner)", value: "MAP" },
        { label: "AP (All Meals)", value: "AP" }
    ]

    const TIER_NAMES = ["BUDGET", "DELUXE", "LUXURY", "PREMIUM", "STANDARD"]

    // Sync tierPlans to selectedHotels for backward compatibility with pricing/saving logic
    useEffect(() => {
        const flattened: any[] = []
        tierPlans.forEach(plan => {
            plan.stops.forEach((stop: any) => {
                if (stop.hotelId || stop.hotelName) {
                    const hotel = destHotels.find(h => h.id === stop.hotelId) || {
                        id: stop.hotelId || `custom-${Date.now()}`,
                        name: stop.hotelName,
                        hotelName: stop.hotelName,
                        category: plan.name,
                        roomType: stop.roomType || "Standard",
                        ratePerNight: stop.ratePerNight || 0
                    }
                    
                    flattened.push({
                        ...hotel,
                        category: plan.name, // Use plan name as category for pricing grouping
                        selectedNights: stop.nights,
                        mealPlan: stop.mealPlan,
                        roomType: stop.roomType || hotel.roomType || "Standard",
                        ratePerNight: stop.ratePerNight || 0
                    })
                }
            })
        })
        setSelectedHotels(flattened)
    }, [tierPlans, destHotels])

    // Dropdown management
    const [openHotelDropdown, setOpenHotelDropdown] = useState<number | null>(null)
    const [openLocDropdown, setOpenLocDropdown] = useState<number | null>(null)
    const [openPresetDropdown, setOpenPresetDropdown] = useState<number | null>(null)
    const [localHotelSearch, setLocalHotelSearch] = useState("")
    const [localLocSearch, setLocalLocSearch] = useState("")
    const [localPresetSearch, setLocalPresetSearch] = useState("")

    // Tier Builder specific dropdowns
    const [openTierLocDropdown, setOpenTierLocDropdown] = useState<{ planIdx: number, stopIdx: number } | null>(null)
    const [openTierHotelDropdown, setOpenTierHotelDropdown] = useState<{ planIdx: number, stopIdx: number } | null>(null)

    // Flight details storage
    const [flightSegments, setFlightSegments] = useState<any[]>([])
    const [isExtractingFlight, setIsExtractingFlight] = useState(false)

    const processFlightImage = async (file: File) => {
        setIsExtractingFlight(true)
        try {
            // 1. Process image client-side to improve OCR accuracy
            const processedBase64 = await preprocessImageForOCR(file)

            // 2. Initialize Tesseract WebWorker dynamically
            const worker = await createWorker('eng', 1, {
                logger: m => console.log(m) // Optional: Track progress
            })

            // 3. Extract Text via WebAssembly Worker
            const { data: { text } } = await worker.recognize(processedBase64)
            await worker.terminate()

            // 4. Parse raw text into structured flight details (can be multiple if round trip)
            const parsedSegs = extractFlightDetailsFromText(text)

            // 5. ML / Data Classification Validation: Verify if the extracted data actually represents a flight
            const isValidTicket = parsedSegs && parsedSegs.length > 0 && parsedSegs.some(seg =>
                (seg.airline && seg.airline.length > 1) ||
                (seg.fromCode && seg.toCode) ||
                (seg.departure && seg.arrival)
            )

            if (!isValidTicket) {
                alert("Data not matched. This does not appear to be a valid flight ticket screenshot.")
                setIsExtractingFlight(false)
                return
            }

            const newSegments = parsedSegs.map(data => ({
                type: data.type || "Onward",
                airline: data.airline || "",
                flightNo: data.flightNo || "",
                fromCode: data.fromCode || "",
                from: "",
                departure: data.departure || "",
                departureDate: "",
                toCode: data.toCode || "",
                to: "",
                arrival: data.arrival || "",
                arrivalDate: "",
                duration: data.duration || "",
                flightType: data.flightType || "Direct",
                layoverDetails: data.layoverDetails || "",
                price: Number(data.price) || 0
            }))

            setFlightSegments(prev => {
                // If there is only one empty segment, replace it. Otherwise append.
                if (prev.length === 1 && !prev[0].airline && !prev[0].departure && !prev[0].fromCode) {
                    return newSegments
                }
                return [...prev, ...newSegments]
            })

            setIsExtractingFlight(false)
        } catch (err) {
            console.error("Tesseract Error:", err)
            alert("Could not process image automatically. You can enter details manually.")
            setIsExtractingFlight(false)
        }
    }

    const handleFlightScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        await processFlightImage(file)
    }

    // Global Paste Listener for flights step
    useEffect(() => {
        const handleGlobalPaste = async (e: ClipboardEvent) => {
            if (step !== 1 || isExtractingFlight) return; // Only process pastes when on Flights step and not already processing
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        e.preventDefault();
                        await processFlightImage(file);
                        return;
                    }
                }
            }
        };
        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, [step, isExtractingFlight]);

    useEffect(() => { loadDestinations() }, [])

    useEffect(() => {
        if (userProfile) {
            setConsultantName(userProfile.name || "")
            setConsultantPhone(userProfile.phone || "")
        }
    }, [userProfile])

    useEffect(() => {
        if (destinationId) loadDestinationData(destinationId)
    }, [destinationId])

    // Load existing itinerary or package if edit mode
    useEffect(() => {
        if (!editId) return
        const loadEditData = async () => {
            try {
                let it, d, h, t, p, f, a;
                if (mode === "package") {
                    [it, d, h, t, p, f, a] = await Promise.all([
                        getPackage(editId) as Promise<any>,
                        getPackageDays(editId) as Promise<any[]>,
                        getPackageHotels(editId) as Promise<any[]>,
                        getPackageTransfers(editId) as Promise<any[]>,
                        getPackagePricing(editId) as Promise<any[]>,
                        getPackageFlights(editId) as Promise<any[]>,
                        getPackageActivities(editId) as Promise<any[]>,
                    ])
                } else {
                    [it, d, h, t, p, f, a] = await Promise.all([
                        getItinerary(editId) as Promise<any>,
                        getItineraryDays(editId) as Promise<any[]>,
                        getItineraryHotels(editId) as Promise<any[]>,
                        getItineraryTransfers(editId) as Promise<any[]>,
                        getItineraryPricing(editId) as Promise<any[]>,
                        getItineraryFlights(editId) as Promise<any[]>,
                        getItineraryActivities(editId) as Promise<any[]>,
                    ])
                }

                if (it) {
                    setCustomerName(it.customerName || it.packageName || "")
                    setCustomerPhone(it.customerPhone || "")
                    setCustomerEmail(it.customerEmail || "")
                    setDestinationId(it.destinationId || "")
                    setDestinationName(it.destination || "")
                    setStartDate(it.startDate || "")
                    setEndDate(it.endDate || "")
                    setAdults(it.adults || 2)
                    setChildren(it.children || 0)
                    const loadChildAgesStr = it.childAge || ""
                    setChildAges(loadChildAgesStr ? loadChildAgesStr.split(", ") : [])
                    setConsultantName(it.consultantName || "")
                    setConsultantPhone(it.consultantPhone || "")
                    setMargin(it.margin || 15)
                }

                if (p && p.length > 0) {
                    const pricing = p[0]
                    setManualHotelCost(pricing.manualHotelCost !== undefined ? pricing.manualHotelCost : null)
                    setManualTransferCost(pricing.manualTransferCost !== undefined ? pricing.manualTransferCost : null)
                    setManualActivityCost(pricing.manualActivityCost !== undefined ? pricing.manualActivityCost : null)
                }

                if (f && f.length > 0) setFlightSegments(f)
                if (h && h.length > 0) {
                    setSelectedHotels(h)
                    // Reconstruct tierPlans from selected hotels
                    const categories = Array.from(new Set(h.map((hotel: any) => hotel.category || "BUDGET")))
                    const reconstructed = categories.map(cat => ({
                        name: cat,
                        stops: h.filter((hotel: any) => (hotel.category || "BUDGET") === cat).map((hotel: any) => ({
                            location: hotel.subDestination || hotel.location || "",
                            hotelId: hotel.id,
                            hotelName: hotel.hotelName || hotel.name,
                            nights: hotel.selectedNights || 1,
                            mealPlan: hotel.mealPlan || "CP (Breakfast)",
                            roomType: hotel.roomType || "",
                            ratePerNight: hotel.ratePerNight || 0
                        }))
                    }))
                    setTierPlans(reconstructed.length > 0 ? reconstructed : [{ name: "BUDGET", stops: [{ location: "", hotelId: "", hotelName: "", nights: 2, mealPlan: "CP (Breakfast)", roomType: "", ratePerNight: 0 }] }])
                }
                if (t && t.length > 0) setTransfers(t)
                if (a && a.length > 0) setSelectedActivities(a)
                if (d && d.length > 0) {
                    // Sort days by day number to ensure chronological order (Day 01, Day 02...)
                    const sortedDays = [...d].sort((a, b) => {
                        const numA = parseInt(a.day?.replace(/\D/g, '') || "0")
                        const numB = parseInt(b.day?.replace(/\D/g, '') || "0")
                        return numA - numB
                    })
                    // Slight delay to ensure it overrides any auto-generation from startDate/endDate changes
                    setTimeout(() => setDayPlans(sortedDays), 100)
                }
            } catch (e) {
                console.error(e)
            }
        }
        loadEditData()
    }, [editId, mode])

    useEffect(() => {
        if (startDate && endDate) {
            const start = new Date(startDate)
            const end = new Date(endDate)
            const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
            setNights(diffDays)
            setTotalDays(diffDays + 1)
            // Auto-generate day plans only if we don't have existing ones in edit mode, or if user is changing dates
            if (!editId || dayPlans.length !== diffDays + 1) {
                const plans = []
                for (let i = 0; i < diffDays + 1; i++) {
                    const date = new Date(start)
                    date.setDate(date.getDate() + i)
                    plans.push({
                        day: `Day ${String(i + 1).padStart(2, "0")}`,
                        date: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
                        title: i === 0 ? "Arrival" : i === diffDays ? "Departure" : "",
                        description: "",
                        highlights: [] as string[],
                        subDestination: "",
                        overnightStay: ""
                    })
                }
                setDayPlans(plans)
            }
        }
    }, [startDate, endDate])

    const loadDestinations = async () => {
        const dests = await getDestinations()
        setDestinations(dests)
        try {
            const custs = await getCustomers()
            setCustomers(custs)
        } catch (e) {
            console.error("Failed to load customers", e)
        }
    }

    const loadDestinationData = async (id: string) => {
        const [hotels, attractions, activities, vehicles, presetDays, transfers] = await Promise.all([
            getHotels(id), getAttractions(id), getActivities(id), getVehicleRules(id), getPresetDays(id), getTransfers(id)
        ])
        setDestHotels(hotels)
        setDestAttractions(attractions)
        setDestActivities(activities)
        setDestVehicles(vehicles)
        setDestPresetDays(presetDays)
        setDestTransfers(transfers)
    }

    const calculatePricing = () => {
        let transferCost = 0
        if (manualTransferCost !== null) {
            transferCost = manualTransferCost
        } else {
            transfers.forEach(t => { transferCost += Number(t.price) || 0 })
        }

        let activityCost = 0
        if (manualActivityCost !== null) {
            activityCost = manualActivityCost
        } else {
            selectedActivities.forEach(a => {
                const actPrice = a.isActivity ? ((Number(a.price) || 0) + (Number(a.vehiclePrice) || 0)) : (Number(a.entryFee) || Number(a.price) || 0)
                activityCost += actPrice * (adults + children)
            })
        }

        let optionalCost = 0
        dayPlans.forEach(d => { optionalCost += Number(d.optionalPrice) || 0 })

        const pax = adults + children
        const baseNetCost = transferCost + activityCost

        if (selectedHotels.length === 0) {
            const hotelCost = manualHotelCost !== null ? manualHotelCost : 0
            const netCost = baseNetCost + hotelCost
            const marginAmt = netCost * (margin / 100)
            const total = netCost + marginAmt + optionalCost
            setTotalPrice(Math.round(total))
            setPerPersonPrice(pax > 0 ? Math.round(total / pax) : 0)
            setPlans([{ hotelName: "No Hotel Selected", total, perPersonPrice: pax > 0 ? Math.round(total / pax) : 0, hotelCost }])
        } else {
            // Group hotels by category (to support multi-hotel sequential stays in the same package option)
            const categories = Array.from(new Set(selectedHotels.map(h => h.category || "Uncategorized")))
            const newPlans = categories.map(cat => {
                const hotelsInCat = selectedHotels.filter(h => (h.category || "Uncategorized") === cat)
                const hotelCost = manualHotelCost !== null ? manualHotelCost : hotelsInCat.reduce((sum, h) => sum + (Number(h.ratePerNight) * Number(h.selectedNights || nights)), 0)
                const netCost = baseNetCost + hotelCost
                const marginAmt = netCost * (margin / 100)
                const total = netCost + marginAmt + optionalCost
                
                // Construct a descriptive name for the multi-hotel plan
                const hotelsDisplay = hotelsInCat.length > 1 
                    ? `${hotelsInCat.length} Hotels (${cat})`
                    : `${hotelsInCat[0].hotelName || hotelsInCat[0].name} - ${hotelsInCat[0].roomType || "Standard"}`

                return {
                    hotelName: hotelsDisplay,
                    category: cat,
                    hotelCost,
                    total: Math.round(total),
                    perPersonPrice: pax > 0 ? Math.round(total / pax) : 0
                }
            })
            // For legacy fields, just use the first plan
            setTotalPrice(newPlans[0].total)
            setPerPersonPrice(newPlans[0].perPersonPrice)
            setPlans(newPlans)
        }
    }

    useEffect(() => { calculatePricing() }, [selectedHotels, transfers, selectedActivities, margin, nights, adults, children, dayPlans, manualHotelCost, manualTransferCost, manualActivityCost])

    const handleSave = async () => {
        setSaving(true)
        try {
            const selectedDest = destinations.find((d: any) => d.id === destinationId)
            const baseData = {
                destinationId, destination: destinationName,
                startDate, endDate, nights, days: totalDays,
                adults, children, childAge: childAges.join(", "),
                totalPrice, perPersonPrice, margin,
                createdBy: userProfile?.uid || "",
                createdByName: userProfile?.name || "",
                pdfTemplate: selectedDest?.pdfTemplate || null,
                manualHotelCost, manualTransferCost, manualActivityCost
            }

            let itinId = editId as string
            let pipelineItinIdForOnSave: string | null = null

            if (mode === "package") {
                const packageData = {
                    ...baseData,
                    packageName: customerName,
                }
                if (editId) {
                    await updatePackage(editId, packageData)
                    await clearPackageSubcollections(editId)
                } else {
                    itinId = await createPackage(packageData)
                }

                for (const day of dayPlans) await addPackageDay(itinId, day)
                for (const flight of flightSegments) await addPackageFlight(itinId, flight)
                for (const hotel of selectedHotels) await addPackageHotel(itinId, hotel)
                for (const transfer of transfers) await addPackageTransfer(itinId, transfer)
                for (const act of selectedActivities) await addPackageActivity(itinId, act)
                await addPackagePricing(itinId, { totalPrice, perPersonPrice, margin, nights, adults, children, plans, manualHotelCost, manualTransferCost, manualActivityCost })

                // DUAL WRITE: Also create an itinerary so it immediately shows up in the Sales Pipeline
                if (!editId) {
                    const itineraryDataForPipeline = {
                        ...baseData,
                        customerName, customerPhone, customerEmail,
                        consultantName, consultantPhone,
                    }
                    const pipelineItinId = await createItinerary(itineraryDataForPipeline)
                    pipelineItinIdForOnSave = pipelineItinId
                    for (const day of dayPlans) await addItineraryDay(pipelineItinId, day)
                    for (const flight of flightSegments) await addItineraryFlight(pipelineItinId, flight)
                    for (const hotel of selectedHotels) await addItineraryHotel(pipelineItinId, hotel)
                    for (const transfer of transfers) await addItineraryTransfer(pipelineItinId, transfer)
                    for (const act of selectedActivities) await addItineraryActivity(pipelineItinId, act)
                    await addItineraryPricing(pipelineItinId, { totalPrice, perPersonPrice, margin, nights, adults, children, plans, manualHotelCost, manualTransferCost, manualActivityCost })
                }

            } else {
                const itineraryData = {
                    ...baseData,
                    customerName, customerPhone, customerEmail,
                    consultantName, consultantPhone,
                }

                if (editId) {
                    await updateItinerary(editId as string, itineraryData)
                    await clearItinerarySubcollections(editId as string)
                } else {
                    itinId = await createItinerary(itineraryData)
                }

                // Conditionally sync new customer
                if (customerName && customerPhone) {
                    const existing = customers.find(c => c.phone === customerPhone)
                    if (!existing) {
                        try {
                            await createCustomer({ name: customerName, phone: customerPhone, email: customerEmail })
                        } catch(e) { console.warn("Failed to create customer record", e) }
                    }
                }

                for (const day of dayPlans) await addItineraryDay(itinId, day)
                for (const flight of flightSegments) await addItineraryFlight(itinId, flight)
                for (const hotel of selectedHotels) await addItineraryHotel(itinId, hotel)
                for (const transfer of transfers) await addItineraryTransfer(itinId, transfer)
                for (const act of selectedActivities) await addItineraryActivity(itinId, act)
                await addItineraryPricing(itinId, { totalPrice, perPersonPrice, margin, nights, adults, children, plans, manualHotelCost, manualTransferCost, manualActivityCost })
            }

            if (onSave) {
                onSave(pipelineItinIdForOnSave || itinId)
            } else {
                router.push(`/sales/itinerary/${itinId}`)
            }

        } catch (err) {
            console.error(err)
            alert("Error saving")
        } finally {
            setSaving(false)
        }
    }

    const inputStyle: React.CSSProperties = { background: '#FFFFFF', color: '#1a1a1a', border: '1px solid #e2e8f0', outline: 'none', borderRadius: '12px', fontSize: '14px', transition: 'border-color 0.2s, box-shadow 0.2s' }
    const selectStyle: React.CSSProperties = { ...inputStyle, color: '#000000', backgroundColor: '#FFFFFF' }
    const inputClass = "w-full px-4 py-3 rounded-xl font-sans text-sm focus:border-emerald-400"
    const labelClass = "font-sans text-[11px] font-semibold tracking-wider uppercase mb-1.5 block"
    const labelStyle: React.CSSProperties = { color: '#059669' }

    const stepProgress = Math.round((step / (STEPS.length - 1)) * 100)

    return (
        <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-24 sm:pb-8 px-2 sm:px-0">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-2xl sm:text-3xl tracking-wide" style={{ color: '#052210' }}>
                        {editId ? (mode === "package" ? "Edit Package Template" : "Edit Itinerary") : (mode === "package" ? "New Package Template" : "New Itinerary")}
                    </h1>
                    <p className="font-sans text-xs sm:text-sm mt-1" style={{ color: '#6b7280' }}>
                        {editId ? `Update the ${mode === "package" ? "package template" : "itinerary"} details below` : `Create a new travel ${mode === "package" ? "package template" : "itinerary"} step by step`}
                    </p>
                </div>
                {nights > 0 && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-sans text-xs font-bold tracking-wider" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                        <Calendar className="w-3.5 h-3.5" /> {nights}N / {totalDays}D
                    </span>
                )}
            </div>

            {/* Mobile step indicator */}
            <div className="flex sm:hidden items-center justify-between p-3 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="p-2 rounded-xl disabled:opacity-20 transition-colors" style={{ color: '#059669' }}>
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#059669' }}>
                        {step + 1}
                    </div>
                    <div>
                        <p className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{STEPS[step].label}</p>
                        <p className="font-sans text-[10px]" style={{ color: '#9ca3af' }}>Step {step + 1} of {STEPS.length}</p>
                    </div>
                </div>
                <button onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))} disabled={step === STEPS.length - 1} className="p-2 rounded-xl disabled:opacity-20 transition-colors" style={{ color: '#059669' }}>
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Desktop step indicator */}
            <div className="hidden sm:block p-4 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div className="flex items-center justify-between relative">
                    {/* Progress line background */}
                    <div className="absolute top-4 left-6 right-6 h-0.5" style={{ background: '#e5e7eb' }} />
                    <div className="absolute top-4 left-6 h-0.5 transition-all duration-500" style={{ background: '#059669', width: `calc(${stepProgress}% - 48px)` }} />

                    {STEPS.map((s, i) => (
                        <button key={i} onClick={() => setStep(i)} className="relative flex flex-col items-center gap-1.5 z-10 group">
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-bold"
                                style={{
                                    background: i <= step ? '#059669' : '#FFFFFF',
                                    color: i <= step ? '#FFFFFF' : '#9ca3af',
                                    border: i <= step ? '2px solid #059669' : '2px solid #d1d5db',
                                    boxShadow: i === step ? '0 0 0 4px rgba(5,150,105,0.15)' : 'none',
                                }}
                            >
                                {i < step ? <Check className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                            </div>
                            <span className="font-sans text-[10px] font-semibold tracking-wider whitespace-nowrap" style={{ color: i === step ? '#059669' : i < step ? '#052210' : '#9ca3af' }}>
                                {s.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Step content */}
            <div className="rounded-2xl p-4 sm:p-6 md:p-8" style={{ background: '#FFFFFF', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

                {/* STEP 0: Customer & Trip */}
                {step === 0 && (
                    <div className="space-y-6">
                        {/* Customer / Package Info Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#ecfdf5' }}>
                                    {mode === "package" ? <PackageSearch className="w-3.5 h-3.5" style={{ color: '#059669' }} /> : <User className="w-3.5 h-3.5" style={{ color: '#059669' }} />}
                                </div>
                                <h2 className="font-serif text-lg sm:text-xl tracking-wide" style={{ color: '#052210' }}>
                                    {mode === "package" ? "Package Information" : "Customer Information"}
                                </h2>
                            </div>

                            {mode === "package" && (
                                <div className="mb-4 p-4 rounded-xl flex items-start gap-3" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                                    <div className="flex-1">
                                        <p className="font-sans text-sm font-semibold" style={{ color: '#92400e' }}>Template Mode Active</p>
                                        <p className="font-sans text-xs mt-1" style={{ color: '#b45309' }}>
                                            Packages built here act as <strong>reusable templates</strong> and will not appear in the active sales pipeline or customer page. To generate a real itinerary from this template, navigate to <strong>Ready-Made Itineraries</strong> after saving.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className={labelClass} style={labelStyle}>Select Existing Customer (Optional)</label>
                                    <select 
                                        className={inputClass} 
                                        style={selectStyle} 
                                        onChange={e => {
                                            const c = customers.find((x: any) => x.id === e.target.value)
                                            if (c) {
                                                setCustomerName(c.name || "")
                                                setCustomerPhone(c.phone || "")
                                                setCustomerEmail(c.email || "")
                                            }
                                        }}
                                    >
                                        <option value="">-- Choose from existing customers or type below --</option>
                                        {customers.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div><label className={labelClass} style={labelStyle}>{mode === "package" ? "Package Name / Customer Name" : "Customer Name"} <span className="text-red-500">*</span></label><input className={inputClass} style={inputStyle} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={mode === "package" ? "e.g. Mr. Wasim (or Package Name)" : "e.g. Mr. Wasim"} /></div>
                                <div><label className={labelClass} style={labelStyle}>Phone</label><input className={inputClass} style={inputStyle} value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="9840341529" /></div>
                                <div className="sm:col-span-2"><label className={labelClass} style={labelStyle}>Email</label><input className={inputClass} style={inputStyle} value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="customer@email.com" /></div>
                            </div>
                        </div>

                        <div className="h-px" style={{ background: '#f3f4f6' }} />

                        {/* Trip Details Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#ecfdf5' }}><MapPin className="w-3.5 h-3.5" style={{ color: '#059669' }} /></div>
                                <h2 className="font-serif text-lg sm:text-xl tracking-wide" style={{ color: '#052210' }}>Trip Details</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass} style={labelStyle}>Destination <span className="text-red-500">*</span></label>
                                    <select className={inputClass} style={selectStyle} value={destinationId} onChange={e => {
                                        setDestinationId(e.target.value)
                                        const d = destinations.find((d: any) => d.id === e.target.value)
                                        setDestinationName(d?.name || "")
                                    }}>
                                        <option style={{ color: '#000000', backgroundColor: '#FFFFFF' }} value="">Select destination</option>
                                        {destinations.map((d: any) => <option style={{ color: '#000000', backgroundColor: '#FFFFFF' }} key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelClass} style={labelStyle}>Travel Dates <span className="text-red-500">*</span></label>
                                    <div className="rounded-xl p-4" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                                        {/* Month nav */}
                                        <div className="flex items-center justify-between mb-3">
                                            <button type="button" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                                                <ChevronLeft className="w-4 h-4" style={{ color: '#6b7280' }} />
                                            </button>
                                            <span className="font-sans text-sm font-semibold" style={{ color: '#052210' }}>{calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                                            <button type="button" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                                                <ChevronRight className="w-4 h-4" style={{ color: '#6b7280' }} />
                                            </button>
                                        </div>
                                        {/* Day headers */}
                                        <div className="grid grid-cols-7 gap-0 mb-1">
                                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                                <div key={d} className="text-center font-sans text-[10px] font-semibold py-1" style={{ color: '#9ca3af' }}>{d}</div>
                                            ))}
                                        </div>
                                        {/* Day grid */}
                                        {(() => {
                                            const cy = calMonth.getFullYear(), cm = calMonth.getMonth()
                                            const firstDay = new Date(cy, cm, 1).getDay()
                                            const dim = new Date(cy, cm + 1, 0).getDate()
                                            const toStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                                            const todayStr = toStr(new Date())
                                            return (
                                                <div className="grid grid-cols-7 gap-0">
                                                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                                                    {Array.from({ length: dim }).map((_, i) => {
                                                        const day = i + 1
                                                        const ds = toStr(new Date(cy, cm, day))
                                                        const s = startDate === ds
                                                        const e = endDate === ds
                                                        const inR = !!startDate && !!endDate && ds > startDate && ds < endDate
                                                        const isPast = ds < todayStr
                                                        return (
                                                            <button type="button" key={day} disabled={isPast} onClick={() => {
                                                                if (!pickingEnd || !startDate) { setStartDate(ds); setEndDate(''); setPickingEnd(true) }
                                                                else if (ds < startDate) { setStartDate(ds); setEndDate(''); }
                                                                else { setEndDate(ds); setPickingEnd(false) }
                                                            }} className="relative h-9 flex items-center justify-center font-sans text-xs transition-all" style={{
                                                                background: s || e ? '#059669' : inR ? '#ecfdf5' : 'transparent',
                                                                color: s || e ? '#fff' : isPast ? '#d1d5db' : inR ? '#059669' : '#374151',
                                                                borderRadius: s ? '9999px 0 0 9999px' : e ? '0 9999px 9999px 0' : inR ? '0' : '9999px',
                                                                fontWeight: s || e ? 700 : 400, cursor: isPast ? 'default' : 'pointer',
                                                            }}>{day}</button>
                                                        )
                                                    })}
                                                </div>
                                            )
                                        })()}
                                        {/* Selection display */}
                                        <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid #e5e7eb' }}>
                                            <div className="flex-1 text-center">
                                                <p className="font-sans text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9ca3af' }}>Start</p>
                                                <p className="font-sans text-sm font-bold mt-0.5" style={{ color: startDate ? '#052210' : '#d1d5db' }}>
                                                    {startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                                                </p>
                                            </div>
                                            <div className="w-6 h-px" style={{ background: '#d1d5db' }} />
                                            <div className="flex-1 text-center">
                                                <p className="font-sans text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9ca3af' }}>End</p>
                                                <p className="font-sans text-sm font-bold mt-0.5" style={{ color: endDate ? '#052210' : '#d1d5db' }}>
                                                    {endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : pickingEnd ? 'Select...' : '—'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div><label className={labelClass} style={labelStyle}>Adults <span className="text-red-500">*</span></label><input type="number" className={inputClass} style={inputStyle} value={adults} onChange={e => setAdults(Number(e.target.value))} min={1} /></div>
                                <div><label className={labelClass} style={labelStyle}>Children</label><input type="number" className={inputClass} style={inputStyle} value={children} onChange={e => setChildren(Number(e.target.value))} min={0} /></div>
                                {children > 0 && Array.from({ length: children }).map((_, i) => (
                                    <div key={i}><label className={labelClass} style={labelStyle}>Child {i + 1} Age</label><input className={inputClass} style={inputStyle} value={childAges[i] || ""} onChange={e => { const newAges = [...childAges]; newAges[i] = e.target.value; setChildAges(newAges) }} placeholder="e.g. 6 Yrs" /></div>
                                ))}
                                <div><label className={labelClass} style={labelStyle}>Consultant Name</label><input className={inputClass} style={inputStyle} value={consultantName} onChange={e => setConsultantName(e.target.value)} /></div>
                                <div><label className={labelClass} style={labelStyle}>Consultant Phone</label><input className={inputClass} style={inputStyle} value={consultantPhone} onChange={e => setConsultantPhone(e.target.value)} /></div>
                            </div>
                        </div>

                        {nights > 0 && (
                            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                                <Calendar className="w-4 h-4" style={{ color: '#059669' }} />
                                <span className="font-sans text-sm font-semibold" style={{ color: '#059669' }}>{nights} Nights / {totalDays} Days</span>
                                {destinationName && <span className="font-sans text-sm" style={{ color: '#047857' }}>· {destinationName}</span>}
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 1: Flights (Optional) */}
                {step === 1 && (
                    <div className="space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#ecfdf5' }}><Plane className="w-3.5 h-3.5" style={{ color: '#059669' }} /></div>
                                <div>
                                    <h2 className="font-serif text-lg sm:text-xl tracking-wide" style={{ color: '#052210' }}>Flights</h2>
                                    <p className="font-sans text-[11px]" style={{ color: '#9ca3af' }}>Optional — won&apos;t show in PDF if skipped</p>
                                </div>
                            </div>
                            <label className="cursor-pointer relative overflow-hidden inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs font-semibold tracking-wider uppercase transition-all" style={{ background: '#052210', color: '#FFFFFF' }}>
                                {isExtractingFlight ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" style={{ color: "#D4AF37" }} />}
                                {isExtractingFlight ? "Running OCR..." : "Auto-Fill OCR"}
                                <input type="file" accept="image/*" onChange={handleFlightScreenshot} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isExtractingFlight} />
                            </label>
                        </div>
                        <p className="font-sans text-xs px-1" style={{ color: '#6b7280' }}>Upload a screenshot, <strong>Paste (Ctrl+V)</strong> an image, or add manually below.</p>

                        {flightSegments.map((seg, idx) => (
                            <div key={idx} className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                                <button onClick={() => setFlightSegments(flightSegments.filter((_, i) => i !== idx))} className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                                    <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
                                </button>

                                <select className={inputClass} style={selectStyle} value={seg.type} onChange={e => { const s = [...flightSegments]; s[idx].type = e.target.value; setFlightSegments(s) }}>
                                    <option style={{ color: '#000', backgroundColor: '#fff' }} value="Onward">Onward</option>
                                    <option style={{ color: '#000', backgroundColor: '#fff' }} value="Return">Return</option>
                                    <option style={{ color: '#000', backgroundColor: '#fff' }} value="Internal">Internal</option>
                                </select>
                                <input className={inputClass} style={inputStyle} placeholder="Airline" value={seg.airline} onChange={e => { const s = [...flightSegments]; s[idx].airline = e.target.value; setFlightSegments(s) }} />
                                <input className={inputClass} style={inputStyle} placeholder="Flight No" value={seg.flightNo} onChange={e => { const s = [...flightSegments]; s[idx].flightNo = e.target.value; setFlightSegments(s) }} />
                                <select className={inputClass} style={selectStyle} value={seg.flightType || "Direct"} onChange={e => { const s = [...flightSegments]; s[idx].flightType = e.target.value; setFlightSegments(s) }}>
                                    <option style={{ color: '#000', backgroundColor: '#fff' }} value="Direct">Direct</option>
                                    <option style={{ color: '#000', backgroundColor: '#fff' }} value="1 Stop">1 Stop</option>
                                    <option style={{ color: '#000', backgroundColor: '#fff' }} value="2+ Stops">2+ Stops</option>
                                </select>
                                <input className={inputClass} style={inputStyle} placeholder="From (TRV)" value={seg.fromCode} onChange={e => { const s = [...flightSegments]; s[idx].fromCode = e.target.value; setFlightSegments(s) }} />
                                <input className={inputClass} style={inputStyle} placeholder="Departure" value={seg.departure} onChange={e => { const s = [...flightSegments]; s[idx].departure = e.target.value; setFlightSegments(s) }} />
                                <input className={inputClass} style={inputStyle} placeholder="To (KUL)" value={seg.toCode} onChange={e => { const s = [...flightSegments]; s[idx].toCode = e.target.value; setFlightSegments(s) }} />
                                <input className={inputClass} style={inputStyle} placeholder="Arrival" value={seg.arrival} onChange={e => { const s = [...flightSegments]; s[idx].arrival = e.target.value; setFlightSegments(s) }} />
                                <input className={inputClass} style={inputStyle} placeholder="Duration" value={seg.duration} onChange={e => { const s = [...flightSegments]; s[idx].duration = e.target.value; setFlightSegments(s) }} />
                                <input type="number" className={inputClass} style={inputStyle} placeholder="Price ₹" value={seg.price || ""} onChange={e => { const s = [...flightSegments]; s[idx].price = Number(e.target.value); setFlightSegments(s) }} />
                                {seg.flightType === "Connecting" && (
                                    <div className="sm:col-span-2"><input className={inputClass} style={inputStyle} placeholder="Layover Details" value={seg.layoverDetails || ""} onChange={e => { const s = [...flightSegments]; s[idx].layoverDetails = e.target.value; setFlightSegments(s) }} /></div>
                                )}
                            </div>
                        ))}

                        {flightSegments.length === 0 && (
                            <div className="text-center py-10 rounded-xl" style={{ background: '#f9fafb', border: '2px dashed #d1d5db' }}>
                                <Plane className="w-10 h-10 mx-auto mb-3" style={{ color: '#d1d5db' }} />
                                <p className="font-sans text-sm" style={{ color: '#9ca3af' }}>No flights added yet</p>
                            </div>
                        )}

                        <button onClick={() => setFlightSegments([...flightSegments, { type: "Onward", airline: "", flightNo: "", fromCode: "", departure: "", toCode: "", arrival: "", duration: "", flightType: "Direct", layoverDetails: "", price: 0 }])} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs font-semibold tracking-wider uppercase transition-all hover:bg-emerald-50" style={{ color: '#059669', border: '1px solid #a7f3d0' }}>
                            <Plus className="w-3.5 h-3.5" /> Add Flight
                        </button>
                    </div>
                )}

                {/* STEP 2: Hotels & Tiers Builder */}
                {step === 2 && (
                    <div className="space-y-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                                    <Hotel className="w-5 h-5" style={{ color: '#059669' }} />
                                </div>
                                <div>
                                    <h2 className="font-serif text-xl sm:text-2xl tracking-wide" style={{ color: '#052210' }}>Select Hotels & Tiers</h2>
                                    <p className="font-sans text-xs sm:text-sm" style={{ color: '#6b7280' }}>Build up to 3 pricing plans to offer your clients different budget options.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (tierPlans.length >= 3) {
                                        alert("Maximum 3 pricing plans allowed.");
                                        return;
                                    }
                                    setTierPlans([...tierPlans, { 
                                        name: TIER_NAMES[tierPlans.length] || "CUSTOM", 
                                        stops: [{ location: "", hotelId: "", hotelName: "", nights: 1, mealPlan: "CP (Breakfast)", roomType: "", ratePerNight: 0 }] 
                                    }]);
                                }}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl font-sans text-xs font-bold tracking-wider uppercase transition-all shadow-sm hover:translate-y-[-1px] active:translate-y-[0px]"
                                style={{ background: '#052210', color: '#FFFFFF' }}
                            >
                                <Plus className="w-4 h-4" /> Add Pricing Plan
                            </button>
                        </div>

                        <div className="space-y-6">
                            {tierPlans.map((plan, planIdx) => (
                                <div key={planIdx} className="rounded-2xl border-2 border-emerald-50 bg-white overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] group transition-all hover:shadow-[0_8px_30px_rgba(5,150,105,0.08)]">
                                    {/* Plan Header */}
                                    <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ background: 'linear-gradient(90deg, #ecfdf5 0%, #ffffff 100%)' }}>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-sans text-[10px] font-bold tracking-widest uppercase py-1 px-2 rounded-md bg-emerald-600 text-white shadow-sm">Plan {planIdx + 1}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="relative">
                                                    <select
                                                        className="pl-4 pr-10 py-2.5 rounded-xl font-serif text-lg font-bold bg-white border border-emerald-100 shadow-sm appearance-none cursor-pointer focus:border-emerald-500 outline-none transition-all"
                                                        value={plan.name}
                                                        onChange={(e) => {
                                                            const newPlans = [...tierPlans];
                                                            newPlans[planIdx].name = e.target.value;
                                                            setTierPlans(newPlans);
                                                        }}
                                                    >
                                                        {TIER_NAMES.map(t => <option key={t} value={t}>{t}</option>)}
                                                        {!TIER_NAMES.includes(plan.name) && <option value={plan.name}>{plan.name}</option>}
                                                        <option value="CUSTOM">CUSTOM</option>
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>
                                        {tierPlans.length > 1 && (
                                            <button 
                                                onClick={() => setTierPlans(tierPlans.filter((_, i) => i !== planIdx))}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors uppercase tracking-wider"
                                            >
                                                <Trash2 className="w-3 h-3" /> Remove Plan
                                            </button>
                                        )}
                                    </div>

                                    {/* Stops Builder */}
                                    <div className="p-6 space-y-6">
                                        {plan.stops.map((stop, stopIdx) => (
                                            <div key={stopIdx} className="relative group/stop animate-in fade-in slide-in-from-left-4 duration-300">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                                                        {stopIdx + 1}
                                                    </div>
                                                    <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#059669]">Stop {stopIdx + 1}</span>
                                                    {plan.stops.length > 1 && (
                                                        <button 
                                                            onClick={() => {
                                                                const newPlans = [...tierPlans];
                                                                newPlans[planIdx].stops = newPlans[planIdx].stops.filter((_, i) => i !== stopIdx);
                                                                setTierPlans(newPlans);
                                                            }}
                                                            className="ml-auto p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-5 rounded-2xl bg-gray-50/50 border border-gray-100 shadow-inner">
                                                    {/* Location */}
                                                    <div className="sm:col-span-3 space-y-1.5 relative">
                                                        <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" /> Location
                                                        </label>
                                                        <div className="relative group/dropdown">
                                                            <div 
                                                                className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm font-sans cursor-pointer hover:border-emerald-300 transition-all shadow-sm"
                                                                onClick={() => setOpenTierLocDropdown(openTierLocDropdown?.planIdx === planIdx && openTierLocDropdown?.stopIdx === stopIdx ? null : { planIdx, stopIdx })}
                                                            >
                                                                <span className={stop.location ? "text-gray-900 font-medium" : "text-gray-400"}>
                                                                    {stop.location || "Select Location"}
                                                                </span>
                                                                <ChevronDown className={`w-4 h-4 text-emerald-600 transition-transform ${openTierLocDropdown?.planIdx === planIdx && openTierLocDropdown?.stopIdx === stopIdx ? 'rotate-180' : ''}`} />
                                                            </div>
                                                            {openTierLocDropdown?.planIdx === planIdx && openTierLocDropdown?.stopIdx === stopIdx && (
                                                                <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-48 overflow-auto py-2 animate-in fade-in slide-in-from-top-2">
                                                                    {(destinations?.find((d: any) => d.id === destinationId)?.subDestinations || []).map((loc: string) => (
                                                                        <div 
                                                                            key={loc} 
                                                                            className="px-4 py-3 hover:bg-emerald-50 text-sm font-sans font-medium cursor-pointer transition-colors"
                                                                            onClick={() => {
                                                                                const newPlans = [...tierPlans];
                                                                                newPlans[planIdx].stops[stopIdx].location = loc;
                                                                                
                                                                                // Aggressive match: Try to find any hotel matching this location field
                                                                                let firstMatch = destHotels.find((h: any) => {
                                                                                    const hLoc = (h.destination || h.subDestination || h.location || "").toLowerCase().trim();
                                                                                    const sLoc = loc.toLowerCase().trim();
                                                                                    const hCat = (h.category || "").toLowerCase().trim();
                                                                                    const pCat = plan.name.toLowerCase().trim();
                                                                                    return hLoc === sLoc && hCat === pCat;
                                                                                });

                                                                                // Fallback: Match by location name only
                                                                                if (!firstMatch) {
                                                                                    firstMatch = destHotels.find((h: any) => {
                                                                                        const hLoc = (h.destination || h.subDestination || h.location || "").toLowerCase().trim();
                                                                                        const sLoc = loc.toLowerCase().trim();
                                                                                        return hLoc === sLoc;
                                                                                    });
                                                                                }

                                                                                if (firstMatch) {
                                                                                    newPlans[planIdx].stops[stopIdx].hotelId = firstMatch.id;
                                                                                    newPlans[planIdx].stops[stopIdx].hotelName = firstMatch.hotelName || firstMatch.name;
                                                                                    
                                                                                    // Get first room category or default
                                                                                    const room = firstMatch.roomCategories?.[0];
                                                                                    newPlans[planIdx].stops[stopIdx].roomType = room?.roomType || "Standard";
                                                                                    
                                                                                    const mp = newPlans[planIdx].stops[stopIdx].mealPlan || "CP (Breakfast)";
                                                                                    const source = room || firstMatch;
                                                                                    
                                                                                    if (mp.startsWith("EP")) newPlans[planIdx].stops[stopIdx].ratePerNight = source.epPrice || 0;
                                                                                    else if (mp.startsWith("CP")) newPlans[planIdx].stops[stopIdx].ratePerNight = source.cpPrice || 0;
                                                                                    else if (mp.startsWith("MAP")) newPlans[planIdx].stops[stopIdx].ratePerNight = source.mapPrice || 0;
                                                                                    else if (mp.startsWith("AP")) newPlans[planIdx].stops[stopIdx].ratePerNight = source.apPrice || 0;
                                                                                } else {
                                                                                    newPlans[planIdx].stops[stopIdx].hotelId = "";
                                                                                    newPlans[planIdx].stops[stopIdx].hotelName = "";
                                                                                    newPlans[planIdx].stops[stopIdx].ratePerNight = 0;
                                                                                }

                                                                                setTierPlans(newPlans);
                                                                                setOpenTierLocDropdown(null);
                                                                            }}
                                                                        >
                                                                            {loc}
                                                                        </div>
                                                                    ))}
                                                                    {(!(destinations?.find((d: any) => d.id === destinationId)?.subDestinations || []).length) && (
                                                                        <div className="px-4 py-3 text-xs text-gray-400 italic">No locations found. Add them in Destinations.</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Hotel */}
                                                    <div className="sm:col-span-4 space-y-1.5 relative">
                                                        <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                                                            <Hotel className="w-3 h-3" /> Hotel
                                                        </label>
                                                        <div className="relative">
                                                            <div 
                                                                className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm font-sans cursor-pointer hover:border-emerald-300 transition-all shadow-sm"
                                                                onClick={() => {
                                                                    setOpenTierHotelDropdown(openTierHotelDropdown?.planIdx === planIdx && openTierHotelDropdown?.stopIdx === stopIdx ? null : { planIdx, stopIdx });
                                                                    setLocalHotelSearch("");
                                                                }}
                                                            >
                                                                <span className={stop.hotelName ? "text-gray-900 font-medium truncate pr-4" : "text-gray-400"}>
                                                                    {stop.hotelName || "Select Hotel"}
                                                                </span>
                                                                <ChevronDown className={`w-4 h-4 text-emerald-600 transition-transform ${openTierHotelDropdown?.planIdx === planIdx && openTierHotelDropdown?.stopIdx === stopIdx ? 'rotate-180' : ''}`} />
                                                            </div>
                                                            {openTierHotelDropdown?.planIdx === planIdx && openTierHotelDropdown?.stopIdx === stopIdx && (
                                                                <div className="absolute z-[100] w-[200%] sm:w-[150%] right-0 sm:left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                                    <div className="p-2 border-b">
                                                                        <div className="relative">
                                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                                            <input 
                                                                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500" 
                                                                                placeholder="Search hotel name..."
                                                                                value={localHotelSearch}
                                                                                onChange={(e) => setLocalHotelSearch(e.target.value)}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="max-h-60 overflow-auto py-2">
                                                                        {destHotels
                                                                            .filter((h: any) => {
                                                                                const hLoc = (h.destination || h.subDestination || h.address || h.location || "").toLowerCase().trim();
                                                                                const sLoc = (stop.location || "").toLowerCase().trim();
                                                                                const locMatch = !stop.location || hLoc.includes(sLoc);
                                                                                const searchMatch = !localHotelSearch || (h.hotelName || h.name || "").toLowerCase().includes(localHotelSearch.toLowerCase());
                                                                                return locMatch && searchMatch;
                                                                            })
                                                                            .map((hotel: any) => {
                                                                                const basePrice = hotel.cpPrice || hotel.epPrice || hotel.mapPrice || hotel.apPrice || hotel.ratePerNight || 0;
                                                                                return (
                                                                                    <div 
                                                                                        key={hotel.id} 
                                                                                        className="px-4 py-3 hover:bg-emerald-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                                                                                        onClick={() => {
                                                                                            const newPlans = [...tierPlans];
                                                                                            newPlans[planIdx].stops[stopIdx].hotelId = hotel.id;
                                                                                            newPlans[planIdx].stops[stopIdx].hotelName = hotel.hotelName || hotel.name;
                                                                                            // Auto-set initial rate based on default CP meal plan if available
                                                                                            newPlans[planIdx].stops[stopIdx].ratePerNight = hotel.cpPrice || basePrice;
                                                                                            newPlans[planIdx].stops[stopIdx].location = hotel.address || hotel.location || newPlans[planIdx].stops[stopIdx].location;
                                                                                            setTierPlans(newPlans);
                                                                                            setOpenTierHotelDropdown(null);
                                                                                        }}
                                                                                    >
                                                                                        <div className="font-bold text-gray-900 text-xs">{hotel.hotelName || hotel.name}</div>
                                                                                        <div className="flex items-center gap-2 mt-1">
                                                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-bold uppercase">{hotel.category || "Standard"}</span>
                                                                                            <span className="text-[9px] text-emerald-600 font-bold">CP: ₹{hotel.cpPrice || 0}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                )
                                                                            })}
                                                                        {localHotelSearch && (
                                                                            <div 
                                                                                className="px-4 py-3 hover:bg-emerald-50 text-xs font-bold text-emerald-600 italic cursor-pointer flex items-center justify-between"
                                                                                onClick={() => {
                                                                                    const newPlans = [...tierPlans];
                                                                                    newPlans[planIdx].stops[stopIdx].hotelId = `custom-${Date.now()}`;
                                                                                    newPlans[planIdx].stops[stopIdx].hotelName = localHotelSearch;
                                                                                    newPlans[planIdx].stops[stopIdx].ratePerNight = 0;
                                                                                    setTierPlans(newPlans);
                                                                                    setOpenTierHotelDropdown(null);
                                                                                }}
                                                                            >
                                                                                Add Custom: "{localHotelSearch}"
                                                                                <Plus className="w-3 h-3" />
                                                                            </div>
                                                                        )}
                                                                        {(!destHotels.length) && <div className="px-4 py-3 text-xs text-gray-400 italic">No hotels found.</div>}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Nights */}
                                                    <div className="sm:col-span-2 space-y-1.5">
                                                        <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" /> Nights
                                                        </label>
                                                        <div className="relative">
                                                            <input 
                                                                type="number" 
                                                                className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm font-sans font-bold text-gray-900 outline-none focus:border-emerald-500 shadow-sm transition-all"
                                                                min={1}
                                                                value={stop.nights}
                                                                onChange={(e) => {
                                                                    const newPlans = [...tierPlans];
                                                                    newPlans[planIdx].stops[stopIdx].nights = Number(e.target.value);
                                                                    setTierPlans(newPlans);
                                                                }}
                                                            />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-300 uppercase">NTS</span>
                                                        </div>
                                                    </div>

                                                    {/* Meal Plan */}
                                                    <div className="sm:col-span-3 space-y-1.5">
                                                        <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                                                            <Users className="w-3 h-3" /> Meal Plan
                                                        </label>
                                                        <div className="relative">
                                                            <select
                                                                className="w-full pl-4 pr-10 py-3 bg-white rounded-xl border border-gray-200 text-sm font-sans font-medium text-gray-900 appearance-none cursor-pointer focus:border-emerald-500 outline-none shadow-sm transition-all"
                                                                value={stop.mealPlan}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const newPlans = [...tierPlans];
                                                                    newPlans[planIdx].stops[stopIdx].mealPlan = val;
                                                                    
                                                                    // Update price based on selected meal plan if hotel exists
                                                                    const hotel = destHotels.find(h => h.id === stop.hotelId);
                                                                    if (hotel) {
                                                                        const selectedRoom = hotel.roomCategories?.find((r: any) => r.roomType === stop.roomType);
                                                                        const priceSource = selectedRoom || hotel;
                                                                        
                                                                        if (val.startsWith("EP")) newPlans[planIdx].stops[stopIdx].ratePerNight = priceSource.epPrice || 0;
                                                                        else if (val.startsWith("CP")) newPlans[planIdx].stops[stopIdx].ratePerNight = priceSource.cpPrice || 0;
                                                                        else if (val.startsWith("MAP")) newPlans[planIdx].stops[stopIdx].ratePerNight = priceSource.mapPrice || 0;
                                                                        else if (val.startsWith("AP")) newPlans[planIdx].stops[stopIdx].ratePerNight = priceSource.apPrice || 0;
                                                                    }
                                                                    
                                                                    setTierPlans(newPlans);
                                                                }}
                                                            >
                                                                <option value="EP (No Meals)">EP (Room Only)</option>
                                                                <option value="CP (Breakfast)">CP (Breakfast)</option>
                                                                <option value="MAP (Breakfast + Dinner)">MAP (Half Board)</option>
                                                                <option value="AP (All Meals)">AP (Full Board)</option>
                                                            </select>
                                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 pointer-events-none" />
                                                        </div>
                                                    </div>

                                                    {/* Room Type & Rate - New Row or flexible grid */}
                                                    <div className="sm:col-span-12 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100/50 mt-1">
                                                        <div className="space-y-1.5 px-1">
                                                            <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-gray-400">Room Category</label>
                                                            <div className="relative">
                                                                <select
                                                                    className="w-full pl-4 pr-10 py-2.5 bg-white/50 rounded-lg border border-gray-200 text-xs font-sans font-medium outline-none focus:border-emerald-400 transition-all appearance-none"
                                                                    value={stop.roomType}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        const newPlans = [...tierPlans];
                                                                        newPlans[planIdx].stops[stopIdx].roomType = val;
                                                                        
                                                                        const hotel = destHotels.find(h => h.id === stop.hotelId);
                                                                        const room = hotel?.roomCategories?.find((r: any) => r.roomType === val);
                                                                        if (room) {
                                                                            const mp = stop.mealPlan;
                                                                            if (mp.startsWith("EP")) newPlans[planIdx].stops[stopIdx].ratePerNight = room.epPrice || 0;
                                                                            else if (mp.startsWith("CP")) newPlans[planIdx].stops[stopIdx].ratePerNight = room.cpPrice || 0;
                                                                            else if (mp.startsWith("MAP")) newPlans[planIdx].stops[stopIdx].ratePerNight = room.mapPrice || 0;
                                                                            else if (mp.startsWith("AP")) newPlans[planIdx].stops[stopIdx].ratePerNight = room.apPrice || 0;
                                                                        }
                                                                        setTierPlans(newPlans);
                                                                    }}
                                                                >
                                                                    <option value="">Standard / Default</option>
                                                                    {destHotels.find(h => h.id === stop.hotelId)?.roomCategories?.map((r: any) => (
                                                                        <option key={r.roomType} value={r.roomType}>{r.roomType}</option>
                                                                    ))}
                                                                    {stop.hotelId.startsWith("custom-") && <option value={stop.roomType}>{stop.roomType || "Standard"}</option>}
                                                                </select>
                                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5 px-1">
                                                            <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-gray-400">Rate per Night (₹)</label>
                                                            <div className="relative">
                                                                <input 
                                                                    type="number"
                                                                    className="w-full px-4 py-2.5 bg-white/50 rounded-lg border border-gray-200 text-xs font-sans font-bold text-emerald-700 outline-none focus:border-emerald-400 transition-all"
                                                                    value={stop.ratePerNight}
                                                                    onChange={(e) => {
                                                                        const newPlans = [...tierPlans];
                                                                        newPlans[planIdx].stops[stopIdx].ratePerNight = Number(e.target.value);
                                                                        setTierPlans(newPlans);
                                                                    }}
                                                                />
                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-emerald-100/50 px-2 py-1 rounded text-[9px] font-bold text-emerald-700">
                                                                    TOTAL: ₹{(stop.ratePerNight * stop.nights).toLocaleString()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {stopIdx < plan.stops.length - 1 && (
                                                    <div className="flex justify-center my-4">
                                                        <div className="w-px h-8 bg-dashed bg-emerald-100" style={{ backgroundImage: 'linear-gradient(to bottom, #d1fae5 50%, rgba(255,255,255,0) 0%)', backgroundPosition: 'right', backgroundSize: '1px 8px', backgroundRepeat: 'repeat-y' }}></div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        <button 
                                            onClick={() => {
                                                const newPlans = [...tierPlans];
                                                newPlans[planIdx].stops.push({ location: "", hotelId: "", hotelName: "", nights: 1, mealPlan: "CP (Breakfast)", roomType: "", ratePerNight: 0 });
                                                setTierPlans(newPlans);
                                            }}
                                            className="w-full py-4 rounded-xl border-2 border-dashed border-emerald-100 bg-emerald-50/20 text-[#059669] font-sans text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all group"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-emerald-200/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Plus className="w-3.5 h-3.5" />
                                            </div>
                                            Add Another Hotel to this Plan
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 3: Transfers */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#ecfdf5' }}><Car className="w-3.5 h-3.5" style={{ color: '#059669' }} /></div>
                            <div>
                                <h2 className="font-serif text-lg sm:text-xl tracking-wide" style={{ color: '#052210' }}>Transfers</h2>
                                <p className="font-sans text-[11px]" style={{ color: '#9ca3af' }}>{destVehicles.length > 0 ? `Suggested vehicles for ${adults + children} pax` : "Configure vehicle transfers"}</p>
                            </div>
                        </div>
                        {transfers.map((t, idx) => (
                            <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-xl relative" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                                <select className={inputClass} style={selectStyle} value={t.type} onChange={e => { const tr = [...transfers]; tr[idx].type = e.target.value; setTransfers(tr) }}>
                                    <option style={{ color: '#000', backgroundColor: '#fff' }} value="Arrival">Arrival Transfer</option>
                                    <option style={{ color: '#000', backgroundColor: '#fff' }} value="Departure">Departure Transfer</option>
                                    <option style={{ color: '#000', backgroundColor: '#fff' }} value="Sightseeing">Sightseeing</option>
                                    <option style={{ color: '#000', backgroundColor: '#fff' }} value="InterCity">Inter-City</option>
                                </select>

                                {destTransfers.length > 0 ? (
                                    <select className={inputClass} style={selectStyle} value={t.pickup} onChange={e => { const tr = [...transfers]; tr[idx].pickup = e.target.value; setTransfers(tr) }}>
                                        <option style={{ color: '#000', backgroundColor: '#fff' }} value="">Select Pickup Location</option>
                                        {destTransfers.filter(dt => dt.type === "Pickup" || dt.type === "Both").map(dt => (
                                            <option key={`pickup-${dt.id}`} style={{ color: '#000', backgroundColor: '#fff' }} value={dt.pointName}>{dt.pointName}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input className={inputClass} style={inputStyle} placeholder="Pickup Location (e.g. Airport)" value={t.pickup || ""} onChange={e => { const tr = [...transfers]; tr[idx].pickup = e.target.value; setTransfers(tr) }} />
                                )}

                                {destTransfers.length > 0 ? (
                                    <select className={inputClass} style={selectStyle} value={t.drop} onChange={e => { const tr = [...transfers]; tr[idx].drop = e.target.value; setTransfers(tr) }}>
                                        <option style={{ color: '#000', backgroundColor: '#fff' }} value="">Select Drop Location</option>
                                        {destTransfers.filter(dt => dt.type === "Drop" || dt.type === "Both").map(dt => (
                                            <option key={`drop-${dt.id}`} style={{ color: '#000', backgroundColor: '#fff' }} value={dt.pointName}>{dt.pointName}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input className={inputClass} style={inputStyle} placeholder="Drop Location (e.g. Hotel)" value={t.drop || ""} onChange={e => { const tr = [...transfers]; tr[idx].drop = e.target.value; setTransfers(tr) }} />
                                )}

                                {destVehicles.length > 0 ? (
                                    <select className={inputClass} style={selectStyle} value={t.vehicleType} onChange={e => {
                                        const tr = [...transfers]
                                        const v = destVehicles.find((v: any) => v.vehicleType === e.target.value)
                                        tr[idx].vehicleType = e.target.value
                                        tr[idx].price = v?.pricePerDay || 0
                                        setTransfers(tr)
                                    }}>
                                        <option style={{ color: '#000', backgroundColor: '#fff' }} value="">Select vehicle</option>
                                        {destVehicles.map((v: any) => <option style={{ color: '#000', backgroundColor: '#fff' }} key={v.id} value={v.vehicleType}>{v.vehicleType} (max {v.maxPax}) — ₹{v.pricePerDay}/day</option>)}
                                    </select>
                                ) : (
                                    <input className={inputClass} style={inputStyle} placeholder="Vehicle Type" value={t.vehicleType} onChange={e => { const tr = [...transfers]; tr[idx].vehicleType = e.target.value; setTransfers(tr) }} />
                                )}
                                <input type="number" className={inputClass} style={inputStyle} placeholder="Price (₹)" value={t.price} onChange={e => { const tr = [...transfers]; tr[idx].price = Number(e.target.value); setTransfers(tr) }} />
                                <button onClick={() => setTransfers(transfers.filter((_, i) => i !== idx))} className="absolute top-2 right-2 p-1.5 rounded-xl hover:bg-red-50 transition-colors" title="Remove">
                                    <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
                                </button>
                            </div>
                        ))}
                        <button onClick={() => setTransfers([...transfers, { type: "Sightseeing", pickup: "", drop: "", vehicleType: "", price: 0 }])} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs font-semibold tracking-wider uppercase transition-all hover:bg-emerald-50" style={{ color: '#059669', border: '1px solid #a7f3d0' }}>
                            <Plus className="w-3.5 h-3.5" /> Add Transfer
                        </button>
                    </div>
                )}

                {/* STEP 4: Activities */}
                {step === 4 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#ecfdf5' }}><Map className="w-3.5 h-3.5" style={{ color: '#059669' }} /></div>
                            <div>
                                <h2 className="font-serif text-lg sm:text-xl tracking-wide" style={{ color: '#052210' }}>Attractions & Activities</h2>
                                <p className="font-sans text-[11px]" style={{ color: '#9ca3af' }}>Select experiences to include</p>
                            </div>
                        </div>
                        {destAttractions.length === 0 ? (
                            <div className="text-center py-10 rounded-xl" style={{ background: '#f9fafb', border: '2px dashed #d1d5db' }}>
                                <Map className="w-10 h-10 mx-auto mb-3" style={{ color: '#d1d5db' }} />
                                <p className="font-sans text-sm" style={{ color: '#9ca3af' }}>No attractions found for this destination</p>
                            </div>
                        ) : destAttractions.map((attr: any) => {
                            const isAttrSelected = selectedActivities.some((a: any) => a.id === attr.id && !a.isActivity)

                            return (
                                <div key={attr.id} className="p-4 rounded-xl transition-all duration-200" style={{ background: isAttrSelected ? '#ecfdf5' : '#f9fafb', border: isAttrSelected ? '1px solid #059669' : '1px solid #e5e7eb', borderLeft: isAttrSelected ? '4px solid #059669' : '4px solid transparent' }}>
                                    <div
                                        onClick={() => {
                                            if (isAttrSelected) setSelectedActivities(selectedActivities.filter((a: any) => !(a.id === attr.id && !a.isActivity)))
                                            else setSelectedActivities([...selectedActivities, { ...attr, isActivity: false }])
                                        }}
                                        className="flex items-center gap-3 sm:gap-4 cursor-pointer"
                                    >
                                        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: isAttrSelected ? '#059669' : '#e5e7eb', transition: 'all 0.2s' }}>
                                            {isAttrSelected && <Check className="w-4 h-4" style={{ color: '#FFFFFF' }} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-sans text-sm font-semibold truncate" style={{ color: '#052210' }}>{attr.name} <span className="text-[10px] text-gray-500 font-normal ml-2 uppercase tracking-wider">Entry Ticket</span></p>
                                            <p className="font-sans text-xs truncate" style={{ color: '#6b7280' }}>
                                                {attr.category || "—"} · ₹{attr.entryFee || 0}
                                            </p>
                                        </div>
                                        <span className="font-sans text-sm font-bold flex-shrink-0" style={{ color: '#059669' }}>₹{((attr.entryFee || 0) * (adults + children)).toLocaleString()}</span>
                                    </div>

                                    {/* Nested Activities */}
                                    {attr.activities && attr.activities.length > 0 && (
                                        <div className="mt-4 pl-10 space-y-3 border-t pt-3" style={{ borderColor: 'rgba(5,34,16,0.05)' }}>
                                            {attr.activities.map((act: any, idx: number) => {
                                                const uniqueId = `${attr.id}_act_${idx}`
                                                const isActSelected = selectedActivities.some((a: any) => a.id === uniqueId && a.isActivity)
                                                // Activity pricing includes price + vehiclePrice if any
                                                const basePrice = (act.price || 0) + (act.vehiclePrice || 0)
                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={() => {
                                                            if (isActSelected) setSelectedActivities(selectedActivities.filter((a: any) => !(a.id === uniqueId && a.isActivity)))
                                                            else setSelectedActivities([...selectedActivities, { ...act, id: uniqueId, isActivity: true, parentAttraction: attr.name }])
                                                        }}
                                                        className="flex items-center gap-3 cursor-pointer"
                                                    >
                                                        <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: isActSelected ? '#059669' : '#e5e7eb', transition: 'all 0.2s' }}>
                                                            {isActSelected && <Check className="w-3 h-3" style={{ color: '#FFFFFF' }} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-sans text-xs font-semibold truncate" style={{ color: '#052210' }}>{act.name} <span className="text-[10px] text-gray-400 font-normal ml-1 tracking-wider uppercase">Activity</span></p>
                                                            <p className="font-sans text-[10px] truncate" style={{ color: '#6b7280' }}>
                                                                ₹{act.price || 0} {act.vehiclePrice ? `+ ₹${act.vehiclePrice} Vehicle` : ''}
                                                            </p>
                                                        </div>
                                                        <span className="font-sans text-xs font-bold flex-shrink-0" style={{ color: '#059669' }}>₹{(basePrice * (adults + children)).toLocaleString()}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* STEP 5: Day Plan */}
                {step === 5 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#ecfdf5' }}><Sun className="w-3.5 h-3.5" style={{ color: '#059669' }} /></div>
                            <div>
                                <h2 className="font-serif text-lg sm:text-xl tracking-wide" style={{ color: '#052210' }}>Day Plan</h2>
                                <p className="font-sans text-[11px]" style={{ color: '#9ca3af' }}>Plan each day of the trip</p>
                            </div>
                        </div>
                        {dayPlans.length === 0 ? (
                            <div className="text-center py-10 rounded-xl" style={{ background: '#f9fafb', border: '2px dashed #d1d5db' }}>
                                <Sun className="w-10 h-10 mx-auto mb-3" style={{ color: '#d1d5db' }} />
                                <p className="font-sans text-sm" style={{ color: '#9ca3af' }}>Set start and end dates in Step 1 first</p>
                            </div>
                        ) : dayPlans.map((day, idx) => (
                            <div key={idx} className="flex gap-3 sm:gap-5">
                                {/* Timeline */}
                                <div className="flex flex-col items-center flex-shrink-0">
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold shadow-sm" style={{ background: 'linear-gradient(135deg, #059669, #06a15c)', color: '#FFFFFF', fontSize: '11px', boxShadow: '0 2px 8px rgba(5,150,105,0.25)' }}>
                                        {idx + 1}
                                    </div>
                                    {idx < dayPlans.length - 1 && <div className="w-0.5 flex-1 mt-1 rounded-full" style={{ background: 'linear-gradient(180deg, #a7f3d0, #d1fae5)' }} />}
                                </div>
                                {/* Content Card */}
                                <div className="flex-1 min-w-0 mb-2">
                                    <div className="rounded-xl p-4 sm:p-5 space-y-4" style={{ background: '#FFFFFF', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                        {/* Day Header */}
                                        <div className="space-y-3 w-full border-b pb-4 mb-2" style={{ borderColor: 'rgba(5,34,16,0.05)' }}>
                                            <div className="flex items-center gap-3">
                                                <span className="font-sans text-sm font-bold tracking-tight whitespace-nowrap" style={{ color: '#052210' }}>{day.day}</span>
                                                <span className="font-sans text-[10px] px-2.5 py-1 rounded-md font-medium" style={{ background: '#f3f4f6', color: '#6b7280' }}>{day.date}</span>
                                            </div>
                                            <div className="w-full relative">
                                                <div className="relative group">
                                                    <div 
                                                        className="w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-lg font-sans font-semibold tracking-wide cursor-pointer transition-all border"
                                                        style={{ 
                                                            background: destPresetDays.length > 0 ? '#ecfdf5' : '#f9fafb', 
                                                            color: destPresetDays.length > 0 ? '#059669' : '#9ca3af', 
                                                            borderColor: destPresetDays.length > 0 ? '#a7f3d0' : '#e5e7eb', 
                                                        }}
                                                        onClick={() => {
                                                            if (destPresetDays.length > 0) {
                                                                setOpenPresetDropdown(openPresetDropdown === idx ? null : idx);
                                                                setLocalPresetSearch("");
                                                            }
                                                        }}
                                                    >
                                                        <span className="truncate pr-4">{destPresetDays.length > 0 ? "Load Preset Day..." : "No preset days found"}</span>
                                                        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${openPresetDropdown === idx ? 'rotate-180' : ''}`} />
                                                    </div>

                                                    {openPresetDropdown === idx && (
                                                        <div className="absolute z-[110] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] max-h-80 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <div className="overflow-y-auto py-1 custom-scrollbar max-h-80">
                                                                {destPresetDays.map((p) => (
                                                                        <div 
                                                                            key={p.id} 
                                                                            className="px-4 py-3.5 hover:bg-emerald-50/50 text-xs font-sans cursor-pointer transition-colors border-b border-gray-50 last:border-0 group/item"
                                                                            onClick={() => { 
                                                                                const d = [...dayPlans];
                                                                                d[idx].title = p.title || "";
                                                                                d[idx].description = p.description || "";
                                                                                d[idx].highlights = p.highlights || [];
                                                                                d[idx].optionalPrice = p.optionalPrice || 0;
                                                                                d[idx].optionalPriceDescription = p.optionalPriceDescription || "";
                                                                                d[idx].subDestination = p.subDestination || "";
                                                                                d[idx].overnightStay = p.overnightStayHotel || "";
                                                                                setDayPlans(d);
                                                                                setOpenPresetDropdown(null);
                                                                            }}
                                                                        >
                                                                            <div className="font-bold text-[#052210] leading-snug group-hover/item:text-emerald-700 transition-colors">{p.title}</div>
                                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium uppercase tracking-tighter">
                                                                                    {p.subDestination || "Default"}
                                                                                </span>
                                                                                {p.overnightStayHotel && (
                                                                                    <span className="text-[10px] text-emerald-600 font-semibold truncate">
                                                                                        • {p.overnightStayHotel}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Title & Description */}
                                        <div className="space-y-3">
                                            <input className={inputClass} style={{ ...inputStyle, fontWeight: 600 }} placeholder="Day Title (e.g. Arrival / Srinagar)" value={day.title} onChange={e => { const d = [...dayPlans]; d[idx].title = e.target.value; setDayPlans(d) }} />
                                            <textarea className={`${inputClass} resize-none`} style={{ ...inputStyle, minHeight: '72px' }} placeholder="Day description..." value={day.description} onChange={e => { const d = [...dayPlans]; d[idx].description = e.target.value; setDayPlans(d) }} />
                                        </div>
                                        
                                        {/* Location - Custom Searchable Dropdowns */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in mb-3">
                                            <div className="relative">
                                                <label className="font-sans text-[10px] tracking-wider uppercase mb-1.5 block font-semibold text-[#059669]">Sub Destination</label>
                                                <div className="relative group">
                                                    <input 
                                                        className={`${inputClass} pr-10`} 
                                                        style={inputStyle} 
                                                        placeholder="e.g. Havelock"
                                                        value={day.subDestination || ""} 
                                                        onFocus={() => { setOpenLocDropdown(idx); setLocalLocSearch(""); }}
                                                        onBlur={() => setTimeout(() => setOpenLocDropdown(null), 200)}
                                                        onChange={e => { 
                                                            const d = [...dayPlans]; d[idx].subDestination = e.target.value; setDayPlans(d);
                                                            setLocalLocSearch(e.target.value);
                                                        }}
                                                    />
                                                    <button 
                                                        type="button" 
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80 transition-opacity"
                                                        onClick={() => setOpenLocDropdown(openLocDropdown === idx ? null : idx)}
                                                    >
                                                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openLocDropdown === idx ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    
                                                    {openLocDropdown === idx && (
                                                        <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-56 overflow-auto py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            {(destinations?.find((d: any) => d.id === destinationId)?.subDestinations || [])
                                                                .filter((loc: string) => !localLocSearch || loc.toLowerCase().includes(localLocSearch.toLowerCase()))
                                                                .map((loc: string) => (
                                                                    <div 
                                                                        key={loc} 
                                                                        className="px-4 py-2.5 hover:bg-emerald-50 text-sm font-sans cursor-pointer transition-colors flex items-center justify-between"
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            const d = [...dayPlans]; d[idx].subDestination = loc; setDayPlans(d); setOpenLocDropdown(null);
                                                                        }}
                                                                    >
                                                                        <span style={{ color: '#052210' }}>{loc}</span>
                                                                        {day.subDestination === loc && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                                                    </div>
                                                                ))}
                                                            {localLocSearch && !(destinations?.find((d: any) => d.id === destinationId)?.subDestinations || []).includes(localLocSearch) && (
                                                                <div 
                                                                    className="px-4 py-2.5 hover:bg-emerald-50 text-sm font-sans cursor-pointer italic text-emerald-600 flex items-center justify-between"
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        const d = [...dayPlans]; d[idx].subDestination = localLocSearch; setDayPlans(d); setOpenLocDropdown(null);
                                                                    }}
                                                                >
                                                                    Add "{localLocSearch}"
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <label className="font-sans text-[10px] tracking-wider uppercase mb-1.5 block font-semibold text-[#059669]">Overnight Stay Location</label>
                                                <div className="relative group">
                                                    <input 
                                                        className={`${inputClass} pr-10`} 
                                                        style={inputStyle} 
                                                        placeholder="e.g. Havelock"
                                                        value={day.overnightStay || ""} 
                                                        onFocus={() => { setOpenHotelDropdown(idx); setLocalHotelSearch(""); }}
                                                        onBlur={() => setTimeout(() => setOpenHotelDropdown(null), 200)}
                                                        onChange={e => { 
                                                            const d = [...dayPlans]; d[idx].overnightStay = e.target.value; setDayPlans(d);
                                                            setLocalHotelSearch(e.target.value);
                                                        }}
                                                    />
                                                    <button 
                                                        type="button" 
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80 transition-opacity"
                                                        onClick={() => setOpenHotelDropdown(openHotelDropdown === idx ? null : idx)}
                                                    >
                                                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openHotelDropdown === idx ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    
                                                    {openHotelDropdown === idx && (
                                                        <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-56 overflow-auto py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            {(destinations?.find((d: any) => d.id === destinationId)?.subDestinations || [])
                                                                .filter((loc: string) => !localHotelSearch || loc.toLowerCase().includes(localHotelSearch.toLowerCase()))
                                                                .map((loc: string) => (
                                                                    <div 
                                                                       key={loc} 
                                                                       className="px-4 py-2.5 hover:bg-emerald-50 text-sm font-sans cursor-pointer transition-colors flex items-center justify-between"
                                                                       onMouseDown={(e) => {
                                                                           e.preventDefault();
                                                                           const d = [...dayPlans]; d[idx].overnightStay = loc; setDayPlans(d); setOpenHotelDropdown(null);
                                                                       }}
                                                                    >
                                                                        <span style={{ color: '#052210' }}>{loc}</span>
                                                                        {day.overnightStay === loc && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                                                    </div>
                                                                ))}
                                                            {localHotelSearch && !(destinations?.find((d: any) => d.id === destinationId)?.subDestinations || []).includes(localHotelSearch) && (
                                                                <div 
                                                                    className="px-4 py-2.5 hover:bg-emerald-50 text-sm font-sans cursor-pointer italic text-emerald-600 flex items-center justify-between"
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        const d = [...dayPlans]; d[idx].overnightStay = localHotelSearch; setDayPlans(d); setOpenHotelDropdown(null);
                                                                    }}
                                                                >
                                                                    Add "{localHotelSearch}"
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <label className="font-sans text-[10px] tracking-wider uppercase mb-1.5 block font-semibold" style={{ color: '#059669' }}>Highlights</label>
                                            <input className={inputClass} style={inputStyle} placeholder="Highlights (comma-separated)" value={day.highlights?.join(", ") || ""} onChange={e => { const d = [...dayPlans]; d[idx].highlights = e.target.value.split(",").map((h: string) => h.trim()).filter(Boolean); setDayPlans(d) }} />
                                        </div>

                                        {/* Optional Pricing - hidden in package mode */}
                                        {mode !== "package" && (
                                        <div className="pt-3" style={{ borderTop: '1px solid #f3f4f6' }}>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="font-sans text-[10px] tracking-wider uppercase mb-1.5 block font-semibold" style={{ color: 'rgba(5,34,16,0.4)' }}>Optional Cost (₹)</label>
                                                    <input type="number" className={inputClass} style={inputStyle} placeholder="e.g. 1500" value={day.optionalPrice || ""} onChange={e => { const d = [...dayPlans]; d[idx].optionalPrice = Number(e.target.value); setDayPlans(d) }} />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="font-sans text-[10px] tracking-wider uppercase mb-1.5 block font-semibold" style={{ color: 'rgba(5,34,16,0.4)' }}>Optional Item Description</label>
                                                    <input className={inputClass} style={inputStyle} placeholder="e.g. VIP seating / Extras" value={day.optionalPriceDescription || ""} onChange={e => { const d = [...dayPlans]; d[idx].optionalPriceDescription = e.target.value; setDayPlans(d) }} />
                                                </div>
                                            </div>
                                        </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* STEP 6: Pricing */}
                {step === 6 && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#ecfdf5' }}><DollarSign className="w-3.5 h-3.5" style={{ color: '#059669' }} /></div>
                            <div>
                                <h2 className="font-serif text-lg sm:text-xl tracking-wide" style={{ color: '#052210' }}>Pricing</h2>
                                <p className="font-sans text-[11px]" style={{ color: '#9ca3af' }}>Auto-calculated cost breakdown</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center p-3.5 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                                <span className="font-sans text-sm" style={{ color: '#6b7280' }}>Hotel Cost ({nights} nights)</span>
                                <input
                                    type="number"
                                    className="w-32 px-3 py-2 rounded-lg font-sans text-sm text-right font-bold"
                                    style={inputStyle}
                                    value={manualHotelCost ?? 0}
                                    onChange={e => setManualHotelCost(e.target.value === "" ? 0 : Number(e.target.value))}
                                />
                            </div>
                            <div className="flex justify-between items-center p-3.5 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                                <span className="font-sans text-sm" style={{ color: '#6b7280' }}>Transfer Cost</span>
                                <input
                                    type="number"
                                    className="w-32 px-3 py-2 rounded-lg font-sans text-sm text-right font-bold"
                                    style={inputStyle}
                                    value={manualTransferCost ?? 0}
                                    onChange={e => setManualTransferCost(e.target.value === "" ? 0 : Number(e.target.value))}
                                />
                            </div>
                            <div className="flex justify-between items-center p-3.5 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                                <span className="font-sans text-sm" style={{ color: '#6b7280' }}>Activities Cost</span>
                                <input
                                    type="number"
                                    className="w-32 px-3 py-2 rounded-lg font-sans text-sm text-right font-bold"
                                    style={inputStyle}
                                    value={manualActivityCost ?? 0}
                                    onChange={e => setManualActivityCost(e.target.value === "" ? 0 : Number(e.target.value))}
                                />
                            </div>

                            {dayPlans.reduce((s: number, d: any) => s + (Number(d.optionalPrice) || 0), 0) > 0 && (
                                <div className="flex justify-between items-center p-3.5 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                                    <span className="font-sans text-sm" style={{ color: '#dc2626' }}>Optional Add-ons Cost</span>
                                    <span className="font-sans text-sm font-bold" style={{ color: '#991b1b' }}>₹{dayPlans.reduce((s: number, d: any) => s + (Number(d.optionalPrice) || 0), 0).toLocaleString()}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center p-3.5 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                                <span className="font-sans text-sm" style={{ color: '#6b7280' }}>Margin % (Applies to Base)</span>
                                <input type="number" className="w-20 px-3 py-2 rounded-lg font-sans text-sm text-right font-bold" style={inputStyle} value={margin} onChange={e => setMargin(Number(e.target.value))} />
                            </div>
                        </div>

                        <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, #a7f3d0, transparent)' }} />

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {plans.map((plan, idx) => (
                                <div key={idx} className="flex flex-col justify-between p-5 rounded-2xl relative overflow-hidden" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                                    {/* Plan Header */}
                                    <div className="mb-4">
                                        <p className="font-sans text-[11px] font-bold tracking-wider uppercase mb-1" style={{ color: '#059669' }}>Plan {idx + 1}</p>
                                        <p className="font-serif text-lg tracking-wide leading-tight" style={{ color: '#052210' }}>{plan.hotelName}</p>
                                        <p className="font-sans text-[10px] mt-1 uppercase tracking-wider" style={{ color: '#6b7280' }}>{plan.category}</p>
                                    </div>

                                    {mode === "package" && (
                                        <div className="mb-4">
                                            <label className="font-sans text-[10px] uppercase tracking-wider mb-1 block" style={{ color: '#059669' }}>Override Package Total (₹)</label>
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 rounded-lg font-sans text-sm font-bold outline-none"
                                                style={{ background: '#FFFFFF', border: '1px solid #6ee7b7', color: '#052210' }}
                                                value={plan.total}
                                                onChange={e => {
                                                    const newTotal = Number(e.target.value);
                                                    const newPlans = [...plans];
                                                    const pax = adults + children;
                                                    newPlans[idx].total = newTotal;
                                                    newPlans[idx].perPersonPrice = pax > 0 ? Math.round(newTotal / pax) : 0;
                                                    setPlans(newPlans);

                                                    if (idx === 0) {
                                                        setTotalPrice(newTotal);
                                                        setPerPersonPrice(newPlans[idx].perPersonPrice);
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Plan Pricing */}
                                    <div className="space-y-2 mt-auto">
                                        <div className="flex justify-between items-end border-b pb-2" style={{ borderColor: 'rgba(5, 150, 105, 0.1)' }}>
                                            <p className="font-sans text-[11px] font-semibold tracking-wider uppercase" style={{ color: '#059669' }}>Total</p>
                                            <p className="font-serif text-xl sm:text-2xl font-bold tracking-wide leading-none" style={{ color: '#059669' }}>₹{plan.total.toLocaleString()}</p>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <p className="font-sans text-[10px] font-semibold tracking-wider uppercase" style={{ color: '#6ee7b7' }}>Per Person</p>
                                            <p className="font-sans text-sm font-bold tracking-wide" style={{ color: '#052210' }}>₹{plan.perPersonPrice.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 7: Preview */}
                {step === 7 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#ecfdf5' }}><Eye className="w-3.5 h-3.5" style={{ color: '#059669' }} /></div>
                            <div>
                                <h2 className="font-serif text-lg sm:text-xl tracking-wide" style={{ color: '#052210' }}>Preview & Save</h2>
                                <p className="font-sans text-[11px]" style={{ color: '#9ca3af' }}>Review before saving</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {[
                                { l: "Customer", v: customerName },
                                { l: "Destination", v: destinationName },
                                { l: "Duration", v: `${nights}N / ${totalDays}D` },
                                { l: "Dates", v: `${startDate} → ${endDate}` },
                                { l: "Pax", v: `${adults} Adults${children > 0 ? `, ${children} Children` : ""}` },
                                { l: "Flights", v: flightSegments.length ? flightSegments.map(f => `${f.airline} (${f.fromCode}→${f.toCode})`).join(", ") : "None" },
                                { l: "Hotels", v: selectedHotels.map((h: any) => `${h.name || h.hotelName}${h.roomType ? ` (${h.roomType})` : ""}`).join(", ") || "None" },
                                { l: "Activities", v: selectedActivities.map((a: any) => a.name || a.activityName).join(", ") || "None" },
                                { l: "Plans", v: plans.map(p => `${p.hotelName} (₹${p.total.toLocaleString()})`).join(" | ") || "None" }
                            ].map(item => (
                                <div key={item.l} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0 px-4 py-3 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                                    <span className="font-sans text-[11px] font-semibold uppercase tracking-wider sm:w-36 flex-shrink-0" style={{ color: '#059669' }}>{item.l}</span>
                                    <span className="font-sans text-sm font-bold" style={{ color: '#052210' }}>{item.v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center justify-between">
                <button
                    onClick={() => setStep(Math.max(0, step - 1))}
                    disabled={step === 0}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl font-sans text-xs font-semibold tracking-wider uppercase disabled:opacity-20 transition-all hover:bg-gray-50"
                    style={{ color: '#059669', border: '1px solid #d1d5db' }}
                >
                    <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                {step < STEPS.length - 1 ? (
                    <button
                        onClick={() => setStep(step + 1)}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-sans text-xs font-semibold tracking-wider uppercase transition-all hover:opacity-90"
                        style={{ background: '#059669', color: '#FFFFFF' }}
                    >
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-sans text-xs font-semibold tracking-wider uppercase transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: '#059669', color: '#FFFFFF' }}
                    >
                        {saving ? "Saving..." : "Save Itinerary"} <Check className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Mobile Fixed Bottom Navigation */}
            <div className="flex sm:hidden items-center justify-between fixed bottom-0 left-0 right-0 p-3 z-50" style={{ background: '#FFFFFF', borderTop: '1px solid #e5e7eb', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
                <button
                    onClick={() => setStep(Math.max(0, step - 1))}
                    disabled={step === 0}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl font-sans text-xs font-semibold tracking-wider uppercase disabled:opacity-20 transition-all"
                    style={{ color: '#059669', border: '1px solid #d1d5db' }}
                >
                    <ChevronLeft className="w-4 h-4" /> Back
                </button>
                {step < STEPS.length - 1 ? (
                    <button
                        onClick={() => setStep(step + 1)}
                        className="flex items-center gap-1.5 px-5 py-3 rounded-xl font-sans text-xs font-semibold tracking-wider uppercase transition-all"
                        style={{ background: '#059669', color: '#FFFFFF' }}
                    >
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-5 py-3 rounded-xl font-sans text-xs font-semibold tracking-wider uppercase transition-all disabled:opacity-50"
                        style={{ background: '#059669', color: '#FFFFFF' }}
                    >
                        {saving ? "Saving..." : "Save"} <Check className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    )
}
