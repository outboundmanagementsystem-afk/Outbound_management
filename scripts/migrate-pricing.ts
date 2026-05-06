import { db } from "@/lib/firebase" // Adjust path if needed
import { collection, getDocs, updateDoc, doc, deleteField } from "firebase/firestore"

export async function migratePricingSchema() {
    console.log("Starting pricing schema migration...")
    const snap = await getDocs(collection(db, "itineraries"))
    let migratedCount = 0

    for (const document of snap.docs) {
        const data = document.data()
        
        let newPlans = []

        // If plans array already exists, map it to strict schema
        if (Array.isArray(data.plans) && data.plans.length > 0) {
            newPlans = data.plans.map((p: any, idx: number) => {
                const total = p.overrideTotal !== undefined && p.overrideTotal !== null ? p.overrideTotal : p.total
                return {
                    planId: p.planId || `plan_${idx + 1}`,
                    planName: p.hotelName || `Plan ${idx + 1}`,
                    category: p.category || "Standard",
                    totalPrice: Number(total) || 0,
                    perPersonPrice: Number(p.perPersonPrice) || 0,
                    costBreakup: {
                        hotelCost: Number(p.hotelCost) || 0,
                        activityCost: Number(p.activityCost) || 0,
                        transferCost: Number(p.transferCost) || 0,
                        margin: Number(p.marginAmt) || 0
                    }
                }
            })
        } else if (data.totalPrice) {
            // Fallback for extremely old itineraries without plans array
            newPlans = [{
                planId: "plan_1",
                planName: "Legacy Plan",
                category: "Standard",
                totalPrice: Number(data.totalPrice) || 0,
                perPersonPrice: Number(data.perPersonPrice) || 0,
                costBreakup: {
                    hotelCost: 0, activityCost: 0, transferCost: 0, margin: 0
                }
            }]
        }

        const updates: any = {}
        
        if (newPlans.length > 0) {
            updates.plans = newPlans
            updates.selectedPlanId = newPlans[0].planId
        }

        // Delete root level pricing fields
        if (data.totalPrice !== undefined) updates.totalPrice = deleteField()
        if (data.perPersonPrice !== undefined) updates.perPersonPrice = deleteField()

        if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, "itineraries", document.id), updates)
            migratedCount++
            console.log(`Migrated ${document.id}`)
        }
    }
    
    console.log(`Migration complete. Migrated ${migratedCount} itineraries.`)
}
