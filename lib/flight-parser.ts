import validIataCodes from "./iata-codes.json" // Assume this is a static map of known IATA codes

export interface FlightSegment {
    airline: string
    flightNo: string
    fromCode: string
    toCode: string
    departure: string
    arrival: string
    duration: string
    type: "Onward" | "Return" | "Internal"
    flightType: "Direct" | "Connecting"
    price: number
    layoverDetails?: string
}

const COMMON_AIRLINES = [
    "IndiGo", "AirAsia", "Air India", "SpiceJet", "Vistara", "Akasa Air", "GoFirst", "Emirates", "Qatar Airways", "Etihad", "Singapore Airlines", "Malaysia Airlines", "SriLankan Airlines", "Oman Air", "Gulf Air", "Saudi Airlines", "FlyDubai", "Air Arabia"
]

export function extractFlightDetailsFromText(text: string): Partial<FlightSegment>[] {
    const segments: Partial<FlightSegment>[] = []

    // 1. Extract Time Formats HH:MM
    const timeRegex = /\b([0-1]?[0-9]|2[0-3])\s*[:;.,]\s*([0-5][0-9])\b/g
    const times = [...text.matchAll(timeRegex)].map(m => m[0].replace(/[;.,]/, ':'))

    // 2. Extract Duration
    const durationRegex = /\b(\d{1,2})\s*[hH]\s*(\d{1,2})\s*[mM]\b/g
    const durations = [...text.matchAll(durationRegex)].map(m => `${m[1]}h ${m[2]}m`)

    // 3. Extract IATA Codes / City Names
    const excludeWords = ["AND", "THE", "FOR", "SET", "ALL", "NEW", "NON", "PM", "AM", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN", "INR", "USD", "HRS", "MIN"]
    const iataRegex = /\b[A-Z]{3}\b/g
    let rawIatas = [...text.matchAll(iataRegex)].map(m => m[0])
    rawIatas = rawIatas.filter(code => !excludeWords.includes(code))

    // Common city fallbacks
    const commonCities = ["Mumbai", "Delhi", "New Delhi", "Chennai", "Kolkata", "Bangalore", "Bengaluru", "Hyderabad", "Kochi", "Trivandrum", "Pune", "Ahmedabad", "Dubai", "Singapore", "Kuala Lumpur", "Bangkok", "London", "Paris", "New York"]
    for (const city of commonCities) {
        if (text.toLowerCase().includes(city.toLowerCase())) {
            // Add a mock 3-letter code based on city for UI compatibility if IATA missed
            const mockCode = city.substring(0, 3).toUpperCase()
            if (!rawIatas.includes(mockCode)) rawIatas.push(mockCode)
        }
    }

    // Deduplicate IATAs maintaining order of appearance
    rawIatas = [...new Set(rawIatas)]

    // 4. Extract Flight Number
    const flightNoRegex = /\b([A-Z0-9]{2})\s*-?\s*(\d{3,4})\b/g
    const flightNos = [...text.matchAll(flightNoRegex)].map(m => `${m[1]}-${m[2]}`)

    // 5. Detect Airline
    let detectedAirline = ""
    for (const airline of COMMON_AIRLINES) {
        if (text.toLowerCase().includes(airline.toLowerCase())) {
            detectedAirline = airline
            break
        }
    }

    // Attempt to parse price ₹
    const priceRegex = /₹\s*([\d,]+)/
    const priceMatch = text.match(priceRegex)
    let price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ""), 10) : 0

    // LOGIC: Pair up times to create segments
    // A single flight has 2 times (departure, arrival)
    // A round trip has 4 times
    // A connecting flight might have 4 times but 1 direction, or 3 IATAs.
    // For simplicity, every pair of times is a segment. We'll assign IATAs based on segment index.

    const isReturn = text.toLowerCase().includes("return") || text.toLowerCase().includes("round trip")

    // Group times into pairs
    for (let i = 0; i < times.length; i += 2) {
        if (i + 1 < times.length) {
            const segIndex = i / 2

            let type: "Onward" | "Return" = "Onward"
            if (isReturn && segIndex > 0) type = "Return" // If it's a return ticket, second chunk is return
            else if (!isReturn && segIndex > 0) type = "Onward" // Connecting onward

            // Assign IATAs sequentially. E.g. [A, B] then [B, A]
            let fromCode = rawIatas[segIndex * 2] || rawIatas[0] || ""
            let toCode = rawIatas[segIndex * 2 + 1] || rawIatas[1] || ""

            // Fallback for return flight IATAs if not enough extracted
            if (type === "Return" && segIndex * 2 >= rawIatas.length) {
                fromCode = rawIatas[1] || "XXX"
                toCode = rawIatas[0] || "YYY"
            }

            segments.push({
                airline: detectedAirline,
                flightNo: flightNos[segIndex] || flightNos[0] || "",
                fromCode: fromCode,
                toCode: toCode,
                departure: times[i],
                arrival: times[i + 1],
                duration: durations[segIndex] || durations[0] || "",
                type: type,
                flightType: text.toLowerCase().includes("1 stop") || text.toLowerCase().includes("connecting") ? "Connecting" : "Direct",
                price: segIndex === 0 ? price : 0, // Attach price to first segment only to avoid doubling
                layoverDetails: ""
            })
        }
    }

    // Fallback if no times found but other details exist
    if (segments.length === 0 && (detectedAirline || rawIatas.length >= 2)) {
        segments.push({
            airline: detectedAirline,
            flightNo: flightNos[0] || "",
            fromCode: rawIatas[0] || "",
            toCode: rawIatas[1] || "",
            departure: "",
            arrival: "",
            duration: durations[0] || "",
            type: "Onward",
            flightType: "Direct",
            price: price
        })
    }

    return segments
}
