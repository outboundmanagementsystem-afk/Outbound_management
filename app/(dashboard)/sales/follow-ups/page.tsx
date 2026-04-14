"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { Clock } from "lucide-react"

export default function FollowUpsPage() {
    return (
        <ProtectedRoute allowedRoles={["sales", "sales_lead", "admin"]}>
            <div className="flex flex-col items-center justify-center py-20">
                <Clock className="w-16 h-16 mb-6" style={{ color: 'rgba(6,161,92,0.2)' }} />
                <h1 className="font-serif text-3xl tracking-wide mb-3" style={{ color: '#052210' }}>Follow-ups</h1>
                <p className="font-sans text-sm" style={{ color: 'rgba(5,34,16,0.5)' }}>Coming soon — track and manage your follow-ups here.</p>
            </div>
        </ProtectedRoute>
    )
}
