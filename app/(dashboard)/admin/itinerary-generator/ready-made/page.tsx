import { ProtectedRoute } from "@/components/protected-route"
import { ReadyMadeGenerator } from "@/components/ready-made-generator"

export default function AdminReadyMadeFlow() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <ReadyMadeGenerator />
        </ProtectedRoute>
    )
}
