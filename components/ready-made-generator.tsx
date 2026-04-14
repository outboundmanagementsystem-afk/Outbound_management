"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import {
    getDestinations, getPackages, getPackage, getPackageDays, getPackageHotels, getPackageTransfers, getPackageActivities, getPackageFlights, getPackagePricing,
    createItinerary, addItineraryDay, addItineraryHotel, addItineraryTransfer, addItineraryActivity, addItineraryFlight, addItineraryPricing, getCustomers,
    createPackage, updatePackage, addPackageDay, addPackageHotel, addPackagePricing, getPresetDays, getHotels, deletePackage, clearPackageSubcollections
} from "@/lib/firestore"
import { PackageSearch, Loader2, Plus, ArrowLeft, Trash2, ChevronDown, Check } from "lucide-react"

export function ReadyMadeGenerator() {
    const { userProfile } = useAuth()
    const router = useRouter()

    // Core state
    const [packages, setPackages] = useState<any[]>([])
    const [destinations, setDestinations] = useState<any[]>([])
    const [customers, setCustomers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Generation State (Existing Flow)
    const [selectedDestId, setSelectedDestId] = useState("")
    const [selectedPkg, setSelectedPkg] = useState<any>(null)
    const [customerName, setCustomerName] = useState("")
    const [customerEmail, setCustomerEmail] = useState("")
    const [customerPhone, setCustomerPhone] = useState("")
    const [startDate, setStartDate] = useState("")
    const [adults, setAdults] = useState(2)
    const [children, setChildren] = useState(0)

    const [cwb, setCwb] = useState(0)
    const [cnb, setCnb] = useState(0)
    const [activePricing, setActivePricing] = useState<any[]>([])

    const [generating, setGenerating] = useState(false)

    // New Package Creation State (Admin Flow)
    const [isCreating, setIsCreating] = useState(false)
    const [presetDays, setPresetDays] = useState<any[]>([])
    const [presetHotels, setPresetHotels] = useState<any[]>([])
    const [creatingSaving, setCreatingSaving] = useState(false)

    const [newPkgDest, setNewPkgDest] = useState("")
    const [newPkgTier, setNewPkgTier] = useState("Deluxe")
    const [newPkgNights, setNewPkgNights] = useState(3)
    const [newPkgDays, setNewPkgDays] = useState(4)

    const [dayPlans, setDayPlans] = useState<string[]>([]) // Array of day plan IDs or names
    const [hotelStops, setHotelStops] = useState<any[]>([{ location: "", hotelId: "", mealPlan: "CP", nights: 2 }])
    const [paxPricing, setPaxPricing] = useState([
        { id: "2pax", label: "2 PAX", desc: "Min 2 pax rate", net: 0, margin: 20 },
        { id: "4pax", label: "4 PAX", desc: "Min 4 pax rate", net: 0, margin: 20 },
        { id: "6pax", label: "6 PAX", desc: "Min 6 pax rate", net: 0, margin: 18 },
        { id: "extra", label: "Extra bed", desc: "CWB / extra mattress", net: 0, margin: 20 },
        { id: "no", label: "No bed", desc: "CNB / without mattress", net: 0, margin: 20 },
    ])
    const [openStopIdx, setOpenStopIdx] = useState<number | null>(null)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [editingPkgId, setEditingPkgId] = useState<string | null>(null)
    const [fetchingPkgDetails, setFetchingPkgDetails] = useState(false)

    // Dynamic Pricing Helpers
    const getBracketPrice = (id: string) => {
        const item = activePricing.find(p => p.id === id);
        if (!item) return { net: 0, margin: 20, total: 0 };
        const total = (Number(item.net) || 0) + ((Number(item.net) || 0) * (Number(item.margin) || 0) / 100);
        return { net: Number(item.net) || 0, margin: Number(item.margin) || 0, total };
    }

    const currentAdultBracket = adults >= 6 ? "6pax" : (adults >= 4 ? "4pax" : "2pax");
    const adultPrice = getBracketPrice(currentAdultBracket);
    const cwbPrice = getBracketPrice("extra");
    const cnbPrice = getBracketPrice("no");

    const totalPrice = (adults * adultPrice.total) + (cwb * cwbPrice.total) + (cnb * cnbPrice.total);

    const isPeakSeason = startDate ? [10, 11, 0, 1].includes(new Date(startDate).getMonth()) : false;

    const selectedDest = destinations.find(d => d.id === newPkgDest);
    const subDestinations = selectedDest?.subDestinations || [];

    const filteredPresetHotels = presetHotels.filter(h => {
        if (!newPkgTier) return true;
        const target = newPkgTier.toLowerCase();
        const category = (h.category || h.tier || "Standard").toLowerCase();
        return category.includes(target) || target.includes(category);
    });

    const autoPackageName = `${newPkgNights}N/${newPkgDays}D ${selectedDest?.name || 'Destination'} – ${newPkgTier}`

    useEffect(() => {
        loadAll()
    }, [])

    const loadAll = async () => {
        try {
            const [pkgs, dests, custs] = await Promise.all([getPackages(), getDestinations(), getCustomers()])
            setPackages(pkgs)
            setDestinations(dests)
            setCustomers(custs)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    // When destination changes for creating package, fetch preset days & hotels
    useEffect(() => {
        if (newPkgDest) {
            getPresetDays(newPkgDest).then(setPresetDays).catch(console.error)
            getHotels(newPkgDest).then(setPresetHotels).catch(console.error)
        } else {
            setPresetDays([])
            setPresetHotels([])
        }
    }, [newPkgDest])

    useEffect(() => {
        // Adjust dayPlans array size when newPkgDays changes
        const diff = newPkgDays - dayPlans.length;
        if (diff > 0) {
            setDayPlans([...dayPlans, ...Array(diff).fill("")]);
        } else if (diff < 0) {
            setDayPlans(dayPlans.slice(0, newPkgDays));
        }
    }, [newPkgDays, dayPlans]);

    // Fetch pricing when package is selected for generation
    useEffect(() => {
        if (selectedPkg) {
            getPackagePricing(selectedPkg.id)
                .then(pricing => {
                    setActivePricing(pricing);
                    // Also reset defaults
                    setAdults(2);
                    setCwb(0);
                    setCnb(0);
                })
                .catch(err => {
                    console.error("Error fetching package pricing:", err);
                    setActivePricing([]);
                });
        }
    }, [selectedPkg]);

    const handleGenerate = async () => {
        if (!selectedPkg || !customerName || !startDate || totalPrice <= 0) {
            alert("Please fill all required fields and ensure total price is > 0")
            return
        }

        setGenerating(true)
        try {
            const [pkgRaw, days, hotels, transfers, activities, flights, pkgPricingRaw] = await Promise.all([
                getPackage(selectedPkg.id),
                getPackageDays(selectedPkg.id),
                getPackageHotels(selectedPkg.id),
                getPackageTransfers(selectedPkg.id),
                getPackageActivities(selectedPkg.id),
                getPackageFlights(selectedPkg.id),
                getPackagePricing(selectedPkg.id),
            ])

            const pkg: any = pkgRaw
            if (!pkg) throw new Error("Package not found")

            const start = new Date(startDate)
            const end = new Date(start)
            end.setDate(end.getDate() + (pkg.nights || 0))
            const endDate = end.toISOString().split('T')[0]

            const itinData = {
                ...pkg,
                customerName, customerEmail, customerPhone, startDate, endDate, adults, cwb, cnb,
                totalPrice: Math.round(totalPrice),
                perPersonPrice: Math.round(totalPrice / (adults + cwb + cnb)),
                createdBy: userProfile?.uid || "",
                createdByName: userProfile?.name || "",
                consultantName: userProfile?.name || "",
                consultantPhone: userProfile?.phone || "",
                status: "draft"
            } as any
            delete itinData.id
            delete itinData.packageName

            const itinId = await createItinerary(itinData)

            for (let i = 0; i < days.length; i++) {
                const day = days[i]
                const dDate = new Date(start)
                dDate.setDate(dDate.getDate() + i)
                await addItineraryDay(itinId, {
                    ...day,
                    date: dDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                })
            }

            for (const item of hotels) await addItineraryHotel(itinId, item)
            for (const item of transfers) await addItineraryTransfer(itinId, item)
            for (const item of activities) await addItineraryActivity(itinId, item)
            for (const item of flights) await addItineraryFlight(itinId, item)

            await addItineraryPricing(itinId, {
                hotelPrice: Number(adultPrice.net) || 0,
                transferPrice: 0,
                activityPrice: 0,
                flightPrice: 0,
                optionalPrice: 0,
                totalPrice: Math.round(totalPrice),
                perPersonPrice: Math.round(totalPrice / (adults + cwb + cnb)),
                margin: Number(adultPrice.margin) || 0,
                nights: pkg.nights || 0,
                adults, cwb, cnb
            })

            router.push(`/itinerary/${itinId}`)
        } catch (err) {
            console.error("Error generating itinerary:", err)
            alert("Failed to generate itinerary.")
            setGenerating(false)
        }
    }

    const handleEditPackage = async (pkg: any) => {
        if (!pkg || !pkg.id) return
        setFetchingPkgDetails(true)
        try {
            console.log("Editing package:", pkg.id, pkg.packageName)
            const [days, hotels, pricing] = await Promise.all([
                getPackageDays(pkg.id),
                getPackageHotels(pkg.id),
                getPackagePricing(pkg.id)
            ])

            // Update all creation states at once
            setNewPkgDest(pkg.destinationId || "")
            setNewPkgTier(pkg.tier || "Deluxe")
            setNewPkgNights(pkg.nights || 3)
            setNewPkgDays(pkg.days || 4)

            // Map days
            const sortedDays = days.sort((a: any, b: any) => (a.dayNumber || 0) - (b.dayNumber || 0))
            setDayPlans(sortedDays.map((d: any) => d.presetId || ""))

            // Map hotels
            if (hotels && hotels.length > 0) {
                setHotelStops(hotels.map((h: any) => ({
                    location: h.location || h.subDestination || "",
                    hotelId: h.hotelId || h.id || "", // Prioritize the actual template ID
                    mealPlan: h.mealPlan || "CP",
                    nights: h.nights || 1
                })))
            } else {
                setHotelStops([{ location: "", hotelId: "", mealPlan: "CP", nights: 2 }])
            }

            // Map pricing
            if (pricing && pricing.length > 0) {
                const updatedPricing = paxPricing.map(defaultPax => {
                    const match = (pricing as any[]).find((p: any) => p.label === defaultPax.label || p.id === defaultPax.id)
                    return match ? { ...defaultPax, net: match.net || 0, margin: match.margin || 20 } : defaultPax
                })
                setPaxPricing(updatedPricing)
            }

            setEditingPkgId(pkg.id)
            setIsCreating(true)
        } catch (err) {
            console.error("Error fetching package for edit:", err)
            alert("Failed to load package data for editing.")
        } finally {
            setFetchingPkgDetails(false)
        }
    }

    const handleSavePackage = async () => {
        if (!newPkgDest) {
            alert("Please select a destination")
            return
        }
        setCreatingSaving(true)
        try {
            const destName = destinations.find(d => d.id === newPkgDest)?.name || ""

            const pkgData = {
                packageName: autoPackageName,
                destinationId: newPkgDest,
                destination: destName,
                tier: newPkgTier,
                nights: newPkgNights,
                days: newPkgDays,
                status: "active"
            }

            let pkgId = editingPkgId
            if (pkgId) {
                await updatePackage(pkgId, pkgData)
                await clearPackageSubcollections(pkgId)
            } else {
                pkgId = await createPackage(pkgData)
            }

            // Save Day Plans
            for (let i = 0; i < dayPlans.length; i++) {
                const presetDay = presetDays.find(pd => pd.id === dayPlans[i])
                await addPackageDay(pkgId, {
                    dayNumber: i + 1,
                    title: presetDay ? presetDay.title || presetDay.name : "Day Plan",
                    description: presetDay?.description || "",
                    presetId: dayPlans[i] || ""
                })
            }

            // Save Hotels
            for (const stop of hotelStops) {
                const hotelInfo = presetHotels.find(h => h.id === stop.hotelId)
                if (hotelInfo || stop.location) {
                    await addPackageHotel(pkgId, {
                        location: stop.location,
                        hotelId: stop.hotelId,
                        hotelName: hotelInfo?.hotelName || hotelInfo?.name || "",
                        mealPlan: stop.mealPlan,
                        nights: stop.nights
                    })
                }
            }

            // Save Pricing
            const pricingPromises = paxPricing.map(pax => addPackagePricing(pkgId, pax));
            await Promise.all(pricingPromises);

            await loadAll()
            setIsCreating(false)
            setEditingPkgId(null)
            alert(editingPkgId ? "Package updated successfully!" : "Package saved successfully!")
        } catch (err) {
            console.error("Error saving package:", err)
            alert("Failed to save package.")
        } finally {
            setCreatingSaving(false)
        }
    }

    const handleDeletePackage = async (pkgId: string, pkgName: string) => {
        if (!window.confirm(`Are you sure you want to delete the package "${pkgName}"? This cannot be undone.`)) return;

        setIsDeleting(pkgId);
        try {
            // Use subcollection clear function
            await clearPackageSubcollections(pkgId);
            // Delete main doc
            await deletePackage(pkgId);

            setPackages(prev => prev.filter(p => p.id !== pkgId));
            if (selectedPkg?.id === pkgId) setSelectedPkg(null);
        } catch (error: any) {
            console.error("Error deleting package:", error);
            alert(`Failed to delete package: ${error.message || "Unknown error"}. Check Firestore permissions.`);
        } finally {
            setIsDeleting(null);
        }
    }

    const updatePaxPricing = (index: number, field: string, value: number) => {
        const newPax = [...paxPricing]
        newPax[index] = { ...newPax[index], [field]: value }
        setPaxPricing(newPax)
    }

    const getTierStyle = (tier: string) => {
        const t = tier.toLowerCase();
        if (t.includes('budget')) return { bg: '#EAF3DE', color: '#3B6D11', border: '#C0DD97' };
        if (t.includes('deluxe')) return { bg: '#E6F1FB', color: '#185FA5', border: '#B5D4F4' };
        if (t.includes('premium')) return { bg: '#FAEEDA', color: '#854F0B', border: '#FAC775' };
        if (t.includes('luxury') || t.includes('royal')) return { bg: '#FAECE7', color: '#993C1D', border: '#F4C8BA' };
        return { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Loading templates...</div>

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header section (always visible unless full screen creating takes over, but fits nicely at top) */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="font-serif text-2xl tracking-wide" style={{ color: '#052210' }}>Ready-Made Itineraries</h1>
                    <p className="font-sans text-[13px] mt-1" style={{ color: '#6b7280' }}>
                        {isCreating ? "Create a new package template." : "Select a package template and generate a custom itinerary instantly."}
                    </p>
                </div>
                {!isCreating && userProfile?.role === "admin" && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                setEditingPkgId(null)
                                setNewPkgDest("")
                                setNewPkgTier("Deluxe")
                                setNewPkgNights(3)
                                setNewPkgDays(4)
                                setDayPlans(Array(4).fill(""))
                                setHotelStops([{ location: "", hotelId: "", mealPlan: "CP", nights: 2 }])
                                setPaxPricing([
                                    { id: "2pax", label: "2 PAX", desc: "Min 2 pax rate", net: 0, margin: 20 },
                                    { id: "4pax", label: "4 PAX", desc: "Min 4 pax rate", net: 0, margin: 20 },
                                    { id: "6pax", label: "6 PAX", desc: "Min 6 pax rate", net: 0, margin: 18 },
                                    { id: "extra", label: "Extra bed", desc: "CWB / extra mattress", net: 0, margin: 20 },
                                    { id: "no", label: "No bed", desc: "CNB / without mattress", net: 0, margin: 20 },
                                ])
                                setIsCreating(true)
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3B6D11] text-[#EAF3DE] rounded-xl font-sans text-xs font-semibold hover:bg-[#2c520c] transition-colors"
                        >
                            <span className="flex items-center justify-center w-4 h-4 bg-white/20 rounded-full text-base leading-none pb-[1px]">+</span>
                            New package
                        </button>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAEEDA] text-[#854F0B] border border-[#FAC775]">Admin only</span>
                    </div>
                )}
            </div>

            {isCreating ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm max-w-full overflow-hidden">
                    <div className="flex items-center gap-2 mb-4">
                        <button onClick={() => { setIsCreating(false); setEditingPkgId(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h2 className="font-sans text-sm font-semibold tracking-wider uppercase text-gray-500">
                            {editingPkgId ? "Editing package" : "Creating new package"} — admin form
                        </h2>
                    </div>

                    <div className="space-y-6">
                        {/* STEP 1 */}
                        <div>
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#EAF3DE] border border-[#C0DD97] flex items-center justify-center text-[11px] font-bold text-[#3B6D11] flex-shrink-0">1</div>
                                <div>
                                    <h3 className="text-[13px] font-semibold text-gray-900">Package identity</h3>
                                    <p className="text-[11px] text-gray-500">Select destination and tier — everything else auto-fills from your DB</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-semibold tracking-wider uppercase text-gray-500 mb-1">Destination</label>
                                    <select className="px-2 py-1.5 bg-white border border-gray-200 rounded-md text-xs outline-none" value={newPkgDest} onChange={e => setNewPkgDest(e.target.value)}>
                                        <option value="">Select...</option>
                                        {destinations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-semibold tracking-wider uppercase text-gray-500 mb-1">Tier</label>
                                    <select className="px-2 py-1.5 bg-white border border-gray-200 rounded-md text-xs outline-none" value={newPkgTier} onChange={e => setNewPkgTier(e.target.value)}>
                                        <option>Budget</option>
                                        <option>Deluxe</option>
                                        <option>Super Deluxe</option>
                                        <option>Premium</option>
                                        <option>Luxury</option>
                                        <option>Royal</option>
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-semibold tracking-wider uppercase text-gray-500 mb-1">Nights</label>
                                    <input type="number" min="1" className="px-2 py-1.5 bg-white border border-gray-200 rounded-md text-xs outline-none" value={newPkgNights} onChange={e => setNewPkgNights(Number(e.target.value))} />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-semibold tracking-wider uppercase text-gray-500 mb-1">Days</label>
                                    <input type="number" min="1" className="px-2 py-1.5 bg-white border border-gray-200 rounded-md text-xs outline-none" value={newPkgDays} onChange={e => setNewPkgDays(Number(e.target.value))} />
                                </div>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mt-3">
                                <label className="flex items-center gap-2 text-[10px] font-semibold tracking-wider uppercase text-gray-500 mb-1">
                                    Package name <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#E6F1FB] text-[#185FA5] border border-[#B5D4F4] normal-case">auto-generated</span>
                                </label>
                                <div className="text-sm font-semibold text-gray-900">{autoPackageName}</div>
                                <p className="text-[10px] text-gray-500 mt-1">Generated from your selections above</p>
                            </div>
                        </div>

                        <hr className="border-gray-200" />

                        {/* STEP 2 */}
                        <div>
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#EAF3DE] border border-[#C0DD97] flex items-center justify-center text-[11px] font-bold text-[#3B6D11] flex-shrink-0">2</div>
                                <div>
                                    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
                                        Day-wise plan
                                        <span className="text-[9px] font-normal px-1.5 py-0.5 rounded bg-[#E6F1FB] text-[#185FA5] border border-[#B5D4F4]">fetched from Day Plans</span>
                                    </h3>
                                    <p className="text-[11px] text-gray-500">Pick from the day plans already created</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {dayPlans.map((planId, idx) => (
                                    <div key={idx} className="flex items-center gap-2 max-w-full">
                                        <div className="w-12 flex-shrink-0 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-center text-xs font-semibold text-gray-500">Day {idx + 1}</div>
                                        <select
                                            className="flex-1 min-w-0 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs outline-none"
                                            value={planId}
                                            onChange={e => {
                                                const newPlans = [...dayPlans];
                                                newPlans[idx] = e.target.value;
                                                setDayPlans(newPlans);
                                            }}
                                        >
                                            <option value="">Select activity/plan for today...</option>
                                            {presetDays.map(pd => (
                                                <option key={pd.id} value={pd.id}>{pd.title || pd.name || `Plan ${pd.id}`}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <hr className="border-gray-200" />

                        {/* STEP 3 */}
                        <div>
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#EAF3DE] border border-[#C0DD97] flex items-center justify-center text-[11px] font-bold text-[#3B6D11] flex-shrink-0">3</div>
                                <div>
                                    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
                                        Hotels per stop
                                        <span className="text-[9px] font-normal px-1.5 py-0.5 rounded bg-[#E6F1FB] text-[#185FA5] border border-[#B5D4F4]">fetched from Hotels ({newPkgTier} filtered)</span>
                                    </h3>
                                    <p className="text-[11px] text-gray-500">Only {newPkgTier} hotels for {destinations.find(d => d.id === newPkgDest)?.name || 'the destination'} are shown</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="grid grid-cols-[minmax(100px,3fr)_minmax(100px,3fr)_minmax(80px,1.5fr)_minmax(60px,1fr)_80px] gap-2 mb-1 px-1">
                                    <div className="text-[10px] font-semibold tracking-wider uppercase text-gray-500">Location / Stop</div>
                                    <div className="text-[10px] font-semibold tracking-wider uppercase text-gray-500">Hotel Name</div>
                                    <div className="text-[10px] font-semibold tracking-wider uppercase text-gray-500">Meal Plan</div>
                                    <div className="text-[10px] font-semibold tracking-wider uppercase text-gray-500">Nights</div>
                                    <div></div>
                                </div>
                                {hotelStops.map((stop, idx) => (
                                    <div key={idx} className="grid grid-cols-[minmax(100px,3fr)_minmax(100px,3fr)_minmax(80px,1.5fr)_minmax(60px,1fr)_80px] gap-2 items-center">
                                        <div className="relative">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    className="w-full pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-emerald-400 transition-all font-medium"
                                                    placeholder="Location (e.g. Port Blair)"
                                                    value={stop.location}
                                                    onFocus={() => setOpenStopIdx(idx)}
                                                    onBlur={() => setTimeout(() => setOpenStopIdx(null), 200)}
                                                    onChange={e => {
                                                        const newStops = [...hotelStops];
                                                        newStops[idx].location = e.target.value;
                                                        setHotelStops(newStops);
                                                    }}
                                                />
                                                <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none transition-transform duration-200 ${openStopIdx === idx ? 'rotate-180' : ''}`} />
                                            </div>

                                            {openStopIdx === idx && (
                                                <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl max-h-48 overflow-auto py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    {subDestinations
                                                        .filter((loc: string) => !stop.location || loc.toLowerCase().includes(stop.location.toLowerCase()))
                                                        .map((loc: string) => (
                                                            <div
                                                                key={loc}
                                                                className="px-3 py-2 hover:bg-emerald-50 text-xs font-sans cursor-pointer flex items-center justify-between group transition-colors"
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    const newStops = [...hotelStops];
                                                                    newStops[idx].location = loc;
                                                                    setHotelStops(newStops);
                                                                    setOpenStopIdx(null);
                                                                }}
                                                            >
                                                                <span className={stop.location === loc ? "text-emerald-700 font-bold" : "text-gray-700"}>{loc}</span>
                                                                {stop.location === loc && <Check className="w-3 h-3 text-emerald-600" />}
                                                            </div>
                                                        ))}
                                                    {stop.location && !subDestinations.some((loc: string) => loc.toLowerCase() === stop.location.toLowerCase()) && (
                                                        <div
                                                            className="px-3 py-2 hover:bg-emerald-50 text-xs font-sans cursor-pointer italic text-emerald-600 flex items-center justify-between"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                setOpenStopIdx(null);
                                                            }}
                                                        >
                                                            Use "{stop.location}"
                                                            <Plus className="w-2.5 h-2.5" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <select
                                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs outline-none truncate"
                                            value={stop.hotelId}
                                            onChange={e => {
                                                const newStops = [...hotelStops];
                                                newStops[idx].hotelId = e.target.value;
                                                setHotelStops(newStops);
                                            }}
                                        >
                                            <option value="">Select Hotel...</option>
                                            {filteredPresetHotels
                                                .filter((h: any) => !stop.location || (h.subDestination || "").toLowerCase().includes(stop.location.toLowerCase()))
                                                .map((h: any) => (
                                                    <option key={h.id} value={h.id}>{h.hotelName || h.name}</option>
                                                ))
                                            }
                                        </select>
                                        <select
                                            className="px-2 py-1.5 bg-white border border-gray-200 rounded-md text-xs outline-none"
                                            value={stop.mealPlan}
                                            onChange={e => {
                                                const newStops = [...hotelStops];
                                                newStops[idx].mealPlan = e.target.value;
                                                setHotelStops(newStops);
                                            }}
                                        >
                                            <option>CP</option><option>EP</option><option>MAP</option><option>AP</option>
                                        </select>
                                        <input
                                            type="number" min="1"
                                            className="px-2 py-1.5 bg-white border border-gray-200 rounded-md text-xs outline-none"
                                            value={stop.nights}
                                            onChange={e => {
                                                const newStops = [...hotelStops];
                                                newStops[idx].nights = Number(e.target.value);
                                                setHotelStops(newStops);
                                            }}
                                        />
                                        <div className="flex items-center gap-1">
                                            <button
                                                title="Add row"
                                                onClick={() => setHotelStops([...hotelStops, { location: "", hotelId: "", mealPlan: "CP", nights: 1 }])}
                                                className="h-7 w-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                            {hotelStops.length > 1 && (
                                                <button
                                                    title="Remove row"
                                                    onClick={() => setHotelStops(hotelStops.filter((_, i) => i !== idx))}
                                                    className="h-7 w-7 flex items-center justify-center rounded border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <hr className="border-gray-200" />

                        {/* STEP 4 */}
                        <div>
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#EAF3DE] border border-[#C0DD97] flex items-center justify-center text-[11px] font-bold text-[#3B6D11] flex-shrink-0">4</div>
                                <div>
                                    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
                                        PAX pricing
                                        <span className="text-[9px] font-normal px-1.5 py-0.5 rounded bg-[#EEEDFE] text-[#534AB7] border border-[#AFA9EC]">enter from DMC rate sheet</span>
                                    </h3>
                                    <p className="text-[11px] text-gray-500">Type net cost per person. Selling price is auto-calculated based on margin.</p>
                                </div>
                            </div>
                            <div className="border border-gray-200 rounded-xl overflow-x-auto mt-3">
                                <table className="w-full text-left text-xs min-w-[600px]">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">PAX Bracket</th>
                                            <th className="px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">DMC Label</th>
                                            <th className="px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider text-[10px] text-right">Net/person (₹)</th>
                                            <th className="px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider text-[10px] text-right">Margin %</th>
                                            <th className="px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider text-[10px] text-right">Selling/person</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {paxPricing.map((pax, idx) => {
                                            const sellRaw = pax.net + (pax.net * (pax.margin / 100));
                                            const sellRounded = Math.round(sellRaw);
                                            return (
                                                <tr key={pax.id} className="bg-white hover:bg-gray-50 transition-colors">
                                                    <td className="px-3 py-2 font-semibold text-gray-900">{pax.label}</td>
                                                    <td className="px-3 py-2 text-[11px] text-gray-500">{pax.desc}</td>
                                                    <td className="px-3 py-2 text-right">
                                                        <input
                                                            type="number"
                                                            className="w-20 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-right text-xs outline-none focus:border-emerald-400"
                                                            value={pax.net || ""}
                                                            onChange={e => updatePaxPricing(idx, "net", Number(e.target.value))}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <input
                                                            type="number"
                                                            className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-right text-xs outline-none focus:border-emerald-400"
                                                            value={pax.margin || ""}
                                                            onChange={e => updatePaxPricing(idx, "margin", Number(e.target.value))}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-bold text-[#3B6D11]">
                                                        ₹{sellRounded.toLocaleString()}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">
                                Inclusions, exclusions, important notes and T&C are auto-fetched from the Destination overview.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                        <button onClick={() => { setIsCreating(false); setEditingPkgId(null); }} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50">
                            Cancel
                        </button>
                        <button onClick={handleSavePackage} disabled={creatingSaving} className="flex items-center gap-2 px-5 py-2 bg-[#3B6D11] text-[#EAF3DE] rounded-lg text-xs font-semibold hover:bg-[#2c520c] transition-colors disabled:opacity-50">
                            {creatingSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            {editingPkgId ? "Update package" : "Save & publish package"}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Pane - Package List */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                            <label className="text-[10px] font-semibold tracking-wider uppercase text-gray-500 mb-2 block">Select Destination</label>
                            <select
                                className="w-full px-3 py-2.5 rounded-lg border-none bg-white shadow-sm text-sm font-semibold outline-none focus:ring-2 focus:ring-[#EAF3DE]"
                                value={selectedDestId}
                                onChange={e => { setSelectedDestId(e.target.value); setSelectedPkg(null); }}
                            >
                                <option value="">All Destinations</option>
                                {destinations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-semibold tracking-wider uppercase text-gray-500 mb-2 block">Select Package Template</label>

                            {(selectedDestId ? packages.filter(p => p.destinationId === selectedDestId) : packages).filter(p => p.tier || p.isReadyMade).length === 0 ? (
                                <div className="text-center py-10 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
                                    <p className="text-[13px] text-gray-500">No packages found.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {(selectedDestId ? packages.filter(p => p.destinationId === selectedDestId) : packages).filter(p => p.tier || p.isReadyMade).map(pkg => {
                                        const isSelected = selectedPkg?.id === pkg.id;
                                        const tStyle = getTierStyle(pkg.tier || '');

                                        return (
                                            <div
                                                key={pkg.id}
                                                onClick={() => setSelectedPkg(pkg)}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl cursor-pointer transition-all border"
                                                style={{
                                                    backgroundColor: isSelected ? tStyle.bg : '#ffffff',
                                                    borderColor: isSelected ? tStyle.border : '#e5e7eb',
                                                    boxShadow: isSelected ? `0 4px 12px ${tStyle.border}40` : '0 1px 2px rgba(0,0,0,0.02)'
                                                }}
                                            >
                                                <div className="mb-2 sm:mb-0">
                                                    <p className="font-semibold text-[15px]" style={{ color: isSelected ? tStyle.color : '#111827' }}>
                                                        {pkg.packageName || `${pkg.nights}N/${pkg.days}D ${pkg.destination} – ${pkg.tier}`}
                                                    </p>
                                                    <p className="text-[12px] opacity-80" style={{ color: isSelected ? tStyle.color : '#6b7280' }}>
                                                        {pkg.destination} · {pkg.nights} nights · {pkg.days} days
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {pkg.tier && (
                                                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: tStyle.bg, color: tStyle.color, border: `0.5px solid ${tStyle.border}` }}>
                                                            {pkg.tier}
                                                        </span>
                                                    )}
                                                    {userProfile?.role === "admin" && (
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                disabled={fetchingPkgDetails}
                                                                onClick={(e) => { e.stopPropagation(); handleEditPackage(pkg); }}
                                                                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border border-gray-200 bg-transparent text-gray-500 hover:bg-white hover:text-gray-900 transition-colors disabled:opacity-50"
                                                            >
                                                                {fetchingPkgDetails && editingPkgId === pkg.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeletePackage(pkg.id, pkg.packageName || `${pkg.nights}N/${pkg.days}D ${pkg.destination}`);
                                                                }}
                                                                className="p-1.5 rounded-md border border-red-100 bg-transparent text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                                                                title="Delete Package"
                                                                disabled={isDeleting === pkg.id}
                                                            >
                                                                {isDeleting === pkg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Pane - Generate Config */}
                    <div className="space-y-4">
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 sticky top-6 shadow-sm">
                            <h3 className="font-serif text-xl tracking-wide mb-6" style={{ color: '#052210' }}>Generate config</h3>

                            {!selectedPkg ? (
                                <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <PackageSearch className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-xs text-gray-400">Select a package to configure.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Customer Section */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400 block">Customer</label>
                                        <select
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-emerald-500 text-gray-700 transition-all appearance-none"
                                            onChange={e => {
                                                const c = customers.find(x => x.id === e.target.value)
                                                if (c) {
                                                    setCustomerName(c.name || "")
                                                    setCustomerPhone(c.phone || "")
                                                    setCustomerEmail(c.email || "")
                                                }
                                            }}
                                        >
                                            <option value="">Search existing customer...</option>
                                            {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                                        </select>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Name</label>
                                                <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 outline-none placeholder:text-gray-300" placeholder="Enter name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Phone</label>
                                                <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 outline-none placeholder:text-gray-300" placeholder="10-digit" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Travel Date */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400 block">Travel Date</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="date"
                                                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 outline-none text-gray-700 font-medium"
                                                value={startDate}
                                                onChange={e => setStartDate(e.target.value)}
                                            />
                                            {isPeakSeason && (
                                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-100 animate-in fade-in zoom-in duration-300">
                                                    Peak season auto-detected
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Pax Count */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400 block">Pax Count</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1 text-center">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase">Adults</label>
                                                <div className="relative group">
                                                    <input type="number" min="1" className="w-full px-2 py-3 bg-gray-50 border border-gray-100 rounded-xl text-center text-lg font-serif font-bold focus:bg-white focus:border-emerald-500 transition-all outline-none" value={adults} onChange={e => setAdults(Number(e.target.value))} />
                                                </div>
                                            </div>
                                            <div className="space-y-1 text-center">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase">CWB (5-11 yrs)</label>
                                                <div className="relative">
                                                    <input type="number" min="0" className="w-full px-2 py-3 bg-gray-50 border border-gray-100 rounded-xl text-center text-lg font-serif font-bold focus:bg-white focus:border-emerald-500 transition-all outline-none" value={cwb} onChange={e => setCwb(Number(e.target.value))} />
                                                </div>
                                            </div>
                                            <div className="space-y-1 text-center">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase">CNB (2-4 yrs)</label>
                                                <div className="relative">
                                                    <input type="number" min="0" className="w-full px-2 py-3 bg-gray-50 border border-gray-100 rounded-xl text-center text-lg font-serif font-bold focus:bg-white focus:border-emerald-500 transition-all outline-none" value={cnb} onChange={e => setCnb(Number(e.target.value))} />
                                                </div>
                                            </div>
                                        </div>

                                        {activePricing.length > 0 && (
                                            <div className="px-3 py-2 bg-[#F6F9F2] border border-[#EAF3DE] rounded-xl text-center">
                                                <p className="text-[11px] font-medium text-[#3B6D11]">
                                                    {adults} adults → <span className="font-bold uppercase">{adultPrice.net > 0 ? (adults >= 6 ? "6 PAX" : adults >= 4 ? "4 PAX" : "2 PAX") : "Base"} Bracket</span> · ₹{Math.round(adultPrice.total).toLocaleString()} per person
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Price Summary */}
                                    <div className="pt-6 border-t border-gray-100">
                                        <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400 block mb-4">Price Summary</label>
                                        <div className="space-y-3 mb-6">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-600">{adults} adults × ₹{Math.round(adultPrice.total).toLocaleString()}</span>
                                                <span className="font-bold text-gray-900">₹{Math.round(adults * adultPrice.total).toLocaleString()}</span>
                                            </div>
                                            {cwb > 0 && (
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-600">{cwb} CWB × ₹{Math.round(cwbPrice.total).toLocaleString()}</span>
                                                    <span className="font-bold text-gray-900">₹{Math.round(cwb * cwbPrice.total).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {cnb > 0 && (
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-600">{cnb} CNB × ₹{Math.round(cnbPrice.total).toLocaleString()}</span>
                                                    <span className="font-bold text-gray-900">₹{Math.round(cnb * cnbPrice.total).toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-baseline pt-4 border-t border-dashed border-gray-100 mt-2">
                                                <span className="text-sm font-bold text-gray-900">Total</span>
                                                <span className="font-serif text-2xl font-bold text-[#052210]">₹{Math.round(totalPrice).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <p className="text-[10px] text-gray-400 italic mb-6">
                                            Net cost and margin are not visible to agents.
                                        </p>

                                        <div className="space-y-3">
                                            <button className="w-full py-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors">
                                                Preview itinerary
                                            </button>
                                            <button
                                                onClick={handleGenerate}
                                                disabled={generating}
                                                className="w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 hover:opacity-90 shadow-lg shadow-emerald-200 bg-[#3B6D11]"
                                            >
                                                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                                {generating ? "Generating..." : "Generate PDF quote"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
