// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAPtuWW5NC4beqrGZRwYjAio_SPV9kqYhg",
  authDomain: "sandbox-chatapp.firebaseapp.com",
  projectId: "sandbox-chatapp",
  storageBucket: "sandbox-chatapp.firebasestorage.app",
  messagingSenderId: "830630085213",
  appId: "1:830630085213:web:397987889c74b9d47403b4",
  measurementId: "G-XXXXXXXXXX"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

// Firebase services
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
