"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { ReadyMadeGenerator } from "@/components/ready-made-generator"

import { EditOnlyGuard } from "@/components/edit-only-guard"

export default function ReadyMadeGeneratorSales() {
    return (
        <ProtectedRoute allowedRoles={["sales", "sales_lead", "admin", "pre_ops"]}>
            <EditOnlyGuard>
                <ReadyMadeGenerator />
            </EditOnlyGuard>
        </ProtectedRoute>
    )
}
