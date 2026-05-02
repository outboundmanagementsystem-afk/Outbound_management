import { ProtectedRoute } from "@/components/protected-route"
import { ManualCanvas } from "@/components/manual-canvas"

export default function AdminManualCanvasPage() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <ManualCanvas />
        </ProtectedRoute>
    )
}
