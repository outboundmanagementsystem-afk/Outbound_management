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
    ChevronRight, ChevronLeft, Check, Plus, Trash2, Eye, Plane, Upload, Loader2, Sparkles, Map, PackageSearch, ChevronDown, X, Search, Star, FileText, RotateCcw
} from "lucide-react"
import { createWorker } from "tesseract.js"
import { preprocessImageForOCR } from "@/lib/image-processing"
import { extractFlightDetailsFromText } from "@/lib/flight-parser"
import { HOTEL_CATEGORIES } from "@/lib/constants"

const STEPS = [
    { label: "Customer & Trip", icon: User },
    { label: "Flights", icon: Plane },
    { label: "Hotels", icon: Hotel },
    { label: "Transfers", icon: Car },
    { label: "Activities", icon: Map },
    { label: "Day Plan", icon: Sun },
    { label: "Inclusions", icon: FileText },
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
    const [isEditingItinerary, setIsEditingItinerary] = useState(false)
    const [itinModule, setItinModule] = useState<string | null>(null)
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
    
    // UI Split Phone States
    const [customerCountryCode, setCustomerCountryCode] = useState("+91")
    const [customerPhoneNum, setCustomerPhoneNum] = useState("")

    const COUNTRY_CODES = [
        { code: "+91", country: "India" },
        { code: "+1", country: "USA" },
        { code: "+44", country: "UK" },
        { code: "+971", country: "UAE" },
        { code: "+65", country: "Singapore" },
        { code: "+60", country: "Malaysia" },
        { code: "+66", country: "Thailand" },
        { code: "+61", country: "Australia" },
        { code: "+64", country: "New Zealand" },
        { code: "+33", country: "France" },
        { code: "+49", country: "Germany" },
    ]

    const splitPhoneNumber = (full: string) => {
        if (!full) return { code: "+91", num: "" }
        const match = COUNTRY_CODES.find(c => full.startsWith(c.code))
        if (match) {
            return { code: match.code, num: full.slice(match.code.length) }
        }
        // Fallback: try to guess if it starts with + and 1-3 digits
        if (full.startsWith("+")) {
            // Rough guess for unknown codes: assume first 3 digits if not in list
            return { code: "+91", num: full.slice(1) } // Simplified fallback
        }
        return { code: "+91", num: full }
    }
    
    // Validation Errors
    const [errors, setErrors] = useState({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
    })

    const validateName = (name: string) => {
        if (!name) return "Customer name is required"
        if (name.length < 2) return "Name must be at least 2 characters"
        if (name.length > 50) return "Name must be at most 50 characters"
        if (!/^[a-zA-Z\s.]+$/.test(name)) return "Name must contain only letters, spaces, or dot."
        return ""
    }

    const validatePhone = (phoneNum: string) => {
        const phoneToValidate = phoneNum ? phoneNum.trim() : "";
        if (!phoneToValidate) return "Phone number is required"
        const phoneRegex = /^\d{7,15}$/
        if (!phoneRegex.test(phoneToValidate)) return "Enter a valid 7-15 digit phone number"
        return ""
    }

    const validateEmail = (email: string) => {
        if (!email) return ""
        const trimmed = email.trim()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Enter a valid email address."
        return ""
    }

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

    // Step 6: Inclusions & Notes
    const [overrideInclusions, setOverrideInclusions] = useState<string[] | null>(null)
    const [overrideExclusions, setOverrideExclusions] = useState<string[] | null>(null)
    const [overrideImportantNotes, setOverrideImportantNotes] = useState<string[] | null>(null)
    const [overrideTermsConditions, setOverrideTermsConditions] = useState<string[] | null>(null)
    const [overridePaymentPolicy, setOverridePaymentPolicy] = useState<string[] | null>(null)
    const [overrideCancellationPolicy, setOverrideCancellationPolicy] = useState<string[] | null>(null)
    const [inclusionsCustomised, setInclusionsCustomised] = useState(false)
    const [inclusionsSeeded, setInclusionsSeeded] = useState(false)
    const [expandedIncSections, setExpandedIncSections] = useState<Record<string, boolean>>({
        inclusions: true, exclusions: true,
        importantNotes: false, termsConditions: false,
        paymentPolicy: false, cancellationPolicy: false,
    })

    // Step 7: Pricing & Plans
    const [margin, setMargin] = useState(15)
    // Legacy single-price fallbacks
    const [totalPrice, setTotalPrice] = useState(0)
    const [perPersonPrice, setPerPersonPrice] = useState(0)
    // Manual Cost Overrides - Defaulting to 0 for a clean slate as requested
    const [manualHotelCost, setManualHotelCost] = useState<number | null>(0)
    const [manualTransferCost, setManualTransferCost] = useState<number | null>(0)
    const [manualActivityCost, setManualActivityCost] = useState<number | null>(0)
    // Per-plan hotel cost overrides (indexed by plan idx)
    const [planHotelCostOverrides, setPlanHotelCostOverrides] = useState<(number | null)[]>([])

    // New Multi-Plan Architecture
    const [plans, setPlans] = useState<any[]>([])
    const [tierPlans, setTierPlans] = useState<any[]>([
        { name: "Budget", stops: [{ location: "", hotelId: "", hotelName: "", nights: 2, mealPlan: "CP (Breakfast)", roomType: "", ratePerNight: 0 }] }
    ])

    const MEAL_PLANS = [
        { label: "EP (No Meals)", value: "EP" },
        { label: "CP (Breakfast)", value: "CP" },
        { label: "MAP (Breakfast + Dinner)", value: "MAP" },
        { label: "AP (All Meals)", value: "AP" }
    ]

    const TIER_NAMES = HOTEL_CATEGORIES

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
                        roomCategory: stop.roomType || hotel.roomType || "Standard",
                        ratePerNight: stop.ratePerNight || 0,
                        location: stop.location || hotel.location || "",
                        starRating: stop.starRating || hotel.starRating || 3
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
                let isItin = false;
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
                    if (!it) {
                        isItin = true;
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
                } else {
                    isItin = true;
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
                setIsEditingItinerary(isItin);

                if (it) {
                    setItinModule(it.module || null)
                    setCustomerName(it.customerName || it.packageName || "")
                    setCustomerPhone(it.customerPhone || "")
                    const split = splitPhoneNumber(it.customerPhone || "")
                    setCustomerCountryCode(split.code)
                    setCustomerPhoneNum(split.num)
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

                    // Restore Inclusions & Notes overrides
                    if (it.override_inclusions !== undefined) {
                        setOverrideInclusions(it.override_inclusions)
                        setOverrideExclusions(it.override_exclusions || null)
                        setOverrideImportantNotes(it.override_important_notes || null)
                        setOverrideTermsConditions(it.override_terms_conditions || null)
                        setOverridePaymentPolicy(it.override_payment_policy || null)
                        setOverrideCancellationPolicy(it.override_cancellation_policy || null)
                        setInclusionsCustomised(it.inclusions_customised || false)
                        setInclusionsSeeded(true)
                    }
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
                            ratePerNight: hotel.ratePerNight || 0,
                            starRating: hotel.starRating || 3
                        }))
                    }))
                    setTierPlans(reconstructed.length > 0 ? reconstructed : [{ name: "Budget", stops: [{ location: "", hotelId: "", hotelName: "", nights: 2, mealPlan: "CP (Breakfast)", roomType: "", ratePerNight: 0 }] }])
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
        if (manualTransferCost !== null && manualTransferCost > 0) {
            transferCost = manualTransferCost
        } else {
            transfers.forEach(t => { transferCost += Number(t.price) || 0 })
        }

        let activityCost = 0
        if (manualActivityCost !== null && manualActivityCost > 0) {
            activityCost = manualActivityCost
        } else {
            selectedActivities.forEach(a => {
                const actPrice = a.isActivity ? ((Number(a.price) || 0) + (Number(a.vehiclePrice) || 0)) : (Number(a.entryFee) || Number(a.price) || 0)
                activityCost += actPrice * (adults + children)
            })
        }

        const pax = adults + children
        const baseShared = transferCost + activityCost

        if (selectedHotels.length === 0) {
            const autoHotelCost = manualHotelCost || 0
            const hotelCost = (planHotelCostOverrides[0] !== null && planHotelCostOverrides[0] !== undefined) ? planHotelCostOverrides[0] : autoHotelCost
            const netCost = baseShared + hotelCost
            const marginAmt = netCost * (margin / 100)
            const total = netCost + marginAmt
            setTotalPrice(Math.round(total))
            setPerPersonPrice(pax > 0 ? Math.round(total / pax) : Math.round(total))
            setPlans([{ 
                planId: `plan_1`,
                planName: "No Hotel Selected", 
                category: "Custom", 
                perPersonPrice: pax > 0 ? Math.round(total / pax) : Math.round(total),
                totalPrice: Math.round(total),
                autoHotelCost,
                hotelCost,
                costBreakup: {
                    hotelCost,
                    activityCost,
                    transferCost,
                    margin: Math.round(marginAmt)
                }
            }])
        } else {
            const categories = Array.from(new Set(selectedHotels.map(h => h.category || "Uncategorized")))
            const newPlans = categories.map((cat, idx) => {
                const hotelsInCat = selectedHotels.filter(h => (h.category || "Uncategorized") === cat)
                const autoHotelCost = hotelsInCat.reduce((sum, h) => sum + (Number(h.ratePerNight) * Number(h.selectedNights || nights)), 0)
                const hotelCost = (planHotelCostOverrides[idx] !== null && planHotelCostOverrides[idx] !== undefined) ? planHotelCostOverrides[idx]! : autoHotelCost
                const netCost = baseShared + hotelCost
                const marginAmt = netCost * (margin / 100)
                const total = netCost + marginAmt
                return {
                    planId: `plan_${idx + 1}`,
                    planName: `PLAN ${idx + 1} - ${cat}`,
                    category: cat,
                    perPersonPrice: pax > 0 ? Math.round(total / pax) : Math.round(total),
                    totalPrice: Math.round(total),
                    autoHotelCost,
                    hotelCost,
                    costBreakup: {
                        hotelCost,
                        activityCost,
                        transferCost,
                        margin: Math.round(marginAmt)
                    }
                }
            })
            setTotalPrice(newPlans[0].totalPrice)
            setPerPersonPrice(newPlans[0].perPersonPrice)
            setPlans(newPlans)
        }
    }

    useEffect(() => { calculatePricing() }, [selectedHotels, transfers, selectedActivities, margin, nights, adults, children, dayPlans, manualHotelCost, manualTransferCost, manualActivityCost, planHotelCostOverrides])

    const handleSave = async () => {
        // --- VALIDATION CHECK ---
        const nameErr = validateName(customerName)
        const phoneErr = validatePhone(customerPhoneNum)
        const emailErr = validateEmail(customerEmail)

        if (nameErr || phoneErr || emailErr) {
            setErrors({
                customerName: nameErr,
                customerPhone: phoneErr,
                customerEmail: emailErr,
            })
            setStep(0) // Jump back to Step 0 where the errors are
            alert("Please fix the validation errors in Step 1 before saving.")
            return
        }

        setSaving(true)
        try {
            const selectedDest = destinations.find((d: any) => d.id === destinationId)
            
            // Clean highlights - trim and remove empty ones before saving
            const cleanedDayPlans = dayPlans.map(day => ({
                ...day,
                highlights: day.highlights?.map((h: string) => h.trim()).filter((h: string) => h.length > 0) || []
            }))

            const baseData = {
                destinationId, destination: destinationName,
                startDate, endDate, nights, days: totalDays,
                adults, children, childAge: childAges.join(", "),
                margin,
                createdBy: userProfile?.uid || "",
                createdByName: userProfile?.name || "",
                pdfTemplate: selectedDest?.pdfTemplate || null,
                manualHotelCost, manualTransferCost, manualActivityCost,
                override_inclusions: overrideInclusions,
                override_exclusions: overrideExclusions,
                override_important_notes: overrideImportantNotes,
                override_terms_conditions: overrideTermsConditions,
                override_payment_policy: overridePaymentPolicy,
                override_cancellation_policy: overrideCancellationPolicy,
                inclusions_customised: inclusionsCustomised,
                module: mode === "package" ? "built-package" : "custom-itinerary",
                plans: plans,
                selectedPlanId: plans.length > 0 ? plans[0].planId : null,
            }

            let itinId = editId as string
            let pipelineItinIdForOnSave: string | null = null

            if (mode === "package" && !isEditingItinerary) {
                const packageData = {
                    ...baseData,
                    packageName: customerName,
                }
                console.log("SAVE PACKAGE PAYLOAD:", packageData);
                if (editId) {
                    await updatePackage(editId, packageData)
                    await clearPackageSubcollections(editId)
                } else {
                    itinId = await createPackage(packageData)
                }

                for (const day of cleanedDayPlans) await addPackageDay(itinId, day)
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
                        module: "built-package",
                    }
                    console.log("SAVE PIPELINE PAYLOAD:", itineraryDataForPipeline);
                    const pipelineItinId = await createItinerary(itineraryDataForPipeline)
                    pipelineItinIdForOnSave = pipelineItinId
                    for (const day of cleanedDayPlans) await addItineraryDay(pipelineItinId, day)
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
                console.log("SAVE ITINERARY PAYLOAD:", itineraryData);

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

                for (const day of cleanedDayPlans) await addItineraryDay(itinId, day)
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

        } catch (err: any) {
            console.error("SAVE ERROR:", err)
            alert("Error saving: " + (err.message || JSON.stringify(err)))
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
                                                const split = splitPhoneNumber(c.phone || "")
                                                setCustomerCountryCode(split.code)
                                                setCustomerPhoneNum(split.num)
                                                setCustomerEmail(c.email || "")
                                                setErrors(prev => ({ ...prev, customerName: "", customerPhone: "", customerEmail: "" }))
                                            }
                                        }}
                                    >
                                        <option value="">-- Choose from existing customers or type below --</option>
                                        {customers.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass} style={labelStyle}>{mode === "package" ? "Package Name / Customer Name" : "Customer Name"} <span className="text-red-500">*</span></label>
                                    <input 
                                        className={inputClass} 
                                        style={{ ...inputStyle, borderColor: errors.customerName ? '#ef4444' : '#e2e8f0' }} 
                                        value={customerName} 
                                        onBlur={() => setErrors(prev => ({ ...prev, customerName: validateName(customerName) }))}
                                        onChange={e => {
                                            setCustomerName(e.target.value);
                                            if (errors.customerName) setErrors(prev => ({ ...prev, customerName: validateName(e.target.value) }));
                                        }} 
                                        placeholder={mode === "package" ? "e.g. Mr. Wasim (or Package Name)" : "e.g. Mr. Wasim"} 
                                    />
                                    {errors.customerName && <p className="text-[10px] text-red-500 mt-1 ml-1 font-semibold">{errors.customerName}</p>}
                                </div>
                                <div>
                                    <label className={labelClass} style={labelStyle}>Phone <span className="text-red-500">*</span></label>
                                    <div className="flex gap-2">
                                        <select 
                                            className="w-[100px] px-3 py-3 rounded-xl font-sans text-sm focus:border-emerald-400" 
                                            style={{ ...inputStyle, borderColor: errors.customerPhone ? '#ef4444' : '#e2e8f0', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }} 
                                            value={customerCountryCode}
                                            onChange={e => {
                                                const newCode = e.target.value;
                                                setCustomerCountryCode(newCode);
                                                const full = newCode + customerPhoneNum;
                                                setCustomerPhone(full);
                                                if (errors.customerPhone) setErrors(prev => ({ ...prev, customerPhone: validatePhone(customerPhoneNum) }));
                                            }}
                                        >
                                            {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                        </select>
                                        <input 
                                            type="tel"
                                            className="flex-1 px-4 py-3 rounded-xl font-sans text-sm focus:border-emerald-400" 
                                            style={{ ...inputStyle, borderColor: errors.customerPhone ? '#ef4444' : '#e2e8f0' }} 
                                            value={customerPhoneNum} 
                                            placeholder="Phone number"
                                            onBlur={() => setErrors(prev => ({ ...prev, customerPhone: validatePhone(customerPhoneNum) }))}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 15); // Only digits, max 15
                                                setCustomerPhoneNum(val);
                                                const full = customerCountryCode + val;
                                                setCustomerPhone(full);
                                                if (errors.customerPhone) setErrors(prev => ({ ...prev, customerPhone: validatePhone(val) }));
                                            }} 
                                        />
                                    </div>
                                    {errors.customerPhone && <p className="text-[10px] text-red-500 mt-1 ml-1 font-semibold">{errors.customerPhone}</p>}
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelClass} style={labelStyle}>Email</label>
                                    <input 
                                        className={inputClass} 
                                        style={{ ...inputStyle, borderColor: errors.customerEmail ? '#ef4444' : '#e2e8f0' }} 
                                        value={customerEmail} 
                                        onBlur={() => setErrors(prev => ({ ...prev, customerEmail: validateEmail(customerEmail) }))}
                                        onChange={e => {
                                            const val = e.target.value.toLowerCase().trim();
                                            setCustomerEmail(val);
                                            if (errors.customerEmail) setErrors(prev => ({ ...prev, customerEmail: validateEmail(val) }));
                                        }} 
                                        placeholder="customer@email.com" 
                                    />
                                    {errors.customerEmail && <p className="text-[10px] text-red-500 mt-1 ml-1 font-semibold">{errors.customerEmail}</p>}
                                </div>
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
                                <div><label className={labelClass} style={labelStyle}>Adults <span className="text-red-500">*</span></label><input type="number" className={`${inputClass} pr-10`} style={inputStyle} value={adults === 0 ? "" : adults} onFocus={e => { if (adults === 0) e.target.value = "" }} onChange={e => { let val = e.target.value.replace(/^0+/, ''); if (val === "") setAdults(0); else setAdults(Math.max(1, parseInt(val) || 0)); }} onBlur={e => { if (e.target.value === "") setAdults(1); }} min={1} /></div>
                                <div><label className={labelClass} style={labelStyle}>Children</label><input type="number" className={`${inputClass} pr-10`} style={inputStyle} value={children === 0 ? "" : children} onFocus={e => { if (children === 0) e.target.value = "" }} onChange={e => { let val = e.target.value.replace(/^0+/, ''); if (val === "") setChildren(0); else setChildren(Math.max(0, parseInt(val) || 0)); }} onBlur={e => { if (e.target.value === "") setChildren(0); }} min={0} /></div>
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
                                <input type="number" className={`${inputClass} pr-10`} style={inputStyle} placeholder="Price ₹" value={seg.price === 0 ? "" : seg.price} onFocus={e => { if (seg.price === 0) e.target.value = "" }} onChange={e => { let val = e.target.value.replace(/^0+/, ''); const s = [...flightSegments]; if (val === "") s[idx].price = 0; else s[idx].price = Math.max(0, parseInt(val) || 0); setFlightSegments(s); }} onBlur={e => { if (e.target.value === "") { const s = [...flightSegments]; s[idx].price = 0; setFlightSegments(s); } }} />
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
                                    <p className="font-sans text-xs sm:text-sm" style={{ color: '#6b7280' }}>Build up to 3 pricing options to offer your clients different budget options.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (tierPlans.length >= 3) {
                                        alert("Maximum 3 pricing options allowed.");
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
                                <Plus className="w-4 h-4" /> Add Pricing Option
                            </button>
                        </div>

                        <div className="space-y-6">
                             {tierPlans.map((plan, planIdx) => (
                                <div key={planIdx} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group transition-all" style={{ marginBottom: '24px' }}>
                                    {/* Plan Header */}
                                    <div className="px-8 py-6 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-4">
                                                {/* PLAN BADGE */}
                                                <div className="bg-[#052210] px-4 py-2 rounded-xl shadow-sm flex items-center justify-center">
                                                    <span className="font-sans text-sm font-black text-white uppercase tracking-wider">
                                                        Option {planIdx + 1}
                                                    </span>
                                                </div>

                                                <div className="h-8 w-px bg-gray-200 hidden sm:block mx-1" />

                                                {/* TIER SELECTOR */}
                                                <div className="relative group">
                                                    <select
                                                        className="pl-4 pr-10 py-2.5 rounded-xl font-serif text-xl font-black bg-white border border-gray-200 text-[#052210] appearance-none cursor-pointer focus:border-emerald-500 outline-none transition-all uppercase"
                                                        value={plan.name}
                                                        onChange={(e) => {
                                                            const newPlans = [...tierPlans];
                                                            newPlans[planIdx].name = e.target.value;
                                                            // Reset hotels in this plan when tier changes
                                                            newPlans[planIdx].stops = newPlans[planIdx].stops.map(stop => ({
                                                                ...stop,
                                                                hotelId: "",
                                                                hotelName: "",
                                                                ratePerNight: 0
                                                            }));
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
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl font-sans text-xs font-bold text-red-500 bg-white border border-red-100 hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest shadow-sm"
                                            >
                                                <Trash2 className="w-4 h-4" /> Remove
                                            </button>
                                        )}
                                    </div>

                                    {/* Stops Builder */}
                                    <div className="p-8 space-y-10">
                                        {plan.stops.map((stop: any, stopIdx: number) => (
                                            <div key={stopIdx} className="relative group/stop animate-in fade-in slide-in-from-left-4 duration-300">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className="font-sans text-[11px] font-black uppercase tracking-[0.25em] text-gray-400">Hotel {stopIdx + 1}</span>
                                                    <div className="h-px flex-1 bg-gray-100" />
                                                    {plan.stops.length > 1 && (
                                                        <button 
                                                            onClick={() => {
                                                                const newPlans = [...tierPlans];
                                                                newPlans[planIdx].stops = newPlans[planIdx].stops.filter((_: any, i: number) => i !== stopIdx);
                                                                setTierPlans(newPlans);
                                                            }}
                                                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-6 bg-gray-50/30 rounded-2xl border border-gray-100 transition-all group-hover/stop:bg-white group-hover/stop:border-emerald-100 group-hover/stop:shadow-md">
                                                    {/* Location */}
                                                    <div className="sm:col-span-3 space-y-1.5 relative">
                                                        <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" /> Location
                                                        </label>
                                                        <div className="relative group/dropdown">
                                                            <div className="relative">
                                                                <input 
                                                                    className={`${inputClass} pr-10`} 
                                                                    style={inputStyle} 
                                                                    placeholder="Select or Type Location"
                                                                    value={openTierLocDropdown?.planIdx === planIdx && openTierLocDropdown?.stopIdx === stopIdx ? localLocSearch : (stop.location || "")}
                                                                    onFocus={() => {
                                                                        setOpenTierLocDropdown({ planIdx, stopIdx });
                                                                        setLocalLocSearch(stop.location || "");
                                                                    }}
                                                                    onBlur={() => setTimeout(() => setOpenTierLocDropdown(null), 200)}
                                                                    onChange={(e) => {
                                                                        setLocalLocSearch(e.target.value);
                                                                        const newPlans = [...tierPlans];
                                                                        newPlans[planIdx].stops[stopIdx].location = e.target.value;
                                                                        setTierPlans(newPlans);
                                                                    }}
                                                                />
                                                                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 transition-transform ${openTierLocDropdown?.planIdx === planIdx && openTierLocDropdown?.stopIdx === stopIdx ? 'rotate-180' : ''}`} />
                                                            </div>
                                                            {openTierLocDropdown?.planIdx === planIdx && openTierLocDropdown?.stopIdx === stopIdx && (
                                                                <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-48 overflow-auto py-2 animate-in fade-in slide-in-from-top-2">
                                                                    {localLocSearch && !(destinations?.find((d: any) => d.id === destinationId)?.subDestinations || []).some(l => l.toLowerCase() === localLocSearch.toLowerCase()) && (
                                                                        <div 
                                                                            className="px-4 py-3 hover:bg-emerald-50 text-xs font-bold text-emerald-600 italic cursor-pointer flex items-center justify-between border-b border-gray-50"
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                const newPlans = [...tierPlans];
                                                                                newPlans[planIdx].stops[stopIdx].location = localLocSearch;
                                                                                setTierPlans(newPlans);
                                                                                setOpenTierLocDropdown(null);
                                                                            }}
                                                                        >
                                                                            ➕ Add "{localLocSearch}"
                                                                            <Plus className="w-3.5 h-3.5" />
                                                                        </div>
                                                                    )}
                                                                    {(destinations?.find((d: any) => d.id === destinationId)?.subDestinations || [])
                                                                        .slice()
                                                                        .sort((a, b) => {
                                                                            const s = localLocSearch.toLowerCase().trim();
                                                                            if (!s) return a.localeCompare(b);
                                                                            const aMatch = a.toLowerCase().includes(s);
                                                                            const bMatch = b.toLowerCase().includes(s);
                                                                            if (aMatch && !bMatch) return -1;
                                                                            if (!aMatch && bMatch) return 1;
                                                                            return a.localeCompare(b);
                                                                        })
                                                                        .map((loc: string) => (
                                                                        <div 
                                                                            key={loc} 
                                                                            className="px-4 py-3 hover:bg-emerald-50 text-sm font-sans font-medium cursor-pointer transition-colors flex items-center justify-between group"
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                const newPlans = [...tierPlans];
                                                                                newPlans[planIdx].stops[stopIdx].location = loc;
                                                                                setLocalLocSearch(loc);
                                                                                
                                                                                // Reset hotel and pricing fields when location changes to prevent auto-selection
                                                                                newPlans[planIdx].stops[stopIdx].hotelId = "";
                                                                                newPlans[planIdx].stops[stopIdx].hotelName = "";
                                                                                newPlans[planIdx].stops[stopIdx].ratePerNight = 0;
                                                                                newPlans[planIdx].stops[stopIdx].roomType = "Standard";
                                                                                newPlans[planIdx].stops[stopIdx].starRating = 3;

                                                                                setTierPlans(newPlans);
                                                                                setOpenTierLocDropdown(null);
                                                                            }}
                                                                        >
                                                                            <span>{loc}</span>
                                                                            {stop.location === loc && <Check className="w-3.5 h-3.5 text-emerald-600" />}
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
                                                        <div className="relative group/dropdown">
                                                            <div className="relative">
                                                                <input 
                                                                    className={`${inputClass} pr-10`} 
                                                                    style={inputStyle} 
                                                                    placeholder="Select or Type Hotel"
                                                                    value={openTierHotelDropdown?.planIdx === planIdx && openTierHotelDropdown?.stopIdx === stopIdx ? localHotelSearch : (stop.hotelName || "")}
                                                                    onFocus={() => {
                                                                        setOpenTierHotelDropdown({ planIdx, stopIdx });
                                                                        setLocalHotelSearch(stop.hotelName || "");
                                                                    }}
                                                                    onBlur={() => setTimeout(() => setOpenTierHotelDropdown(null), 200)}
                                                                    onChange={(e) => {
                                                                        setLocalHotelSearch(e.target.value);
                                                                        const newPlans = [...tierPlans];
                                                                        newPlans[planIdx].stops[stopIdx].hotelName = e.target.value;
                                                                        setTierPlans(newPlans);
                                                                    }}
                                                                />
                                                                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 transition-transform ${openTierHotelDropdown?.planIdx === planIdx && openTierHotelDropdown?.stopIdx === stopIdx ? 'rotate-180' : ''}`} />
                                                            </div>
                                                            {openTierHotelDropdown?.planIdx === planIdx && openTierHotelDropdown?.stopIdx === stopIdx && (
                                                                <div className="absolute z-[100] w-[200%] sm:w-[150%] right-0 sm:left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                                    <div className="max-h-60 overflow-auto py-2">
                                                                        {destHotels
                                                                            .filter((h: any) => {
                                                                                const hLoc = (h.destination || h.subDestination || h.address || h.location || "").toLowerCase().trim();
                                                                                const sLoc = (stop.location || "").toLowerCase().trim();
                                                                                const locMatch = !stop.location || hLoc.includes(sLoc);
                                                                                
                                                                                // Filter by Tier (Category)
                                                                                const hCat = (h.category || "").toLowerCase().trim();
                                                                                const pTier = (plan.name || "").toLowerCase().trim();
                                                                                const tierMatch = pTier === "custom" || hCat === pTier;

                                                                                const searchMatch = !localHotelSearch || (h.hotelName || h.name || "").toLowerCase().includes(localHotelSearch.toLowerCase());
                                                                                return locMatch && tierMatch && searchMatch;
                                                                            })
                                                                            .map((hotel: any) => {
                                                                                const basePrice = hotel.cpPrice || hotel.epPrice || hotel.mapPrice || hotel.apPrice || hotel.ratePerNight || 0;
                                                                                return (
                                                                                    <div 
                                                                                        key={hotel.id} 
                                                                                        className="px-4 py-3 hover:bg-emerald-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                                                                                        onMouseDown={(e) => {
                                                                                            e.preventDefault();
                                                                                            const newPlans = [...tierPlans];
                                                                                            newPlans[planIdx].stops[stopIdx].hotelId = hotel.id;
                                                                                            newPlans[planIdx].stops[stopIdx].hotelName = hotel.hotelName || hotel.name;
                                                                                            // Auto-set initial rate based on default CP meal plan if available
                                                                                            const selectedRoom = hotel.roomCategories?.[0];
                                                                                            newPlans[planIdx].stops[stopIdx].ratePerNight = hotel.cpPrice || basePrice;
                                                                                            newPlans[planIdx].stops[stopIdx].location = hotel.address || hotel.location || newPlans[planIdx].stops[stopIdx].location;
                                                                                            newPlans[planIdx].stops[stopIdx].starRating = hotel.starRating || selectedRoom?.starRating || 3;
                                                                                            setTierPlans(newPlans);
                                                                                            setOpenTierHotelDropdown(null);
                                                                                        }}
                                                                                    >
                                                                                        <div className="font-bold text-gray-900 text-xs">{hotel.hotelName || hotel.name}</div>
                                                                                        <div className="flex items-center gap-2 mt-1">
                                                                                            <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Starting from ₹{hotel.cpPrice || 0}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                )
                                                                            })}
                                                                        {localHotelSearch && !destHotels.some(h => (h.hotelName || h.name || "").toLowerCase() === localHotelSearch.toLowerCase()) && (
                                                                            <div 
                                                                                className="px-4 py-3 hover:bg-emerald-50 text-xs font-bold text-emerald-600 italic cursor-pointer flex items-center justify-between border-t border-gray-50"
                                                                                onMouseDown={(e) => {
                                                                                    e.preventDefault();
                                                                                    const newPlans = [...tierPlans];
                                                                                    newPlans[planIdx].stops[stopIdx].hotelId = `custom-${Date.now()}`;
                                                                                    newPlans[planIdx].stops[stopIdx].hotelName = localHotelSearch;
                                                                                    newPlans[planIdx].stops[stopIdx].ratePerNight = 0;
                                                                                    setTierPlans(newPlans);
                                                                                    setOpenTierHotelDropdown(null);
                                                                                }}
                                                                            >
                                                                                ➕ Add "{localHotelSearch}"
                                                                                <Plus className="w-3.5 h-3.5" />
                                                                            </div>
                                                                        )}
                                                                        {(() => {
                                                                            const filteredCount = destHotels.filter((h: any) => {
                                                                                const hLoc = (h.destination || h.subDestination || h.address || h.location || "").toLowerCase().trim();
                                                                                const sLoc = (stop.location || "").toLowerCase().trim();
                                                                                const locMatch = !stop.location || hLoc.includes(sLoc);
                                                                                const hCat = (h.category || "").toLowerCase().trim();
                                                                                const pTier = (plan.name || "").toLowerCase().trim();
                                                                                const tierMatch = pTier === "custom" || hCat === pTier;
                                                                                const searchMatch = !localHotelSearch || (h.hotelName || h.name || "").toLowerCase().includes(localHotelSearch.toLowerCase());
                                                                                return locMatch && tierMatch && searchMatch;
                                                                            }).length;

                                                                            if (filteredCount === 0) {
                                                                                return <div className="px-4 py-3 text-xs text-gray-400 italic">No hotels available for selected location and category.</div>;
                                                                            }
                                                                            return null;
                                                                        })()}
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
                                                                className="w-full pl-4 pr-16 py-3 bg-white rounded-xl border border-gray-200 text-sm font-sans font-bold text-gray-900 outline-none focus:border-emerald-500 shadow-sm transition-all"
                                                                min={1}
                                                                value={stop.nights === 0 ? "" : stop.nights}
                                                                onFocus={e => { if (stop.nights === 0) e.target.value = "" }}
                                                                onChange={(e) => {
                                                                    let val = e.target.value.replace(/^0+/, '');
                                                                    const newPlans = [...tierPlans];
                                                                    if (val === "") newPlans[planIdx].stops[stopIdx].nights = 0;
                                                                    else newPlans[planIdx].stops[stopIdx].nights = Math.max(0, parseInt(val) || 0);
                                                                    setTierPlans(newPlans);
                                                                }}
                                                                onBlur={e => {
                                                                    if (e.target.value === "") {
                                                                        const newPlans = [...tierPlans];
                                                                        newPlans[planIdx].stops[stopIdx].nights = 0;
                                                                        setTierPlans(newPlans);
                                                                    }
                                                                }}
                                                            />
                                                            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-300 uppercase">NTS</span>
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
                                                                            
                                                                            // Set star rating from room category default
                                                                            newPlans[planIdx].stops[stopIdx].starRating = hotel?.starRating || room.starRating || 3;
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
                                                                    className="w-full pl-4 pr-32 py-2.5 bg-white/50 rounded-lg border border-gray-200 text-xs font-sans font-bold text-emerald-700 outline-none focus:border-emerald-400 transition-all"
                                                                    value={stop.ratePerNight === 0 ? "" : stop.ratePerNight}
                                                                    onFocus={e => { if (stop.ratePerNight === 0) e.target.value = "" }}
                                                                    onChange={(e) => {
                                                                        let val = e.target.value.replace(/^0+/, '');
                                                                        const newPlans = [...tierPlans];
                                                                        if (val === "") newPlans[planIdx].stops[stopIdx].ratePerNight = 0;
                                                                        else newPlans[planIdx].stops[stopIdx].ratePerNight = Math.max(0, parseInt(val) || 0);
                                                                        setTierPlans(newPlans);
                                                                    }}
                                                                    onBlur={e => {
                                                                        if (e.target.value === "") {
                                                                            const newPlans = [...tierPlans];
                                                                            newPlans[planIdx].stops[stopIdx].ratePerNight = 0;
                                                                            setTierPlans(newPlans);
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="absolute right-9 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-emerald-100/50 px-2 py-1 rounded text-[9px] font-bold text-emerald-700">
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
                                <input type="number" className={`${inputClass} pr-10`} style={inputStyle} placeholder="Price (₹)" value={t.price === 0 ? "" : t.price} onFocus={e => { if (t.price === 0) e.target.value = "" }} onChange={e => { let val = e.target.value.replace(/^0+/, ''); const tr = [...transfers]; if (val === "") tr[idx].price = 0; else tr[idx].price = Math.max(0, parseInt(val) || 0); setTransfers(tr); }} onBlur={e => { if (e.target.value === "") { const tr = [...transfers]; tr[idx].price = 0; setTransfers(tr); } }} />
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
                                                <div className="relative group/dropdown">
                                                    <div className="relative">
                                                        <input 
                                                            className="w-full px-3 py-2.5 text-xs rounded-lg font-sans font-semibold tracking-wide outline-none transition-all border pr-10"
                                                            style={{ 
                                                                background: '#FFFFFF', 
                                                                color: '#052210', 
                                                                borderColor: '#e5e7eb', 
                                                            }}
                                                            placeholder={destPresetDays.length > 0 ? "Search or Type Preset Day..." : "No preset days found"}
                                                            value={openPresetDropdown === idx ? localPresetSearch : ""}
                                                            onFocus={() => {
                                                                if (destPresetDays.length > 0) {
                                                                    setOpenPresetDropdown(idx);
                                                                    setLocalPresetSearch("");
                                                                }
                                                            }}
                                                            onBlur={() => setTimeout(() => setOpenPresetDropdown(null), 200)}
                                                            onChange={(e) => setLocalPresetSearch(e.target.value)}
                                                            disabled={destPresetDays.length === 0}
                                                        />
                                                        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-600 transition-transform duration-200 ${openPresetDropdown === idx ? 'rotate-180' : ''}`} />
                                                    </div>

                                                    {openPresetDropdown === idx && (
                                                        <div className="absolute z-[110] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] max-h-80 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <div className="overflow-y-auto py-1 custom-scrollbar max-h-80">
                                                                {destPresetDays
                                                                    .filter(p => !localPresetSearch || (p.title || "").toLowerCase().includes(localPresetSearch.toLowerCase()))
                                                                    .map((p) => (
                                                                        <div 
                                                                            key={p.id} 
                                                                            className="px-4 py-3.5 hover:bg-emerald-50/50 text-xs font-sans cursor-pointer transition-colors border-b border-gray-50 last:border-0 group/item"
                                                                            onMouseDown={(e) => { 
                                                                                e.preventDefault();
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
                                                                {localPresetSearch && !destPresetDays.some(p => (p.title || "").toLowerCase() === localPresetSearch.toLowerCase()) && (
                                                                    <div 
                                                                        className="px-4 py-3.5 hover:bg-emerald-50/50 text-xs font-bold text-emerald-600 italic cursor-pointer flex items-center justify-between border-t border-gray-50"
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            const d = [...dayPlans];
                                                                            d[idx].title = localPresetSearch;
                                                                            setDayPlans(d);
                                                                            setOpenPresetDropdown(null);
                                                                        }}
                                                                    >
                                                                        ➕ Add Custom Day: "{localPresetSearch}"
                                                                        <Plus className="w-3.5 h-3.5" />
                                                                    </div>
                                                                )}
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
                                          {/* Location - Custom Searchable Dropdowns - Hidden for last day */}
                                        {idx < dayPlans.length - 1 && (
                                            <div className="animate-fade-in mb-3">
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
                                                                {localHotelSearch && !(destinations?.find((d: any) => d.id === destinationId)?.subDestinations || []).includes(localHotelSearch) && (
                                                                    <div 
                                                                        className="px-4 py-2.5 hover:bg-emerald-50 text-sm font-sans cursor-pointer italic text-emerald-600 flex items-center justify-between border-b border-gray-50"
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            const d = [...dayPlans]; d[idx].overnightStay = localHotelSearch; setDayPlans(d); setOpenHotelDropdown(null);
                                                                        }}
                                                                    >
                                                                        Add "{localHotelSearch}"
                                                                        <Plus className="w-3.5 h-3.5" />
                                                                    </div>
                                                                )}
                                                                {(destinations?.find((d: any) => d.id === destinationId)?.subDestinations || [])
                                                                    .slice()
                                                                    .sort((a, b) => {
                                                                        const s = (localHotelSearch || "").toLowerCase().trim();
                                                                        if (!s) return a.localeCompare(b);
                                                                        const aMatch = a.toLowerCase().includes(s);
                                                                        const bMatch = b.toLowerCase().includes(s);
                                                                        if (aMatch && !bMatch) return -1;
                                                                        if (!aMatch && bMatch) return 1;
                                                                        return a.localeCompare(b);
                                                                    })
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
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-2">
                                            <label className="font-sans text-[10px] tracking-wider uppercase mb-1.5 block font-semibold" style={{ color: '#059669' }}>Highlights</label>
                                            <input className={inputClass} style={inputStyle} placeholder="Highlights (comma-separated)" value={day.highlights?.join(",") || ""} onChange={e => { const d = [...dayPlans]; d[idx].highlights = e.target.value.split(","); setDayPlans(d) }} />
                                        </div>

                                        {/* Optional Pricing - hidden in package mode */}
                                        {(mode !== "package" && itinModule !== "built-package") && (
                                        <div className="pt-3" style={{ borderTop: '1px solid #f3f4f6' }}>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="font-sans text-[10px] tracking-wider uppercase mb-1.5 block font-semibold" style={{ color: 'rgba(5,34,16,0.4)' }}>Optional Cost (₹)</label>
                                                    <input type="number" className={`${inputClass} pr-10`} style={inputStyle} placeholder="e.g. 1500" value={day.optionalPrice || ""} onFocus={e => { if (!day.optionalPrice) e.target.value = "" }} onChange={e => { let val = e.target.value.replace(/^0+/, ''); const d = [...dayPlans]; if (val === "") d[idx].optionalPrice = 0; else d[idx].optionalPrice = Math.max(0, parseInt(val) || 0); setDayPlans(d); }} onBlur={e => { if (e.target.value === "") { const d = [...dayPlans]; d[idx].optionalPrice = 0; setDayPlans(d); } }} />
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

                {/* STEP 6: Inclusions & Notes */}
                {step === 6 && (() => {
                    // Seed from destination defaults on first visit
                    const selectedDest = destinations.find((d: any) => d.id === destinationId)
                    const destPdf = selectedDest?.pdfTemplate || {}
                    if (!inclusionsSeeded && overrideInclusions === null) {
                        // Use setTimeout to avoid setState during render
                        setTimeout(() => {
                            setOverrideInclusions([...(destPdf.inclusions || [])])
                            setOverrideExclusions([...(destPdf.exclusions || [])])
                            setOverrideImportantNotes([...(destPdf.importantNotes || [])])
                            setOverrideTermsConditions([...(destPdf.termsAndConditions || [])])
                            setOverridePaymentPolicy([...(destPdf.paymentPolicy || [])])
                            setOverrideCancellationPolicy([...(destPdf.cancellationPolicy || [])])
                            setInclusionsSeeded(true)
                        }, 0)
                    }

                    // Track original defaults for comparison
                    const defaults: Record<string, string[]> = {
                        inclusions: destPdf.inclusions || [],
                        exclusions: destPdf.exclusions || [],
                        importantNotes: destPdf.importantNotes || [],
                        termsConditions: destPdf.termsAndConditions || [],
                        paymentPolicy: destPdf.paymentPolicy || [],
                        cancellationPolicy: destPdf.cancellationPolicy || [],
                    }

                    const sections = [
                        { key: "inclusions", label: "Inclusions", data: overrideInclusions, setter: setOverrideInclusions, icon: "✓", color: "#059669", bgColor: "#ecfdf5", borderColor: "#a7f3d0" },
                        { key: "exclusions", label: "Exclusions", data: overrideExclusions, setter: setOverrideExclusions, icon: "✕", color: "#dc2626", bgColor: "#fef2f2", borderColor: "#fecaca" },
                        { key: "importantNotes", label: "Important Notes", data: overrideImportantNotes, setter: setOverrideImportantNotes, icon: "⚠", color: "#d97706", bgColor: "#fffbeb", borderColor: "#fde68a" },
                        { key: "termsConditions", label: "Terms & Conditions", data: overrideTermsConditions, setter: setOverrideTermsConditions, icon: "§", color: "#4f46e5", bgColor: "#eef2ff", borderColor: "#c7d2fe" },
                        { key: "paymentPolicy", label: "Payment Policy", data: overridePaymentPolicy, setter: setOverridePaymentPolicy, icon: "₹", color: "#0891b2", bgColor: "#ecfeff", borderColor: "#a5f3fc" },
                        { key: "cancellationPolicy", label: "Cancellation Policy", data: overrideCancellationPolicy, setter: setOverrideCancellationPolicy, icon: "⊘", color: "#be185d", bgColor: "#fdf2f8", borderColor: "#fbcfe8" },
                    ]

                    const checkIfCustomised = () => {
                        const checks = sections.map(s => {
                            const current = s.data || []
                            const def = defaults[s.key] || []
                            if (current.length !== def.length) return true
                            return current.some((item, i) => item !== def[i])
                        })
                        return checks.some(Boolean)
                    }

                    const handleItemEdit = (section: typeof sections[0], idx: number, value: string) => {
                        const arr = [...(section.data || [])]
                        arr[idx] = value
                        section.setter(arr)
                        setTimeout(() => setInclusionsCustomised(checkIfCustomised()), 0)
                    }

                    const handleItemDelete = (section: typeof sections[0], idx: number) => {
                        const arr = [...(section.data || [])]
                        arr.splice(idx, 1)
                        section.setter(arr)
                        setTimeout(() => setInclusionsCustomised(checkIfCustomised()), 0)
                    }

                    const handleItemAdd = (section: typeof sections[0]) => {
                        const arr = [...(section.data || []), ""]
                        section.setter(arr)
                        setTimeout(() => setInclusionsCustomised(true), 0)
                    }

                    const handleResetSection = (section: typeof sections[0]) => {
                        const def = [...(defaults[section.key] || [])]
                        section.setter(def)
                        setTimeout(() => {
                            // Re-check all sections after this reset
                            const isCustom = sections.some(s => {
                                const current = s.key === section.key ? def : (s.data || [])
                                const d = defaults[s.key] || []
                                if (current.length !== d.length) return true
                                return current.some((item, i) => item !== d[i])
                            })
                            setInclusionsCustomised(isCustom)
                        }, 0)
                    }

                    const getItemStatus = (sectionKey: string, idx: number, value: string) => {
                        const def = defaults[sectionKey] || []
                        if (idx >= def.length) return "new"
                        if (value !== def[idx]) return "edited"
                        return "unchanged"
                    }

                    return (
                        <div className="space-y-5">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#ecfdf5' }}><FileText className="w-3.5 h-3.5" style={{ color: '#059669' }} /></div>
                                <div className="flex-1">
                                    <h2 className="font-serif text-lg sm:text-xl tracking-wide" style={{ color: '#052210' }}>Inclusions & Notes</h2>
                                    <p className="font-sans text-[11px]" style={{ color: '#9ca3af' }}>Customise inclusions, exclusions, terms & policies for this trip</p>
                                </div>
                                {/* Source badge */}
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-sans text-[10px] font-bold tracking-wider uppercase ${inclusionsCustomised ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`} style={{ border: '1px solid' }}>
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: inclusionsCustomised ? '#0d9488' : '#d97706' }} />
                                    {inclusionsCustomised ? "Customised" : "Destination Defaults"}
                                </div>
                            </div>

                            {!destinationId && (
                                <div className="text-center py-10 rounded-xl" style={{ background: '#f9fafb', border: '2px dashed #d1d5db' }}>
                                    <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: '#d1d5db' }} />
                                    <p className="font-sans text-sm" style={{ color: '#9ca3af' }}>Select a destination in Step 1 to load default content</p>
                                </div>
                            )}

                            {destinationId && sections.map(section => {
                                const items = section.data || []
                                const isExpanded = expandedIncSections[section.key]
                                const editedCount = items.filter((_, i) => getItemStatus(section.key, i, items[i]) !== "unchanged").length
                                const isDefault = !items.some((item, i) => getItemStatus(section.key, i, item) !== "unchanged") && items.length === (defaults[section.key]?.length || 0)

                                return (
                                    <div key={section.key} className="rounded-xl overflow-hidden transition-all duration-200" style={{ border: `1px solid ${section.borderColor}` }}>
                                        {/* Section Header */}
                                        <button
                                            onClick={() => setExpandedIncSections(prev => ({ ...prev, [section.key]: !prev[section.key] }))}
                                            className="w-full flex items-center gap-3 px-5 py-4 transition-colors"
                                            style={{ background: section.bgColor }}
                                        >
                                            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: '#FFFFFF', color: section.color, border: `1px solid ${section.borderColor}` }}>
                                                {section.icon}
                                            </span>
                                            <span className="font-sans text-sm font-bold tracking-wide flex-1 text-left" style={{ color: '#052210' }}>{section.label}</span>
                                            <span className="font-sans text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full" style={{ background: '#FFFFFF', color: isDefault ? '#9ca3af' : section.color, border: `1px solid ${isDefault ? '#e5e7eb' : section.borderColor}` }}>
                                                {items.length} item{items.length !== 1 ? 's' : ''}{editedCount > 0 ? ` · ${editedCount} edited` : isDefault ? ' · default' : ''}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} style={{ color: section.color }} />
                                        </button>

                                        {/* Expanded Content */}
                                        {isExpanded && (
                                            <div className="px-5 py-4 space-y-2 bg-white">
                                                {/* Reset Button */}
                                                {!isDefault && (
                                                    <div className="flex justify-end mb-2">
                                                        <button
                                                            onClick={() => handleResetSection(section)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans text-[10px] font-bold tracking-wider uppercase transition-all hover:bg-gray-100"
                                                            style={{ color: '#6b7280', border: '1px solid #e5e7eb' }}
                                                        >
                                                            <RotateCcw className="w-3 h-3" /> Reset to defaults
                                                        </button>
                                                    </div>
                                                )}

                                                {items.length === 0 && (
                                                    <p className="font-sans text-xs italic py-3 text-center" style={{ color: '#9ca3af' }}>No items. Click "Add" below to get started.</p>
                                                )}

                                                {items.map((item, idx) => {
                                                    const status = getItemStatus(section.key, idx, item)
                                                    const rowBg = status === "edited" ? '#E1F5EE' : status === "new" ? '#E6F1FB' : '#FFFFFF'
                                                    return (
                                                        <div key={idx} className="flex items-center gap-2 group rounded-lg px-3 py-2 transition-colors" style={{ background: rowBg, border: '1px solid #f3f4f6' }}>
                                                            <span className="font-sans text-[10px] font-bold w-5 text-center flex-shrink-0" style={{ color: '#9ca3af' }}>{idx + 1}</span>
                                                            <input
                                                                className="flex-1 font-sans text-sm bg-transparent outline-none px-2 py-1"
                                                                style={{ color: '#052210' }}
                                                                value={item}
                                                                onChange={(e) => handleItemEdit(section, idx, e.target.value)}
                                                                placeholder={`Enter ${section.label.toLowerCase()} item...`}
                                                            />
                                                            {status !== "unchanged" && (
                                                                <span className="font-sans text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded flex-shrink-0" style={{
                                                                    background: status === "edited" ? '#d1fae5' : '#dbeafe',
                                                                    color: status === "edited" ? '#065f46' : '#1e40af',
                                                                }}>
                                                                    {status}
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={() => handleItemDelete(section, idx)}
                                                                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all flex-shrink-0"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                            </button>
                                                        </div>
                                                    )
                                                })}

                                                <button
                                                    onClick={() => handleItemAdd(section)}
                                                    className="w-full py-2.5 rounded-lg border-2 border-dashed font-sans text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:bg-gray-50"
                                                    style={{ borderColor: section.borderColor, color: section.color }}
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> Add {section.label.replace(/s$/, '').replace(/ & .*/, '')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )
                })()}

                {/* STEP 7: Pricing */}
                {step === 7 && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#ecfdf5' }}><DollarSign className="w-3.5 h-3.5" style={{ color: '#059669' }} /></div>
                            <div>
                                <h2 className="font-serif text-lg sm:text-xl tracking-wide" style={{ color: '#052210' }}>Pricing</h2>
                                <p className="font-sans text-[11px]" style={{ color: '#9ca3af' }}>Per-plan breakdown — all values update in real time</p>
                            </div>
                        </div>

                        {/* SECTION 1: Per-Plan Hotel Cost */}
                        {plans.length > 0 && (
                            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                                <div className="px-4 py-3" style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    <p className="font-sans text-[11px] font-bold uppercase tracking-widest" style={{ color: '#059669' }}>Hotel Cost per Plan ({nights} nights)</p>
                                    <p className="font-sans text-[10px] mt-0.5" style={{ color: '#9ca3af' }}>Pre-filled from Hotels step · Editable to override</p>
                                </div>
                                <div className={`grid gap-0 divide-x`} style={{ gridTemplateColumns: `repeat(${plans.length}, minmax(0, 1fr))` }}>
                                    {plans.map((plan, idx) => {
                                        const override = planHotelCostOverrides[idx]
                                        const displayVal = override !== null && override !== undefined ? override : (plan.autoHotelCost ?? plan.hotelCost ?? 0)
                                        return (
                                            <div key={idx} className="p-4 flex flex-col gap-2">
                                                <p className="font-sans text-[10px] font-black uppercase tracking-wider" style={{ color: '#052210' }}>Plan {idx + 1}: {plan.category}</p>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-sans text-sm font-bold" style={{ color: '#059669' }}>₹</span>
                                                    <input
                                                        type="number"
                                                        className="w-full pl-7 pr-3 py-2 rounded-lg font-sans text-sm font-bold outline-none"
                                                        style={{ background: '#FFFFFF', border: '1px solid #d1d5db', color: '#052210' }}
                                                        value={displayVal === 0 ? "" : displayVal}
                                                        placeholder="0"
                                                        onChange={e => {
                                                            let val = e.target.value.replace(/^0+/, '')
                                                            const newOverrides = [...planHotelCostOverrides]
                                                            newOverrides[idx] = val === "" ? (plan.autoHotelCost ?? 0) : Math.max(0, parseInt(val) || 0)
                                                            setPlanHotelCostOverrides(newOverrides)
                                                        }}
                                                        onBlur={e => {
                                                            if (e.target.value === "") {
                                                                const newOverrides = [...planHotelCostOverrides]
                                                                newOverrides[idx] = plan.autoHotelCost ?? 0
                                                                setPlanHotelCostOverrides(newOverrides)
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                {plan.autoHotelCost > 0 && (
                                                    <p className="font-sans text-[9px]" style={{ color: '#9ca3af' }}>Auto: ₹{plan.autoHotelCost.toLocaleString()}</p>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* SECTION 2: Shared Fields */}
                        <div className="space-y-2">
                            <p className="font-sans text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>Shared Costs (applies to all plans)</p>

                            {/* Transfer Cost */}
                            <div className="flex justify-between items-center p-3.5 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                                <div>
                                    <span className="font-sans text-sm font-medium" style={{ color: '#374151' }}>Transfer Cost</span>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-sans text-sm font-bold" style={{ color: '#6b7280' }}>₹</span>
                                    <input
                                        type="number"
                                        className="w-36 pl-7 pr-3 py-2 rounded-lg font-sans text-sm font-bold text-right outline-none"
                                        style={inputStyle}
                                        placeholder="0"
                                        value={(() => {
                                            const autoTransferSum = transfers.reduce((s, t) => s + (Number(t.price) || 0), 0)
                                            const displayVal = manualTransferCost > 0 ? manualTransferCost : autoTransferSum
                                            return displayVal === 0 ? "" : displayVal
                                        })()}
                                        onChange={e => { 
                                            let val = e.target.value.replace(/^0+/, ''); 
                                            if (val === "") setManualTransferCost(0); 
                                            else setManualTransferCost(Math.max(0, parseInt(val) || 0)); 
                                        }}
                                        onBlur={e => { if (e.target.value === "") setManualTransferCost(0); }}
                                    />
                                </div>
                            </div>

                            {/* Activities Cost */}
                            <div className="flex justify-between items-center p-3.5 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                                <div>
                                    <span className="font-sans text-sm font-medium" style={{ color: '#374151' }}>Activities Cost</span>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-sans text-sm font-bold" style={{ color: '#6b7280' }}>₹</span>
                                    <input
                                        type="number"
                                        className="w-36 pl-7 pr-3 py-2 rounded-lg font-sans text-sm font-bold text-right outline-none"
                                        style={inputStyle}
                                        placeholder="0"
                                        value={(() => {
                                            const autoActivitySum = selectedActivities.reduce((s, a) => {
                                                const p = a.isActivity ? ((Number(a.price) || 0) + (Number(a.vehiclePrice) || 0)) : (Number(a.entryFee) || Number(a.price) || 0)
                                                return s + p * (adults + children)
                                            }, 0)
                                            const displayVal = manualActivityCost > 0 ? manualActivityCost : autoActivitySum
                                            return displayVal === 0 ? "" : displayVal
                                        })()}
                                        onChange={e => { 
                                            let val = e.target.value.replace(/^0+/, ''); 
                                            if (val === "") setManualActivityCost(0); 
                                            else setManualActivityCost(Math.max(0, parseInt(val) || 0)); 
                                        }}
                                        onBlur={e => { if (e.target.value === "") setManualActivityCost(0); }}
                                    />
                                </div>
                            </div>

                            {/* Margin */}
                            <div className="flex justify-between items-center p-3.5 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                                <span className="font-sans text-sm font-medium" style={{ color: '#374151' }}>Margin % (applied to base cost)</span>
                                <input type="number" className="w-24 pl-3 pr-3 py-2 rounded-lg font-sans text-sm font-bold text-right outline-none" style={inputStyle} placeholder="15" value={margin === 0 ? "" : margin} onChange={e => { let val = e.target.value.replace(/^0+/, ''); if (val === "") setMargin(0); else setMargin(Math.max(0, parseInt(val) || 0)); }} onBlur={e => { if (e.target.value === "") setMargin(15); }} />
                            </div>
                        </div>

                        {/* SECTION 3: Plan Cards with live breakdown */}
                        <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, #a7f3d0, transparent)' }} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {plans.map((plan, idx) => {
                                const pax = adults + children
                                const displayTotal = plan.totalPrice || 0
                                const displayPerPerson = plan.perPersonPrice || 0

                                return (
                                    <div key={idx} className="flex flex-col p-5 rounded-2xl gap-4" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                                        {/* Plan label */}
                                        <div>
                                            <p className="font-sans text-[11px] font-bold tracking-widest uppercase" style={{ color: '#059669' }}>Plan {idx + 1}</p>
                                            <p className="font-serif text-xl font-black uppercase leading-tight" style={{ color: '#052210' }}>{plan.category}</p>
                                        </div>

                                        {/* Breakdown table */}
                                        <div className="rounded-xl overflow-hidden text-[11px] font-sans" style={{ background: '#FFFFFF', border: '1px solid #d1fae5' }}>
                                            {[
                                                { label: `Hotel Cost (${nights}N)`, val: plan.costBreakup?.hotelCost ?? 0 },
                                                { label: '+ Transfer Cost', val: plan.costBreakup?.transferCost ?? 0 },
                                                { label: '+ Activities Cost', val: plan.costBreakup?.activityCost ?? 0 },
                                            ].map((row, i) => (
                                                <div key={i} className="flex justify-between px-3 py-2" style={{ borderBottom: '1px solid #d1fae5' }}>
                                                    <span style={{ color: '#6b7280' }}>{row.label}</span>
                                                    <span className="font-bold" style={{ color: '#052210' }}>₹{(row.val).toLocaleString()}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between px-3 py-2" style={{ borderBottom: '1px solid #d1fae5', background: '#f0fdf4' }}>
                                                <span style={{ color: '#6b7280' }}>Base Total</span>
                                                <span className="font-bold" style={{ color: '#052210' }}>₹{((plan.costBreakup?.hotelCost ?? 0) + (plan.costBreakup?.transferCost ?? 0) + (plan.costBreakup?.activityCost ?? 0)).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between px-3 py-2" style={{ borderBottom: '1px solid #d1fae5' }}>
                                                <span style={{ color: '#6b7280' }}>+ Margin ({margin}%)</span>
                                                <span className="font-bold" style={{ color: '#059669' }}>₹{(plan.costBreakup?.margin ?? 0).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* Override field */}
                                        {(mode === "package" || itinModule === "built-package") && (
                                            <div>
                                                <label className="font-sans text-[10px] uppercase tracking-wider mb-1 block" style={{ color: '#059669' }}>Package Total (₹)</label>
                                                <input
                                                    type="number"
                                                    className="w-full pl-3 pr-3 py-2 rounded-lg font-sans text-sm font-bold outline-none"
                                                    style={{ background: '#FFFFFF', border: '1px solid #6ee7b7', color: '#052210' }}
                                                    placeholder="Enter custom total..."
                                                    value={plan.totalPrice || ""}
                                                    onChange={e => {
                                                        let val = e.target.value.replace(/^0+/, '')
                                                        const newPlans = [...plans]
                                                        const newTotal = val === "" ? 0 : Math.max(0, parseInt(val) || 0)
                                                        newPlans[idx].totalPrice = newTotal
                                                        const finalPP = pax > 0 ? Math.round(newTotal / pax) : newTotal
                                                        newPlans[idx].perPersonPrice = finalPP
                                                        setPlans(newPlans)
                                                        if (idx === 0) { setTotalPrice(newTotal); setPerPersonPrice(finalPP) }
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* Total display */}
                                        <div className="space-y-1.5 pt-1" style={{ borderTop: '2px solid #a7f3d0' }}>
                                            <div className="flex justify-between items-center">
                                                <p className="font-sans text-[11px] font-bold uppercase tracking-wider" style={{ color: '#059669' }}>Total</p>
                                                <p className="font-serif text-2xl font-black" style={{ color: '#059669' }}>₹{displayTotal.toLocaleString()}</p>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="font-sans text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#6ee7b7' }}>Per Person ({pax} pax)</p>
                                                <p className="font-sans text-sm font-bold" style={{ color: '#052210' }}>₹{displayPerPerson.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* STEP 8: Preview */}
                {step === 8 && (
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
                                { l: "Hotels", v: selectedHotels.length ? selectedHotels.map((h: any) => {
                                    const details = [h.location, h.roomType, h.mealPlan ? h.mealPlan.split(' ')[0] : '', h.selectedNights ? `${h.selectedNights} Nights` : ''].filter(Boolean).join(" • ");
                                    return `${h.name || h.hotelName}${details ? ` (${details})` : ""}`;
                                }).join(", ") : "No hotel selected" },
                                { l: "Activities", v: selectedActivities.map((a: any) => a.name || a.activityName).join(", ") || "None" },
                                { l: "Plans", v: plans.filter(p => (p.totalPrice || p.total) > 0).map(p => `${p.planName || p.hotelName} (₹${(p.totalPrice || p.total).toLocaleString()})`).join(" | ") || "None" }
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
