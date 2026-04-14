"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { ManualCanvas } from "@/components/manual-canvas"

import { EditOnlyGuard } from "@/components/edit-only-guard"

export default function ManualCanvasSales() {
    return (
        <ProtectedRoute allowedRoles={["sales", "sales_lead", "admin", "pre_ops"]}>
            <EditOnlyGuard>
                <ManualCanvas />
            </EditOnlyGuard>
        </ProtectedRoute>
    )
}
