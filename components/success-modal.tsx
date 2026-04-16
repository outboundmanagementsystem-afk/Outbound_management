"use client"

import { useEffect } from "react"

interface SuccessModalProps {
  isOpen: boolean
  message: string
  onClose: () => void
}

export function SuccessModal({ isOpen, message, onClose }: SuccessModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dark overlay */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className="relative z-10 transform transition-all duration-300 scale-100 opacity-100">
        <div className="bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full">
          {/* Success icon */}
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4 mx-auto">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 9" />
            </svg>
          </div>
          
          {/* Message */}
          <p className="text-center text-gray-900 font-medium text-lg mb-6">
            {message}
          </p>
          
          {/* OK button */}
          <button
            onClick={onClose}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
