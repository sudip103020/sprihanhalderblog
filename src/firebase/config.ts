import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyAfwP0Yxu1LVmCbhL3H6wjk4e7His3OuBA",
  authDomain: "sprihan-halder-blog.firebaseapp.com",
  projectId: "sprihan-halder-blog",
  storageBucket: "sprihan-halder-blog.firebasestorage.app",
  messagingSenderId: "118623684483",
  appId: "1:118623684483:web:bab27a96c509602c79d8b6",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;