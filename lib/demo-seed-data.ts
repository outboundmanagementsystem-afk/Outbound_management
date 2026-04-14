// ─────────────────────────────────────────────────────
// Full 1-Month Demo Seed Data for Outbound Travel CRM
// Seeds: 8 Users, 20 Customers, 25 Itineraries (all
// pipeline stages), 3 SOP Templates, 3 Packages
// ─────────────────────────────────────────────────────

import {
    preRegisterUser, generateEmployeeCode, updateUser, getUsers, deleteUser,
    getCustomers, deleteCustomer,
    getDestinations,
    seedCreateRawItinerary, updateItinerary, clearItinerarySubcollections, deleteItinerary, getItineraries,
    addItineraryDay, addItineraryFlight, addItineraryHotel,
    addItineraryTransfer, addItineraryActivity, addItineraryPricing,
    initSopChecklist, initPostOpsChecklist,
    createSOP, getSOPs, deleteSOP,
    createPackage, getPackages, clearPackageSubcollections, deletePackage,
    addPackageDay, addPackageFlight, addPackageHotel,
    addPackageTransfer, addPackageActivity, addPackagePricing,
    createCustomer as _createCustomer,
} from "./firestore"

// ─── Date Helpers ────────────────────────────────────

function daysFromNow(n: number): string {
    const d = new Date()
    d.setDate(d.getDate() + n)
    return d.toISOString().split("T")[0]
}

function daysAgoISO(n: number): string {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString()
}

function addDays(dateStr: string, n: number): string {
    const d = new Date(dateStr + "T00:00:00")
    d.setDate(d.getDate() + n)
    return d.toISOString().split("T")[0]
}

function sanitizeEmail(email: string): string {
    return email.replace(/[^a-zA-Z0-9]/g, "_")
}

// ─── Demo Users ──────────────────────────────────────

const DEMO_USERS = [
    { name: "Arjun Mehta", email: "arjun.mehta@outbound.demo", role: "sales_lead" as const, department: "sales" as const, phone: "+919876543210" },
    { name: "Priya Sharma", email: "priya.sharma@outbound.demo", role: "sales" as const, department: "sales" as const, phone: "+919876543211", leadEmail: "arjun.mehta@outbound.demo" },
    { name: "Rahul Nair", email: "rahul.nair@outbound.demo", role: "sales" as const, department: "sales" as const, phone: "+919876543212", leadEmail: "arjun.mehta@outbound.demo" },
    { name: "Sneha Iyer", email: "sneha.iyer@outbound.demo", role: "sales" as const, department: "sales" as const, phone: "+919876543213", leadEmail: "arjun.mehta@outbound.demo" },
    { name: "Vikram Patel", email: "vikram.patel@outbound.demo", role: "pre_ops_lead" as const, department: "operations" as const, phone: "+919876543214" },
    { name: "Ananya Rao", email: "ananya.rao@outbound.demo", role: "pre_ops" as const, department: "operations" as const, phone: "+919876543215", leadEmail: "vikram.patel@outbound.demo" },
    { name: "Deepika Krishnan", email: "deepika.krishnan@outbound.demo", role: "post_ops_lead" as const, department: "operations" as const, phone: "+919876543216" },
    { name: "Karthik Menon", email: "karthik.menon@outbound.demo", role: "post_ops" as const, department: "operations" as const, phone: "+919876543217", leadEmail: "deepika.krishnan@outbound.demo" },
]

// Sales reps are at indices 1, 2, 3
const SALES_REPS = [DEMO_USERS[1], DEMO_USERS[2], DEMO_USERS[3]]

// ─── Demo Customers ──────────────────────────────────

const DEMO_CUSTOMERS = [
    { name: "Rajesh Kumar", phone: "+919900100001", email: "rajesh.kumar@gmail.com" },
    { name: "Meera Banerjee", phone: "+919900100002", email: "meera.banerjee@gmail.com" },
    { name: "Sanjay Gupta", phone: "+919900100003", email: "sanjay.gupta@gmail.com" },
    { name: "Anita Deshmukh", phone: "+919900100004", email: "anita.deshmukh@gmail.com" },
    { name: "Vivek Reddy", phone: "+919900100005", email: "vivek.reddy@gmail.com" },
    { name: "Pooja Joshi", phone: "+919900100006", email: "pooja.joshi@gmail.com" },
    { name: "Amir Khan", phone: "+919900100007", email: "amir.khan@gmail.com" },
    { name: "Lakshmi Narayanan", phone: "+919900100008", email: "lakshmi.narayanan@gmail.com" },
    { name: "Rohit Malhotra", phone: "+919900100009", email: "rohit.malhotra@gmail.com" },
    { name: "Divya Pillai", phone: "+919900100010", email: "divya.pillai@gmail.com" },
    { name: "Suresh Bhat", phone: "+919900100011", email: "suresh.bhat@gmail.com" },
    { name: "Kavitha Sundaram", phone: "+919900100012", email: "kavitha.sundaram@gmail.com" },
    { name: "Manish Agarwal", phone: "+919900100013", email: "manish.agarwal@gmail.com" },
    { name: "Neha Chauhan", phone: "+919900100014", email: "neha.chauhan@gmail.com" },
    { name: "Prakash Shetty", phone: "+919900100015", email: "prakash.shetty@gmail.com" },
    { name: "Ritu Saxena", phone: "+919900100016", email: "ritu.saxena@gmail.com" },
    { name: "Gaurav Thakur", phone: "+919900100017", email: "gaurav.thakur@gmail.com" },
    { name: "Swati Kulkarni", phone: "+919900100018", email: "swati.kulkarni@gmail.com" },
    { name: "Nitin Verma", phone: "+919900100019", email: "nitin.verma@gmail.com" },
    { name: "Farhan Qureshi", phone: "+919900100020", email: "farhan.qureshi@gmail.com" },
]

// ─── Destination Templates ───────────────────────────

