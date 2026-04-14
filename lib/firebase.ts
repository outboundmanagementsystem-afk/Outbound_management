import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDgjODlIXB6cIIeyNmNLqJ6xZt1BClqy1I",
    authDomain: "outbounditenary.firebaseapp.com",
    projectId: "outbounditenary",
    storageBucket: "outbounditenary.firebasestorage.app",
    messagingSenderId: "140255023553",
    appId: "1:140255023553:web:ff91ea6e11357a694d5f40"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
