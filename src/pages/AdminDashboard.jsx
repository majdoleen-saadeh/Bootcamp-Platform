import React, { useState, useEffect } from "react";
import { db, auth } from "../config/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("courses");

  // حالات الكورسات والدروس
  const [courseName, setCourseName] = useState("");
  const [instructor, setInstructor] = useState("");
  const [duration, setDuration] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  // حالات الدروس
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDuration, setLessonDuration] = useState("");
  const [lessonUrl, setLessonUrl] = useState("");
  const [lessonSuccess, setLessonSuccess] = useState("");
  const [lessonLoading, setLessonLoading] = useState(false);

  // حالات الإعلانات
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementType, setAnnouncementType] = useState("تنبيه عاجل");
  const [announcementSuccess, setAnnouncementSuccess] = useState("");
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);

  // حالات الطلاب
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const fetchCourses = async () => {
    setFetchLoading(true);
    try {
      const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(list);
      if(list.length > 0) setSelectedCourseId(list[0].id);
    } catch (error) { console.error(error); } 
    finally { setFetchLoading(false); }
  };

  const fetchAnnouncements = async () => {
    setAnnouncementsLoading(true);
    try {
      const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      setAnnouncements(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) { console.error(error); }
    finally { setAnnouncementsLoading(false); }
  };

  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      setStudents(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) { console.error(error); } 
    finally { setStudentsLoading(false); }
  };

  useEffect(() => {
    fetchCourses();
    fetchAnnouncements();
    fetchStudents();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage("");
    try {
      await addDoc(collection(db, "courses"), { name: courseName, instructor, duration, createdAt: new Date() });
      setSuccessMessage("🎉 تم إضافة الدورة بنجاح!");
      setCourseName(""); setInstructor(""); setDuration("");
      fetchCourses();
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return alert("الرجاء اختيار كورس أولاً");
    setLessonLoading(true);
    setLessonSuccess("");
    try {
      await addDoc(collection(db, "courses", selectedCourseId, "lessons"), { 
        title: lessonTitle, duration: lessonDuration, videoUrl: lessonUrl, createdAt: new Date() 
      });
      setLessonSuccess("🚀 تم إضافة الدرس بنجاح!");
      setLessonTitle(""); setLessonDuration(""); setLessonUrl("");
    } catch (error) { console.error(error); } finally { setLessonLoading(false); }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    setAnnouncementLoading(true);
    setAnnouncementSuccess("");
    try {
      await addDoc(collection(db, "announcements"), { text: announcementText, type: announcementType, createdAt: new Date() });
      setAnnouncementSuccess("📢 تم نشر الإعلان في المنصة!");
      setAnnouncementText("");
      fetchAnnouncements();
    } catch (error) { console.error(error); } finally { setAnnouncementLoading(false); }
  };

  const handleDeleteCourse = async (courseId) => {
    if (window.confirm("هل أنت متأكد من حذف هذه الدورة؟")) {
      try {
        await deleteDoc(doc(db, "courses", courseId));
        fetchCourses();
      } catch (error) { console.error(error); }
    }
  };

  // دالة حذف إعلان معين
  const handleDeleteAnnouncement = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الإعلان نهائياً؟")) {
      try {
        await deleteDoc(doc(db, "announcements", id));
        fetchAnnouncements();
      } catch (error) { console.error(error); }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row" dir="rtl">
      {/* السايدبار الجانبي - متجاوب تماماً */}
      <div className="w-full md:w-64 bg-slate-800 text-white p-4 md:p-6 block">
        <h2 className="text-xl font-bold mb-4 md:mb-8 text-center md:text-right">لوحة التحكم</h2>
        <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          <button onClick={() => setActiveTab("courses")} className={`whitespace-nowrap text-right py-2 px-4 rounded font-medium transition text-sm flex-1 md:flex-initial ${activeTab === "courses" ? "bg-blue-600 text-white" : "hover:bg-slate-700 text-slate-300"}`}>إدارة المنصة</button>
          <button onClick={() => setActiveTab("students")} className={`whitespace-nowrap text-right py-2 px-4 rounded font-medium transition text-sm flex-1 md:flex-initial ${activeTab === "students" ? "bg-blue-600 text-white" : "hover:bg-slate-700 text-slate-300"}`}>الطلاب ({students.length})</button>
        </nav>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <header className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">بوابة الأدمن</h1>
          <button onClick={handleLogout} className="w-full sm:w-auto bg-red-50 text-red-600 hover:bg-red-100 font-semibold px-4 py-2 rounded-lg text-sm transition text-center">تسجيل الخروج</button>
        </header>

        {activeTab === "courses" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            
            {/* عمود النماذج الثلاثة */}
            <div className="space-y-6 lg:col-span-1">
              {/* فورم الكورس */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 md:p-6">
                <h2 className="text-sm font-bold text-slate-800 mb-3">1. إضافة دورة جديدة</h2>
                {successMessage && <div className="bg-green-50 text-green-700 p-2 rounded-lg mb-3 text-xs">{successMessage}</div>}
                <form onSubmit={handleAddCourse} className="space-y-3">
                  <input type="text" value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="اسم الدورة" className="w-full p-2 border border-slate-200 rounded-lg text-xs" required />
                  <input type="text" value={instructor} onChange={(e) => setInstructor(e.target.value)} placeholder="المدرب" className="w-full p-2 border border-slate-200 rounded-lg text-xs" required />
                  <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="مدة الدورة" className="w-full p-2 border border-slate-200 rounded-lg text-xs" required />
                  <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded-lg text-xs font-semibold">نشر الدورة</button>
                </form>
              </div>

              {/* فورم الدرس */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 md:p-6">
                <h2 className="text-sm font-bold text-slate-800 mb-3">2. إضافة درس إلى دورة</h2>
                {lessonSuccess && <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg mb-3 text-xs">{lessonSuccess}</div>}
                <form onSubmit={handleAddLesson} className="space-y-3">
                  <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white">
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input type="text" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="عنوان الدرس" className="w-full p-2 border border-slate-200 rounded-lg text-xs" required />
                  <input type="text" value={lessonDuration} onChange={(e) => setLessonDuration(e.target.value)} placeholder="مدة الدرس" className="w-full p-2 border border-slate-200 rounded-lg text-xs" required />
                  <input type="url" value={lessonUrl} placeholder="رابط فيديو الدرس" className="w-full p-2 border border-slate-200 rounded-lg text-xs" required onChange={(e) => setLessonUrl(e.target.value)} />
                  <button type="submit" disabled={lessonLoading} className="w-full bg-slate-700 text-white p-2 rounded-lg text-xs font-semibold">إضافة الدرس</button>
                </form>
              </div>

              {/* مركز بث الإعلانات */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 md:p-6">
                <h2 className="text-sm font-bold text-slate-800 mb-3">3. مركز بث الإعلانات (Carousel)</h2>
                {announcementSuccess && <div className="bg-amber-50 text-amber-800 p-2 rounded-lg mb-3 text-xs">{announcementSuccess}</div>}
                <form onSubmit={handlePostAnnouncement} className="space-y-3">
                  <select value={announcementType} onChange={(e) => setAnnouncementType(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white">
                    <option value="تنبيه عاجل">🚨 تنبيه عاجل</option>
                    <option value="دورة جديدة">🎓 دورة جديدة متاحة</option>
                    <option value="تحديث هام">📢 تحديث عام للمنصة</option>
                  </select>
                  <textarea value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} placeholder="اكتب نص الإعلان..." rows="2" className="w-full p-2 border border-slate-200 rounded-lg text-xs resize-none" required></textarea>
                  <button type="submit" disabled={announcementLoading} className="w-full bg-amber-600 text-white p-2 rounded-lg text-xs font-semibold">بث ونشر الإعلان</button>
                </form>
              </div>
            </div>

            {/* عمود عرض الجداول الحية */}
            <div className="lg:col-span-2 space-y-6">
              {/* جدول الدورات */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 md:p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-3">الدورات الحالية</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs md:text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold"><th className="py-2 px-2">اسم الدورة</th><th className="py-2 px-2 text-center">إجراءات</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {courses.map((course) => (
                        <tr key={course.id} className="text-slate-700 hover:bg-slate-50 transition">
                          <td className="py-3 px-2 font-medium text-slate-900">{course.name}</td>
                          <td className="py-3 px-2 text-center"><button onClick={() => handleDeleteCourse(course.id)} className="bg-red-50 text-red-600 hover:bg-red-100 px-2.5 py-1 rounded text-xs">حذف</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ميزة الحذف الجديدة: جدول الإعلانات المنشورة للأدمن */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 md:p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-3">الإعلانات والبانرات المنشورة</h2>
                {announcementsLoading ? ( <p className="text-slate-500 text-xs animate-pulse">جاري التحديث...</p> ) : announcements.length === 0 ? ( <p className="text-slate-400 text-xs">لا توجد إعلانات نشطة حالياً.</p> ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs md:text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold"><th className="py-2 px-2">نوع الإعلان</th><th className="py-2 px-2">نص الإعلان</th><th className="py-2 px-2 text-center">إجراءات</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {announcements.map((ann) => (
                          <tr key={ann.id} className="text-slate-700 hover:bg-slate-50 transition">
                            <td className="py-3 px-2 whitespace-nowrap"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">{ann.type}</span></td>
                            <td className="py-3 px-2 max-w-xs truncate font-medium">{ann.text}</td>
                            <td className="py-3 px-2 text-center"><button onClick={() => handleDeleteAnnouncement(ann.id)} className="bg-red-50 text-red-600 hover:bg-red-100 px-2.5 py-1 rounded text-xs">حذف</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {activeTab === "students" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 md:p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">قائمة مستخدمي النظام</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold"><th className="py-3 px-4">معرّف المستخدم (UID)</th><th className="py-3 px-4">الصلاحية</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.map((student) => (
                    <tr key={student.id} className="text-slate-700 hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{student.id}</td>
                      <td className="py-3 px-4"><span className={`px-2.5 py-1 rounded text-xs font-semibold ${student.role === "admin" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`}>{student.role || "student"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}