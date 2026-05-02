"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { ItineraryWizard } from "@/components/itinerary-wizard"
import { useRouter, useSearchParams } from "next/navigation"

import { EditOnlyGuard } from "@/components/edit-only-guard"

export default function CustomItineraryGeneratorSales() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const returnTo = searchParams.get("returnTo")
    
    return (
        <ProtectedRoute allowedRoles={["sales", "sales_lead", "admin", "pre_ops", "pre_ops_lead", "post_ops", "post_ops_lead"]}>
            <EditOnlyGuard>
                <ItineraryWizard mode="custom" onSave={(id) => {
                    if (returnTo) {
                        router.push(decodeURIComponent(returnTo))
                    } else {
                        router.push(`/sales/itinerary/${id}`)
                    }
                }} />
            </EditOnlyGuard>
        </ProtectedRoute>
    )
}