interface DestTemplate {
    dayPlans: { title: string; description: string; highlights: string[] }[]
    flight: {
        airline: string; flightNo: string; fromCode: string; from: string
        toCode: string; to: string; depTime: string; arrTime: string
        duration: string; flightType: string
        retFlightNo: string; retDepTime: string; retArrTime: string
        price: number
    }
    hotels: { name: string; category: string; rate: number }[]
    transfers: { type: string; pickup: string; drop: string; vehicleType: string; price: number }[]
    activities: { name: string; price: number }[]
    code: string
    currency: string
}

const DEST_TEMPLATES: Record<string, DestTemplate> = {
    Dubai: {
        code: "DU",
        currency: "AED",
        dayPlans: [
            { title: "Arrival & Dubai Marina Walk", description: "Arrive at DXB International and transfer to your hotel. In the evening, enjoy a scenic walk at the Dubai Marina, followed by a memorable Dhow Cruise dinner.", highlights: ["Airport pickup & hotel check-in", "Dubai Marina promenade", "Traditional Dhow Cruise dinner"] },
            { title: "Old Dubai Heritage & Souks", description: "Explore the cultural heart of Dubai. Visit the historic Al Fahidi district, cross the creek on an Abra, and browse the legendary Gold and Spice Souks.", highlights: ["Al Fahidi historical neighbourhood", "Abra ride across Dubai Creek", "Gold Souk & Spice Souk", "Dubai Museum visit"] },
            { title: "Desert Safari Adventure", description: "An action-packed afternoon in the Arabian desert with dune bashing, camel rides, and a BBQ dinner under the stars with live entertainment.", highlights: ["Thrilling 4x4 dune bashing", "Camel riding experience", "BBQ dinner with live shows", "Henna painting & falconry"] },
            { title: "Burj Khalifa & Downtown Dubai", description: "Visit the observation deck of the world's tallest building, shop at the enormous Dubai Mall, and watch the spectacular Dubai Fountain show.", highlights: ["At the Top – Burj Khalifa 124th floor", "Dubai Mall mega shopping", "Dubai Fountain evening show", "Souk Al Bahar dining"] },
            { title: "Palm Jumeirah & Atlantis", description: "Head to the iconic Palm Jumeirah. Enjoy Atlantis Aquaventure Waterpark and relax on the pristine beaches of this man-made wonder.", highlights: ["Palm Jumeirah monorail ride", "Atlantis Aquaventure Waterpark", "Lost Chambers Aquarium", "Beach leisure time"] },
            { title: "Abu Dhabi Day Trip", description: "Full-day excursion to the UAE capital. Visit the magnificent Sheikh Zayed Grand Mosque, explore Yas Island, and stroll through the Heritage Village.", highlights: ["Sheikh Zayed Grand Mosque", "Yas Island exploration", "Heritage Village tour", "Corniche waterfront"] },
            { title: "Departure & Duty-Free Shopping", description: "Enjoy a leisurely morning, check out from the hotel, and transfer to DXB Airport for your return flight. Don't miss last-minute duty-free shopping!", highlights: ["Hotel checkout", "Last-minute souvenir shopping", "Airport transfer", "Duty-free shopping"] },
        ],
        flight: { airline: "Emirates", flightNo: "EK505", fromCode: "BOM", from: "Mumbai", toCode: "DXB", to: "Dubai", depTime: "03:15", arrTime: "05:30", duration: "3h 45m", flightType: "Direct", retFlightNo: "EK504", retDepTime: "10:30", retArrTime: "15:45", price: 18500 },
        hotels: [
            { name: "Atlantis The Palm", category: "5 Star", rate: 18500 },
            { name: "Rove Downtown", category: "3 Star", rate: 6600 },
        ],
        transfers: [
            { type: "Arrival", pickup: "DXB International Airport", drop: "Hotel", vehicleType: "Private Sedan", price: 3300 },
            { type: "Departure", pickup: "Hotel", drop: "DXB International Airport", vehicleType: "Private Sedan", price: 3300 },
            { type: "Sightseeing", pickup: "Hotel", drop: "Desert Safari Camp", vehicleType: "4x4 Land Cruiser", price: 4400 },
        ],
        activities: [
            { name: "Desert Safari with BBQ Dinner", price: 3300 },
            { name: "At the Top – Burj Khalifa", price: 3850 },
            { name: "Dubai Marina Dhow Cruise", price: 2640 },
        ],
    },
    Bali: {
        code: "BL",
        currency: "USD",
        dayPlans: [
            { title: "Arrival in the Island of Gods", description: "Arrive at Ngurah Rai International Airport and transfer to your resort. Spend the evening relaxing by the pool or exploring nearby Seminyak Beach.", highlights: ["Airport pickup & resort check-in", "Welcome drink & resort orientation", "Sunset at Seminyak Beach"] },
            { title: "Ubud Art & Culture Safari", description: "Dive into Bali's cultural heart. Visit the Sacred Monkey Forest, Tegallalang rice terraces, and traditional artisan villages of Ubud.", highlights: ["Sacred Monkey Forest Sanctuary", "Tegallalang Rice Terraces", "Traditional Batik workshop", "Ubud Art Market shopping"] },
            { title: "Mount Batur Sunrise Trek", description: "Early morning hike to the summit of an active volcano for a breathtaking sunrise. Descend and relax in natural hot springs.", highlights: ["Pre-dawn volcano trek", "Spectacular sunrise views", "Natural hot spring bath", "Local coffee plantation visit"] },
            { title: "Nusa Penida Island Expedition", description: "Speedboat to the stunning Nusa Penida island. Visit Kelingking Beach, Angel's Billabong, and the natural infinity pool at Broken Beach.", highlights: ["Speedboat to Nusa Penida", "Kelingking Beach (T-Rex cliff)", "Angel's Billabong natural pool", "Broken Beach arch"] },
            { title: "Temple Tour & Kecak Dance", description: "Visit Bali's most iconic temples – Tanah Lot and Uluwatu. End the day with a mesmerizing Kecak fire dance performance at sunset.", highlights: ["Tanah Lot sea temple", "Uluwatu cliffside temple", "Kecak fire dance at sunset", "Jimbaran Bay seafood dinner"] },
            { title: "Waterfall & Spa Day", description: "Visit the stunning Tegenungan waterfall, then indulge in a traditional Balinese spa treatment. Free afternoon for shopping or beach.", highlights: ["Tegenungan Waterfall swim", "Traditional Balinese massage", "Flower bath ritual", "Free time for shopping"] },
            { title: "Departure from Bali", description: "Last morning in paradise. Enjoy breakfast, check out, and transfer to the airport with beautiful memories of the Island of Gods.", highlights: ["Leisure breakfast", "Hotel checkout", "Airport transfer", "Souvenir shopping en route"] },
        ],
        flight: { airline: "IndiGo", flightNo: "6E1681", fromCode: "BOM", from: "Mumbai", toCode: "DPS", to: "Bali (Denpasar)", depTime: "01:30", arrTime: "12:45", duration: "8h 15m", flightType: "1 Stop", retFlightNo: "6E1682", retDepTime: "14:00", retArrTime: "20:15", price: 24000 },
        hotels: [
            { name: "Ayana Resort & Spa", category: "5 Star", rate: 20750 },
            { name: "Potato Head Suites", category: "4 Star", rate: 14940 },
        ],
        transfers: [
            { type: "Arrival", pickup: "Ngurah Rai International Airport", drop: "Hotel", vehicleType: "Private Car", price: 1660 },
            { type: "Departure", pickup: "Hotel", drop: "Ngurah Rai International Airport", vehicleType: "Private Car", price: 1660 },
            { type: "Sightseeing", pickup: "Hotel", drop: "Ubud Area", vehicleType: "Private Car with Guide", price: 3320 },
        ],
        activities: [
            { name: "Ubud Sacred Monkey Forest Tour", price: 4980 },
            { name: "Mount Batur Sunrise Trek", price: 3735 },
            { name: "Nusa Penida Full Day Tour", price: 7055 },
        ],
    },
    Maldives: {
        code: "ML",
        currency: "USD",
        dayPlans: [
            { title: "Arrival in Paradise", description: "Arrive at Velana International Airport, Male. Transfer to your luxury resort via speedboat or seaplane. Welcome cocktail and resort orientation.", highlights: ["Seaplane/speedboat transfer", "Welcome cocktail ceremony", "Resort orientation & villa check-in", "Sunset viewing deck"] },
            { title: "Underwater Discovery", description: "Experience the magical coral reefs with guided snorkeling. Afternoon at leisure in your overwater villa with panoramic Indian Ocean views.", highlights: ["Guided reef snorkeling", "Marine biologist talk", "Overwater villa relaxation", "Underwater restaurant dinner"] },
            { title: "Ocean Adventures", description: "Morning whale shark snorkeling expedition, followed by a sunset dolphin cruise with champagne and canapés.", highlights: ["Whale shark swim experience", "Tropical island hopping", "Sunset dolphin cruise", "Champagne & canapés on deck"] },
            { title: "Sandbank Picnic & Water Sports", description: "Private boat trip to a deserted sandbank for an exclusive champagne picnic. Afternoon water sports – jet ski, parasailing, and kayaking.", highlights: ["Private sandbank picnic", "Jet ski adventure", "Parasailing over the lagoon", "Kayaking in crystal waters"] },
            { title: "Spa & Romance Day", description: "Couples overwater spa treatment with ocean views. Followed by a private beach dinner under the stars with live acoustic music.", highlights: ["Overwater couples spa", "Private beach candlelight dinner", "Stargazing session", "Live acoustic serenade"] },
            { title: "Island Exploration", description: "Visit a local Maldivian island to experience authentic culture, visit a school, and enjoy traditional Maldivian cuisine.", highlights: ["Local island village tour", "Traditional craft workshop", "Authentic Maldivian cooking class", "Sunset fishing trip"] },
            { title: "Departure from Maldives", description: "Final morning in the Maldives. Enjoy breakfast with ocean views, check out from your villa, and transfer to Male Airport.", highlights: ["Farewell breakfast", "Villa checkout", "Seaplane/speedboat to Male", "Airport departure"] },
        ],
        flight: { airline: "Air India", flightNo: "AI247", fromCode: "BOM", from: "Mumbai", toCode: "MLE", to: "Male (Maldives)", depTime: "09:00", arrTime: "11:45", duration: "4h 15m", flightType: "Direct", retFlightNo: "AI248", retDepTime: "13:00", retArrTime: "17:30", price: 22000 },
        hotels: [
            { name: "Soneva Jani Water Villa", category: "5 Star", rate: 207500 },
            { name: "Kuramathi Island Resort", category: "4 Star", rate: 37350 },
        ],
        transfers: [
            { type: "Arrival", pickup: "Velana International Airport", drop: "Resort", vehicleType: "Speedboat", price: 8300 },
            { type: "Departure", pickup: "Resort", drop: "Velana International Airport", vehicleType: "Speedboat", price: 8300 },
            { type: "Sightseeing", pickup: "Resort", drop: "Local Island", vehicleType: "Traditional Dhoni Boat", price: 5000 },
        ],
        activities: [
            { name: "Whale Shark Snorkeling Expedition", price: 12450 },
            { name: "Sunset Dolphin Cruise", price: 7055 },
            { name: "Private Sandbank Champagne Picnic", price: 20750 },
        ],
    },
    Singapore: {
        code: "SG",
        currency: "SGD",
        dayPlans: [
            { title: "Arrival in the Lion City", description: "Arrive at Changi Airport (regularly voted the world's best). Transfer to your hotel and spend the evening exploring the stunning Marina Bay area.", highlights: ["Changi Airport experience", "Hotel check-in & rest", "Marina Bay Sands light show", "Clarke Quay dinner walk"] },
            { title: "Gardens & Cultural Discovery", description: "Morning at the futuristic Gardens by the Bay, then explore Chinatown, Little India, and Kampong Glam for a cultural melting pot experience.", highlights: ["Gardens by the Bay Conservatories", "Supertree Grove OCBC Skyway", "Chinatown heritage walk", "Little India & Kampong Glam"] },
            { title: "Sentosa Island Fun Day", description: "Full day on Sentosa Island. Thrilling rides at Universal Studios Singapore, followed by beach time and the Wings of Time light show.", highlights: ["Universal Studios Singapore", "S.E.A. Aquarium visit", "Siloso Beach relaxation", "Wings of Time night show"] },
            { title: "Night Safari & Zoo Adventure", description: "Daytime Singapore Zoo visit with the award-winning open-concept enclosures, followed by the world-famous Night Safari after dark.", highlights: ["Singapore Zoo exploration", "Orangutan breakfast encounter", "Night Safari tram ride", "Creatures of the Night show"] },
            { title: "Shopping & Orchard Road", description: "Retail therapy on the legendary Orchard Road. Visit ION Orchard, Takashimaya, and Ngee Ann City for world-class shopping.", highlights: ["Orchard Road mega-shopping", "ION Sky observation deck", "Local food court lunch", "Bugis Street market"] },
            { title: "Departure from Singapore", description: "Leisure morning for last-minute shopping. Check out and transfer to Changi Airport. Pick up souvenirs at the Jewel Changi complex.", highlights: ["Hotel checkout", "Jewel Changi Rain Vortex", "Duty-free shopping", "Airport transfer"] },
        ],
        flight: { airline: "Singapore Airlines", flightNo: "SQ423", fromCode: "BOM", from: "Mumbai", toCode: "SIN", to: "Singapore", depTime: "00:35", arrTime: "08:50", duration: "5h 45m", flightType: "Direct", retFlightNo: "SQ422", retDepTime: "21:55", retArrTime: "01:10", price: 21000 },
        hotels: [
            { name: "Marina Bay Sands", category: "5 Star", rate: 40300 },
            { name: "Village Hotel Sentosa", category: "4 Star", rate: 17360 },
        ],
        transfers: [
            { type: "Arrival", pickup: "Changi International Airport", drop: "Hotel", vehicleType: "Private Sedan", price: 3720 },
            { type: "Departure", pickup: "Hotel", drop: "Changi International Airport", vehicleType: "Private Sedan", price: 3720 },
            { type: "Sightseeing", pickup: "Hotel", drop: "Sentosa Island", vehicleType: "Maxi Cab", price: 4960 },
        ],
        activities: [
            { name: "Gardens by the Bay – Conservatories", price: 1736 },
            { name: "Universal Studios Singapore", price: 5084 },
            { name: "Singapore Night Safari", price: 3410 },
        ],
    },
    Paris: {
        code: "PR",
        currency: "EUR",
        dayPlans: [
            { title: "Bienvenue à Paris!", description: "Arrive at Charles de Gaulle Airport and transfer to your hotel. Evening walk along the Seine with views of the illuminated Eiffel Tower.", highlights: ["CDG Airport pickup", "Hotel check-in & freshen up", "Evening Seine riverside walk", "Eiffel Tower illumination"] },
            { title: "Louvre & Le Marais", description: "Skip-the-line guided tour of the world's largest art museum. Afternoon exploring the chic Le Marais district with its galleries, boutiques, and cafés.", highlights: ["Louvre Museum guided tour", "Mona Lisa & Venus de Milo", "Le Marais district walk", "French café experience"] },
            { title: "Eiffel Tower & Seine Cruise", description: "Ascend the Eiffel Tower for panoramic views of Paris. In the evening, enjoy a magical dinner cruise on the River Seine.", highlights: ["Eiffel Tower summit access", "Champ de Mars gardens", "Seine River dinner cruise", "Illuminated monuments from water"] },
            { title: "Versailles Palace Excursion", description: "Half-day trip to the opulent Palace of Versailles. Tour the Hall of Mirrors, the Royal Apartments, and the magnificent French gardens.", highlights: ["Palace of Versailles tour", "Hall of Mirrors", "Marie Antoinette's Estate", "Versailles Gardens stroll"] },
            { title: "Montmartre & Sacré-Cœur", description: "Explore the artistic quarter of Montmartre. Visit the Sacré-Cœur Basilica, see Place du Tertre painters, and enjoy views over the entire city.", highlights: ["Sacré-Cœur Basilica", "Place du Tertre artists' square", "Moulin Rouge photo stop", "Amélie's café visit"] },
            { title: "Champs-Élysées & Shopping", description: "Stroll down the world's most famous avenue. Visit the Arc de Triomphe, explore luxury boutiques, and enjoy French patisserie.", highlights: ["Arc de Triomphe climb", "Champs-Élysées promenade", "Galeries Lafayette shopping", "French patisserie tasting"] },
            { title: "Notre-Dame & Latin Quarter", description: "Visit the reconstruction of Notre-Dame Cathedral, explore the bohemian Latin Quarter, and browse the iconic Shakespeare & Company bookshop.", highlights: ["Notre-Dame Cathedral area", "Shakespeare & Company bookshop", "Panthéon visit", "Latin Quarter exploration"] },
            { title: "Au Revoir Paris!", description: "Final Parisian morning. Pick up last-minute macarons from Ladurée, check out, and transfer to CDG Airport.", highlights: ["Ladurée macarons stop", "Hotel checkout", "Airport transfer", "Charles de Gaulle departure"] },
        ],
        flight: { airline: "Air France", flightNo: "AF225", fromCode: "BOM", from: "Mumbai", toCode: "CDG", to: "Paris (Charles de Gaulle)", depTime: "22:50", arrTime: "04:30", duration: "9h 10m", flightType: "Direct", retFlightNo: "AF226", retDepTime: "13:20", retArrTime: "01:45", price: 42000 },
        hotels: [
            { name: "Shangri-La Paris", category: "5 Star", rate: 108000 },
            { name: "Le Relais des Halles", category: "4 Star", rate: 22500 },
        ],
        transfers: [
            { type: "Arrival", pickup: "CDG Airport Terminal 2", drop: "Hotel", vehicleType: "Private Sedan", price: 8550 },
            { type: "Departure", pickup: "Hotel", drop: "CDG Airport Terminal 2", vehicleType: "Private Sedan", price: 8550 },
            { type: "InterCity", pickup: "Hotel", drop: "Palace of Versailles", vehicleType: "Private Van", price: 10800 },
        ],
        activities: [
            { name: "Louvre Museum Skip-the-Line Tour", price: 4050 },
            { name: "Seine River Dinner Cruise", price: 9900 },
            { name: "Versailles Palace Half-Day Tour", price: 7650 },
        ],
    },
}

