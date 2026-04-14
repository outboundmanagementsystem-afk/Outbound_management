import Image from "next/image"

export function OutboundLogo({ className = "", variant = "white" }: { className?: string; variant?: "white" | "dark" | "gold" }) {
  // We use the provided PNG logo instead of the SVG
  return (
    <div className={`relative ${className} aspect-[280/120]`}>
      <Image
        src="/images/outbound png 3.png"
        alt="Outbound Travelers logo"
        fill
        className="object-contain"
        priority
      />
    </div>
  )
}

export function OutboundLogoCompact({ className = "", variant = "white" }: { className?: string; variant?: "white" | "dark" | "gold" }) {
  const fillColor = variant === "white" ? "#FFFFFF" : variant === "gold" ? "#D4AF37" : "#052210"

  return (
    <svg
      className={className}
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Outbound Travelers logo mark"
    >
      {/* Globe */}
      <circle cx="28" cy="28" r="22" stroke={fillColor} strokeWidth="1.5" fill="none" />
      <ellipse cx="28" cy="28" rx="22" ry="8" stroke={fillColor} strokeWidth="0.7" fill="none" />
      <ellipse cx="28" cy="28" rx="8" ry="22" stroke={fillColor} strokeWidth="0.7" fill="none" />
      <ellipse cx="28" cy="28" rx="15" ry="22" stroke={fillColor} strokeWidth="0.7" fill="none" />
      <line x1="6" y1="28" x2="50" y2="28" stroke={fillColor} strokeWidth="0.7" />
      {/* Airplane */}
      <g transform="translate(42, 14) rotate(-30)">
        <path
          d="M0 0 L-5 2.5 L-11 1.5 L-5 0 L-11 -1.5 L-5 -2.5 Z"
          fill={fillColor}
        />
        <path d="M-7 0 L-10 4 L-8 0 L-10 -4 Z" fill={fillColor} />
      </g>
    </svg>
  )
}
