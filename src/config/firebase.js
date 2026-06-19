import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// مفاتيح الربط الحقيقية الخاصة بمشروعك
const firebaseConfig = {
  apiKey: "AIzaSyAsMkWgjCVyEhyeGWDecnObYwvxQSP-vOw",
  authDomain: "bootcamp-platform-16413.firebaseapp.com",
  projectId: "bootcamp-platform-16413",
  storageBucket: "bootcamp-platform-16413.firebasestorage.app",
  messagingSenderId: "334356145024",
  appId: "1:334356145024:web:12f92764b90695e5e2d765",
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);

// تصدير خدمات المصادقة وقاعدة البيانات للاستخدام في التطبيق
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
