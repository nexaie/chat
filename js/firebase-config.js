// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAPtuWW5NC4beqrGZRwYjAio_SPV9kqYhg",
    authDomain: "sandbox-chatapp.firebaseapp.com",
    projectId: "sandbox-chatapp",
    storageBucket: "sandbox-chatapp.appspot.com",
    messagingSenderId: "830630085213",
    appId: "1:830630085213:web:397987889c74b9d47403b4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
  .catch((err) => {
      console.log("Firebase persistence error: ", err);
  });

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
