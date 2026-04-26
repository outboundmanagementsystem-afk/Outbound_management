import {
    collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
    query, where, orderBy, Timestamp
} from "firebase/firestore"
import { db } from "./firebase"
import type { UserRole } from "./auth-context"

// ─── Users ──────────────────────────────────────────
export async function getUsers() {
    const snap = await getDocs(collection(db, "users"))
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
}

export async function preRegisterUser(
    email: string, role: UserRole, name: string, employeeCode: string,
    department?: "sales" | "operations" | "finance", leadId?: string, phone?: string
) {
    const docRef = await addDoc(collection(db, "users"), {
        name,
        email,
        role,
        employeeCode,
        department: department || "",
        leadId: leadId || "",
        phone: phone || "",
        createdAt: new Date().toISOString()
    })
    return docRef.id
}

export async function updateUser(uid: string, data: Record<string, any>) {
    await updateDoc(doc(db, "users", uid), data)
}

export async function updateUserRole(uid: string, role: UserRole) {
    await updateDoc(doc(db, "users", uid), { role })
}

export async function deleteUser(uid: string) {
    await deleteDoc(doc(db, "users", uid))
}

export async function generateEmployeeCode(role: UserRole, name: string): Promise<string> {
    const users = await getUsers()
    const nameParts = name.trim().split(/\s+/)
    const initials = nameParts.length >= 2
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : (name.substring(0, 2)).toUpperCase()

    let prefix = ""
    let filterPrefix = ""

    switch (role) {
        case "owner":
            prefix = "OT"
            filterPrefix = "OT"
            break
        case "sales_lead":
            prefix = "OTSLD" + initials
            filterPrefix = "OTSLD"
            break
        case "sales":
            prefix = "OTS" + initials
            filterPrefix = "OTS"
            break
        case "pre_ops_lead":
            prefix = "OTPLD" + initials
            filterPrefix = "OTPLD"
            break
        case "pre_ops":
            prefix = "OTPRE" + initials
            filterPrefix = "OTPRE"
            break
        case "post_ops_lead":
            prefix = "OTPOLD" + initials
            filterPrefix = "OTPOLD"
            break
        case "post_ops":
            prefix = "OTPOST" + initials
            filterPrefix = "OTPOST"
            break
        case "finance_lead":
            prefix = "OTFLD" + initials
            filterPrefix = "OTFLD"
            break
        case "finance":
            prefix = "OTFIN" + initials
            filterPrefix = "OTFIN"
            break
        default:
            prefix = "OT"
            filterPrefix = "OT"
    }

    // Count existing users with this prefix pattern to get next sequence
    const existingCodes = users
        .map((u: any) => u.employeeCode || "")
        .filter((c: string) => c.startsWith(filterPrefix))
    const seq = String(existingCodes.length + 1).padStart(3, "0")

    return role === "owner" ? `${prefix}${seq}` : `${prefix}${seq}`
}

