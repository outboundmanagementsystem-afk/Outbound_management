"use client"

import { useState, useRef, useEffect } from "react"
import {
    Plus, Trash2, ArrowUp, ArrowDown, Type, Calendar, FileText,
    Download, LayoutTemplate, Settings, X, Loader2, DollarSign,
    Hotel, Plane, Car, CheckCircle2, Scale,
    Sparkles, Eye, EyeOff, ZoomIn, ZoomOut
} from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getDraft, saveDraft, updateDraft, getDestinations, getPresetDays } from "@/lib/firestore"

import { HeroSection } from "@/components/hero-section"
import { TripSummary } from "@/components/trip-summary"
import { FlightDetails } from "@/components/flight-details"
import { HotelDetails } from "@/components/hotel-details"
import { TransferDetails } from "@/components/transfer-details"
import { DayItinerary } from "@/components/day-itinerary"
import { PricingSection } from "@/components/pricing-section"
import { IncExcSection } from "@/components/inc-exc-section"
import { TermsSection } from "@/components/terms-section"

type BlockType = 'HERO' | 'TRIP_SUMMARY' | 'FLIGHT_DETAILS' | 'HOTEL_DETAILS' | 'TRANSFER_DETAILS' | 'DAY_ITINERARY' | 'PRICING_SECTION' | 'INC_EXC' | 'TERMS' | 'TEXT'

interface Block {
    id: string
    type: BlockType
    data: any
}

/* ─── Element definitions ─────────────────────────────────────── */
const ELEMENTS = [
    {
        group: 'Structure',
        items: [
            { type: 'HERO' as BlockType, label: 'Cover / Hero', desc: 'Title page with destination', icon: FileText, color: '#7c3aed' },
            { type: 'TRIP_SUMMARY' as BlockType, label: 'Trip Summary', desc: 'Overview of the trip', icon: LayoutTemplate, color: '#0891b2' },
        ]
    },
    {
        group: 'Travel Details',
        items: [
            { type: 'FLIGHT_DETAILS' as BlockType, label: 'Flight Details', desc: 'Flights & segments', icon: Plane, color: '#0369a1' },
            { type: 'HOTEL_DETAILS' as BlockType, label: 'Hotel Details', desc: 'Accommodation info', icon: Hotel, color: '#b45309' },
            { type: 'TRANSFER_DETAILS' as BlockType, label: 'Transfers', desc: 'Pickup & drop info', icon: Car, color: '#15803d' },
            { type: 'DAY_ITINERARY' as BlockType, label: 'Day Plan Array', desc: 'Day-by-day schedule', icon: Calendar, color: '#b91c1c' },
        ]
    },
    {
        group: 'Financials & Legal',
        items: [
            { type: 'PRICING_SECTION' as BlockType, label: 'Pricing Section', desc: 'Price & tax breakdown', icon: DollarSign, color: '#065f46' },
            { type: 'INC_EXC' as BlockType, label: 'Inc & Exc', desc: 'What is included', icon: CheckCircle2, color: '#6d28d9' },
            { type: 'TERMS' as BlockType, label: 'Terms & Cond.', desc: 'Policies & conditions', icon: Scale, color: '#9f1239' },
        ]
    },
    {
        group: 'Custom',
        items: [
            { type: 'TEXT' as BlockType, label: 'Custom Text', desc: 'Free-form text block', icon: Type, color: '#374151' },
        ]
    },
]

/* ─── Label helper ─────────────────────────────────────────────── */
const BLOCK_LABELS: Record<BlockType, string> = {
    HERO: 'Cover / Hero',
    TRIP_SUMMARY: 'Trip Summary',
    FLIGHT_DETAILS: 'Flight Details',
    HOTEL_DETAILS: 'Hotel Details',
    TRANSFER_DETAILS: 'Transfers',
    DAY_ITINERARY: 'Day Plan Array',
    PRICING_SECTION: 'Pricing Section',
    INC_EXC: 'Inc & Exc',
    TERMS: 'Terms & Cond.',
    TEXT: 'Custom Text',
}

/* ─── Input helpers ────────────────────────────────────────────── */
const LabelEl = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#6b7280' }}>
        {children}
    </label>
)

