"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { ItineraryWizard } from "@/components/itinerary-wizard"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export default function BuildPackageGeneratorAdmin() {
    const router = useRouter()
    const { userProfile } = useAuth()
    return (
        <ProtectedRoute allowedRoles={["admin", "owner", "sales", "sales_lead", "ops", "ops_lead", "pre_ops", "pre_ops_lead", "post_ops", "post_ops_lead", "finance", "finance_lead"]}>
            <ItineraryWizard mode="package" onSave={(id) => {
                const role = userProfile?.role || 'admin';
                if (['admin', 'owner', 'sales', 'sales_lead'].includes(role)) {
                    router.push(`/sales/itinerary/${id}`);
                } else if (['finance', 'finance_lead'].includes(role)) {
                    router.push(`/finance/itinerary/${id}`);
                } else if (['ops', 'ops_lead', 'pre_ops', 'pre_ops_lead', 'post_ops', 'post_ops_lead'].includes(role)) {
                    router.push(`/ops/booking/${id}`);
                } else {
                    router.push(`/sales/itinerary/${id}`);
                }
            }} />
        </ProtectedRoute>
    )
}
