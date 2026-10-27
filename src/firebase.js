// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyASYJKR89oDu3HtCFIPIVt14m_Y-mmETPU",
  authDomain: "somase-voting.firebaseapp.com",
  projectId: "somase-voting",
  storageBucket: "somase-voting.firebasestorage.app",
  messagingSenderId: "236597119272",
  appId: "1:236597119272:web:e7f7a8d2a87052523de81d",
  measurementId: "G-RX9D8LCF6R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);
export const auth = getAuth(app); 
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
  hd: 'mubas.ac.mw' 
});