const InputEl = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className={`w-full px-3 py-2 rounded-lg text-sm font-sans transition-all duration-150 outline-none ${props.className || ''}`}
        style={{
            background: '#F9FAFB',
            border: '1px solid #E5E7EB',
            color: '#111827',
            ...(props.style || {}),
        }}
        onFocus={e => { e.currentTarget.style.border = '1px solid #06a15c'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(6,161,92,0.1)' }}
        onBlur={e => { e.currentTarget.style.border = '1px solid #E5E7EB'; e.currentTarget.style.boxShadow = 'none' }}
    />
)

const TextAreaEl = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
        {...props}
        className={`w-full px-3 py-2 rounded-lg text-sm font-sans transition-all duration-150 outline-none resize-none ${props.className || ''}`}
        style={{
            background: '#F9FAFB',
            border: '1px solid #E5E7EB',
            color: '#111827',
            ...(props.style || {}),
        }}
        onFocus={e => { e.currentTarget.style.border = '1px solid #06a15c'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(6,161,92,0.1)' }}
        onBlur={e => { e.currentTarget.style.border = '1px solid #E5E7EB'; e.currentTarget.style.boxShadow = 'none' }}
    />
)

const AddBtn = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-1.5 text-xs font-semibold mt-3 px-3 py-1.5 rounded-lg transition-all duration-150"
        style={{ color: '#06a15c', background: 'rgba(6,161,92,0.06)', border: '1px solid rgba(6,161,92,0.2)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(6,161,92,0.12)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(6,161,92,0.06)' }}
    >
        <Plus className="w-3 h-3" /> {label}
    </button>
)

const RemoveBtn = ({ onClick }: { onClick: () => void }) => (
    <button
        onClick={onClick}
        className="p-1.5 rounded-lg transition-all duration-150 flex-shrink-0"
        style={{ color: '#ef4444', background: 'rgba(239,68,68,0.06)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)' }}
    >
        <X className="w-3.5 h-3.5" />
    </button>
)

const FieldCard = ({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) => (
    <div className="relative p-3 rounded-xl mb-2.5 group" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
        <div className="absolute top-2.5 right-2.5">
            <RemoveBtn onClick={onRemove} />
        </div>
        <div className="pr-8 space-y-2">
            {children}
        </div>
    </div>
)

const Divider = ({ label }: { label: string }) => (
    <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>{label}</span>
        <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
    </div>
)

/* ─── Main Component ───────────────────────────────────────────── */
export function ManualCanvas() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { userProfile } = useAuth()
    const draftIdParam = searchParams.get('draft')

    const [draftId, setDraftId] = useState<string | null>(draftIdParam)
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const initLoaded = useRef(false)

    const [blocks, setBlocks] = useState<Block[]>([
        { id: '1', type: 'HERO', data: { customerName: 'Mr. Wasim', destination: 'Kashmir', nights: 4, days: 5, startDate: 'Dec 23, 2024', endDate: 'Dec 27, 2024' } }
    ])
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>('1')
    const [generating, setGenerating] = useState(false)
    const [previewMode, setPreviewMode] = useState(false)
    const [zoomLevel, setZoomLevel] = useState(1)
    const printRef = useRef<HTMLDivElement>(null)
    const [destinations, setDestinations] = useState<any[]>([])

    useEffect(() => {
        const fetchDests = async () => {
            try {
                const dests = await getDestinations()
                setDestinations(dests)
            } catch (err) { console.error("Error loading destinations", err) }
        }
        fetchDests()
    }, [])

    useEffect(() => {
        if (!draftIdParam || initLoaded.current) return
        const loadDraft = async () => {
            try {
                const draft = await getDraft(draftIdParam) as any
                if (draft && draft.data) {
                    setBlocks(draft.data)
                }
            } catch (err) { console.error("Error loading draft", err) }
            initLoaded.current = true
        }
        loadDraft()
    }, [draftIdParam])

    useEffect(() => {
        if (!userProfile || (!initLoaded.current && draftIdParam)) return

        const saveTimer = setTimeout(async () => {
            setIsSaving(true)
            try {
                const draftData = {
                    type: "manual",
                    data: blocks,
                    customerName: (blocks.find(b => b.type === 'HERO') as any)?.data?.customerName || "Untitled Itinerary",
                    destination: (blocks.find(b => b.type === 'HERO') as any)?.data?.destination || "",
                    nights: (blocks.find(b => b.type === 'HERO') as any)?.data?.nights || 0,
                    days: (blocks.find(b => b.type === 'HERO') as any)?.data?.days || 0
                }

                if (draftId) {
                    await updateDraft(draftId, draftData)
                } else {
                    const id = await saveDraft(userProfile.uid, draftData)
                    setDraftId(id)
                    window.history.replaceState(null, '', `?draft=${id}`)
                }
                setLastSaved(new Date())
            } catch (err) { console.error("Auto-save failed", err) }
            finally { setIsSaving(false) }
        }, 2000)

        return () => clearTimeout(saveTimer)
    }, [blocks, userProfile, draftId, draftIdParam])

    const addBlock = (type: BlockType) => {
        const newBlock: Block = { id: Date.now().toString(), type, data: getDefaultData(type) }
        setBlocks(prev => [...prev, newBlock])
        setSelectedBlockId(newBlock.id)
    }

    const getDefaultData = (type: BlockType) => {
        switch (type) {
            case 'HERO': return { customerName: 'Mr. Wasim', destination: 'Kashmir', nights: 4, days: 5, startDate: 'Dec 23', endDate: 'Dec 27' }
            case 'TRIP_SUMMARY': return { fields: [{ label: 'Name', value: 'Mr. Wasim', icon: '✦' }, { label: 'Trip To', value: 'Kashmir', icon: '📍' }, { label: 'No. of Nights', value: '4N / 5D', icon: '🌙' }] }
            case 'FLIGHT_DETAILS': return { segments: [{ flightNumber: '6E 2131', airline: 'IndiGo', origin: 'DEL', destination: 'SXR', originTime: '10:00 AM', destinationTime: '11:30 AM', duration: '1h 30m', departureDate: 'Dec 23, 2024', originType: 'non-stop' }] }
            case 'HOTEL_DETAILS': return { hotelList: [{ name: 'Srinagar Premium Hotel', subtitle: 'Or Similar Property', location: 'Srinagar', rating: 4, nights: '2 Nights', amenities: 'Breakfast, Dinner, Heater' }] }
            case 'TRANSFER_DETAILS': return { transfers: [{ type: 'Private Sedan', date: 'Dec 23, 2024', time: '12:00 PM', pickup: 'Srinagar Airport', drop: 'Srinagar Hotel', vehicle: 'Etios / Dzire' }] }
            case 'DAY_ITINERARY': return { destination: 'Kashmir', totalDays: 5, dayPlans: [{ day: 'Day 01', date: 'Dec 23', title: 'Arrival in Srinagar', description: 'Arrive at Srinagar airport, transfer to hotel and relax.', highlights: ['Shikara Ride'], overnightStay: 'Srinagar' }] }
            case 'PRICING_SECTION': return { price: '₹140,000', inclusions: '2 Adults, Per Person', gstNote: '5% GST applicable' }
            case 'INC_EXC': return { inclusions: ['Accommodation as per itinerary', 'Daily Breakfast & Dinner', 'All transfers via private vehicle', 'Toll, parking and driver bata'], exclusions: ['Airfare / Train tickets', 'Lunch & any other meals', 'Personal expenses', 'Entry tickets & guide fees'] }
            case 'TERMS': return { terms: ['100% advance payment required for flight bookings.', '50% advance required to confirm the package.', 'Standard check-in time is 14:00 and check-out is 11:00.', 'No refunds for unutilized services or no-shows.'] }
            case 'TEXT': return { heading: '', content: '' }
            default: return {}
        }
    }

    const updateBlockData = (id: string, key: string, value: any) => {
        setBlocks(prev => prev.map(b => {
            if (b.id !== id) return b
            const newData = { ...b.data, [key]: value }

            if (b.type === 'HERO' && (key === 'startDate' || key === 'endDate')) {
                const start = new Date(key === 'startDate' ? value : b.data.startDate)
                const end = new Date(key === 'endDate' ? value : b.data.endDate)
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                    if (diff >= 0) { newData.nights = diff; newData.days = diff + 1 }
                }
            }
            return { ...b, data: newData }
        }))
    }

    const removeBlock = (id: string) => {
        setBlocks(prev => prev.filter(b => b.id !== id))
        if (selectedBlockId === id) setSelectedBlockId(null)
    }

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        const newBlocks = [...blocks]
        if (direction === 'up' && index > 0) {
            [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]]
        } else if (direction === 'down' && index < blocks.length - 1) {
            [newBlocks[index + 1], newBlocks[index]] = [newBlocks[index], newBlocks[index + 1]]
        }
        setBlocks(newBlocks)
    }

    const generatePDF = async () => {
        if (!printRef.current) return
        setGenerating(true)
        const prevSelected = selectedBlockId
        setSelectedBlockId(null)
        setPreviewMode(true)

        // Small delay to let UI update (deselect rings, etc.)
        await new Promise(r => setTimeout(r, 200))

        try {
            const html2pdf = (await import('html2pdf.js')).default
            const element = printRef.current
            const opt = {
                margin: 0,
                filename: 'Itinerary.pdf',
                image: { type: 'jpeg' as const, quality: 0.99 },
                html2canvas: { 
                    scale: 3, 
                    useCORS: true, 
                    scrollY: 0, 
                    windowHeight: element.scrollHeight, 
                    logging: false,
                    onclone: function(clonedDoc) {
                        // --- PHASE 1: Baseline Style Inlining ---
                        clonedDoc.querySelectorAll('*').forEach(el => {
                            const element = el as HTMLElement;
                            const computed = clonedDoc.defaultView?.getComputedStyle(el);
                            if (!computed) return;
                            const color = computed.getPropertyValue('color');
                            const bg = computed.getPropertyValue('background-color');
                            const fontSize = computed.getPropertyValue('font-size');
                            const fontWeight = computed.getPropertyValue('font-weight');

                            if (color) element.style.setProperty('color', color, 'important');
                            if (bg && bg !== 'rgba(0, 0, 0, 0)') element.style.setProperty('background-color', bg, 'important');
                            if (fontSize) element.style.setProperty('font-size', fontSize, 'important');
                            if (fontWeight) element.style.setProperty('font-weight', fontWeight, 'important');
                        });

                        // Force the root backdrop to match the dark scheme so empty gaps aren't rendered naked white
                        const rootEl = clonedDoc.getElementById('print-container');
                        if (rootEl) {
                            rootEl.classList.remove('bg-white');
                            rootEl.style.setProperty('background-color', '#051F10', 'important');
                        }

                        // --- PHASE 2: Global Context & Visibility Logic ---
                        clonedDoc.querySelectorAll('.pdf-section, section[class*="bg-[#031A0C]"], section[class*="bg-[#051F10]"], div[class*="bg-[#051F10]"]').forEach(section => {
                            section.querySelectorAll('p, span, h1, h2, h3, div').forEach(el => {
                                const element = el as HTMLElement;
                                
                                // Explicitly recover yellow items manually if compute fails
                                if (element.classList.contains('text-[#FFE500]') || element.classList.contains('text-yellow-400')) {
                                    element.style.setProperty('color', '#FFE500', 'important');
                                } 
                                else if (!element.closest('.bg-white') && !element.closest('.bg-gray-50') && !element.getAttribute('data-pdf-color')) {
                                    element.style.setProperty('color', '#ffffff', 'important');
                                }
                            });
                        });

                        clonedDoc.querySelectorAll('.bg-white, .bg-gray-50, section[style*="#FAF9F6"], section[style*="#faf9f6"], section[style*="rgb(250, 249, 246)"]').forEach(container => {
                           container.querySelectorAll('p, h1, h2, h3, span:not(.text-white), li').forEach(el => {
                               const element = el as HTMLElement;
                               if (!element.closest('[class*="bg-[#051F10]"]') && !element.closest('[class*="day-marker-badge"]')) {
                                   element.style.setProperty('color', '#1a211d', 'important');
                               }
                           });
                        });

                        // --- PHASE 3: Targeted Component Recovery ---
                        clonedDoc.querySelectorAll('[class*="day-marker-badge"]').forEach(badge => {
                            (badge as HTMLElement).style.setProperty('background-color', '#051f10', 'important');
                            (badge as HTMLElement).style.setProperty('color', '#ffe500', 'important');
                            badge.querySelectorAll('*').forEach(child => {
                                (child as HTMLElement).style.setProperty('color', '#ffe500', 'important');
                            });
                        });

                        clonedDoc.querySelectorAll('.overnight-stay-label').forEach(el => {
                            (el as HTMLElement).style.setProperty('color', '#ffe500', 'important');
                            (el as HTMLElement).style.setProperty('opacity', '1', 'important');
                        });
                        clonedDoc.querySelectorAll('.overnight-stay-value').forEach(el => {
                            (el as HTMLElement).style.setProperty('color', '#ffffff', 'important');
                            (el as HTMLElement).style.setProperty('opacity', '1', 'important');
                        });

                        clonedDoc.querySelectorAll('h3[class*="emerald-950"]').forEach(el => {
                            (el as HTMLElement).style.setProperty('color', '#052e16', 'important');
                        });
                        clonedDoc.querySelectorAll('p[class*="text-gray-700"]').forEach(el => {
                            (el as HTMLElement).style.setProperty('color', '#374151', 'important');
                        });
                        clonedDoc.querySelectorAll('[class*="hotel-name"], [class*="hotel-title"]').forEach(el => {
                            (el as HTMLElement).style.setProperty('color', '#1a1a1a', 'important');
                        });
                        clonedDoc.querySelectorAll('[class*="hotel-location"], [class*="location-text"]').forEach(el => {
                            (el as HTMLElement).style.setProperty('color', '#6b7280', 'important');
                        });
                        clonedDoc.querySelectorAll('[class*="nights-badge"]').forEach(el => {
                            (el as HTMLElement).style.setProperty('background-color', '#f5c518', 'important');
                            (el as HTMLElement).style.setProperty('color', '#1a1a1a', 'important');
                        });

                        clonedDoc.querySelectorAll('.trip-summary-label').forEach(el => {
                            const element = el as HTMLElement;
                            element.style.setProperty('color', '#8E918F', 'important');
                            element.style.setProperty('font-size', '14px', 'important');
                            element.style.setProperty('font-weight', '400', 'important');
                            element.style.setProperty('letter-spacing', '0.1em', 'important');
                        });
                        clonedDoc.querySelectorAll('.trip-summary-value').forEach(el => {
                            const element = el as HTMLElement;
                            element.style.setProperty('color', '#1A211D', 'important');
                            element.style.setProperty('font-size', '14px', 'important');
                            element.style.setProperty('font-weight', '400', 'important');
                        });

                        clonedDoc.querySelectorAll('[class*="price-amount"], [class*="amount"]').forEach(el => {
                            (el as HTMLElement).style.setProperty('color', '#ffe500', 'important');
                        });

                        clonedDoc.querySelectorAll('footer').forEach(footer => {
                            (footer as HTMLElement).style.setProperty('background-color', '#031a0c', 'important');
                            footer.querySelectorAll('*').forEach(el => {
                                const element = el as HTMLElement;
                                if (!element.hasAttribute('data-pdf-color') && !element.classList.contains('text-[#FFE500]')) {
                                    element.style.setProperty('color', '#ffffff', 'important');
                                }
                            });
                        });

                        clonedDoc.querySelectorAll('[data-pdf-logo]').forEach(el => {
                            const element = el as HTMLElement;
                            element.style.setProperty('width', '160px', 'important');
                            element.style.setProperty('height', 'auto', 'important');
                            element.style.setProperty('display', 'block', 'important');
                            element.style.setProperty('object-fit', 'contain', 'important');
                            element.style.setProperty('max-width', 'none', 'important');
                        });

                        clonedDoc.querySelectorAll('[data-pdf-color]').forEach(el => {
                            const element = el as HTMLElement;
                            const pdfColor = element.getAttribute('data-pdf-color');
                            if (pdfColor === 'yellow') {
                                element.style.setProperty('color', '#FFE500', 'important');
                            } else if (pdfColor === 'white') {
                                element.style.setProperty('color', '#FFFFFF', 'important');
                            } else if (pdfColor === 'black') {
                                element.style.setProperty('color', '#1a211d', 'important');
                            }
                        });
                    }
                },
                jsPDF: { unit: 'px' as const, format: [element.offsetWidth, element.scrollHeight], orientation: 'portrait' as const }
            }
            await html2pdf().set(opt).from(element).save()
        } catch (error) {
            console.error("PDF generation error:", error)
            alert("Failed to generate PDF. Please try again.")
        } finally {
            setGenerating(false)
            setPreviewMode(false)
            setSelectedBlockId(prevSelected)
        }
    }

    const selectedBlock = blocks.find(b => b.id === selectedBlockId)

    return (
        /* Full viewport minus the dashboard header (header is ~53px) */
        <div
            className="flex -m-4 sm:-m-6 md:-m-8"
            style={{ height: 'calc(100vh - 53px)', background: '#F0F2F1' }}
        >

            {/* ══ LEFT PANEL: Elements ══════════════════════════════════ */}
            <div
                className="hidden md:flex flex-col w-[220px] flex-shrink-0"
                style={{
                    background: '#FFFFFF',
                    borderRight: '1px solid #E5E7EB',
                    boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
                }}
            >
                {/* Panel header */}
                <div className="flex-shrink-0 px-4 py-3.5" style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(5,34,16,0.08)' }}>
                            <LayoutTemplate className="w-3.5 h-3.5" style={{ color: '#052210' }} />
                        </div>
                        <span className="font-sans text-xs font-bold tracking-wide uppercase" style={{ color: '#111827' }}>Elements</span>
                    </div>
                    <p className="font-sans text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>Click to add blocks</p>
                </div>

                {/* Element groups — scrollable */}
                <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4" style={{ scrollbarWidth: 'none' }}>
                    {ELEMENTS.map(group => (
                        <div key={group.group}>
                            <p className="text-[9px] font-black uppercase tracking-widest px-1 mb-1.5" style={{ color: '#CBD5E1' }}>
                                {group.group}
                            </p>
                            <div className="space-y-1">
                                {group.items.map(el => (
                                    <button
                                        key={el.type}
                                        onClick={() => addBlock(el.type)}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-150 group"
                                        style={{ border: '1px solid transparent' }}
                                        onMouseEnter={e => {
                                            const t = e.currentTarget as HTMLElement
                                            t.style.background = '#F9FAFB'
                                            t.style.border = `1px solid ${el.color}22`
                                        }}
                                        onMouseLeave={e => {
                                            const t = e.currentTarget as HTMLElement
                                            t.style.background = 'transparent'
                                            t.style.border = '1px solid transparent'
                                        }}
                                    >
                                        <div
                                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ background: `${el.color}15` }}
                                        >
                                            <el.icon className="w-3.5 h-3.5" style={{ color: el.color }} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-sans text-[11px] font-semibold truncate leading-tight" style={{ color: '#1F2937' }}>
                                                {el.label}
                                            </p>
                                            <p className="font-sans text-[9px] truncate leading-tight mt-0.5" style={{ color: '#9CA3AF' }}>
                                                {el.desc}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Block count */}
                <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                    <p className="text-[10px] font-sans" style={{ color: '#9CA3AF' }}>
                        <span className="font-bold" style={{ color: '#052210' }}>{blocks.length}</span> block{blocks.length !== 1 ? 's' : ''} on canvas
                    </p>
                </div>
            </div>

            {/* ══ CENTER: Canvas ════════════════════════════════════════ */}
            <div
                className="flex-1 flex flex-col overflow-hidden relative"
                style={{ background: '#E8ECEA' }}
            >
                {/* Canvas toolbar */}
                <div
                    className="flex-shrink-0 flex items-center justify-between px-5 py-2.5"
                    style={{
                        background: 'rgba(255,255,255,0.95)',
                        borderBottom: '1px solid rgba(5,34,16,0.07)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                >
                    {/* Left: save status */}
                    <div className="flex items-center gap-2">
                        {isSaving ? (
                            <div className="flex items-center gap-1.5 text-[11px] font-sans font-semibold" style={{ color: '#06a15c' }}>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving…</span>
                            </div>
                        ) : lastSaved ? (
                            <div className="flex items-center gap-1.5 text-[11px] font-sans" style={{ color: '#6B7280' }}>
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981' }} />
                                <span>Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-[11px] font-sans" style={{ color: '#9CA3AF' }}>
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#D1D5DB' }} />
                                <span>Draft</span>
                            </div>
                        )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-2">
                        {/* Zoom controls */}
                        <div className="flex items-center gap-1 mr-2 px-2 py-1 rounded-lg" style={{ background: '#F3F4F6' }}>
                            <button onClick={() => setZoomLevel(z => Math.max(0.25, z - 0.1))} className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700 transition-colors">
                                <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-sans text-[10px] font-bold w-10 text-center" style={{ color: '#4B5563' }}>{Math.round(zoomLevel * 100)}%</span>
                            <button onClick={() => setZoomLevel(z => Math.min(2, z + 0.1))} className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700 transition-colors">
                                <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        
                        {/* Preview toggle */}
                        <button
                            onClick={() => setPreviewMode(!previewMode)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all duration-150"
                            style={{
                                background: previewMode ? 'rgba(5,34,16,0.08)' : 'transparent',
                                color: '#374151',
                                border: '1px solid #E5E7EB',
                            }}
                        >
                            {previewMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {previewMode ? 'Edit' : 'Preview'}
                        </button>

                        {/* Export PDF */}
                        <button
                            onClick={generatePDF}
                            disabled={generating}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold font-sans transition-all duration-150 disabled:opacity-60"
                            style={{
                                background: generating ? '#064e3b' : 'linear-gradient(135deg, #052210 0%, #063318 100%)',
                                color: '#FFFFFF',
                                boxShadow: generating ? 'none' : '0 2px 8px rgba(5,34,16,0.25)',
                            }}
                            onMouseEnter={e => { if (!generating) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
                        >
                            {generating
                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting…</>
                                : <><Download className="w-3.5 h-3.5" /> Export PDF</>
                            }
                        </button>
                    </div>
                </div>

                {/* Canvas scroll area */}
                <div
                    className="flex-1 overflow-auto flex justify-center py-8 px-4"
                    onClick={e => { if (e.target === e.currentTarget) setSelectedBlockId(null) }}
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}
                >
                    <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.2s', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        {/* A4 page */}
                        <div
                            id="print-container"
                            ref={printRef}
                            className="flex flex-col relative"
                            style={{
                                width: '210mm', // Fixed exact width to allow true scaling
                                minHeight: '297mm',
                                boxShadow: '0 4px 40px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
                                borderRadius: '2px',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                        {blocks.map((block, index) => {
                            const isSelected = !previewMode && selectedBlockId === block.id
                            return (
                                <div
                                    key={block.id}
                                    className="relative group"
                                    style={{
                                        outline: isSelected ? '2px solid #06a15c' : 'none',
                                        outlineOffset: '-2px',
                                        cursor: previewMode ? 'default' : 'pointer',
                                        transition: 'outline 0.1s',
                                    }}
                                    onClick={() => { if (!previewMode) setSelectedBlockId(block.id) }}
                                >
                                    {/* Block label + controls — shown on hover/select */}
                                    {!previewMode && !generating && (
                                        <div
                                            className={`absolute top-2 left-2 z-20 transition-opacity duration-150 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                        >
                                            <div
                                                className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold font-sans uppercase tracking-wider"
                                                style={{ background: '#052210', color: '#4ade80' }}
                                            >
                                                {BLOCK_LABELS[block.type]}
                                            </div>
                                        </div>
                                    )}

                                    {/* Block action controls */}
                                    {!previewMode && !generating && (
                                        <div
                                            className={`absolute top-2 right-2 z-20 flex items-center gap-0.5 rounded-lg p-0.5 transition-opacity duration-150 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                            style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', border: '1px solid #E5E7EB' }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() => moveBlock(index, 'up')}
                                                disabled={index === 0}
                                                className="p-1.5 rounded-md transition-colors hover:bg-gray-100 disabled:opacity-30"
                                                title="Move up"
                                            >
                                                <ArrowUp className="w-3.5 h-3.5 text-gray-600" />
                                            </button>
                                            <button
                                                onClick={() => moveBlock(index, 'down')}
                                                disabled={index === blocks.length - 1}
                                                className="p-1.5 rounded-md transition-colors hover:bg-gray-100 disabled:opacity-30"
                                                title="Move down"
                                            >
                                                <ArrowDown className="w-3.5 h-3.5 text-gray-600" />
                                            </button>
                                            <div className="w-px h-4 mx-0.5" style={{ background: '#E5E7EB' }} />
                                            <button
                                                onClick={() => removeBlock(block.id)}
                                                className="p-1.5 rounded-md transition-colors hover:bg-red-50"
                                                title="Remove block"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Block content */}
                                    <div className="pointer-events-none">
                                        {block.type === 'HERO' && (
                                            <div className="w-full flex flex-col" style={{ minHeight: '297mm', overflow: 'hidden' }}>
                                                <HeroSection {...block.data} />
                                            </div>
                                        )}
                                        {block.type === 'TRIP_SUMMARY' && <TripSummary {...block.data} />}
                                        {block.type === 'FLIGHT_DETAILS' && <div className="pb-4"><FlightDetails {...block.data} /></div>}
                                        {block.type === 'HOTEL_DETAILS' && <div className="pb-4"><HotelDetails {...block.data} /></div>}
                                        {block.type === 'TRANSFER_DETAILS' && <div className="pb-4"><TransferDetails {...block.data} /></div>}
                                        {block.type === 'DAY_ITINERARY' && <div className="pb-4"><DayItinerary {...block.data} /></div>}
                                        {block.type === 'PRICING_SECTION' && <div className="pb-4"><PricingSection {...block.data} /></div>}
                                        {block.type === 'INC_EXC' && <div className="pb-4"><IncExcSection {...block.data} /></div>}
                                        {block.type === 'TERMS' && <div className="pb-4"><TermsSection {...block.data} /></div>}
                                        {block.type === 'TEXT' && (
                                            <div className="p-12">
                                                <h2 className="font-serif text-3xl text-emerald-950 mb-4">{block.data.heading}</h2>
                                                <div className="font-sans text-gray-600 leading-relaxed whitespace-pre-wrap">{block.data.content}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}

                        {blocks.length === 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center py-32 text-center px-8">
                                <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                                    style={{ background: 'rgba(5,34,16,0.06)' }}
                                >
                                    <LayoutTemplate className="w-8 h-8" style={{ color: '#9CA3AF' }} />
                                </div>
                                <p className="font-sans text-sm font-semibold" style={{ color: '#6B7280' }}>Canvas is empty</p>
                                <p className="font-sans text-xs mt-1" style={{ color: '#9CA3AF' }}>Add elements from the left panel to start designing</p>
                            </div>
                        )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ══ RIGHT PANEL: Settings ═════════════════════════════════ */}
            {selectedBlock && !previewMode && (
                <div
                    className="w-[280px] flex-shrink-0 flex flex-col"
                    style={{
                        background: '#FFFFFF',
                        borderLeft: '1px solid #E5E7EB',
                        boxShadow: '-2px 0 12px rgba(0,0,0,0.04)',
                    }}
                >
                    {/* Panel header */}
                    <div
                        className="flex-shrink-0 flex items-center justify-between px-4 py-3"
                        style={{ borderBottom: '1px solid #F3F4F6' }}
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(5,34,16,0.08)' }}>
                                <Settings className="w-3.5 h-3.5" style={{ color: '#052210' }} />
                            </div>
                            <div>
                                <p className="font-sans text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Block Settings</p>
                                <p className="font-sans text-xs font-semibold leading-tight" style={{ color: '#111827' }}>
                                    {BLOCK_LABELS[selectedBlock.type]}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedBlockId(null)}
                            className="p-1 rounded-lg transition-colors hover:bg-gray-100"
                        >
                            <X className="w-4 h-4" style={{ color: '#6B7280' }} />
                        </button>
                    </div>

                    {/* Settings form — scrollable */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollbarWidth: 'thin' }}>

                        {/* ── HERO ── */}
                        {selectedBlock.type === 'HERO' && (
                            <>
                                <div>
                                    <LabelEl>Customer Name</LabelEl>
                                    <InputEl
                                        value={selectedBlock.data.customerName}
                                        onChange={e => updateBlockData(selectedBlock.id, 'customerName', e.target.value)}
                                        placeholder="e.g. Mr. Wasim"
                                    />
                                </div>
                                <div>
                                    <LabelEl>Destination</LabelEl>
                                    <InputEl
                                        value={selectedBlock.data.destination}
                                        onChange={e => updateBlockData(selectedBlock.id, 'destination', e.target.value)}
                                        placeholder="e.g. Kashmir"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <LabelEl>Nights</LabelEl>
                                        <InputEl
                                            type="number"
                                            min="0"
                                            value={selectedBlock.data.nights !== undefined && selectedBlock.data.nights !== null ? selectedBlock.data.nights : ''}
                                            onKeyDown={e => { if (e.key === '-' || e.key === 'e' || e.key === '.') e.preventDefault() }}
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (val === '') {
                                                    updateBlockData(selectedBlock.id, 'nights', '');
                                                } else {
                                                    updateBlockData(selectedBlock.id, 'nights', Math.max(0, parseInt(val, 10) || 0));
                                                }
                                            }}
                                            onBlur={e => {
                                                if (selectedBlock.data.nights === '' || Number(selectedBlock.data.nights) < 0 || isNaN(Number(selectedBlock.data.nights))) {
                                                    updateBlockData(selectedBlock.id, 'nights', 0);
                                                }
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <LabelEl>Days</LabelEl>
                                        <InputEl
                                            type="number"
                                            min="0"
                                            value={selectedBlock.data.days !== undefined && selectedBlock.data.days !== null ? selectedBlock.data.days : ''}
                                            onKeyDown={e => { if (e.key === '-' || e.key === 'e' || e.key === '.') e.preventDefault() }}
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (val === '') {
                                                    updateBlockData(selectedBlock.id, 'days', '');
                                                } else {
                                                    updateBlockData(selectedBlock.id, 'days', Math.max(0, parseInt(val, 10) || 0));
                                                }
                                            }}
                                            onBlur={e => {
                                                if (selectedBlock.data.days === '' || Number(selectedBlock.data.days) < 0 || isNaN(Number(selectedBlock.data.days))) {
                                                    updateBlockData(selectedBlock.id, 'days', 0);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <LabelEl>Start Date</LabelEl>
                                        <InputEl
                                            type="date"
                                            value={selectedBlock.data.startDate ? (() => { try { return new Date(selectedBlock.data.startDate).toISOString().split('T')[0] } catch { return '' } })() : ''}
                                            onChange={e => {
                                                const d = new Date(e.target.value)
                                                const formatted = isNaN(d.getTime()) ? e.target.value : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                updateBlockData(selectedBlock.id, 'startDate', formatted)
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <LabelEl>End Date</LabelEl>
                                        <InputEl
                                            type="date"
                                            value={selectedBlock.data.endDate ? (() => { try { return new Date(selectedBlock.data.endDate).toISOString().split('T')[0] } catch { return '' } })() : ''}
                                            onChange={e => {
                                                const d = new Date(e.target.value)
                                                const formatted = isNaN(d.getTime()) ? e.target.value : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                updateBlockData(selectedBlock.id, 'endDate', formatted)
                                            }}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── TRIP SUMMARY ── */}
                        {selectedBlock.type === 'TRIP_SUMMARY' && (
                            <>
                                <LabelEl>Summary Fields</LabelEl>
                                {selectedBlock.data.fields.map((f: any, i: number) => (
                                    <FieldCard key={i} onRemove={() => updateBlockData(selectedBlock.id, 'fields', selectedBlock.data.fields.filter((_: any, idx: number) => idx !== i))}>
                                        <div className="flex gap-2">
                                            <InputEl
                                                placeholder="Icon"
                                                className="w-14 flex-shrink-0"
                                                value={f.icon}
                                                onChange={e => { const arr = [...selectedBlock.data.fields]; arr[i].icon = e.target.value; updateBlockData(selectedBlock.id, 'fields', arr) }}
                                            />
                                            <InputEl
                                                placeholder="Label"
                                                value={f.label}
                                                onChange={e => { const arr = [...selectedBlock.data.fields]; arr[i].label = e.target.value; updateBlockData(selectedBlock.id, 'fields', arr) }}
                                            />
                                        </div>
                                        <InputEl
                                            placeholder="Value"
                                            value={f.value}
                                            onChange={e => { const arr = [...selectedBlock.data.fields]; arr[i].value = e.target.value; updateBlockData(selectedBlock.id, 'fields', arr) }}
                                        />
                                    </FieldCard>
                                ))}
                                <AddBtn onClick={() => updateBlockData(selectedBlock.id, 'fields', [...selectedBlock.data.fields, { label: 'New Field', value: '', icon: '✦' }])} label="Add Field" />
                            </>
                        )}

                        {/* ── FLIGHT DETAILS ── */}
                        {selectedBlock.type === 'FLIGHT_DETAILS' && (
                            <>
                                <LabelEl>Flight Segments</LabelEl>
                                {selectedBlock.data.segments.map((s: any, i: number) => (
                                    <FieldCard key={i} onRemove={() => updateBlockData(selectedBlock.id, 'segments', selectedBlock.data.segments.filter((_: any, idx: number) => idx !== i))}>
                                        <InputEl placeholder="Airline" value={s.airline} onChange={e => { const arr = [...selectedBlock.data.segments]; arr[i].airline = e.target.value; updateBlockData(selectedBlock.id, 'segments', arr) }} />
                                        <InputEl placeholder="Flight Number" value={s.flightNumber} onChange={e => { const arr = [...selectedBlock.data.segments]; arr[i].flightNumber = e.target.value; updateBlockData(selectedBlock.id, 'segments', arr) }} />
                                        <div className="grid grid-cols-2 gap-2">
                                            <InputEl placeholder="Origin (e.g. DEL)" value={s.origin} onChange={e => { const arr = [...selectedBlock.data.segments]; arr[i].origin = e.target.value; updateBlockData(selectedBlock.id, 'segments', arr) }} />
                                            <InputEl placeholder="Dep. Time" value={s.originTime} onChange={e => { const arr = [...selectedBlock.data.segments]; arr[i].originTime = e.target.value; updateBlockData(selectedBlock.id, 'segments', arr) }} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <InputEl placeholder="Dest (e.g. SXR)" value={s.destination} onChange={e => { const arr = [...selectedBlock.data.segments]; arr[i].destination = e.target.value; updateBlockData(selectedBlock.id, 'segments', arr) }} />
                                            <InputEl placeholder="Arr. Time" value={s.destinationTime} onChange={e => { const arr = [...selectedBlock.data.segments]; arr[i].destinationTime = e.target.value; updateBlockData(selectedBlock.id, 'segments', arr) }} />
                                        </div>
                                        <InputEl placeholder="Departure Date" value={s.departureDate || ''} onChange={e => { const arr = [...selectedBlock.data.segments]; arr[i].departureDate = e.target.value; updateBlockData(selectedBlock.id, 'segments', arr) }} />
                                        <InputEl placeholder="Duration (e.g. 1h 30m)" value={s.duration || ''} onChange={e => { const arr = [...selectedBlock.data.segments]; arr[i].duration = e.target.value; updateBlockData(selectedBlock.id, 'segments', arr) }} />
                                    </FieldCard>
                                ))}
                                <AddBtn onClick={() => updateBlockData(selectedBlock.id, 'segments', [...selectedBlock.data.segments, { airline: '', flightNumber: '', origin: '', destination: '', originTime: '', destinationTime: '', duration: '', departureDate: '' }])} label="Add Flight" />
                            </>
                        )}

                        {/* ── HOTEL DETAILS ── */}
                        {selectedBlock.type === 'HOTEL_DETAILS' && (
                            <>
                                <LabelEl>Hotels</LabelEl>
                                {selectedBlock.data.hotelList.map((h: any, i: number) => (
                                    <FieldCard key={i} onRemove={() => updateBlockData(selectedBlock.id, 'hotelList', selectedBlock.data.hotelList.filter((_: any, idx: number) => idx !== i))}>
                                        <InputEl placeholder="Hotel Name" value={h.name} onChange={e => { const arr = [...selectedBlock.data.hotelList]; arr[i].name = e.target.value; updateBlockData(selectedBlock.id, 'hotelList', arr) }} />
                                        <InputEl placeholder="Subtitle (e.g. Or Similar)" value={h.subtitle || ''} onChange={e => { const arr = [...selectedBlock.data.hotelList]; arr[i].subtitle = e.target.value; updateBlockData(selectedBlock.id, 'hotelList', arr) }} />
                                        <InputEl placeholder="Location / City" value={h.location} onChange={e => { const arr = [...selectedBlock.data.hotelList]; arr[i].location = e.target.value; updateBlockData(selectedBlock.id, 'hotelList', arr) }} />
                                        <div className="grid grid-cols-2 gap-2">
                                            <InputEl type="number" placeholder="Rating (1–5)" value={h.rating} onChange={e => { const arr = [...selectedBlock.data.hotelList]; arr[i].rating = Number(e.target.value); updateBlockData(selectedBlock.id, 'hotelList', arr) }} />
                                            <InputEl placeholder="Nights (e.g. 2 Nights)" value={h.nights} onChange={e => { const arr = [...selectedBlock.data.hotelList]; arr[i].nights = e.target.value; updateBlockData(selectedBlock.id, 'hotelList', arr) }} />
                                        </div>
                                        <InputEl placeholder="Amenities (comma separated)" value={Array.isArray(h.amenities) ? h.amenities.join(', ') : (h.amenities || '')} onChange={e => { const arr = [...selectedBlock.data.hotelList]; arr[i].amenities = e.target.value; updateBlockData(selectedBlock.id, 'hotelList', arr) }} />
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {(typeof h.amenities === 'string' ? h.amenities.split(',') : (h.amenities || [])).map((item: string, idx: number) => {
                                                const trimmed = item.trim()
                                                if (!trimmed) return null
                                                return (
                                                    <span key={idx} className="bg-[#f1f1f1] px-3 py-1.5 rounded-[16px] text-[12px] font-sans" style={{ color: '#1A211D' }}>
                                                        {trimmed}
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    </FieldCard>
                                ))}
                                <AddBtn onClick={() => updateBlockData(selectedBlock.id, 'hotelList', [...selectedBlock.data.hotelList, { name: '', location: '', rating: 3, nights: '', amenities: [] }])} label="Add Hotel" />
                            </>
                        )}

                        {/* ── TRANSFER DETAILS ── */}
                        {selectedBlock.type === 'TRANSFER_DETAILS' && (
                            <>
                                <LabelEl>Transfers</LabelEl>
                                {selectedBlock.data.transfers.map((t: any, i: number) => (
                                    <FieldCard key={i} onRemove={() => updateBlockData(selectedBlock.id, 'transfers', selectedBlock.data.transfers.filter((_: any, idx: number) => idx !== i))}>
                                        <div className="grid grid-cols-2 gap-2">
                                            <InputEl placeholder="Type (e.g. Private)" value={t.type} onChange={e => { const arr = [...selectedBlock.data.transfers]; arr[i].type = e.target.value; updateBlockData(selectedBlock.id, 'transfers', arr) }} />
                                            <InputEl placeholder="Vehicle" value={t.vehicle} onChange={e => { const arr = [...selectedBlock.data.transfers]; arr[i].vehicle = e.target.value; updateBlockData(selectedBlock.id, 'transfers', arr) }} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <InputEl placeholder="Date" value={t.date} onChange={e => { const arr = [...selectedBlock.data.transfers]; arr[i].date = e.target.value; updateBlockData(selectedBlock.id, 'transfers', arr) }} />
                                            <InputEl placeholder="Time" value={t.time} onChange={e => { const arr = [...selectedBlock.data.transfers]; arr[i].time = e.target.value; updateBlockData(selectedBlock.id, 'transfers', arr) }} />
                                        </div>
                                        <InputEl placeholder="Pickup Location" value={t.pickup} onChange={e => { const arr = [...selectedBlock.data.transfers]; arr[i].pickup = e.target.value; updateBlockData(selectedBlock.id, 'transfers', arr) }} />
                                        <InputEl placeholder="Drop Location" value={t.drop} onChange={e => { const arr = [...selectedBlock.data.transfers]; arr[i].drop = e.target.value; updateBlockData(selectedBlock.id, 'transfers', arr) }} />
                                    </FieldCard>
                                ))}
                                <AddBtn onClick={() => updateBlockData(selectedBlock.id, 'transfers', [...selectedBlock.data.transfers, { type: 'Private', date: '', time: '', pickup: '', drop: '', vehicle: '' }])} label="Add Transfer" />
                            </>
                        )}

                        {/* ── DAY ITINERARY ── */}
                        {selectedBlock.type === 'DAY_ITINERARY' && (
                            <>
                                {/* Auto-fill from destination */}
                                <div className="p-3 rounded-xl" style={{ background: 'rgba(6,161,92,0.05)', border: '1px solid rgba(6,161,92,0.15)' }}>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Sparkles className="w-3 h-3" style={{ color: '#06a15c' }} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#065f46' }}>Auto-fill from Destination</span>
                                    </div>
                                    <select
                                        className="w-full px-3 py-2 rounded-lg text-xs font-sans outline-none transition-all"
                                        style={{ background: 'white', border: '1px solid rgba(6,161,92,0.3)', color: '#111827' }}
                                        onChange={async (e) => {
                                            const destId = e.target.value
                                            if (!destId) return
                                            const dest = destinations.find((d: any) => d.id === destId)
                                            if (!dest) return
                                            const heroBlock = blocks.find(x => x.type === 'HERO')
                                            let baseDate: Date | null = null
                                            if (heroBlock && heroBlock.data.startDate) {
                                                const parsed = new Date(heroBlock.data.startDate)
                                                if (!isNaN(parsed.getTime())) baseDate = parsed
                                            }
                                            try {
                                                const days = await getPresetDays(destId)
                                                const mappedDays = days.map((d: any, index: number) => {
                                                    let dayDateStr = ''
                                                    if (baseDate) {
                                                        const current = new Date(baseDate)
                                                        current.setDate(current.getDate() + index)
                                                        dayDateStr = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                    }
                                                    return {
                                                        day: d.day || `Day ${String(index + 1).padStart(2, '0')}`,
                                                        date: dayDateStr || d.date || '',
                                                        title: d.title || d.name || '',
                                                        description: d.description || '',
                                                        highlights: d.highlights || [],
                                                        subDestination: d.subDestination || '',
                                                        overnightStay: d.overnightStayHotel || d.overnightStay || ''
                                                    }
                                                })
                                                setBlocks(prev => prev.map(b => {
                                                    if (b.id !== selectedBlock.id) return b
                                                    return { ...b, data: { ...b.data, destination: dest.name || '', totalDays: mappedDays.length || b.data.totalDays, dayPlans: mappedDays.length > 0 ? mappedDays : b.data.dayPlans } }
                                                }))
                                                e.target.value = ""
                                            } catch (err) { console.error(err) }
                                        }}
                                    >
                                        <option value="">— Select a destination —</option>
                                        {destinations.map((d: any) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <Divider label="or configure manually" />

                                <div>
                                    <LabelEl>Destination Name</LabelEl>
                                    <InputEl
                                        value={selectedBlock.data.destination}
                                        onChange={e => updateBlockData(selectedBlock.id, 'destination', e.target.value)}
                                        placeholder="e.g. Kashmir"
                                    />
                                </div>

                                <div>
                                    <LabelEl>Day Plans</LabelEl>
                                    {selectedBlock.data.dayPlans.map((d: any, i: number) => (
                                        <FieldCard key={i} onRemove={() => updateBlockData(selectedBlock.id, 'dayPlans', selectedBlock.data.dayPlans.filter((_: any, idx: number) => idx !== i))}>
                                            <div className="grid grid-cols-2 gap-2">
                                                <InputEl placeholder="Day 01" value={d.day} onChange={e => { const arr = [...selectedBlock.data.dayPlans]; arr[i].day = e.target.value; updateBlockData(selectedBlock.id, 'dayPlans', arr) }} />
                                                <InputEl placeholder="Dec 23" value={d.date} onChange={e => { const arr = [...selectedBlock.data.dayPlans]; arr[i].date = e.target.value; updateBlockData(selectedBlock.id, 'dayPlans', arr) }} />
                                            </div>
                                            <InputEl placeholder="Day Title" value={d.title} onChange={e => { const arr = [...selectedBlock.data.dayPlans]; arr[i].title = e.target.value; updateBlockData(selectedBlock.id, 'dayPlans', arr) }} />
                                            <TextAreaEl rows={3} placeholder="Description..." value={d.description} onChange={e => { const arr = [...selectedBlock.data.dayPlans]; arr[i].description = e.target.value; updateBlockData(selectedBlock.id, 'dayPlans', arr) }} />
                                            <div className="grid grid-cols-2 gap-2 mt-1">
                                                <InputEl placeholder="Highlights (csv)" value={(d.highlights || []).join(', ')} onChange={e => { const arr = [...selectedBlock.data.dayPlans]; arr[i].highlights = e.target.value.split(',').map((x: string) => x.trim()); updateBlockData(selectedBlock.id, 'dayPlans', arr) }} />
                                                <InputEl placeholder="Overnight Stay" value={d.overnightStay || ''} onChange={e => { const arr = [...selectedBlock.data.dayPlans]; arr[i].overnightStay = e.target.value; updateBlockData(selectedBlock.id, 'dayPlans', arr) }} />
                                            </div>
                                        </FieldCard>
                                    ))}
                                    <AddBtn onClick={() => updateBlockData(selectedBlock.id, 'dayPlans', [...selectedBlock.data.dayPlans, { day: `Day ${String(selectedBlock.data.dayPlans.length + 1).padStart(2, '0')}`, date: '', title: '', description: '', highlights: [] }])} label="Add Day Plan" />
                                </div>
                            </>
                        )}

                        {/* ── PRICING SECTION ── */}
                        {selectedBlock.type === 'PRICING_SECTION' && (
                            <>
                                <div>
                                    <LabelEl>Base Price (₹)</LabelEl>
                                    <InputEl
                                        placeholder="e.g. 140000"
                                        value={selectedBlock.data.price}
                                        onChange={e => updateBlockData(selectedBlock.id, 'price', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <LabelEl>Inclusions (comma separated)</LabelEl>
                                    <InputEl
                                        placeholder="e.g. 2 Adults, Per Person"
                                        value={Array.isArray(selectedBlock.data.inclusions) ? selectedBlock.data.inclusions.join(', ') : (selectedBlock.data.inclusions || '')}
                                        onChange={e => updateBlockData(selectedBlock.id, 'inclusions', e.target.value)}
                                    />
                                </div>

                                {/* Tax toggles */}
                                <div className="space-y-2">
                                    <LabelEl>Tax Options</LabelEl>
                                    <label
                                        className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                                        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedBlock.data.applyGST || false}
                                            onChange={e => updateBlockData(selectedBlock.id, 'applyGST', e.target.checked)}
                                            className="mt-0.5 w-4 h-4 rounded accent-emerald-600 flex-shrink-0"
                                        />
                                        <div>
                                            <p className="text-xs font-semibold" style={{ color: '#065f46' }}>Apply 5% GST</p>
                                            <p className="text-[10px]" style={{ color: '#9CA3AF' }}>Goods & Services Tax</p>
                                        </div>
                                    </label>
                                    <label
                                        className="flex items-start gap-3 p-3 rounded-xl cursor-pointer"
                                        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedBlock.data.applyTCS || false}
                                            onChange={e => updateBlockData(selectedBlock.id, 'applyTCS', e.target.checked)}
                                            className="mt-0.5 w-4 h-4 rounded accent-blue-600 flex-shrink-0"
                                        />
                                        <div>
                                            <p className="text-xs font-semibold" style={{ color: '#1e40af' }}>International TCS</p>
                                            <p className="text-[10px]" style={{ color: '#9CA3AF' }}>2% TCS + 5% GST on TCS</p>
                                        </div>
                                    </label>
                                </div>

                                {/* Live breakdown */}
                                {(() => {
                                    const base = Number(String(selectedBlock.data.price || '0').replace(/[₹,]/g, '')) || 0
                                    const gstAmt = selectedBlock.data.applyGST ? Math.round(base * 0.05) : 0
                                    const tcsAmt = selectedBlock.data.applyTCS ? Math.round(base * 0.02) : 0
                                    const tcsGst = selectedBlock.data.applyTCS ? Math.round(tcsAmt * 0.05) : 0
                                    const total = base + gstAmt + tcsAmt + tcsGst
                                    return (
                                        <div className="p-3 rounded-xl" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                                            <p className="text-[9px] font-black uppercase tracking-widest mb-2.5" style={{ color: '#9CA3AF' }}>Price Breakdown</p>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-xs font-sans">
                                                    <span style={{ color: '#6B7280' }}>Base Price</span>
                                                    <span className="font-semibold" style={{ color: '#111827' }}>₹{base.toLocaleString()}</span>
                                                </div>
                                                {gstAmt > 0 && (
                                                    <div className="flex justify-between text-xs font-sans">
                                                        <span style={{ color: '#065f46' }}>GST (5%)</span>
                                                        <span className="font-semibold" style={{ color: '#065f46' }}>₹{gstAmt.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {tcsAmt > 0 && (
                                                    <div className="flex justify-between text-xs font-sans">
                                                        <span style={{ color: '#1e40af' }}>TCS (2%)</span>
                                                        <span className="font-semibold" style={{ color: '#1e40af' }}>₹{tcsAmt.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {tcsGst > 0 && (
                                                    <div className="flex justify-between text-xs font-sans">
                                                        <span style={{ color: '#2563eb' }}>GST on TCS (5%)</span>
                                                        <span className="font-semibold" style={{ color: '#2563eb' }}>₹{tcsGst.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                <div className="pt-1.5 mt-0.5 flex justify-between font-sans" style={{ borderTop: '1px solid #E5E7EB' }}>
                                                    <span className="text-sm font-bold" style={{ color: '#111827' }}>Total</span>
                                                    <span className="text-sm font-bold" style={{ color: '#06a15c' }}>₹{total.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })()}

                                <div>
                                    <LabelEl>Custom Note</LabelEl>
                                    <InputEl
                                        placeholder="e.g. GST inclusive, TCS applicable"
                                        value={selectedBlock.data.gstNote || ''}
                                        onChange={e => updateBlockData(selectedBlock.id, 'gstNote', e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        {/* ── INC & EXC ── */}
                        {selectedBlock.type === 'INC_EXC' && (
                            <>
                                <div>
                                    <LabelEl>Inclusions</LabelEl>
                                    {(selectedBlock.data.inclusions || []).map((item: string, i: number) => (
                                        <div key={i} className="flex items-center gap-2 mb-2">
                                            <InputEl
                                                value={item}
                                                onChange={e => {
                                                    const arr = [...selectedBlock.data.inclusions]
                                                    arr[i] = e.target.value
                                                    updateBlockData(selectedBlock.id, 'inclusions', arr)
                                                }}
                                                placeholder="Inclusion item"
                                            />
                                            <RemoveBtn onClick={() => updateBlockData(selectedBlock.id, 'inclusions', selectedBlock.data.inclusions.filter((_: any, idx: number) => idx !== i))} />
                                        </div>
                                    ))}
                                    <AddBtn onClick={() => updateBlockData(selectedBlock.id, 'inclusions', [...(selectedBlock.data.inclusions || []), ''])} label="Add Inclusion" />
                                </div>

                                <Divider label="Exclusions" />

                                <div>
                                    <LabelEl>Exclusions</LabelEl>
                                    {(selectedBlock.data.exclusions || []).map((item: string, i: number) => (
                                        <div key={i} className="flex items-center gap-2 mb-2">
                                            <InputEl
                                                value={item}
                                                onChange={e => {
                                                    const arr = [...selectedBlock.data.exclusions]
                                                    arr[i] = e.target.value
                                                    updateBlockData(selectedBlock.id, 'exclusions', arr)
                                                }}
                                                placeholder="Exclusion item"
                                            />
                                            <RemoveBtn onClick={() => updateBlockData(selectedBlock.id, 'exclusions', selectedBlock.data.exclusions.filter((_: any, idx: number) => idx !== i))} />
                                        </div>
                                    ))}
                                    <AddBtn onClick={() => updateBlockData(selectedBlock.id, 'exclusions', [...(selectedBlock.data.exclusions || []), ''])} label="Add Exclusion" />
                                </div>
                            </>
                        )}

                        {/* ── TERMS ── */}
                        {selectedBlock.type === 'TERMS' && (
                            <>
                                <LabelEl>Terms & Conditions</LabelEl>
                                {(selectedBlock.data.terms || []).map((term: string, i: number) => (
                                    <div key={i} className="flex gap-2 mb-2">
                                        <TextAreaEl
                                            rows={2}
                                            value={term}
                                            placeholder="Term or condition..."
                                            onChange={e => {
                                                const arr = [...selectedBlock.data.terms]
                                                arr[i] = e.target.value
                                                updateBlockData(selectedBlock.id, 'terms', arr)
                                            }}
                                        />
                                        <RemoveBtn onClick={() => updateBlockData(selectedBlock.id, 'terms', selectedBlock.data.terms.filter((_: any, idx: number) => idx !== i))} />
                                    </div>
                                ))}
                                <AddBtn onClick={() => updateBlockData(selectedBlock.id, 'terms', [...(selectedBlock.data.terms || []), ''])} label="Add Term" />
                            </>
                        )}

                        {/* ── TEXT ── */}
                        {selectedBlock.type === 'TEXT' && (
                            <>
                                <div>
                                    <LabelEl>Heading</LabelEl>
                                    <InputEl
                                        value={selectedBlock.data.heading || ''}
                                        onChange={e => updateBlockData(selectedBlock.id, 'heading', e.target.value)}
                                        placeholder="Enter heading"
                                    />
                                </div>
                                <div>
                                    <LabelEl>Content</LabelEl>
                                    <TextAreaEl
                                        rows={8}
                                        value={selectedBlock.data.content || ''}
                                        onChange={e => updateBlockData(selectedBlock.id, 'content', e.target.value)}
                                        placeholder="Enter your custom long text description here..."
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Panel footer — delete block */}
                    <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                        <button
                            onClick={() => removeBlock(selectedBlock.id)}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold font-sans transition-all duration-150"
                            style={{ color: '#ef4444', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)' }}
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Remove Block
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
