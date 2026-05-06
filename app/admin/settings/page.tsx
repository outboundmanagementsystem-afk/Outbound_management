"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useEffect, useState } from "react"
import { getUsers, getItineraries, createDestination, addHotel, addActivity, addTransfer, getDestinations, deleteDestination, clearDestinationSubcollections, deleteAllCustomers, deleteAllNonAdminUsers, deleteAllItineraries } from "@/lib/firestore"
import { Users, Database, LayoutDashboard, Crown, Trophy, Target, TrendingUp, Clock, FileText, CheckCircle2, ChevronRight, RefreshCw, BarChart2, Trash2, ShieldAlert, Sparkles, Globe, UserPlus, CalendarRange, ClipboardList, Package } from "lucide-react"
import { seedFullDemo, deleteFullDemo } from "@/lib/demo-seed-data"

// --- SEED DATA ---
const SEED_DESTINATIONS = [
    {
        name: "Dubai",
        country: "United Arab Emirates",
        state: "Dubai",
        currency: "AED",
        description: "Experience the luxury, ultramodern architecture, and vibrant nightlife of Dubai. From the towering Burj Khalifa to the expansive desert dunes, Dubai offers an unforgettable blend of tradition and futuristic vision.",
        coverImage: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=1600",
        hotels: [
            { name: "Atlantis The Palm", rating: 5, address: "Palm Jumeirah", type: "Resort", price: 800, currency: "AED", description: "Iconic resort on the Palm featuring a waterpark and marine habitat.", image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800" },
            { name: "Burj Al Arab", rating: 5, address: "Jumeirah St", type: "Luxury", price: 4500, currency: "AED", description: "The world's only 7-star hotel, known for its sail-shaped silhouette.", image: "https://images.unsplash.com/photo-1541849546-216549281001?auto=format&fit=crop&q=80&w=800" },
            { name: "Rove Downtown", rating: 3, address: "Downtown Dubai", type: "Boutique", price: 300, currency: "AED", description: "Trendy, affordable hotel steps away from Burj Khalifa.", image: "https://images.unsplash.com/photo-1551882547-ff40c0d12c56?auto=format&fit=crop&q=80&w=800" }
        ],
        activities: [
            { title: "Desert Safari with BBQ Dinner", type: "Adventure", duration: "6 Hours", price: 150, currency: "AED", image: "https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?auto=format&fit=crop&q=80&w=800", description: "Dune bashing, camel riding, and traditional performances." },
            { title: "At the Top - Burj Khalifa", type: "Sightseeing", duration: "2 Hours", price: 175, currency: "AED", image: "https://images.unsplash.com/photo-1526495124232-a04e1849168c?auto=format&fit=crop&q=80&w=800", description: "Visit the observation deck of the world's tallest building." },
            { title: "Dubai Marina Dhow Cruise", type: "Sightseeing", duration: "2 Hours", price: 120, currency: "AED", image: "https://images.unsplash.com/photo-1601366533287-5ee4c763ae4e?auto=format&fit=crop&q=80&w=800", description: "Evening cruise with dinner and views of the Marina skyline." }
        ],
        transfers: [
            { type: "Private Sedan", from: "DXB Airport", to: "City Center Hotels", price: 150, currency: "AED", vehicleType: "Toyota Camry or similar", maxPassengers: 3 },
            { type: "Luxury Van", from: "DXB Airport", to: "Palm Jumeirah", price: 350, currency: "AED", vehicleType: "Mercedes V-Class", maxPassengers: 6 }
        ]
    },
    {
        name: "Bali",
        country: "Indonesia",
        state: "Bali",
        currency: "USD", // using USD for easier pricing
        description: "The Island of the Gods. Bali offers stunning beaches, lush terraced rice fields, ancient temples, and a deeply spiritual culture that captivates every visitor.",
        coverImage: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=1600",
        hotels: [
            { name: "Ayana Resort", rating: 5, address: "Jimbaran", type: "Resort", price: 250, currency: "USD", description: "Clifftop resort famous for its Rock Bar and ocean views.", image: "https://images.unsplash.com/photo-1540541338-8c6158923363?auto=format&fit=crop&q=80&w=800" },
            { name: "Hanging Gardens of Bali", rating: 5, address: "Ubud", type: "Boutique", price: 400, currency: "USD", description: "Jungle retreat with an iconic multi-tiered infinity pool.", image: "https://images.unsplash.com/photo-1544365558-35aa4afcf11f?auto=format&fit=crop&q=80&w=800" },
            { name: "Potato Head Suites", rating: 4, address: "Seminyak", type: "Modern", price: 180, currency: "USD", description: "Creative village blending design, art, and beach club vibes.", image: "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&q=80&w=800" }
        ],
        activities: [
            { title: "Ubud Best Kept Secrets Tour", type: "Cultural", duration: "8 Hours", price: 60, currency: "USD", image: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&q=80&w=800", description: "Visit monkey forest, rice terraces, and hidden waterfalls." },
            { title: "Mount Batur Sunrise Trek", type: "Adventure", duration: "6 Hours", price: 45, currency: "USD", image: "https://images.unsplash.com/photo-1502482322302-39c04d1f2bca?auto=format&fit=crop&q=80&w=800", description: "Early morning hike to an active volcano for sunrise views." },
            { title: "Nusa Penida Island Tour", type: "Sightseeing", duration: "10 Hours", price: 85, currency: "USD", image: "https://images.unsplash.com/photo-1570789210967-3346bdeee897?auto=format&fit=crop&q=80&w=800", description: "Speedboat to Nusa Penida to see Kelingking Beach and Broken Beach." }
        ],
        transfers: [
            { type: "Private Car", from: "DPS Airport", to: "Kuta/Seminyak", price: 20, currency: "USD", vehicleType: "Toyota Avanza", maxPassengers: 4 },
            { type: "Private Van", from: "DPS Airport", to: "Ubud", price: 35, currency: "USD", vehicleType: "Toyota Hiace", maxPassengers: 10 }
        ]
    },
    {
        name: "Maldives",
        country: "Maldives",
        state: "Various Atolls",
        currency: "USD",
        description: "A tropical paradise in the Indian Ocean, comprising 26 ring-shaped atolls. Known for its pristine white-sand beaches, crystal-clear turquoise waters, and luxurious overwater bungalows.",
        coverImage: "https://images.unsplash.com/photo-1514282401047-179a5161cb5a?auto=format&fit=crop&q=80&w=1600",
        hotels: [
            { name: "Soneva Jani", rating: 5, address: "Noonu Atoll", type: "Luxury", price: 2500, currency: "USD", description: "Ultra-luxury water villas with private pools and water slides.", image: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&q=80&w=800" },
            { name: "Kuramathi Maldives", rating: 4, address: "Rasdhoo Atoll", type: "Resort", price: 450, currency: "USD", description: "Beautiful island resort with diverse dining and a stunning sandbank.", image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&q=80&w=800" },
            { name: "Hard Rock Hotel", rating: 5, address: "South Male Atoll", type: "Modern", price: 550, currency: "USD", description: "Music-inspired resort connected to Marina @ CROSSROADS.", image: "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&q=80&w=800" }
        ],
        activities: [
            { title: "Whale Shark Snorkeling", type: "Water Sports", duration: "4 Hours", price: 150, currency: "USD", image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=800", description: "Swim alongside the gentle giants of the ocean." },
            { title: "Sunset Dolphin Cruise", type: "Sightseeing", duration: "2 Hours", price: 85, currency: "USD", image: "https://images.unsplash.com/photo-1454662111325-15a9ff86d080?auto=format&fit=crop&q=80&w=800", description: "Relaxing evening cruise with champagne and wild dolphins." },
            { title: "Private Sandbank Picnic", type: "Romantic", duration: "3 Hours", price: 250, currency: "USD", image: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&q=80&w=800", description: "Exclusive lunch on a deserted strip of white sand." }
        ],
        transfers: [
            { type: "Speedboat", from: "Male Airport", to: "South Male Atolls", price: 100, currency: "USD", vehicleType: "Shared Speedboat", maxPassengers: 15 },
            { type: "Seaplane", from: "Male Airport", to: "Distant Atolls", price: 350, currency: "USD", vehicleType: "Trans Maldivian Airways", maxPassengers: 14 }
        ]
    },
    {
        name: "Singapore",
        country: "Singapore",
        state: "Singapore",
        currency: "SGD",
        description: "A spectacular garden city where nature meets cutting-edge technology. Experience diverse cultures, world-class shopping, and incredibly clean public spaces.",
        coverImage: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&q=80&w=1600",
        hotels: [
            { name: "Marina Bay Sands", rating: 5, address: "Marina Bay", type: "Luxury", price: 650, currency: "SGD", description: "Iconic hotel with the world's largest rooftop infinity pool.", image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800" },
            { name: "Raffles Hotel", rating: 5, address: "Beach Road", type: "Heritage", price: 900, currency: "SGD", description: "Historic colonial-style hotel, birthplace of the Singapore Sling.", image: "https://images.unsplash.com/photo-1618218168354-e7220c3a51cf?auto=format&fit=crop&q=80&w=800" },
            { name: "Village Hotel Sentosa", rating: 4, address: "Sentosa Island", type: "Family Resort", price: 280, currency: "SGD", description: "Family-friendly resort with an incredible pool deck.", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800" }
        ],
        activities: [
            { title: "Gardens by the Bay - Conservatories", type: "Sightseeing", duration: "3 Hours", price: 28, currency: "SGD", image: "https://images.unsplash.com/photo-1508009603885-50cf7cbf0c56?auto=format&fit=crop&q=80&w=800", description: "Entry to Cloud Forest and Flower Dome." },
            { title: "Universal Studios Singapore", type: "Theme Park", duration: "1 Day", price: 82, currency: "SGD", image: "https://images.unsplash.com/photo-1605808381862-2bf2f38d6df8?auto=format&fit=crop&q=80&w=800", description: "Full day pass to the famous movie-themed rides." },
            { title: "Singapore Night Safari", type: "Nature", duration: "4 Hours", price: 55, currency: "SGD", image: "https://images.unsplash.com/photo-1534011400843-adffc38b29c8?auto=format&fit=crop&q=80&w=800", description: "Tram ride through the world's first nocturnal wildlife park." }
        ],
        transfers: [
            { type: "Private Sedan", from: "Changi Airport", to: "City Hotels", price: 60, currency: "SGD", vehicleType: "Mercedes E-Class", maxPassengers: 3 },
            { type: "Maxi Cab", from: "Changi Airport", to: "Sentosa", price: 80, currency: "SGD", vehicleType: "7-Seater Toyota Alpha", maxPassengers: 6 }
        ]
    },
    {
        name: "Paris",
        country: "France",
        state: "Île-de-France",
        currency: "EUR",
        description: "The City of Light. A global center for art, fashion, gastronomy, and culture. Its picturesque 19th-century cityscape is crisscrossed by wide boulevards and the River Seine.",
        coverImage: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=1600",
        hotels: [
            { name: "Shangri-La Paris", rating: 5, address: "16th Arrondissement", type: "Palace", price: 1200, currency: "EUR", description: "Former royal residence offering straight-on views of the Eiffel Tower.", image: "https://images.unsplash.com/photo-1517840901100-8179e982acb7?auto=format&fit=crop&q=80&w=800" },
            { name: "Hôtel Plaza Athénée", rating: 5, address: "Avenue Montaigne", type: "Luxury", price: 1500, currency: "EUR", description: "Iconic hotel on the prestigious Avenue Montaigne with red awnings.", image: "https://images.unsplash.com/photo-1542314831-c6a4d27ce66b?auto=format&fit=crop&q=80&w=800" },
            { name: "Le Relais des Halles", rating: 4, address: "1st Arrondissement", type: "Boutique", price: 250, currency: "EUR", description: "Charming boutique hotel in the historic heart of Paris.", image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=800" }
        ],
        activities: [
            { title: "Louvre Museum Skip-the-Line", type: "Cultural", duration: "3 Hours", price: 45, currency: "EUR", image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=800", description: "Guided tour of masterpieces including the Mona Lisa." },
            { title: "Seine River Dinner Cruise", type: "Romantic", duration: "2.5 Hours", price: 110, currency: "EUR", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=800", description: "Multi-course French dinner while floating past illuminated monuments." },
            { title: "Versailles Palace Half-Day", type: "Cultural", duration: "5 Hours", price: 85, currency: "EUR", image: "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&q=80&w=800", description: "Tour of the royal chateau and its magnificent gardens." }
        ],
        transfers: [
            { type: "Private Sedan", from: "CDG Airport", to: "Central Paris", price: 95, currency: "EUR", vehicleType: "Mercedes E-Class", maxPassengers: 3 },
            { type: "Private Van", from: "CDG Airport", to: "Central Paris", price: 120, currency: "EUR", vehicleType: "Mercedes V-Class", maxPassengers: 7 }
        ]
    }
]

export default function SettingsPage() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <SettingsContent />
        </ProtectedRoute>
    )
}

function SettingsContent() {
    const [activeTab, setActiveTab] = useState("kpi")

    // KPI State
    const [users, setUsers] = useState<any[]>([])
    const [kpiData, setKpiData] = useState<any[]>([])
    const [loadingKPI, setLoadingKPI] = useState(true)

    // Seed State
    const [isSeeding, setIsSeeding] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [seedProgress, setSeedProgress] = useState(0)
    const [seedMessage, setSeedMessage] = useState("")
    const [isDeletingCRM, setIsDeletingCRM] = useState(false)
    const [crmDeleteMessage, setCrmDeleteMessage] = useState("")
    const [isDeletingData, setIsDeletingData] = useState(false)
    const [dataDeleteMessage, setDataDeleteMessage] = useState("")

    // Full Demo Seed State
    const [isSeedingDemo, setIsSeedingDemo] = useState(false)
    const [isDeletingDemo, setIsDeletingDemo] = useState(false)
    const [demoProgress, setDemoProgress] = useState(0)
    const [demoMessage, setDemoMessage] = useState("")
    const [demoError, setDemoError] = useState("")

    useEffect(() => {
        if (activeTab === "kpi") {
            loadKPIData()
        }
    }, [activeTab])

    const loadKPIData = async () => {
        setLoadingKPI(true)
        try {
            const allUsers = await getUsers() as any[]
            const allItineraries = await getItineraries() as any[]

            const salesUsers = allUsers.filter(u => u.role === "sales")

            const stats = salesUsers.map(user => {
                const userItineraries = allItineraries.filter(i => i.createdBy === user.uid)
                const confirmed = userItineraries.filter(i => i.status === "confirmed" || i.status === "handover" || i.status === "post-ops" || i.status === "completed")

                const totalRevenue = confirmed.reduce((acc, curr) => acc + (Number((curr.plans?.find((p:any) => p.planId === curr.selectedPlanId)?.totalPrice || curr.plans?.[0]?.totalPrice || 0)) || 0), 0)
                const conversionRate = userItineraries.length > 0 ? (confirmed.length / userItineraries.length) * 100 : 0

                return {
                    id: user.uid,
                    name: user.name || "Unknown",
                    email: user.email,
                    totalLeads: userItineraries.length,
                    confirmedDeals: confirmed.length,
                    conversionRate: conversionRate.toFixed(1),
                    totalRevenue: totalRevenue
                }
            })

            // Sort by revenue descending
            stats.sort((a, b) => b.totalRevenue - a.totalRevenue)

            setUsers(salesUsers)
            setKpiData(stats)
        } catch (error) {
            console.error("Error loading KPI data:", error)
        } finally {
            setLoadingKPI(false)
        }
    }

    const handleSeedData = async () => {
        if (!confirm("This will inject 5 complete destinations into your database. Continue?")) return

        setIsSeeding(true)
        setSeedProgress(0)

        try {
            for (let i = 0; i < SEED_DESTINATIONS.length; i++) {
                const destConfig = SEED_DESTINATIONS[i]
                setSeedMessage(`Creating ${destConfig.name}...`)

                // Create parent destination
                const destId = await createDestination({
                    name: destConfig.name,
                    destinationName: destConfig.name,
                    country: destConfig.country,
                    state: destConfig.state,
                    currency: destConfig.currency,
                    description: destConfig.description,
                    coverImage: destConfig.coverImage
                })

                // Add Hotels
                setSeedMessage(`Adding hotels to ${destConfig.name}...`)
                for (const hotel of destConfig.hotels) {
                    await addHotel(destId, hotel)
                }

                // Add Activities
                setSeedMessage(`Adding activities to ${destConfig.name}...`)
                for (const activity of destConfig.activities) {
                    await addActivity(destId, activity)
                }

                // Add Transfers
                setSeedMessage(`Adding transfers to ${destConfig.name}...`)
                for (const transfer of destConfig.transfers) {
                    await addTransfer(destId, transfer)
                }

                setSeedProgress(((i + 1) / SEED_DESTINATIONS.length) * 100)
            }

            setSeedMessage("Successfully generated 5 destinations!")
            setTimeout(() => {
                setSeedMessage("")
                setIsSeeding(false)
                setSeedProgress(0)
            }, 3000)

        } catch (error) {
            console.error("Seeding failed:", error)
            setSeedMessage("Error during seeding. Check console.")
            setIsSeeding(false)
        }
    }

    const handleDeleteSeededData = async () => {
        if (!confirm("This will permanently delete ALL destinations that match the names of the seed data (Dubai, Bali, Maldives, Singapore, Paris). Are you sure?")) return

        setIsDeleting(true)
        setSeedMessage("Searching for seeded destinations to delete...")

        try {
            const allDestinations = await getDestinations() as any[]
            const seedNames = SEED_DESTINATIONS.map(d => d.name)

            // Find destinations whose names match any of the seeded ones
            const toDelete = allDestinations.filter(d => seedNames.includes(d.name))

            if (toDelete.length === 0) {
                setSeedMessage("No seeded destinations found to delete.")
                setIsDeleting(false)
                return
            }

            for (let i = 0; i < toDelete.length; i++) {
                const dest = toDelete[i]
                setSeedMessage(`Deleting data for ${dest.name}...`)

                // Clear subcollections first
                await clearDestinationSubcollections(dest.id)

                // Delete the parent document
                await deleteDestination(dest.id)
            }

            setSeedMessage(`Successfully deleted ${toDelete.length} destination(s).`)
            setTimeout(() => {
                setSeedMessage("")
                setIsDeleting(false)
            }, 3000)

        } catch (error) {
            console.error("Deletion failed:", error)
            setSeedMessage("Error during deletion. Check console.")
            setIsDeleting(false)
        }
    }

    const handleDeleteCRMData = async () => {
        if (!confirm("🚨 WARNING: This will permanently delete ALL Customer records in the CRM database. There is no undo. Are you absolutely sure?")) return

        setIsDeletingCRM(true)
        setCrmDeleteMessage("Wiping CRM database...")

        try {
            await deleteAllCustomers()
            setCrmDeleteMessage("CRM Database wiped successfully.")
            setTimeout(() => {
                setCrmDeleteMessage("")
                setIsDeletingCRM(false)
            }, 3000)
        } catch (error) {
            console.error("CRM Deletion failed:", error)
            setCrmDeleteMessage("Error wiping CRM. Check console.")
            setIsDeletingCRM(false)
        }
    }

    const handleDeleteAllNonAdminUsers = async () => {
        if (!confirm("🚨 WARNING: This will permanently delete ALL non-admin user accounts. Are you absolutely sure?")) return

        setIsDeletingData(true)
        setDataDeleteMessage("Wiping Non-Admin Users...")

        try {
            await deleteAllNonAdminUsers()
            setDataDeleteMessage("Non-Admin Users wiped successfully. Refresh the page to update KPIs.")
            setTimeout(() => {
                setDataDeleteMessage("")
                setIsDeletingData(false)
            }, 3000)
        } catch (error) {
            console.error("User Deletion failed:", error)
            setDataDeleteMessage("Error wiping users. Check console.")
            setIsDeletingData(false)
        }
    }

    const handleDeleteAllItineraries = async () => {
        if (!confirm("🚨 WARNING: This will permanently delete ALL itineraries AND their associated contents (hotels, flights, activities, etc). Are you absolutely sure?")) return

        setIsDeletingData(true)
        setDataDeleteMessage("Wiping All Itineraries...")

        try {
            await deleteAllItineraries()
            setDataDeleteMessage("Itineraries wiped successfully. Refresh the page to update KPIs.")
            setTimeout(() => {
                setDataDeleteMessage("")
                setIsDeletingData(false)
            }, 3000)
        } catch (error) {
            console.error("Itinerary Deletion failed:", error)
            setDataDeleteMessage("Error wiping itineraries. Check console.")
            setIsDeletingData(false)
        }
    }

    // ── Full Demo Handlers ──
    const handleSeedFullDemo = async () => {
        if (!confirm("This will generate a complete 1-month demo dataset: 8 team members, 20 customers, 25 itineraries (across all pipeline stages), 3 SOP templates, and 3 ready-made packages.\n\nIMPORTANT: Destination data must already be seeded (use the button above first).\n\nContinue?")) return

        setIsSeedingDemo(true)
        setDemoProgress(0)
        setDemoMessage("")
        setDemoError("")

        try {
            await seedFullDemo((pct, msg) => {
                setDemoProgress(pct)
                setDemoMessage(msg)
            })

            setDemoMessage("Full demo seeded successfully! Refresh other pages to see the data.")
            setTimeout(() => {
                setDemoMessage("")
                setIsSeedingDemo(false)
                setDemoProgress(0)
            }, 5000)
        } catch (error: any) {
            console.error("Demo seeding failed:", error)
            setDemoError(error?.message || "Seeding failed. Check console for details.")
            setIsSeedingDemo(false)
            setDemoProgress(0)
        }
    }

    const handleDeleteFullDemo = async () => {
        if (!confirm("This will remove ALL demo-generated data (users, customers, itineraries, SOPs, packages marked as demo). Your real data will NOT be affected.\n\nContinue?")) return

        setIsDeletingDemo(true)
        setDemoProgress(0)
        setDemoMessage("")
        setDemoError("")

        try {
            await deleteFullDemo((pct, msg) => {
                setDemoProgress(pct)
                setDemoMessage(msg)
            })

            setDemoMessage("All demo data removed successfully!")
            setTimeout(() => {
                setDemoMessage("")
                setIsDeletingDemo(false)
                setDemoProgress(0)
            }, 4000)
        } catch (error: any) {
            console.error("Demo deletion failed:", error)
            setDemoError(error?.message || "Deletion failed. Check console.")
            setIsDeletingDemo(false)
            setDemoProgress(0)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="font-serif text-2xl sm:text-3xl tracking-wide truncate" style={{ color: '#052210' }}>Settings & Analytics</h1>
                    <p className="font-sans text-xs sm:text-sm mt-1" style={{ color: 'rgba(5,34,16,0.5)' }}>Manage system data and track your team's performance.</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('kpi')}
                    className={`px-6 py-4 font-sans text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-200 ${activeTab === 'kpi'
                        ? 'border-[#06a15c] text-[#052210]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <BarChart2 className="w-4 h-4" />
                        Employee KPIs
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('data')}
                    className={`px-6 py-4 font-sans text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-200 ${activeTab === 'data'
                        ? 'border-[#06a15c] text-[#052210]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        System Data
                    </div>
                </button>
            </div>

            {/* Tab Contents */}
            <div className="mt-6">

                {/* KPI TAB */}
                {activeTab === 'kpi' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 rounded-2xl" style={{ background: '#f8faf9', border: '1px solid rgba(5,34,16,0.08)' }}>
                                <div className="flex items-center justify-between">
                                    <p className="font-sans text-xs font-semibold uppercase tracking-wider text-black/40">Total Sales Reps</p>
                                    <Users className="w-5 h-5 text-[#06a15c]/60" />
                                </div>
                                <h3 className="font-serif text-3xl mt-2 text-[#052210]">{users.length}</h3>
                            </div>
                            <div className="p-6 rounded-2xl" style={{ background: '#f8faf9', border: '1px solid rgba(5,34,16,0.08)' }}>
                                <div className="flex items-center justify-between">
                                    <p className="font-sans text-xs font-semibold uppercase tracking-wider text-black/40">Total Revenue Generated</p>
                                    <TrendingUp className="w-5 h-5 text-[#06a15c]/60" />
                                </div>
                                <h3 className="font-serif text-3xl mt-2 text-[#052210]">
                                    ₹{kpiData.reduce((acc, curr) => acc + curr.totalRevenue, 0).toLocaleString()}
                                </h3>
                            </div>
                            <div className="p-6 rounded-2xl" style={{ background: '#f8faf9', border: '1px solid rgba(5,34,16,0.08)' }}>
                                <div className="flex items-center justify-between">
                                    <p className="font-sans text-xs font-semibold uppercase tracking-wider text-black/40">Avg Conversion Rate</p>
                                    <Target className="w-5 h-5 text-[#06a15c]/60" />
                                </div>
                                <h3 className="font-serif text-3xl mt-2 text-[#052210]">
                                    {users.length > 0
                                        ? (kpiData.reduce((acc, curr) => acc + Number(curr.conversionRate), 0) / users.length).toFixed(1)
                                        : 0}%
                                </h3>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <h3 className="font-serif text-lg text-[#052210]">Sales Leaderboard</h3>
                                <Crown className="w-5 h-5 text-amber-500" />
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left font-sans">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Representative</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Itineraries Created</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Confirmed Deals</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Conversion Rate</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loadingKPI ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">Calculating metrics...</td>
                                            </tr>
                                        ) : kpiData.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">No sales data available yet.</td>
                                            </tr>
                                        ) : kpiData.map((stat, idx) => (
                                            <tr key={stat.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-8 h-8 rounded-full bg-[#06a15c]/10 text-[#06a15c] flex items-center justify-center font-bold text-xs ring-2 ring-white">
                                                                {stat.name.charAt(0)}
                                                            </div>
                                                            {idx === 0 && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                                                {stat.name}
                                                                {idx === 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Top Performer</span>}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{stat.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm text-gray-600 font-medium">{stat.totalLeads}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        {stat.confirmedDeals}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full transition-all duration-1000"
                                                                style={{
                                                                    width: `${stat.conversionRate}%`,
                                                                    background: Number(stat.conversionRate) > 30 ? '#10b981' : Number(stat.conversionRate) > 10 ? '#f59e0b' : '#ef4444'
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700 w-10 text-left">{stat.conversionRate}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-bold text-[#052210]">
                                                        ₹{stat.totalRevenue.toLocaleString()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* DATA TAB */}
                {activeTab === 'data' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm relative overflow-hidden">
                            {/* Decorative background element */}
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Database className="w-48 h-48" />
                            </div>

                            <div className="relative z-10">
                                <h3 className="font-serif text-xl text-[#052210] mb-2">Populate Destination Data</h3>
                                <p className="font-sans text-sm text-gray-500 max-w-2xl leading-relaxed mb-8">
                                    Clicking the button below will instantly generate 5 fully equipped destinations in your database.
                                    These destinations (Dubai, Bali, Maldives, Singapore, Paris) will include pre-configured hotels, activities, and transfers. This allows you to immediately start building rich itineraries without manual data entry.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                        <div className="bg-[#06a15c]/10 p-2 rounded-lg text-[#06a15c]"><CheckCircle2 className="w-4 h-4" /></div>
                                        <span className="text-sm font-medium text-gray-700">5 Locations</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                        <div className="bg-[#06a15c]/10 p-2 rounded-lg text-[#06a15c]"><CheckCircle2 className="w-4 h-4" /></div>
                                        <span className="text-sm font-medium text-gray-700">15+ Hotels</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                        <div className="bg-[#06a15c]/10 p-2 rounded-lg text-[#06a15c]"><CheckCircle2 className="w-4 h-4" /></div>
                                        <span className="text-sm font-medium text-gray-700">15+ Activities</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                        <div className="bg-[#06a15c]/10 p-2 rounded-lg text-[#06a15c]"><CheckCircle2 className="w-4 h-4" /></div>
                                        <span className="text-sm font-medium text-gray-700">10+ Transfers</span>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <button
                                        onClick={handleSeedData}
                                        disabled={isSeeding || isDeleting}
                                        className={`flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-sans text-sm font-bold tracking-wider text-white transition-all duration-300 ${(isSeeding || isDeleting) ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#06a15c] hover:bg-[#058b4f] hover:shadow-lg hover:-translate-y-0.5'
                                            }`}
                                    >
                                        {isSeeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                                        {isSeeding ? 'GENERATING...' : 'GENERATE SAMPLE DATA'}
                                    </button>

                                    <button
                                        onClick={handleDeleteSeededData}
                                        disabled={isSeeding || isDeleting}
                                        className={`flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-sans text-sm font-bold tracking-wider text-red-600 border transition-all duration-300 ${(isSeeding || isDeleting) ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-red-200 bg-red-50 hover:bg-red-100'
                                            }`}
                                    >
                                        {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        {isDeleting ? 'DELETING...' : 'DELETE SEEDED DATA'}
                                    </button>

                                    {(isSeeding || isDeleting) && (
                                        <div className="flex-1 w-full sm:max-w-xs">
                                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#06a15c] transition-all duration-500 rounded-full"
                                                    style={{ width: `${seedProgress}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 text-center sm:text-left">{seedMessage}</p>
                                        </div>
                                    )}

                                    {!isSeeding && seedMessage && (
                                        <p className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" /> {seedMessage}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Full Demo Experience */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-amber-200 shadow-sm relative overflow-hidden mt-6" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 50%)' }}>
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Sparkles className="w-48 h-48 text-amber-500" />
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-serif text-xl text-[#052210]">Full Demo Experience</h3>
                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">1 Month of Data</span>
                                </div>
                                <p className="font-sans text-sm text-gray-500 max-w-2xl leading-relaxed mb-8">
                                    Generate a realistic 1-month demo dataset that showcases the complete platform. This populates the Kanban board with cards across all pipeline stages, KPI dashboards with real metrics, CRM with customers, team members across all roles, and fully viewable itinerary pages.
                                    <span className="block mt-2 text-amber-700 font-medium text-xs">Requires destination data to be seeded first (use the button above).</span>
                                </p>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
                                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-100">
                                        <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600"><UserPlus className="w-3.5 h-3.5" /></div>
                                        <span className="text-xs font-medium text-gray-700">8 Users</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-100">
                                        <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600"><Users className="w-3.5 h-3.5" /></div>
                                        <span className="text-xs font-medium text-gray-700">20 Customers</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-100">
                                        <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600"><CalendarRange className="w-3.5 h-3.5" /></div>
                                        <span className="text-xs font-medium text-gray-700">25 Itineraries</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-100">
                                        <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600"><ClipboardList className="w-3.5 h-3.5" /></div>
                                        <span className="text-xs font-medium text-gray-700">3 SOPs</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-100">
                                        <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600"><Package className="w-3.5 h-3.5" /></div>
                                        <span className="text-xs font-medium text-gray-700">3 Packages</span>
                                    </div>
                                </div>

                                {/* Pipeline stage previews */}
                                <div className="flex flex-wrap gap-2 mb-8">
                                    {[
                                        { label: "Draft", count: 4, color: "#9ca3af" },
                                        { label: "Sent", count: 6, color: "#60a5fa" },
                                        { label: "Confirmed", count: 6, color: "#34d399" },
                                        { label: "Handover", count: 3, color: "#a78bfa" },
                                        { label: "Post Ops", count: 3, color: "#f59e0b" },
                                        { label: "Completed", count: 3, color: "#f472b6" },
                                    ].map((stage) => (
                                        <div key={stage.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-100 shadow-sm">
                                            <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                                            <span className="text-xs font-medium text-gray-600">{stage.label}</span>
                                            <span className="text-xs font-bold text-gray-900">{stage.count}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <button
                                        onClick={handleSeedFullDemo}
                                        disabled={isSeedingDemo || isDeletingDemo}
                                        className={`flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-sans text-sm font-bold tracking-wider text-white transition-all duration-300 ${(isSeedingDemo || isDeletingDemo) ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 hover:shadow-lg hover:-translate-y-0.5'
                                            }`}
                                    >
                                        {isSeedingDemo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        {isSeedingDemo ? 'GENERATING DEMO...' : 'GENERATE FULL DEMO'}
                                    </button>

                                    <button
                                        onClick={handleDeleteFullDemo}
                                        disabled={isSeedingDemo || isDeletingDemo}
                                        className={`flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-sans text-sm font-bold tracking-wider text-red-600 border transition-all duration-300 ${(isSeedingDemo || isDeletingDemo) ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-red-200 bg-red-50 hover:bg-red-100'
                                            }`}
                                    >
                                        {isDeletingDemo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        {isDeletingDemo ? 'REMOVING DEMO...' : 'DELETE DEMO DATA'}
                                    </button>
                                </div>

                                {/* Progress bar */}
                                {(isSeedingDemo || isDeletingDemo) && (
                                    <div className="mt-6">
                                        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full transition-all duration-500 rounded-full"
                                                style={{
                                                    width: `${demoProgress}%`,
                                                    background: isDeletingDemo ? '#ef4444' : 'linear-gradient(90deg, #f59e0b, #f97316)'
                                                }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                                            <span className="font-mono text-amber-600 font-bold">{demoProgress}%</span>
                                            {demoMessage}
                                        </p>
                                    </div>
                                )}

                                {/* Success message */}
                                {!isSeedingDemo && !isDeletingDemo && demoMessage && !demoError && (
                                    <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                        <p className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" /> {demoMessage}
                                        </p>
                                    </div>
                                )}

                                {/* Error message */}
                                {demoError && (
                                    <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100">
                                        <p className="text-sm font-medium text-red-700 flex items-center gap-2">
                                            <ShieldAlert className="w-4 h-4" /> {demoError}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Advanced Data Management */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-red-200 shadow-sm relative overflow-hidden mt-6">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <ShieldAlert className="w-48 h-48 text-red-600" />
                            </div>

                            <div className="relative z-10">
                                <h3 className="font-serif text-xl text-red-900 mb-2">Advanced Data Management</h3>
                                <p className="font-sans text-sm text-gray-500 max-w-2xl leading-relaxed mb-4">
                                    Use these options to securely manage the broader platform data. <strong className="text-red-600 font-semibold">These actions are completely irreversible.</strong> Only use this for resetting a test environment or during specific migrations.
                                </p>

                                {/* CRM Wipe Action */}
                                <div className="flex flex-col sm:flex-row items-center gap-4 border-t border-red-50 pt-6 mt-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900">Purge CRM Database</p>
                                        <p className="text-xs text-gray-500 mt-1">Permanently erase ALL Customer Records from the platform.</p>
                                    </div>
                                    <button
                                        onClick={handleDeleteCRMData}
                                        disabled={isDeletingCRM || isDeletingData}
                                        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-sans text-xs font-bold tracking-wider text-red-600 border transition-all duration-300 ${(isDeletingCRM || isDeletingData) ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-red-200 bg-red-50 hover:bg-red-100'
                                            }`}
                                    >
                                        {(isDeletingCRM && crmDeleteMessage.includes('CRM')) ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        {(isDeletingCRM && crmDeleteMessage.includes('CRM')) ? 'WIPING CRM...' : 'NUKE CRM DATA'}
                                    </button>
                                </div>

                                {/* Itineraries Wipe Action */}
                                <div className="flex flex-col sm:flex-row items-center gap-4 border-t border-red-50 pt-6 mt-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900">Purge Itineraries</p>
                                        <p className="text-xs text-gray-500 mt-1">Permanently erase ALL Itineraries and their associated contents.</p>
                                    </div>
                                    <button
                                        onClick={handleDeleteAllItineraries}
                                        disabled={isDeletingCRM || isDeletingData}
                                        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-sans text-xs font-bold tracking-wider text-red-600 border transition-all duration-300 ${(isDeletingCRM || isDeletingData) ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-red-200 bg-red-50 hover:bg-red-100'
                                            }`}
                                    >
                                        {(isDeletingData && dataDeleteMessage.includes('Itineraries')) ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        {(isDeletingData && dataDeleteMessage.includes('Itineraries')) ? 'WIPING...' : 'NUKE ITINERARIES'}
                                    </button>
                                </div>

                                {/* Users Wipe Action */}
                                <div className="flex flex-col sm:flex-row items-center gap-4 border-t border-red-50 pt-6 mt-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900">Purge Users (Exclude Admin)</p>
                                        <p className="text-xs text-gray-500 mt-1">Permanently erase ALL user accounts EXCEPT admins. (Will not affect Authentication data, only Firestore DB details).</p>
                                    </div>
                                    <button
                                        onClick={handleDeleteAllNonAdminUsers}
                                        disabled={isDeletingCRM || isDeletingData}
                                        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-sans text-xs font-bold tracking-wider text-white transition-all duration-300 ${(isDeletingCRM || isDeletingData) ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 hover:shadow-lg hover:-translate-y-0.5'
                                            }`}
                                    >
                                        {(isDeletingData && dataDeleteMessage.includes('Users')) ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        {(isDeletingData && dataDeleteMessage.includes('Users')) ? 'WIPING...' : 'NUKE USERS'}
                                    </button>
                                </div>

                                {/* Feedback Area */}
                                {(crmDeleteMessage || dataDeleteMessage) && (
                                    <div className="mt-6 border-t border-red-50 pt-4">
                                        <p className={`text-sm font-medium flex items-center justify-end gap-2 ${(crmDeleteMessage || dataDeleteMessage).includes('wiped') ? 'text-emerald-600' : 'text-gray-500'}`}>
                                            {((crmDeleteMessage || dataDeleteMessage).includes('wiped')) && <CheckCircle2 className="w-4 h-4" />} {crmDeleteMessage || dataDeleteMessage}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
} 