// ─── 25 Itinerary Configurations ─────────────────────

interface ItinConfig {
    ci: number; dest: string; si: number
    n: number; a: number; ch: number; ca: string
    st: string; cda: number; tso: number
    tp: number; mg: number; ap: number
}

const ITIN_CONFIGS: ItinConfig[] = [
    //  ci  dest          si n  a  ch ca             status       cda tso   totalPrice  mg  amtPaid
    { ci: 0,  dest: "Dubai",     si: 0, n: 4, a: 2, ch: 0, ca: "",            st: "confirmed", cda: 20, tso: -5,   tp: 85000,   mg: 15, ap: 42500 },
    { ci: 1,  dest: "Bali",      si: 1, n: 5, a: 2, ch: 1, ca: "8 Yrs",      st: "completed", cda: 28, tso: -15,  tp: 125000,  mg: 18, ap: 125000 },
    { ci: 2,  dest: "Maldives",  si: 2, n: 4, a: 2, ch: 0, ca: "",            st: "post-ops",  cda: 18, tso: -2,   tp: 195000,  mg: 20, ap: 156000 },
    { ci: 3,  dest: "Singapore", si: 0, n: 3, a: 2, ch: 2, ca: "5 Yrs, 3 Yrs", st: "completed", cda: 25, tso: -12, tp: 78000,  mg: 15, ap: 78000 },
    { ci: 4,  dest: "Paris",     si: 1, n: 5, a: 2, ch: 0, ca: "",            st: "handover",  cda: 15, tso: 7,    tp: 245000,  mg: 18, ap: 171500 },
    { ci: 5,  dest: "Dubai",     si: 2, n: 3, a: 2, ch: 1, ca: "6 Yrs",      st: "sent",      cda: 5,  tso: 20,   tp: 65000,   mg: 12, ap: 0 },
    { ci: 6,  dest: "Bali",      si: 0, n: 6, a: 2, ch: 0, ca: "",            st: "confirmed", cda: 12, tso: 10,   tp: 145000,  mg: 18, ap: 72500 },
    { ci: 7,  dest: "Maldives",  si: 1, n: 5, a: 2, ch: 0, ca: "",            st: "post-ops",  cda: 16, tso: -1,   tp: 280000,  mg: 20, ap: 224000 },
    { ci: 8,  dest: "Singapore", si: 2, n: 4, a: 3, ch: 0, ca: "",            st: "sent",      cda: 4,  tso: 25,   tp: 95000,   mg: 15, ap: 0 },
    { ci: 9,  dest: "Paris",     si: 0, n: 7, a: 2, ch: 1, ca: "10 Yrs",     st: "draft",     cda: 1,  tso: 30,   tp: 320000,  mg: 20, ap: 0 },
    { ci: 10, dest: "Dubai",     si: 1, n: 5, a: 2, ch: 0, ca: "",            st: "handover",  cda: 10, tso: 5,    tp: 110000,  mg: 15, ap: 77000 },
    { ci: 11, dest: "Bali",      si: 2, n: 4, a: 2, ch: 1, ca: "4 Yrs",      st: "confirmed", cda: 14, tso: 8,    tp: 98000,   mg: 15, ap: 49000 },
    { ci: 12, dest: "Maldives",  si: 0, n: 3, a: 2, ch: 0, ca: "",            st: "sent",      cda: 6,  tso: 18,   tp: 165000,  mg: 18, ap: 0 },
    { ci: 13, dest: "Singapore", si: 1, n: 5, a: 2, ch: 2, ca: "7 Yrs, 4 Yrs", st: "completed", cda: 26, tso: -14, tp: 115000, mg: 15, ap: 115000 },
    { ci: 14, dest: "Paris",     si: 2, n: 4, a: 4, ch: 0, ca: "",            st: "confirmed", cda: 11, tso: 12,   tp: 285000,  mg: 20, ap: 142500 },
    { ci: 15, dest: "Dubai",     si: 0, n: 4, a: 2, ch: 0, ca: "",            st: "draft",     cda: 2,  tso: 28,   tp: 88000,   mg: 15, ap: 0 },
    { ci: 16, dest: "Bali",      si: 1, n: 3, a: 2, ch: 0, ca: "",            st: "sent",      cda: 3,  tso: 22,   tp: 72000,   mg: 12, ap: 0 },
    { ci: 17, dest: "Singapore", si: 2, n: 4, a: 2, ch: 1, ca: "9 Yrs",      st: "draft",     cda: 0,  tso: 35,   tp: 92000,   mg: 15, ap: 0 },
    { ci: 18, dest: "Maldives",  si: 0, n: 6, a: 2, ch: 0, ca: "",            st: "post-ops",  cda: 17, tso: -3,   tp: 350000,  mg: 22, ap: 280000 },
    { ci: 19, dest: "Paris",     si: 1, n: 3, a: 2, ch: 0, ca: "",            st: "sent",      cda: 7,  tso: 15,   tp: 190000,  mg: 15, ap: 0 },
    { ci: 0,  dest: "Dubai",     si: 2, n: 6, a: 4, ch: 2, ca: "8 Yrs, 5 Yrs", st: "handover", cda: 13, tso: 3,   tp: 155000,  mg: 15, ap: 108500 },
    { ci: 1,  dest: "Bali",      si: 0, n: 5, a: 2, ch: 0, ca: "",            st: "confirmed", cda: 9,  tso: 14,   tp: 130000,  mg: 18, ap: 65000 },
    { ci: 2,  dest: "Singapore", si: 1, n: 3, a: 2, ch: 0, ca: "",            st: "draft",     cda: 1,  tso: 40,   tp: 70000,   mg: 12, ap: 0 },
    { ci: 4,  dest: "Dubai",     si: 2, n: 4, a: 2, ch: 0, ca: "",            st: "sent",      cda: 5,  tso: 19,   tp: 92000,   mg: 15, ap: 0 },
    { ci: 3,  dest: "Paris",     si: 0, n: 5, a: 2, ch: 1, ca: "6 Yrs",      st: "confirmed", cda: 8,  tso: 16,   tp: 258000,  mg: 18, ap: 129000 },
]

