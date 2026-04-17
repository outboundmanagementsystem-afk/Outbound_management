"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { ItineraryWizard } from "@/components/itinerary-wizard"
import { useRouter } from "next/navigation"

export default function BuildPackageGeneratorAdmin() {
    const router = useRouter()
    return (
        <ProtectedRoute allowedRoles={["admin", "owner", "sales", "sales_lead", "ops", "ops_lead", "pre_ops", "pre_ops_lead", "post_ops", "post_ops_lead", "finance", "finance_lead"]}>
            <ItineraryWizard mode="package" onSave={(id) => router.push(`/${userProfile?.role || 'admin'}/itinerary/${id}`)} />
        </ProtectedRoute>
    )
}
