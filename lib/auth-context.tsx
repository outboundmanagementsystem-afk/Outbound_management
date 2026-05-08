"use client"

import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode, useMemo } from "react"
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, User } from "firebase/auth"
import { doc, getDoc, setDoc, collection, getDocs, query, where, limit } from "firebase/firestore"
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
    authError: string | null
    signInWithGoogle: () => Promise<void>
    signOut: () => Promise<void>
    retryAuth: () => void
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    authError: null,
    signInWithGoogle: async () => { },
    signOut: async () => { },
    retryAuth: () => { },
})

export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [authError, setAuthError] = useState<string | null>(null)
    const isSignInInProgress = useRef(false)

    const fetchOrCreateProfile = useCallback(async (firebaseUser: User): Promise<UserProfile | null> => {
        const userDocRef = doc(db, "users", firebaseUser.uid)

        try {
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
                    try {
                        const { deleteDoc } = await import("firebase/firestore")
                        await deleteDoc(doc(db, "users", preRegDoc.id))
                    } catch (deleteErr) {
                        console.warn("Could not delete pre-registered doc, continuing with new doc:", deleteErr)
                    }
                }
                await setDoc(userDocRef, profile)
                return { uid: firebaseUser.uid, ...profile }
            }

            // If we reach here, the user is neither registered nor pre-registered
            // Immediate security measure: Sign out unauthorized users
            await firebaseSignOut(auth)
            throw new Error("Access denied. You are not authorized to use this system. Please contact your administrator.")
        } catch (error: any) {
            console.error("fetchOrCreateProfile error:", error)
            throw error // Re-throw so the caller can handle it
        }
    }, [])

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                setUser(firebaseUser)
                setAuthError(null)

                if (firebaseUser) {
                    const profile = await fetchOrCreateProfile(firebaseUser)
                    setUserProfile(profile)
                } else {
                    setUserProfile(null)
                }
            } catch (error: any) {
                console.error("Auth state change error:", error)
                setUserProfile(null)
                setAuthError(
                    error?.message?.includes("Access denied")
                        ? error.message
                        : error?.code === "permission-denied"
                            ? "Access denied. Your account may not be registered. Contact your admin."
                            : "Failed to load your profile. Please try again."
                )
            } finally {
                setLoading(false)
            }
        })
        return () => unsubscribe()
    }, [fetchOrCreateProfile])

    const retryAuth = useCallback(() => {
        const currentUser = auth.currentUser
        if (!currentUser) return

        setLoading(true)
        setAuthError(null)

        fetchOrCreateProfile(currentUser)
            .then((profile) => {
                setUserProfile(profile)
            })
            .catch((error) => {
                console.error("Retry auth error:", error)
                setAuthError("Failed to load your profile. Please try again.")
            })
            .finally(() => {
                setLoading(false)
            })
    }, [fetchOrCreateProfile])

    const handleSignIn = useCallback(async () => {
        if (isSignInInProgress.current) return;

        try {
            isSignInInProgress.current = true;
            setAuthError(null);
            await signInWithPopup(auth, googleProvider)
        } catch (error: any) {
            if (error?.code !== 'auth/cancelled-popup-request' && error?.code !== 'auth/popup-closed-by-user') {
                console.error("Sign-in error:", error)
                setAuthError("Sign-in failed. Please try again.")
            }
        } finally {
            isSignInInProgress.current = false;
        }
    }, [])

    const handleSignOut = useCallback(async () => {
        try {
            await firebaseSignOut(auth)
            setUserProfile(null)
            setAuthError(null)
        } catch (error) {
            console.error("Sign-out error:", error)
        }
    }, [])

    const value = useMemo(() => ({
        user,
        userProfile,
        loading,
        authError,
        signInWithGoogle: handleSignIn,
        signOut: handleSignOut,
        retryAuth,
    }), [user, userProfile, loading, authError, handleSignIn, handleSignOut, retryAuth])

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