// ─── SOP Templates ───────────────────────────────────

const DEMO_SOP_TEMPLATES = [
    {
        title: "Sales Qualification Process",
        department: "sales",
        items: [
            "Initial client inquiry recorded in CRM",
            "Budget range & travel dates confirmed",
            "Destination preferences & interests noted",
            "Number of travellers & special requirements documented",
            "Customized itinerary quote prepared & sent",
            "Follow-up call scheduled within 48 hours",
        ],
        whatsappTemplate: "Hi {customerName}! 🌍 Thank you for choosing Outbound Travel for your upcoming {destination} trip. We're excited to help you plan the perfect getaway! Our travel consultant will share a personalized itinerary with you shortly.",
    },
    {
        title: "Pre-Operations Handover Checklist",
        department: "pre_ops",
        items: [
            "Client profile & travel documents verified",
            "Full payment or agreed instalment confirmed",
            "Hotel booking confirmations received",
            "Flight tickets issued & PNR shared",
            "Ground transfer arrangements finalized",
            "Activity & excursion vouchers generated",
            "Travel insurance arranged & policy shared",
            "Emergency contact details collected",
        ],
    },
    {
        title: "Post-Trip Follow-up Protocol",
        department: "post_ops",
        items: [
            "Welcome back / safe return message sent",
            "Trip feedback & satisfaction survey collected",
            "Google 5-star review request sent",
            "Photo & video testimonial requested",
            "Referral program offer extended",
            "Next trip suggestion or seasonal deal pitched",
            "Customer profile updated in loyalty program",
        ],
    },
]

