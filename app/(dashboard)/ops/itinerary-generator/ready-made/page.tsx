import { ProtectedRoute } from "@/components/protected-route"
import { ReadyMadeGenerator } from "@/components/ready-made-generator"

export default function OpsReadyMadeFlow() {
    return (
        <ProtectedRoute allowedRoles={["pre_ops", "pre_ops_lead"]}>
            <ReadyMadeGenerator />
        </ProtectedRoute>
    )
}
