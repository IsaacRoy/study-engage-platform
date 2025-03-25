import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getDatabase, connectDatabaseEmulator, ref, get, remove } from "firebase/database";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxDdxu04GUsgrFuHF8nzi9Vn5W6w-UssQ",
  authDomain: "educonnect-66985.firebaseapp.com",
  databaseURL:
    "https://educonnect-66985-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "educonnect-66985",
  storageBucket: "educonnect-66985.appspot.com",
  messagingSenderId: "929385552633",
  appId: "1:929385552633:web:cae4b94e026a5a3a00a028",
  measurementId: "G-VHB69G4S4J",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize other Firebase services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

// Connect to emulators if enabled
const useEmulators = localStorage.getItem("useFirebaseEmulators") === "true";

if (useEmulators) {
  connectAuthEmulator(auth, "http://localhost:9099");
  connectDatabaseEmulator(database, "localhost", 9000);
  connectStorageEmulator(storage, "localhost", 9199);
  connectFirestoreEmulator(db, "localhost", 8080); // Firestore emulator
  console.log("Using Firebase local emulators");
} else {
  console.log("Using Firebase production services");
}

// Function to delete empty courses
async function deleteEmptyCourses() {
  const db = getDatabase();
  const coursesRef = ref(db, 'courses');
  const snapshot = await get(coursesRef);

  if (snapshot.exists()) {
    snapshot.forEach(courseSnapshot => {
      const courseData = courseSnapshot.val();
      if (!courseData || Object.keys(courseData).length === 0) {
        remove(ref(db, `courses/${courseSnapshot.key}`));
      }
    });
  }
}

// Call this function periodically or on a specific trigger
deleteEmptyCourses();
