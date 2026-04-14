import fs from 'fs';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const envStr = fs.readFileSync('.env.local', 'utf-8');
const env = Object.fromEntries(
    envStr.split('\n')
        .filter(l => l.includes('='))
        .map(l => {
            const [k, ...v] = l.split('=');
            return [k.trim(), v.join('=').trim().replace(/^"|"$/g, '')];
        })
);

const firebaseConfig = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
    const itinId = "CRcFUcz5bfusGhvNrn948";
    console.log("Fetching sales checklist for:", itinId);
    
    const snap = await getDocs(collection(db, "itineraries", itinId, "salesChecklist"));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(JSON.stringify(items, null, 2));
    
    // Also fetch SOP templates to see what's actually stored.
    console.log("\nFetching Sales SOP Templates:");
    const sopSnap = await getDocs(collection(db, "sops"));
    const sops = sopSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.department === "sales");
    console.log(JSON.stringify(sops, null, 2));

    process.exit(0);
}

main().catch(console.error);
