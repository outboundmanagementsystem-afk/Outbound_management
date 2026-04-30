import { BusFront, ArrowDownUp } from "lucide-react"

export function TransferDetails({ transfers }: { transfers: any[] }) {
    const hasValidTransfers = transfers && transfers.length > 0 && transfers.some(t => {
        const p = (t.pickup || "").trim().toLowerCase();
        const d = (t.drop || "").trim().toLowerCase();
        return (p !== "" && p !== "select pickup location") || 
               (d !== "" && d !== "select drop location");
    })

    if (!hasValidTransfers) return null

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
            {transfers.map((t, idx) => {
                const p = (t.pickup || "").trim().toLowerCase();
                const d = (t.drop || "").trim().toLowerCase();
                const isValid = (p !== "" && p !== "select pickup location") || 
                               (d !== "" && d !== "select drop location");
                
                if (!isValid) return null;

                return (
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
                                                {t.pickup || "Not Specified"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="absolute left-[34px] top-[48px] h-[12px] w-[2px] bg-gradient-to-b from-[#FFE500] to-transparent opacity-30" />

                                    <div className="bg-[#0A1C14] rounded-xl py-4 px-5 flex items-center gap-4 shadow-inner">
                                        <div className="w-8 h-8 rounded-lg bg-[#FFE500]/10 flex items-center justify-center flex-shrink-0">
                                            <ArrowDownUp className="w-4 h-4 text-[#FFE500]" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-sans text-[7px] font-black text-[#FFE500] uppercase tracking-widest mb-0.5">Drop</span>
                                            <span className="font-sans text-[13px] font-black text-white uppercase tracking-tight">
                                                {t.drop || "Not Specified"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <span className="block font-sans text-[6px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Vehicle</span>
                                            <span className="font-sans text-[11px] font-black text-[#1A211D] uppercase">{t.vehicle || t.type || "Private"}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-sans text-[6px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Scheduled</span>
                                        <span className="font-sans text-[11px] font-black text-[#1A211D] uppercase">
                                            {t.date ? `${t.date}${t.time ? ` @ ${t.time}` : ''}` : 'As per itinerary'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )
            })}
        </>
    )
}