// ─── Package Configurations ──────────────────────────

const DEMO_PACKAGES = [
    { name: "Dubai Luxury Escape", dest: "Dubai", nights: 4, description: "4 Nights of pure luxury in Dubai – from Desert Safari adventures to the iconic Burj Khalifa. Includes 5-star accommodation, private transfers, and curated experiences." },
    { name: "Bali Adventure & Culture", dest: "Bali", nights: 5, description: "5 Nights exploring the best of Bali – volcano treks, temple visits, rice terraces, and island hopping. Perfect mix of adventure and relaxation." },
    { name: "Singapore Family Fun", dest: "Singapore", nights: 3, description: "3 Nights of family-friendly fun in Singapore – Universal Studios, Night Safari, Gardens by the Bay, and Sentosa Island. Kid-approved and parent-loved!" },
]

// ─── Sub-Collection Generators ───────────────────────

function generateDays(dest: string, startDate: string, nights: number) {
    const t = DEST_TEMPLATES[dest]
    const days = []
    for (let i = 0; i <= nights; i++) {
        const isLast = i === nights
        const tpl = isLast
            ? t.dayPlans[t.dayPlans.length - 1]
            : t.dayPlans[Math.min(i, t.dayPlans.length - 2)]
        days.push({
            day: i + 1,
            date: addDays(startDate, i),
            title: tpl.title,
            description: tpl.description,
            highlights: tpl.highlights,
        })
    }
    return days
}

