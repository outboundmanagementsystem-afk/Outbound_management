"use client"

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react"
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, User } from "firebase/auth"
import { doc, getDoc, setDoc, collection, getDocs, query, where } from "firebase/firestore"
import { auth, db, googleProvider } from "./firebase"

export type UserRole = "admin" | "owner" | "sales_lead" | "sales" | "pre_ops_lead" | "pre_ops" | "post_ops_lead" | "post_ops" | "finance" | "finance_lead"

export interface UserProfile {
    uid: string
    name: string
    email: string
    role: UserRole
    employeeCode: string
    createdAt: string
    department?: "sales" | "operations"
    leadId?: string
    phone?: string
}

interface AuthContextType {
    user: User | null
    userProfile: UserProfile | null
    loading: boolean
    signInWithGoogle: () => Promise<void>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    signInWithGoogle: async () => { },
    signOut: async () => { },
})

export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const isSignInInProgress = useRef(false)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser)
            if (firebaseUser) {
                const profile = await fetchOrCreateProfile(firebaseUser)
                setUserProfile(profile)
            } else {
                setUserProfile(null)
            }
            setLoading(false)
        })
        return () => unsubscribe()
    }, [])

    const fetchOrCreateProfile = async (firebaseUser: User): Promise<UserProfile | null> => {
        const userDocRef = doc(db, "users", firebaseUser.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
            const data = userDoc.data();
            // Force owner email to be admin
            if (firebaseUser.email === "ahamedshafeek12345@gmail.com" && data.role !== "admin") {
                const updatedData = { ...data, role: "admin", employeeCode: data.employeeCode || "ADMIN-001" };
                await setDoc(userDocRef, updatedData);
                return { uid: firebaseUser.uid, ...updatedData } as UserProfile;
            }
            return { uid: firebaseUser.uid, ...data } as UserProfile;
        }

        // Check if this email was pre-registered by admin
        const preRegQuery = query(collection(db, "users"), where("email", "==", firebaseUser.email))
        const preRegSnap = await getDocs(preRegQuery)

        if (!preRegSnap.empty) {
            // Pre-registered user — link the UID and update
            const preRegDoc = preRegSnap.docs[0]
            const preRegData = preRegDoc.data()
            const profile: Omit<UserProfile, "uid"> = {
                name: firebaseUser.displayName || preRegData.name || "",
                email: firebaseUser.email || "",
                role: preRegData.role || "sales",
                employeeCode: preRegData.employeeCode || "",
                createdAt: preRegData.createdAt || new Date().toISOString(),
                department: preRegData.department || "",
                leadId: preRegData.leadId || "",
                phone: preRegData.phone || "",
            }
            // Delete old doc if different ID, create new one with actual UID
            if (preRegDoc.id !== firebaseUser.uid) {
                const { deleteDoc } = await import("firebase/firestore")
                await deleteDoc(doc(db, "users", preRegDoc.id))
            }
            await setDoc(userDocRef, profile)
            return { uid: firebaseUser.uid, ...profile }
        }

        // Check if this is the very first user → make them Super Admin
        const allUsersSnap = await getDocs(collection(db, "users"))
        const isFirstUser = allUsersSnap.empty

        const isOwner = firebaseUser.email === "ahamedshafeek12345@gmail.com";
        const newProfile: Omit<UserProfile, "uid"> = {
            name: firebaseUser.displayName || "",
            email: firebaseUser.email || "",
            role: (isFirstUser || isOwner) ? "admin" : "sales",
            employeeCode: (isFirstUser || isOwner) ? "ADMIN-001" : "",
            createdAt: new Date().toISOString(),
        }

        await setDoc(userDocRef, newProfile)
        return { uid: firebaseUser.uid, ...newProfile }
    }

    const handleSignIn = async () => {
        if (isSignInInProgress.current) return;
        
        try {
            isSignInInProgress.current = true;
            setLoading(true);
            await signInWithPopup(auth, googleProvider)
        } catch (error: any) {
            if (error?.code !== 'auth/cancelled-popup-request' && error?.code !== 'auth/popup-closed-by-user') {
                console.error("Sign-in error:", error)
            }
        } finally {
            isSignInInProgress.current = false;
            setLoading(false);
        }
    }

    const handleSignOut = async () => {
        try {
            await firebaseSignOut(auth)
            setUserProfile(null)
        } catch (error) {
            console.error("Sign-out error:", error)
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                userProfile,
                loading,
                signInWithGoogle: handleSignIn,
                signOut: handleSignOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}
