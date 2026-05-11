import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  browserLocalPersistence, 
  setPersistence 
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Set persistence to local to ensure users stay signed in across refreshes
setPersistence(auth, browserLocalPersistence);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  try {
    // Ensure persistence is set before signing in
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Firebase Auth Error:", error.code, error.message);
    
    const domain = window.location.hostname;
    
    if (error.code === 'auth/unauthorized-domain') {
      alert(`Domain Unauthorized: The domain "${domain}" is not authorized in your Firebase project. \n\nPlease go to Firebase Console > Authentication > Settings > Authorized Domains and add "${domain}".`);
    } else if (error.code === 'auth/popup-blocked') {
      alert("Popup Blocked: Your browser blocked the login popup. Please allow popups for this site to sign in.");
    } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
      // User closed the popup, no need to alert
    } else if (error.code === 'auth/internal-error' && error.message.includes('iframe')) {
       alert("Iframe Restriction: This browser is blocking authentication inside the preview. Please try opening the app in a new tab using the button in the top right.");
    } else {
      alert(`Sign-in failed (${error.code}): ${error.message}`);
    }
    throw error;
  }
};

export const signOutUser = () => auth.signOut();

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or internet connection.");
    }
  }
}
testConnection();