// ─── Destinations ───────────────────────────────────
export async function getDestinations() {
    const snap = await getDocs(collection(db, "destinations"))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getDestination(id: string) {
    const snap = await getDoc(doc(db, "destinations", id))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function createDestination(data: any) {
    const docRef = await addDoc(collection(db, "destinations"), { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    return docRef.id
}

export async function updateDestination(id: string, data: any) {
    await updateDoc(doc(db, "destinations", id), { ...data, updatedAt: new Date().toISOString() })
}

export async function deleteDestination(id: string) {
    await deleteDoc(doc(db, "destinations", id))
}

export async function clearDestinationSubcollections(destId: string) {
    const subs = ["hotels", "attractions", "activities", "transfers", "vehicleRules", "dayPlans"]
    for (const sub of subs) {
        const snap = await getDocs(collection(db, "destinations", destId, sub))
        for (const d of snap.docs) {
            await deleteDoc(doc(db, "destinations", destId, sub, d.id))
        }
    }
}

// ─── Destination Sub-collections ────────────────────
async function getSubCollection(destId: string, subName: string) {
    const snap = await getDocs(collection(db, "destinations", destId, subName))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

async function addSubDoc(destId: string, subName: string, data: any) {
    const docRef = await addDoc(collection(db, "destinations", destId, subName), data)
    return docRef.id
}

async function updateSubDoc(destId: string, subName: string, docId: string, data: any) {
    await updateDoc(doc(db, "destinations", destId, subName, docId), data)
}

async function deleteSubDoc(destId: string, subName: string, docId: string) {
    await deleteDoc(doc(db, "destinations", destId, subName, docId))
}

export const getHotels = (destId: string) => getSubCollection(destId, "hotels")
export const addHotel = (destId: string, data: any) => addSubDoc(destId, "hotels", data)
export const updateHotel = (destId: string, id: string, data: any) => updateSubDoc(destId, "hotels", id, data)
export const deleteHotel = (destId: string, id: string) => deleteSubDoc(destId, "hotels", id)

export const getAttractions = (destId: string) => getSubCollection(destId, "attractions")
export const addAttraction = (destId: string, data: any) => addSubDoc(destId, "attractions", data)
export const updateAttraction = (destId: string, id: string, data: any) => updateSubDoc(destId, "attractions", id, data)
export const deleteAttraction = (destId: string, id: string) => deleteSubDoc(destId, "attractions", id)

export const getActivities = (destId: string) => getSubCollection(destId, "activities")
export const addActivity = (destId: string, data: any) => addSubDoc(destId, "activities", data)
export const updateActivity = (destId: string, id: string, data: any) => updateSubDoc(destId, "activities", id, data)
export const deleteActivity = (destId: string, id: string) => deleteSubDoc(destId, "activities", id)

export const getPresetDays = (destId: string) => getSubCollection(destId, "dayPlans")
export const addPresetDay = (destId: string, data: any) => addSubDoc(destId, "dayPlans", data)
export const updatePresetDay = (destId: string, id: string, data: any) => updateSubDoc(destId, "dayPlans", id, data)
export const deletePresetDay = (destId: string, id: string) => deleteSubDoc(destId, "dayPlans", id)

export const getVehicleRules = (destId: string) => getSubCollection(destId, "vehicleRules")
export const addVehicleRule = (destId: string, data: any) => addSubDoc(destId, "vehicleRules", data)
export const updateVehicleRule = (destId: string, id: string, data: any) => updateSubDoc(destId, "vehicleRules", id, data)
export const deleteVehicleRule = (destId: string, id: string) => deleteSubDoc(destId, "vehicleRules", id)

export const getTransfers = (destId: string) => getSubCollection(destId, "transfers")
export const addTransfer = (destId: string, data: any) => addSubDoc(destId, "transfers", data)
export const updateTransfer = (destId: string, id: string, data: any) => updateSubDoc(destId, "transfers", id, data)
export const deleteTransfer = (destId: string, id: string) => deleteSubDoc(destId, "transfers", id)

// ─── Itineraries ────────────────────────────────────
export type ItineraryStatus = "draft" | "sent" | "confirmed" | "handover" | "pre-ops" | "post-ops" | "completed"

export async function getItineraries(salesUid?: string) {
    let q
    if (salesUid) {
        q = query(collection(db, "itineraries"), where("createdBy", "==", salesUid), orderBy("createdAt", "desc"))
    } else {
        q = query(collection(db, "itineraries"), orderBy("createdAt", "desc"))
    }
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getItinerary(id: string) {
    const snap = await getDoc(doc(db, "itineraries", id))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function createItinerary(data: any) {
    let quoteId = data.quoteId
    if (!quoteId && data.destination) {
        quoteId = await generateQuoteId(data.destination)
    }

    let customerId = data.customerId
    if (data.customerName && data.customerPhone) {
        const existing = await getCustomerByPhone(data.customerPhone) as any
        if (existing) {
            customerId = existing.id
            await updateCustomer(existing.id, {
                name: data.customerName,
                email: data.customerEmail || existing.email
            })
        } else {
            customerId = await createCustomer({
                name: data.customerName,
                phone: data.customerPhone,
                email: data.customerEmail || "",
            })
        }
    }

    const docRef = await addDoc(collection(db, "itineraries"), {
        ...data,
        quoteId: quoteId || null,
        customerId: customerId || null,
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    })
    return docRef.id
}

export async function updateItinerary(id: string, data: any) {
    await updateDoc(doc(db, "itineraries", id), { ...data, updatedAt: new Date().toISOString() })
}

export async function updateItineraryStatus(id: string, status: ItineraryStatus) {
    await updateDoc(doc(db, "itineraries", id), { status, updatedAt: new Date().toISOString() })
    if (status === "handover" || status === "pre-ops") {
        // Init/sync Pre-Ops SOP checklist (called by sales/admin who have sops read permission)
        const cl = await getItinSub(id, "sopChecklist")
        if (cl.length === 0) {
            await initSopChecklist(id)
        } else {
            await syncChecklist(id, "pre_ops", "sopChecklist")
        }
    } else if (status === "post-ops") {
        const cl = await getItinSub(id, "postOpsChecklist")
        if (cl.length === 0) {
            await initPostOpsChecklist(id)
        } else {
            await syncChecklist(id, "post_ops", "postOpsChecklist")
        }
    }
}

export async function updateItineraryStage(id: string, postOpStage: string) {
    await updateDoc(doc(db, "itineraries", id), { postOpStage, updatedAt: new Date().toISOString() })
}

export async function deleteItinerary(id: string) {
    await deleteDoc(doc(db, "itineraries", id))
}

export async function clearItinerarySubcollections(itinId: string) {
    const subs = ["days", "hotels", "flights", "transfers", "pricing", "activities", "sopChecklist", "postOpsChecklist", "salesChecklist"]
    for (const sub of subs) {
        const snap = await getDocs(collection(db, "itineraries", itinId, sub))
        for (const d of snap.docs) {
            await deleteDoc(doc(db, "itineraries", itinId, sub, d.id))
        }
    }
}

// ─── Itinerary Sub-collections ──────────────────────
export const getItineraryDays = (itinId: string) => getItinSub(itinId, "days")
export const addItineraryDay = (itinId: string, data: any) => addItinSub(itinId, "days", data)
export const updateItineraryDay = (itinId: string, dayId: string, data: any) => updateItinSub(itinId, "days", dayId, data)
export const deleteItineraryDay = (itinId: string, dayId: string) => deleteItinSub(itinId, "days", dayId)

export const getItineraryPricing = (itinId: string) => getItinSub(itinId, "pricing")
export const addItineraryPricing = (itinId: string, data: any) => addItinSub(itinId, "pricing", data)

export const getItineraryFlights = (itinId: string) => getItinSub(itinId, "flights")
export const addItineraryFlight = (itinId: string, data: any) => addItinSub(itinId, "flights", data)
export const updateItineraryFlight = (itinId: string, flightId: string, data: any) => updateItinSub(itinId, "flights", flightId, data)
export const deleteItineraryFlight = (itinId: string, flightId: string) => deleteItinSub(itinId, "flights", flightId)

export const getItineraryHotels = (itinId: string) => getItinSub(itinId, "hotels")
export const addItineraryHotel = (itinId: string, data: any) => addItinSub(itinId, "hotels", data)

export const getItineraryTransfers = (itinId: string) => getItinSub(itinId, "transfers")
export const addItineraryTransfer = (itinId: string, data: any) => addItinSub(itinId, "transfers", data)

export const getItineraryActivities = (itinId: string) => getItinSub(itinId, "activities")
export const addItineraryActivity = (itinId: string, data: any) => addItinSub(itinId, "activities", data)

export const getSopChecklist = async (itinId: string) => (await getItinSub(itinId, "sopChecklist")).sort((a, b) => (a.order || 0) - (b.order || 0))
export const updateSopItem = (itinId: string, itemId: string, data: any) => updateItinSub(itinId, "sopChecklist", itemId, data)

export const getPostOpsChecklist = async (itinId: string) => (await getItinSub(itinId, "postOpsChecklist")).sort((a, b) => (a.order || 0) - (b.order || 0))
export const updatePostOpsItem = (itinId: string, itemId: string, data: any) => updateItinSub(itinId, "postOpsChecklist", itemId, data)

export const getSalesChecklist = async (itinId: string) => (await getItinSub(itinId, "salesChecklist")).sort((a, b) => (a.order || 0) - (b.order || 0))
export const updateSalesItem = (itinId: string, itemId: string, data: any) => updateItinSub(itinId, "salesChecklist", itemId, data)

export async function initSopChecklist(itinId: string) {
    // This now refers to Pre-Ops (Ops) Handover checklist
    const q = query(collection(db, "sops"), where("department", "==", "pre_ops"))
    const snap = await getDocs(q)
    const sops = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))

    // Sort by creation time or rely on order, then add items
    let orderIndex = 0;
    for (const sop of sops) {
        if (!sop.items) continue
        for (const item of sop.items) {
            const isObj = typeof item === 'object' && item !== null
            const name = isObj ? (item.title || String(item)) : String(item)
            const type = isObj ? (item.type || 'checkbox') : 'checkbox'
            const isRequired = isObj ? item.isRequired !== false : true
            const requiresAcknowledgement = isObj ? !!item.requiresAcknowledgement : false
            const notes = isObj ? (item.notes || '') : ''
            const points = isObj ? (item.points || []) : []
            const extraInfo = isObj ? (item.extraInfo || '') : ''
            const dependsOn = isObj ? (item.dependsOn || '') : ''
            const originalId = isObj ? (item.id || '') : ''

            await addItinSub(itinId, "sopChecklist", {
                name,
                checked: false,
                acknowledged: false,
                fileUrl: "",
                type,
                isRequired,
                requiresAcknowledgement,
                notes,
                points,
                extraInfo,
                dependsOn,
                originalId,
                options: isObj ? (item.options || []) : [],
                order: orderIndex++,
                updatedAt: ""
            })
        }
    }
}

export async function initPostOpsChecklist(itinId: string) {
    const q = query(collection(db, "sops"), where("department", "==", "post_ops"))
    const snap = await getDocs(q)
    const sops = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))

    let orderIndex = 0;
    for (const sop of sops) {
        if (!sop.items) continue
        for (const item of sop.items) {
            const isObj = typeof item === 'object' && item !== null
            const name = isObj ? (item.title || String(item)) : String(item)
            const type = isObj ? (item.type || 'checkbox') : 'checkbox'
            const isRequired = isObj ? item.isRequired !== false : true
            const requiresAcknowledgement = isObj ? !!item.requiresAcknowledgement : false
            const notes = isObj ? (item.notes || '') : ''
            const points = isObj ? (item.points || []) : []
            const extraInfo = isObj ? (item.extraInfo || '') : ''
            const dependsOn = isObj ? (item.dependsOn || '') : ''
            const originalId = isObj ? (item.id || '') : ''

            await addItinSub(itinId, "postOpsChecklist", {
                name,
                checked: false,
                acknowledged: false,
                fileUrl: "",
                type,
                isRequired,
                requiresAcknowledgement,
                notes,
                points,
                extraInfo,
                dependsOn,
                originalId,
                options: isObj ? (item.options || []) : [],
                order: orderIndex++,
                updatedAt: ""
            })
        }
    }
}

export async function initSalesChecklist(itinId: string) {
    const q = query(collection(db, "sops"), where("department", "==", "sales"))
    const snap = await getDocs(q)
    const sops = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))

    let orderIndex = 0;
    for (const sop of sops) {
        if (!sop.items) continue
        for (const item of sop.items) {
            const isObj = typeof item === 'object' && item !== null
            const name = isObj ? (item.title || String(item)) : String(item)
            const type = isObj ? (item.type || 'checkbox') : 'checkbox'
            const isRequired = isObj ? item.isRequired !== false : true
            const requiresAcknowledgement = isObj ? !!item.requiresAcknowledgement : false
            const notes = isObj ? (item.notes || '') : ''
            const points = isObj ? (item.points || []) : []
            const extraInfo = isObj ? (item.extraInfo || '') : ''
            const dependsOn = isObj ? (item.dependsOn || '') : ''
            const originalId = isObj ? (item.id || '') : ''

            await addItinSub(itinId, "salesChecklist", {
                name,
                checked: false,
                acknowledged: false,
                fileUrl: "",
                type,
                isRequired,
                requiresAcknowledgement,
                notes,
                points,
                extraInfo,
                dependsOn,
                originalId,
                options: isObj ? (item.options || []) : [],
                order: orderIndex++,
                updatedAt: ""
            })
        }
    }
}

export async function syncChecklist(itinId: string, department: string, subName: string) {
    const existing = await getItinSub(itinId, subName);

    const q = query(collection(db, "sops"), where("department", "==", department));
    const snap = await getDocs(q);
    const sops = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    const expectedItems: any[] = [];
    let orderIndex = 0;
    for (const sop of sops) {
        if (!sop.items) continue;
        for (const item of sop.items) {
            const isObj = typeof item === 'object' && item !== null;
            const name = isObj ? (item.title || String(item)) : String(item);
            const type = isObj ? (item.type || 'checkbox') : 'checkbox';
            const isRequired = isObj ? item.isRequired !== false : true;
            const requiresAcknowledgement = isObj ? !!item.requiresAcknowledgement : false;
            const notes = isObj ? (item.notes || '') : '';
            const points = isObj ? (item.points || []) : [];
            const extraInfo = isObj ? (item.extraInfo || '') : '';
            const dependsOn = isObj ? (item.dependsOn || '') : '';
            const originalId = isObj ? (item.id || "") : "";
            const options = isObj ? (item.options || []) : [];
            const order = orderIndex++;

            expectedItems.push({
                name, type, isRequired, requiresAcknowledgement, notes, points, extraInfo, dependsOn, originalId, options, order
            });
        }
    }

    let hasChanges = false;
    const activeDocIds = new Set<string>();

    for (const exp of expectedItems) {
        let match = null;
        if (exp.originalId) {
            match = existing.find(e => e.originalId === exp.originalId);
        }
        if (!match) {
            match = existing.find(e => e.name === exp.name && !activeDocIds.has(e.id));
        }

        if (match) {
            activeDocIds.add(match.id);
            const needsUpdate =
                match.name !== exp.name ||
                match.type !== exp.type ||
                match.isRequired !== exp.isRequired ||
                match.requiresAcknowledgement !== exp.requiresAcknowledgement ||
                match.notes !== exp.notes ||
                JSON.stringify(match.points || []) !== JSON.stringify(exp.points) ||
                match.extraInfo !== exp.extraInfo ||
                match.dependsOn !== exp.dependsOn ||
                match.originalId !== exp.originalId ||
                JSON.stringify(match.options || []) !== JSON.stringify(exp.options || []) ||
                match.order !== exp.order;

            if (needsUpdate) {
                await updateItinSub(itinId, subName, match.id, exp);
                hasChanges = true;
            }
        } else {
            await addItinSub(itinId, subName, {
                ...exp,
                checked: false,
                acknowledged: false,
                fileUrl: "",
                updatedAt: ""
            });
            hasChanges = true;
        }
    }

    for (const ex of existing) {
        if (!activeDocIds.has(ex.id)) {
            await deleteItinSub(itinId, subName, ex.id);
            hasChanges = true;
        }
    }

    return hasChanges;
}

async function getItinSub(itinId: string, subName: string): Promise<any[]> {
    const snap = await getDocs(collection(db, "itineraries", itinId, subName))
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
}

async function addItinSub(itinId: string, subName: string, data: any) {
    const docRef = await addDoc(collection(db, "itineraries", itinId, subName), data)
    return docRef.id
}

async function updateItinSub(itinId: string, subName: string, docId: string, data: any) {
    await updateDoc(doc(db, "itineraries", itinId, subName, docId), data)
}

async function deleteItinSub(itinId: string, subName: string, docId: string) {
    await deleteDoc(doc(db, "itineraries", itinId, subName, docId))
}

// ─── Itineraries by status (for Kanban / Ops) ──────
export async function getItinerariesByStatus(status: ItineraryStatus) {
    const q = query(collection(db, "itineraries"), where("status", "==", status))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ─── Packages (Template Itineraries) ────────────────
export async function getPackages() {
    const q = query(collection(db, "packages"), orderBy("createdAt", "desc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getPackage(id: string) {
    const snap = await getDoc(doc(db, "packages", id))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function createPackage(data: any) {
    const docRef = await addDoc(collection(db, "packages"), {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    })
    return docRef.id
}

export async function updatePackage(id: string, data: any) {
    await updateDoc(doc(db, "packages", id), { ...data, updatedAt: new Date().toISOString() })
}

export async function deletePackage(id: string) {
    await deleteDoc(doc(db, "packages", id))
}

export async function clearPackageSubcollections(pkgId: string) {
    const subs = ["days", "hotels", "flights", "transfers", "pricing", "activities"]
    const promises: Promise<void>[] = []

    for (const sub of subs) {
        const snap = await getDocs(collection(db, "packages", pkgId, sub))
        snap.forEach(d => {
            promises.push(deleteDoc(doc(db, "packages", pkgId, sub, d.id)))
        })
    }

    await Promise.all(promises)
}

// ─── Package Sub-collections ────────────────────────
export const getPackageDays = (pkgId: string) => getPkgSub(pkgId, "days")
export const addPackageDay = (pkgId: string, data: any) => addPkgSub(pkgId, "days", data)
export const updatePackageDay = (pkgId: string, dayId: string, data: any) => updatePkgSub(pkgId, "days", dayId, data)
export const deletePackageDay = (pkgId: string, dayId: string) => deletePkgSub(pkgId, "days", dayId)

export const getPackagePricing = (pkgId: string) => getPkgSub(pkgId, "pricing")
export const addPackagePricing = (pkgId: string, data: any) => addPkgSub(pkgId, "pricing", data)

export const getPackageFlights = (pkgId: string) => getPkgSub(pkgId, "flights")
export const addPackageFlight = (pkgId: string, data: any) => addPkgSub(pkgId, "flights", data)
export const updatePackageFlight = (pkgId: string, flightId: string, data: any) => updatePkgSub(pkgId, "flights", flightId, data)
export const deletePackageFlight = (pkgId: string, flightId: string) => deletePkgSub(pkgId, "flights", flightId)

export const getPackageHotels = (pkgId: string) => getPkgSub(pkgId, "hotels")
export const addPackageHotel = (pkgId: string, data: any) => addPkgSub(pkgId, "hotels", data)

export const getPackageTransfers = (pkgId: string) => getPkgSub(pkgId, "transfers")
export const addPackageTransfer = (pkgId: string, data: any) => addPkgSub(pkgId, "transfers", data)

export const getPackageActivities = (pkgId: string) => getPkgSub(pkgId, "activities")
export const addPackageActivity = (pkgId: string, data: any) => addPkgSub(pkgId, "activities", data)

async function getPkgSub(pkgId: string, subName: string) {
    const snap = await getDocs(collection(db, "packages", pkgId, subName))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

async function addPkgSub(pkgId: string, subName: string, data: any) {
    const docRef = await addDoc(collection(db, "packages", pkgId, subName), data)
    return docRef.id
}

async function updatePkgSub(pkgId: string, subName: string, docId: string, data: any) {
    await updateDoc(doc(db, "packages", pkgId, subName, docId), data)
}

async function deletePkgSub(pkgId: string, subName: string, docId: string) {
    await deleteDoc(doc(db, "packages", pkgId, subName, docId))
}

export async function deleteAllCustomers() {
    const snap = await getDocs(collection(db, "customers"))
    const deletePromises = snap.docs.map(d => deleteDoc(doc(db, "customers", d.id)))
    await Promise.all(deletePromises)
}

export async function deleteAllNonAdminUsers() {
    const snap = await getDocs(collection(db, "users"))
    const docsToDelete = snap.docs.filter(d => d.data().role !== "admin")
    const deletePromises = docsToDelete.map(d => deleteDoc(doc(db, "users", d.id)))
    await Promise.all(deletePromises)
}

export async function deleteAllItineraries() {
    const snap = await getDocs(collection(db, "itineraries"))
    for (const d of snap.docs) {
        await clearItinerarySubcollections(d.id)
        await deleteItinerary(d.id)
    }
}

// ─── Seed Helpers ───────────────────────────────────
/** Raw itinerary write — full control over all fields (no auto quoteId/customer/status) */
export async function seedCreateRawItinerary(data: any): Promise<string> {
    const docRef = await addDoc(collection(db, "itineraries"), data)
    return docRef.id
}

/** Delete a single customer */
export async function deleteCustomer(id: string) {
    await deleteDoc(doc(db, "customers", id))
}

// ─── Quote IDs (destination-based) ──────────────────
// Format: OT + 2-char destination code + sequence, e.g. OTKA0001, OTDU0001
function getDestinationCode(dest: string): string {
    const clean = dest.trim().toUpperCase()
    const map: Record<string, string> = {
        "KASHMIR": "KA", "DUBAI": "DU", "GOA": "GO", "MALDIVES": "ML",
        "BALI": "BL", "SINGAPORE": "SG", "THAILAND": "TH", "MALAYSIA": "MY",
        "VIETNAM": "VN", "SRI LANKA": "SL", "EUROPE": "EU", "TURKEY": "TK",
        "EGYPT": "EG", "JAPAN": "JP", "AUSTRALIA": "AU", "LONDON": "LN",
        "PARIS": "PR", "SWITZERLAND": "SW", "ITALY": "IT", "GREECE": "GR",
        "MANALI": "MN", "SHIMLA": "SH", "LADAKH": "LK", "RAJASTHAN": "RJ",
        "KERALA": "KL", "ANDAMAN": "AN", "OOTY": "OT", "KODAIKANAL": "KD",
        "PONDICHERRY": "PD", "MUNNAR": "MU", "COORG": "CR", "DARJEELING": "DJ",
    }
    if (map[clean]) return map[clean]
    // Fallback: first 2 letters
    return clean.substring(0, 2) || "XX"
}

export async function generateQuoteId(destination: string): Promise<string> {
    const code = getDestinationCode(destination)
    const prefix = `OT${code}`
    const allItins = await getItineraries()
    const existing = allItins.filter((i: any) => (i.quoteId || "").startsWith(prefix))
    const seq = String(existing.length + 1).padStart(4, "0")
    return `${prefix}${seq}`
}

// ─── Customers ──────────────────────────────────────
export async function getCustomers() {
    const snap = await getDocs(query(collection(db, "customers"), orderBy("createdAt", "desc")))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getCustomerByPhone(phone: string) {
    const snap = await getDocs(query(collection(db, "customers"), where("phone", "==", phone)))
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }
}

export async function createCustomer(data: { name: string; phone: string; email?: string }) {
    const docRef = await addDoc(collection(db, "customers"), {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    })
    return docRef.id
}

export async function updateCustomer(id: string, data: any) {
    await updateDoc(doc(db, "customers", id), { ...data, updatedAt: new Date().toISOString() })
}

export async function getCustomerItineraries(customerId: string) {
    const snap = await getDocs(query(collection(db, "itineraries"), where("customerId", "==", customerId), orderBy("createdAt", "desc")))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ─── Drafts ─────────────────────────────────────────
export async function saveDraft(userId: string, data: any) {
    const docRef = await addDoc(collection(db, "drafts"), {
        ...data,
        userId,
        updatedAt: new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString(),
    })
    return docRef.id
}

export async function updateDraft(draftId: string, data: any) {
    await updateDoc(doc(db, "drafts", draftId), { ...data, updatedAt: new Date().toISOString() })
}

export async function getDrafts(userId: string) {
    const snap = await getDocs(query(collection(db, "drafts"), where("userId", "==", userId), orderBy("updatedAt", "desc")))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getDraft(draftId: string) {
    const snap = await getDoc(doc(db, "drafts", draftId))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function deleteDraft(draftId: string) {
    await deleteDoc(doc(db, "drafts", draftId))
}

// ─── SOPs (Standard Operating Procedures) ──────────
export async function getSOPs(department?: string) {
    let q
    if (department) {
        q = query(collection(db, "sops"), where("department", "==", department))
    } else {
        q = query(collection(db, "sops"), orderBy("createdAt", "desc"))
    }
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createSOP(data: { title: string; department: string; items: any[]; whatsappTemplate?: string }) {
    const docRef = await addDoc(collection(db, "sops"), {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    })
    return docRef.id
}

export async function updateSOP(id: string, data: any) {
    await updateDoc(doc(db, "sops", id), { ...data, updatedAt: new Date().toISOString() })
}

export async function deleteSOP(id: string) {
    await deleteDoc(doc(db, "sops", id))
}

// SOP checklist per itinerary
export async function getItinerarySopChecklist(itinId: string) {
    const snap = await getDocs(collection(db, "itineraries", itinId, "sopChecklist"))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function updateSopChecklistItem(itinId: string, checklistId: string, data: any) {
    await updateDoc(doc(db, "itineraries", itinId, "sopChecklist", checklistId), data)
}

export async function initItinerarySopChecklist(itinId: string, sopItems: { sopId: string; title: string; items: string[] }[]) {
    for (const sop of sopItems) {
        await addDoc(collection(db, "itineraries", itinId, "sopChecklist"), {
            sopId: sop.sopId,
            title: sop.title,
            items: sop.items.map(text => ({ text, completed: false, completedAt: null, completedBy: null })),
            createdAt: new Date().toISOString(),
        })
    }
}

// ─── Finance / Payments ─────────────────────────────
export type PaymentMethod = "cash" | "gpay" | "phonepe" | "bank_transfer"
export type PaymentType = "advance" | "balance" | "full"

export interface Payment {
    id?: string
    itineraryId: string
    type: PaymentType
    amount: number
    method: PaymentMethod
    screenshotUrl?: string
    notes?: string
    collectedBy: string
    collectedByName: string
    collectedAt: string
    invoiceGenerated?: boolean
    invoiceUrl?: string
}

export async function addPayment(itineraryId: string, data: Omit<Payment, 'id' | 'itineraryId'>): Promise<string> {
    // Firestore does not accept undefined values — strip optional fields if not provided
    const payload: Record<string, any> = {
        itineraryId,
        type: data.type,
        amount: Number(data.amount),
        method: data.method,
        collectedBy: data.collectedBy || "",
        collectedByName: data.collectedByName || "",
        collectedAt: data.collectedAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
    }
    if (data.notes) payload.notes = data.notes
    if (data.screenshotUrl) payload.screenshotUrl = data.screenshotUrl

    const docRef = await addDoc(collection(db, "itineraries", itineraryId, "payments"), payload)
    // Update itinerary amountPaid total
    const allPayments = await getItineraryPayments(itineraryId)
    const totalPaid = allPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) + (Number(data.amount) || 0)
    await updateDoc(doc(db, "itineraries", itineraryId), {
        amountPaid: totalPaid,
        updatedAt: new Date().toISOString(),
    })
    return docRef.id
}

export async function getItineraryPayments(itineraryId: string): Promise<any[]> {
    const snap = await getDocs(query(
        collection(db, "itineraries", itineraryId, "payments"),
        orderBy("createdAt", "desc")
    ))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function updatePayment(itineraryId: string, paymentId: string, data: Partial<Payment>) {
    await updateDoc(doc(db, "itineraries", itineraryId, "payments", paymentId), {
        ...data,
        updatedAt: new Date().toISOString(),
    })
}

export async function getAllPayments(): Promise<any[]> {
    // Get all itineraries and fetch their payments subcollection
    const snap = await getDocs(query(collection(db, "itineraries"), orderBy("createdAt", "desc")))
    const itins = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    const results: any[] = []
    for (const itin of itins) {
        const payments = await getItineraryPayments(itin.id)
        if (payments.length > 0) {
            results.push({ ...itin, payments })
        }
    }
    return results
}