function generateFlights(dest: string, startDate: string, endDate: string) {
    const f = DEST_TEMPLATES[dest].flight
    return [
        {
            type: "Onward",
            airline: f.airline,
            flightNo: f.flightNo,
            fromCode: f.fromCode,
            from: f.from,
            departure: f.depTime,
            departureDate: startDate,
            toCode: f.toCode,
            to: f.to,
            arrival: f.arrTime,
            arrivalDate: startDate,
            duration: f.duration,
            flightType: f.flightType,
            layoverDetails: "",
            price: f.price,
        },
        {
            type: "Return",
            airline: f.airline,
            flightNo: f.retFlightNo,
            fromCode: f.toCode,
            from: f.to,
            departure: f.retDepTime,
            departureDate: endDate,
            toCode: f.fromCode,
            to: f.from,
            arrival: f.retArrTime,
            arrivalDate: endDate,
            duration: f.duration,
            flightType: f.flightType,
            layoverDetails: "",
            price: f.price,
        },
    ]
}

function pickHotel(dest: string, totalPrice: number) {
    const hotels = DEST_TEMPLATES[dest].hotels
    // Expensive trips get luxury hotel (index 0), budget trips get index 1
    return totalPrice > 150000 ? hotels[0] : hotels[1]
}

function generateHotel(dest: string, nights: number, totalPrice: number) {
    const h = pickHotel(dest, totalPrice)
    return {
        hotelName: h.name,
        name: h.name,
        category: h.category,
        nights,
        ratePerNight: h.rate,
    }
}

function generateTransfers(dest: string) {
    return DEST_TEMPLATES[dest].transfers.map((t) => ({
        type: t.type,
        pickup: t.pickup,
        drop: t.drop,
        vehicleType: t.vehicleType,
        price: t.price,
    }))
}

function generateActivities(dest: string, nights: number) {
    const all = DEST_TEMPLATES[dest].activities
    // Return 2-3 activities based on trip length
    return all.slice(0, Math.min(nights >= 5 ? 3 : 2, all.length)).map((a) => ({
        activityName: a.name,
        name: a.name,
        price: a.price,
    }))
}

