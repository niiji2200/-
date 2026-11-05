// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, getDocFromServer, collection, query, orderBy, limit, writeBatch, serverTimestamp, getDocs, where } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

export const app = initializeApp(firebaseConfig);
// NOTE: firebase-applet-config.json does not have firestoreDatabaseId in older formats sometimes, standard default is fallback
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || "(default)");
export const auth = getAuth(app);

export const loginAnonymously = () => signInAnonymously(auth);

// Handle errors appropriately
export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null) {
  const currentUser = auth.currentUser;
  const errorInfo: FirestoreErrorInfo = {
    error: error.message || 'Unknown error',
    operationType,
    path,
    authInfo: currentUser ? {
      userId: currentUser.uid,
      email: currentUser.email,
      emailVerified: currentUser.emailVerified,
      isAnonymous: currentUser.isAnonymous,
      providerInfo: currentUser.providerData
    } : null
  };
  console.error("Firestore Error:", JSON.stringify(errorInfo, null, 2));
  alert(`Error: ${error.message}`);
}
