"use client"

import Image from "next/image"
import { OutboundLogoCompact } from "./outbound-logo"
import { Instagram, Facebook, Twitter, Phone, Mail, MapPin } from "lucide-react"

export function FooterSection() {
  return (
    <footer
      className="relative grain-overlay"
      style={{
        backgroundImage: "url('/images/bg/page_001.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-[#0000000D] pointer-events-none" />
      {/* Gold top border */}
      <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, #D4AF37 20%, #D4AF37 80%, transparent 100%)' }} />

      <div className="px-6 md:px-16 lg:px-24 py-16 md:py-20">
        <div className="max-w-4xl mx-auto text-center relative z-10">

          {/* Logo mark */}
          <div className="flex justify-center mb-6">
            <div className="relative w-[140px] h-[70px]">
              <Image
                src="/images/outbound png 3.png"
                alt="Outbound Travelers"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* Tagline */}
          <p className="font-serif text-xl md:text-2xl italic tracking-wide" style={{ color: '#D4AF37' }}>
            Make your trips easier
          </p>

          {/* Divider */}
          <div className="my-8 mx-auto w-32 h-px" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />

          {/* Contact info */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 mb-8">
            <a href="tel:+919840341529" className="flex items-center gap-2 transition-colors duration-200 hover:opacity-80" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <Phone className="w-4 h-4" style={{ color: '#D4AF37' }} />
              <span className="font-sans text-sm">+91 9840341529</span>
            </a>
            <a href="mailto:info@outboundtravelers.com" className="flex items-center gap-2 transition-colors duration-200 hover:opacity-80" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <Mail className="w-4 h-4" style={{ color: '#D4AF37' }} />
              <span className="font-sans text-sm">info@outboundtravelers.com</span>
            </a>
            <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <MapPin className="w-4 h-4" style={{ color: '#D4AF37' }} />
              <span className="font-sans text-sm">Chennai, India</span>
            </div>
          </div>

          {/* Social icons */}
          <div className="flex items-center justify-center gap-4 mb-10">
            {[Instagram, Facebook, Twitter].map((Icon, idx) => (
              <button
                key={idx}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                style={{
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  color: '#D4AF37',
                  background: 'rgba(212,175,55,0.05)',
                }}
                aria-label={`Social media link ${idx + 1}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 py-8" style={{ borderTop: '1px solid rgba(212, 175, 55, 0.1)', borderBottom: '1px solid rgba(212, 175, 55, 0.1)' }}>
            {[
              { number: "5000+", label: "Happy Customers" },
              { number: "100+", label: "Destinations" },
              { number: "24/7", label: "Support" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-serif text-2xl tracking-wide" style={{ color: '#D4AF37' }}>{stat.number}</p>
                <p className="font-sans text-xs tracking-[0.15em] uppercase mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Copyright */}
          <p className="font-sans text-xs mt-8 tracking-wider" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {'© 2024 Outbound Travelers. All rights reserved.'}
          </p>
        </div>
      </div>
    </footer>
  )
}
