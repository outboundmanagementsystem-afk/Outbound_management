export const WHATSAPP_TEMPLATES: Record<string, (booking: any) => string> = {
    "Check Client - 5 Days Before Arrival": (booking) =>
        `Hello ${booking?.customerName},\n\nHope this message finds you well! We are super excited to welcome you to ${booking?.destination} in just 5 days! Please let us know if you have any questions before your arrival.\n\nBest Regards,\nOutbound Travelers Team`,

    "Send Greetings Message - 5 Days Before Arrival": (booking) =>
        `Warm greetings ${booking?.customerName}!\n\nWe are looking forward to hosting you for your ${booking?.nights}N/${booking?.days}D trip. Everything is well prepared for your safe and memorable journey.\n\nBest,\nOutbound Travelers`,

    "Send Essentials to Carry / Travel Reminders": (booking) =>
        `Hi ${booking?.customerName},\n\nAs your trip approaches, here are a few quick travel reminders and essentials to pack for your journey to ${booking?.destination}... (Attach PDF/Image manually if needed).\n\nSafe travels!`,

    "Check Client Readiness - 2 Days Before Arrival": (booking) =>
        `Hello ${booking?.customerName},\n\nYour trip is just 2 days away! Are you all packed and ready? Please ensure you have your tickets and IDs handy. Let us know if we can assist with anything final.\n\nWarm regards,\nOutbound Travelers`,

    "Send Driver & Hotel Details + Day-wise Itinerary - 1 Day Before": (booking) =>
        `Hi ${booking?.customerName},\n\nTomorrow is the big day! We have finalized your driver and hotel details. Your dedicated driver will be receiving you upon arrival. Wishing you a smooth journey!`,

    "Welcome Message on Arrival": (booking) =>
        `Welcome to ${booking?.destination}, ${booking?.customerName}!\n\nWe are thrilled you've arrived safely. We hope you have an incredible vacation. Our team is available 24/7 if you need any assistance during your stay. Enjoy your trip!`,

    "Daily Client Comfort Check Call / Text": (booking) =>
        `Hello ${booking?.customerName},\n\nJust checking in! How is your trip going so far? We hope everything is comfortable and to your liking. Have a wonderful day of sightseeing!`,

    "Before one day Itinerary Update in WhatsApp Group": (booking) =>
        `Hello ${booking?.customerName},\n\nHere is a quick update on tomorrow's itinerary plan... Let us know what time you would prefer to start the day!\n\nBest,\nOutbound Travelers`,

    "Trip Ending Message & Safe Reach Confirmation": (booking) =>
        `Hi ${booking?.customerName},\n\nAs your beautiful trip comes to an end, we want to thank you for choosing Outbound Travelers. Wishing you a very safe flight back home! Please let us know once you reach safely.`,

    "Collect Photos / Video Testimonials": (booking) =>
        `Hello ${booking?.customerName},\n\nWe would love to feature your wonderful moments! If you captured any beautiful photos or videos from your trip to ${booking?.destination} that you'd be happy to share with us, please send them here!\n\nWarm regards,\nOutbound Travelers`,

    "Collect Reviews (Google 5-star)": (booking) =>
        `Hi ${booking?.customerName},\n\nWe hope you had a fantastic trip! If you enjoyed our service, it would mean the world to us if you could leave a 5-star review on our Google page. Your feedback helps us immensely!\n\nThank you,\nOutbound Travelers`,

    "Pitch Next Trip / Referral / Discount": (booking) =>
        `Hello ${booking?.customerName},\n\nThank you for traveling with us! As a token of our appreciation, we are offering an exclusive discount for your next adventure or any referrals you send our way. Let's plan your next dream vacation!`,
}

export function generateWhatsAppLink(phone: string, text: string) {
    const cleanPhone = phone.replace(/\D/g, "")
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
}
