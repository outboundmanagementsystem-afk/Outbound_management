"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { SopChecklistEditor } from "@/components/sop-checklist-editor"

export default function SopBuilderPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="py-8 px-4">
        <SopChecklistEditor />
      </div>
    </ProtectedRoute>
  )
}
