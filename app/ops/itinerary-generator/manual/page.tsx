import { ProtectedRoute } from "@/components/protected-route"
import { ManualCanvas } from "@/components/manual-canvas"

export default function OpsManualCanvasPage() {
    return (
        <ProtectedRoute allowedRoles={["pre_ops", "pre_ops_lead"]}>
            <ManualCanvas />
        </ProtectedRoute>
    )
}
