
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB3K9YdwfaprjTyBC6cgj3qDPgW5nswvNo",
  authDomain: "ev-charging-station-6c041.firebaseapp.com",
  projectId: "ev-charging-station-6c041",
  storageBucket: "ev-charging-station-6c041.firebasestorage.app",
  messagingSenderId: "737134474297",
  appId: "1:737134474297:web:4c5889fbd821330badc9e8",
  measurementId: "G-TZXZPMSJBY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export { db };
