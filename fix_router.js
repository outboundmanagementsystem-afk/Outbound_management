const fs = require('fs');
const file = 'app/(dashboard)/sales/itinerary-generator/custom/page.tsx';
let c = fs.readFileSync(file, 'utf8');

const replacement = \import { useRouter, useSearchParams } from "next/navigation"

import { EditOnlyGuard } from "@/components/edit-only-guard"

export default function CustomItineraryGeneratorSales() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const returnTo = searchParams.get('returnTo')

    return (
        <ProtectedRoute allowedRoles={["sales", "sales_lead", "admin", "pre_ops", "pre_ops_lead", "post_ops", "post_ops_lead"]}>
            <EditOnlyGuard>
                <ItineraryWizard mode="custom" onSave={(id) => {
                    if (returnTo) {
                        router.push(decodeURIComponent(returnTo))
                    } else {
                        router.push(\\\/sales/itinerary/\\\\)
                    }
                }} />
            </EditOnlyGuard>
        </ProtectedRoute>
    )
}\;

c = c.replace(/import \{ useRouter \} from "next\/navigation"[\s\S]*/, replacement);
fs.writeFileSync(file, c, 'utf8');