function generatePricing(
    totalPrice: number, margin: number, nights: number,
    adults: number, children: number,
    hotel: { name: string; category: string; rate: number },
) {
    const baseCost = Math.round(totalPrice / (1 + margin / 100))
    const hotelPrice = Math.round(baseCost * 0.35)
    const flightPrice = Math.round(baseCost * 0.28)
    const transferPrice = Math.round(baseCost * 0.10)
    const activityPrice = Math.round(baseCost * 0.17)
    const optionalPrice = Math.round(baseCost * 0.10)
    const totalPax = adults + (children * 0.5)
    const perPersonPrice = Math.round(totalPrice / Math.max(totalPax, 1))

    return {
        totalPrice,
        perPersonPrice,
        margin,
        nights,
        adults,
        children,
        hotelPrice,
        flightPrice,
        transferPrice,
        activityPrice,
        optionalPrice,
        plans: [{
            hotelName: hotel.name,
            category: hotel.category,
            hotelCost: hotelPrice,
            total: totalPrice,
            perPersonPrice,
        }],
    }
}

// ─── Main Seed Function ──────────────────────────────

type ProgressFn = (pct: number, msg: string) => void

export async function seedFullDemo(onProgress: ProgressFn): Promise<void> {
    // ── Pre-check: destinations must exist ──
    onProgress(1, "Checking destination data...")
    const destinations = await getDestinations() as any[]
    const requiredDests = ["Dubai", "Bali", "Maldives", "Singapore", "Paris"]
    const destMap = new Map<string, string>()
    for (const d of destinations) {
        destMap.set(d.name || d.destinationName, d.id)
    }
    const missing = requiredDests.filter((n) => !destMap.has(n))
    if (missing.length > 0) {
        throw new Error(`Missing destinations: ${missing.join(", ")}. Please seed destination data first using the "Generate Sample Data" button above.`)
    }

    // ── Phase 1: Create Users (5-15%) ──
    onProgress(5, "Creating 8 demo team members...")
    const userDocIds: string[] = []
    for (let i = 0; i < DEMO_USERS.length; i++) {
        const u = DEMO_USERS[i]
        const empCode = await generateEmployeeCode(u.role, u.name)
        const leadId = (u as any).leadEmail ? sanitizeEmail((u as any).leadEmail) : ""
        await preRegisterUser(u.email, u.role, u.name, empCode, u.department, leadId, u.phone)
        const docId = sanitizeEmail(u.email)
        await updateUser(docId, { __seedDemo: true })
        userDocIds.push(docId)
        onProgress(5 + Math.round((i + 1) / DEMO_USERS.length * 10), `Created ${u.name} (${u.role})`)
    }

    // ── Phase 2: Create Customers (15-25%) ──
    onProgress(15, "Creating 20 demo customers...")
    const customerIds: string[] = []
    for (let i = 0; i < DEMO_CUSTOMERS.length; i++) {
        const c = DEMO_CUSTOMERS[i]
        const cid = await _createCustomer({ ...c, __seedDemo: true } as any)
        customerIds.push(cid)
        onProgress(15 + Math.round((i + 1) / DEMO_CUSTOMERS.length * 10), `Created customer ${c.name}`)
    }

    // ── Phase 3: Create SOP Templates (25-28%) ──
    onProgress(25, "Creating 3 SOP templates...")
    for (let i = 0; i < DEMO_SOP_TEMPLATES.length; i++) {
        const s = DEMO_SOP_TEMPLATES[i]
        await createSOP({ ...s, __seedDemo: true } as any)
        onProgress(25 + (i + 1), `Created SOP: ${s.title}`)
    }

    // ── Phase 4: Create 25 Itineraries (28-82%) ──
    onProgress(28, "Creating 25 demo itineraries with full details...")
    const destCounters: Record<string, number> = {}

    for (let i = 0; i < ITIN_CONFIGS.length; i++) {
        const cfg = ITIN_CONFIGS[i]
        const customer = DEMO_CUSTOMERS[cfg.ci]
        const rep = SALES_REPS[cfg.si]
        const repDocId = sanitizeEmail(rep.email)
        const tmpl = DEST_TEMPLATES[cfg.dest]

        // Generate quoteId
        destCounters[tmpl.code] = (destCounters[tmpl.code] || 0) + 1
        const quoteId = `OT${tmpl.code}${String(destCounters[tmpl.code]).padStart(4, "0")}`

        const startDate = daysFromNow(cfg.tso)
        const endDate = addDays(startDate, cfg.n)
        const createdAt = daysAgoISO(cfg.cda)
        const perPerson = Math.round(cfg.tp / Math.max(cfg.a + cfg.ch * 0.5, 1))

        // Create parent itinerary document
        const itinId = await seedCreateRawItinerary({
            quoteId,
            customerId: customerIds[cfg.ci],
            customerName: customer.name,
            customerPhone: customer.phone,
            customerEmail: customer.email,
            destinationId: destMap.get(cfg.dest) || "",
            destination: cfg.dest,
            startDate,
            endDate,
            nights: cfg.n,
            days: cfg.n + 1,
            adults: cfg.a,
            children: cfg.ch,
            childAge: cfg.ca,
            totalPrice: cfg.tp,
            perPersonPrice: perPerson,
            margin: cfg.mg,
            consultantName: rep.name,
            consultantPhone: rep.phone,
            status: cfg.st,
            postOpStage: cfg.st === "post-ops" ? "in_progress" : "",
            createdBy: repDocId,
            createdByName: rep.name,
            amountPaid: cfg.ap,
            createdAt,
            updatedAt: createdAt,
            __seedDemo: true,
        })

        // Add days
        const days = generateDays(cfg.dest, startDate, cfg.n)
        for (const day of days) {
            await addItineraryDay(itinId, day)
        }

        // Add flights
        const flights = generateFlights(cfg.dest, startDate, endDate)
        for (const fl of flights) {
            await addItineraryFlight(itinId, fl)
        }

        // Add hotel
        const hotel = generateHotel(cfg.dest, cfg.n, cfg.tp)
        await addItineraryHotel(itinId, hotel)

        // Add transfers
        const transfers = generateTransfers(cfg.dest)
        for (const tr of transfers) {
            await addItineraryTransfer(itinId, tr)
        }

        // Add activities
        const activities = generateActivities(cfg.dest, cfg.n)
        for (const act of activities) {
            await addItineraryActivity(itinId, act)
        }

        // Add pricing
        const h = pickHotel(cfg.dest, cfg.tp)
        const pricing = generatePricing(cfg.tp, cfg.mg, cfg.n, cfg.a, cfg.ch, h)
        await addItineraryPricing(itinId, pricing)

        // Init SOP checklists for confirmed+ statuses
        const sopStatuses = ["confirmed", "handover", "post-ops", "completed"]
        if (sopStatuses.includes(cfg.st)) {
            await initSopChecklist(itinId)
        }

        // Init Post-Ops checklists for post-ops+ statuses
        const postOpsStatuses = ["post-ops", "completed"]
        if (postOpsStatuses.includes(cfg.st)) {
            await initPostOpsChecklist(itinId)
        }

        const pct = 28 + Math.round(((i + 1) / ITIN_CONFIGS.length) * 54)
        onProgress(pct, `Created itinerary ${quoteId} for ${customer.name} → ${cfg.dest} (${cfg.st})`)
    }

    // ── Phase 5: Create 3 Packages (82-95%) ──
    onProgress(82, "Creating 3 ready-made package templates...")
    for (let p = 0; p < DEMO_PACKAGES.length; p++) {
        const pkg = DEMO_PACKAGES[p]
        const tmpl = DEST_TEMPLATES[pkg.dest]

        const pkgId = await createPackage({
            packageName: pkg.name,
            destination: pkg.dest,
            destinationId: destMap.get(pkg.dest) || "",
            nights: pkg.nights,
            days: pkg.nights + 1,
            description: pkg.description,
            __seedDemo: true,
        })

        // Package days
        const pkgDays = generateDays(pkg.dest, "2026-01-01", pkg.nights)
        for (const day of pkgDays) {
            await addPackageDay(pkgId, day)
        }

        // Package flights (template dates)
        const pkgFlights = generateFlights(pkg.dest, "2026-01-01", addDays("2026-01-01", pkg.nights))
        for (const fl of pkgFlights) {
            await addPackageFlight(pkgId, fl)
        }

        // Package hotel
        const pkgHotel = generateHotel(pkg.dest, pkg.nights, 200000)
        await addPackageHotel(pkgId, pkgHotel)

        // Package transfers
        const pkgTransfers = generateTransfers(pkg.dest)
        for (const tr of pkgTransfers) {
            await addPackageTransfer(pkgId, tr)
        }

        // Package activities
        const pkgActivities = generateActivities(pkg.dest, pkg.nights)
        for (const act of pkgActivities) {
            await addPackageActivity(pkgId, act)
        }

        // Package pricing
        const ph = pickHotel(pkg.dest, 200000)
        const pkgPricing = generatePricing(
            pkg.nights * 30000, 15, pkg.nights, 2, 0, ph
        )
        await addPackagePricing(pkgId, pkgPricing)

        onProgress(82 + Math.round(((p + 1) / DEMO_PACKAGES.length) * 13), `Created package: ${pkg.name}`)
    }

    onProgress(100, "Demo data seeded successfully!")
}

