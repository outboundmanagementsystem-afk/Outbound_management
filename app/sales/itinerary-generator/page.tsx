"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { ItineraryGeneratorsHub } from "@/components/itinerary-generators-hub"

import { EditOnlyGuard } from "@/components/edit-only-guard"

export default function SalesItineraryGeneratorsHub() {
    return (
        <ProtectedRoute allowedRoles={["sales", "sales_lead", "admin", "pre_ops"]}>
            <EditOnlyGuard>
                <ItineraryGeneratorsHub />
            </EditOnlyGuard>
        </ProtectedRoute>
    )
}
