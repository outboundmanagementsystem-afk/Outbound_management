import { BusFront, ArrowDownUp } from "lucide-react"

export function TransferDetails({ transfers }: { transfers: any[] }) {
    if (!transfers || transfers.length === 0) return null

    return (
        <>
            {/* HEADER SECTION */}
            <section
                className="pt-5 pb-8 px-4 relative flex flex-col justify-center avoid-break page-break-before pdf-section"
                style={{
                    backgroundImage: "url('/images/bg/page_006.png')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: '#051F10'
                }}
            >
                <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                <div className="relative z-10 w-full text-center px-4">
                    <h2 className="font-serif text-[2.5rem] tracking-tighter m-0 leading-none drop-shadow-2xl uppercase w-full font-black text-[#FFE500]">
                        Transfers
                    </h2>
                    <div className="h-1 w-16 bg-[#FFE500] mx-auto mt-4 rounded-full" />
                </div>
            </section>

            {/* INDIVIDUAL TRANSFER CARDS */}
            {transfers.map((t, idx) => (
                <section
                    key={idx}
                    className="py-3 px-4 relative overflow-hidden avoid-break pdf-section"
                    style={{
                        backgroundImage: "url('/images/bg/page_006.png')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: '#051F10'
                    }}
                >
                    <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                    <div className="w-full relative z-10">
                        <div className="bg-[#FDFDFB] rounded-[24px] p-5 shadow-2xl border border-white/5 relative">
                            <h3 className="font-sans text-[16px] font-black uppercase tracking-tight mb-5 text-center text-[#1A211D]">
                                {t.type}
                            </h3>

                            <div className="flex flex-col gap-3 relative">
                                <div className="bg-[#0A1C14] rounded-xl py-4 px-5 flex items-center gap-4 shadow-inner">
                                    <div className="w-8 h-8 rounded-lg bg-[#FFE500]/10 flex items-center justify-center flex-shrink-0">
                                        <BusFront className="w-4 h-4 text-[#FFE500]" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-sans text-[7px] font-black text-[#FFE500] uppercase tracking-widest mb-0.5">Pickup</span>
                                        <span className="font-sans text-[13px] font-black text-white uppercase tracking-tight">
                                            {t.pickup || "LOCATION"}
                                        </span>
                                    </div>
                                </div>

                                <div className="mx-auto w-8 h-8 rounded-lg bg-[#FFE500] 
                                    flex items-center justify-center shadow-lg border-[3px] border-[#FDFDFB]">
                                    <ArrowDownUp className="w-4 h-4 text-[#0A1C14]" strokeWidth={4} />
                                </div>

                                <div className="bg-[#0A1C14] rounded-xl py-4 px-5 flex items-center gap-4 shadow-inner">
                                    <div className="w-8 h-8 rounded-lg bg-[#FFE500]/10 flex items-center justify-center flex-shrink-0">
                                        <BusFront className="w-4 h-4 text-[#FFE500]" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-sans text-[7px] font-black text-[#FFE500] uppercase tracking-widest mb-0.5">Drop</span>
                                        <span className="font-sans text-[13px] font-black text-white uppercase tracking-tight">
                                            {t.drop || "LOCATION"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center justify-center gap-3 bg-gray-50 py-3 px-4 rounded-xl border border-gray-100 shadow-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#1A211D] animate-pulse" />
                                <p className="font-sans text-[8px] font-black text-[#6B7280] uppercase tracking-widest text-center opacity-70">
                                    PREMIUM TRAVEL LOGISTICS
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            ))}
        </>
    )
}
