"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { ItineraryWizard } from "@/components/itinerary-wizard"
import { useRouter } from "next/navigation"

export default function BuildPackageGeneratorAdmin() {
    const router = useRouter()
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <ItineraryWizard mode="package" onSave={(id) => router.push(`/sales/itinerary/${id}`)} />
        </ProtectedRoute>
    )
}