// ─── Delete Demo Data Function ───────────────────────

export async function deleteFullDemo(onProgress: ProgressFn): Promise<void> {
    // Phase 1: Delete demo itineraries (with sub-collections)
    onProgress(5, "Removing demo itineraries...")
    const allItins = await getItineraries() as any[]
    const demoItins = allItins.filter((i) => i.__seedDemo === true)
    for (let i = 0; i < demoItins.length; i++) {
        await clearItinerarySubcollections(demoItins[i].id)
        await deleteItinerary(demoItins[i].id)
        onProgress(5 + Math.round(((i + 1) / Math.max(demoItins.length, 1)) * 25), `Deleted itinerary ${demoItins[i].quoteId || demoItins[i].id}`)
    }

    // Phase 2: Delete demo packages (with sub-collections)
    onProgress(30, "Removing demo packages...")
    const allPkgs = await getPackages() as any[]
    const demoPkgs = allPkgs.filter((p) => p.__seedDemo === true)
    for (let i = 0; i < demoPkgs.length; i++) {
        await clearPackageSubcollections(demoPkgs[i].id)
        await deletePackage(demoPkgs[i].id)
        onProgress(30 + Math.round(((i + 1) / Math.max(demoPkgs.length, 1)) * 15), `Deleted package ${demoPkgs[i].packageName || demoPkgs[i].id}`)
    }

    // Phase 3: Delete demo customers
    onProgress(50, "Removing demo customers...")
    const allCusts = await getCustomers() as any[]
    const demoCusts = allCusts.filter((c) => c.__seedDemo === true)
    for (let i = 0; i < demoCusts.length; i++) {
        await deleteCustomer(demoCusts[i].id)
        onProgress(50 + Math.round(((i + 1) / Math.max(demoCusts.length, 1)) * 15), `Deleted customer ${demoCusts[i].name}`)
    }

    // Phase 4: Delete demo SOPs
    onProgress(70, "Removing demo SOP templates...")
    const allSOPs = await getSOPs() as any[]
    const demoSOPs = allSOPs.filter((s) => s.__seedDemo === true)
    for (const s of demoSOPs) {
        await deleteSOP(s.id)
    }

    // Phase 5: Delete demo users
    onProgress(80, "Removing demo users...")
    const allUsers = await getUsers() as any[]
    const demoUsers = allUsers.filter((u) => u.__seedDemo === true)
    for (let i = 0; i < demoUsers.length; i++) {
        await deleteUser(demoUsers[i].uid)
        onProgress(80 + Math.round(((i + 1) / Math.max(demoUsers.length, 1)) * 15), `Deleted user ${demoUsers[i].name}`)
    }

    onProgress(100, "All demo data removed successfully!")
}
