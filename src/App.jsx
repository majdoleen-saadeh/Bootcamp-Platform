import React, { useEffect, useState } from "react";
import CourseDetails from "./pages/CourseDetails";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./config/firebase";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // جلب مستند المستخدم من الفايرستور لمعرفة الـ role
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          } else {
            setUserRole("student"); // إذا لم يوجد له مستند نعتبره طالب افتراضياً
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole("student");
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-slate-500 text-lg animate-pulse font-medium">
          جاري التحقق من الصلاحيات وتأمين النظام...
        </p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* صفحة تسجيل الدخول */}
        <Route
          path="/login"
          element={
            !user ? (
              <Login />
            ) : userRole === "admin" ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/student" replace />
            )
          }
        />

        {/* مسار الأدمن المحمي بالكامل */}
        <Route
          path="/admin"
          element={
            user && userRole === "admin" ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* مسار الطالب المحمي بالكامل */}
        <Route
          path="/student"
          element={
            user ? <StudentDashboard /> : <Navigate to="/login" replace />
          }
        />
        {/* مسار تفاصيل الكورس للطالب مع تمرير الـ ID ديناميكياً */}
        <Route
          path="/course/:courseId"
          element={user ? <CourseDetails /> : <Navigate to="/login" replace />}
        />
        {/* تحويل أي مسار عشوائي */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
