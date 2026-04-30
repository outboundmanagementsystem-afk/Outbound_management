"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react"

type StatusType = "success" | "error" | "warning"

export function StatusDialog({
  open,
  onOpenChange,
  type,
  title,
  message,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: StatusType
  title: string
  message: string
}) {
  const iconMap = {
    success: <CheckCircle className="text-green-500 w-6 h-6" />,
    error: <XCircle className="text-red-500 w-6 h-6" />,
    warning: <AlertTriangle className="text-yellow-500 w-6 h-6" />,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {iconMap[type]}
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-sm text-gray-600">{message}</p>
      </DialogContent>
    </Dialog>
  )
}
