"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { ItineraryGeneratorsHub } from "@/components/itinerary-generators-hub"

export default function AdminItineraryGeneratorsHub() {
    return (
        <ProtectedRoute allowedRoles={["admin", "pre_ops"]}>
            <ItineraryGeneratorsHub />
        </ProtectedRoute>
    )
}
