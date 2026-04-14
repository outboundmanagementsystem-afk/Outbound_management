import Image from "next/image"

export function AppPromo() {
  return (
    <section className="w-full bg-[#052210]">
      <Image
        src="/images/footer.png"
        alt="Promotional background"
        width={1920}
        height={1080}
        className="w-full h-auto"
        priority
      />
    </section>
  )
}
