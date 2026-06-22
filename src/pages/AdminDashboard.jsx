import React, { useState, useEffect } from "react";
import { db, auth } from "../config/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
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
  const [currentCourseLessons, setCurrentCourseLessons] = useState([]); // 📚 دروس الكورس المحدد حالياً لغايات الحذف
  const [lessonsFetchLoading, setLessonsFetchLoading] = useState(false);

  // حالات الإعلانات
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementType, setAnnouncementType] = useState("تنبيه عاجل");
  const [announcementSuccess, setAnnouncementSuccess] = useState("");
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);

  // حالات الطلاب المسجلين
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const fetchCourses = async () => {
    setFetchLoading(true);
    try {
      const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCourses(list);
      if (list.length > 0 && !selectedCourseId) {
        setSelectedCourseId(list[0].id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setFetchLoading(false);
    }
  };

  // 🔄 دالة جلب دروس كورس معين لعرضها وحذفها
  const fetchLessonsForCourse = async (courseId) => {
    if (!courseId) return;
    setLessonsFetchLoading(true);
    try {
      const lessonsRef = collection(db, "courses", courseId, "lessons");
      const q = query(lessonsRef, orderBy("createdAt", "asc"));
      const querySnapshot = await getDocs(q);
      setCurrentCourseLessons(
        querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLessonsFetchLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    setAnnouncementsLoading(true);
    try {
      const q = query(
        collection(db, "announcements"),
        orderBy("createdAt", "desc"),
      );
      const querySnapshot = await getDocs(q);
      setAnnouncements(
        querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    } catch (error) {
      console.error(error);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const list = usersSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((user) => user.role !== "admin");
      setStudents(list);
    } catch (error) {
      console.error(error);
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchAnnouncements();
    fetchStudents();
  }, []);

  // تحديث قائمة الدروس كلما تغير الكورس المختار في قائمة التحكم
  useEffect(() => {
    if (selectedCourseId) {
      fetchLessonsForCourse(selectedCourseId);
    }
  }, [selectedCourseId]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage("");
    try {
      await addDoc(collection(db, "courses"), {
        name: courseName,
        instructor,
        duration,
        createdAt: new Date(),
        meetingTime: "كل يوم سبت الساعة 8:00 مساءً",
        meetingTopic: "مراجعة عامة وحل مشاكل الطلاب",
      });
      setSuccessMessage("🎉 تم إضافة الدورة بنجاح!");
      setCourseName("");
      setInstructor("");
      setDuration("");
      fetchCourses();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return alert("الرجاء اختيار كورس أولاً");
    setLessonLoading(true);
    setLessonSuccess("");
    try {
      await addDoc(collection(db, "courses", selectedCourseId, "lessons"), {
        title: lessonTitle,
        duration: lessonDuration,
        videoUrl: lessonUrl,
        createdAt: new Date(),
      });
      setLessonSuccess("🚀 تم إضافة الدرس بنجاح مع رابط الفيديو!");
      setLessonTitle("");
      setLessonDuration("");
      setLessonUrl("");
      fetchLessonsForCourse(selectedCourseId); // تحديث القائمة فوراً بعد الإضافة
    } catch (error) {
      console.error(error);
    } finally {
      setLessonLoading(false);
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    setAnnouncementLoading(true);
    setAnnouncementSuccess("");
    try {
      await addDoc(collection(db, "announcements"), {
        text: announcementText,
        type: announcementType,
        createdAt: new Date(),
      });
      setAnnouncementSuccess("📢 تم نشر وبث الإعلان حياً!");
      setAnnouncementText("");
      fetchAnnouncements();
    } catch (error) {
      console.error(error);
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (
      window.confirm(
        "هل أنت متأكد من حذف هذه الدورة بالكامل؟ (سيتم حذف مرجع الدورة الرئيسي)",
      )
    ) {
      try {
        await deleteDoc(doc(db, "courses", courseId));
        if (selectedCourseId === courseId) setSelectedCourseId("");
        fetchCourses();
      } catch (error) {
        console.error(error);
      }
    }
  };

  // 🗑️ دالة حذف درس محدد من الفايرستور حياً
  const handleDeleteLesson = async (lessonId) => {
    if (window.confirm("هل أنتِ متأكدة من رغبتكِ في حذف هذا الدرس نهائياً؟")) {
      try {
        await deleteDoc(
          doc(db, "courses", selectedCourseId, "lessons", lessonId),
        );
        fetchLessonsForCourse(selectedCourseId); // إعادة جلب الدروس لتحديث الجدول
      } catch (error) {
        console.error("خطأ أثناء حذف الدرس: ", error);
      }
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الإعلان؟")) {
      try {
        await deleteDoc(doc(db, "announcements", id));
        fetchAnnouncements();
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div
      className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row"
      dir="rtl"
    >
      {/* السايدبار الجانبي */}
      <div className="w-full md:w-64 bg-slate-800 text-white p-5 flex flex-col justify-between shrink-0">
        <div>
          <h2 className="text-xl font-black mb-6 text-center md:text-right border-b border-white/10 pb-3">
            لوحة الإشراف ⚙️
          </h2>
          <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            <button
              onClick={() => setActiveTab("courses")}
              className={`whitespace-nowrap w-full text-right py-2 px-4 rounded-lg font-bold text-xs transition ${activeTab === "courses" ? "bg-blue-600 text-white" : "hover:bg-slate-700 text-slate-300"}`}
            >
              📚 المقررات والإعلانات حياً
            </button>
            <button
              onClick={() => setActiveTab("students")}
              className={`whitespace-nowrap w-full text-right py-2 px-4 rounded-lg font-bold text-xs transition ${activeTab === "students" ? "bg-blue-600 text-white" : "hover:bg-slate-700 text-slate-300"}`}
            >
              👥 رقابة ومتابعة الطلاب ({students.length})
            </button>
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white w-full py-2 rounded-lg text-xs font-bold mt-8 shadow-sm"
        >
          تسجيل الخروج
        </button>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 p-5 md:p-8 overflow-x-hidden">
        {activeTab === "courses" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                إدارة المقررات العامة والتنبيهات بالمنصة
              </h1>
              <p className="text-slate-500 text-xs mt-1">
                أضيفي الكورسات، الدروس بالروابط، وبثي التنبيهات للـ Carousel
                التفاعلي.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              {/* عمود النماذج الثلاثة الحية */}
              <div className="space-y-6 lg:col-span-1">
                {/* 1. إضافة كورس */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                  <h2 className="text-xs font-black text-slate-800 mb-3">
                    1. إضافة دورة جديدة
                  </h2>
                  {successMessage && (
                    <div className="bg-green-50 text-green-700 p-2 rounded-lg mb-3 text-[11px] font-bold text-center">
                      {successMessage}
                    </div>
                  )}
                  <form onSubmit={handleAddCourse} className="space-y-2.5">
                    <input
                      type="text"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      placeholder="اسم الدورة التدريبية"
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                      required
                    />
                    <input
                      type="text"
                      value={instructor}
                      onChange={(e) => setInstructor(e.target.value)}
                      placeholder="المدرب المسؤول"
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                      required
                    />
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="مدة الدورة الكلية"
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 text-white p-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition"
                    >
                      نشر الدورة فوراً
                    </button>
                  </form>
                </div>

                {/* 2. إضافة درس برابط */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                  <h2 className="text-xs font-black text-slate-800 mb-3">
                    2. إدارة وإضافة درس إلى دورة
                  </h2>
                  {lessonSuccess && (
                    <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg mb-3 text-[11px] font-bold text-center">
                      {lessonSuccess}
                    </div>
                  )}
                  <form onSubmit={handleAddLesson} className="space-y-2.5">
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">
                      اختر الدورة المستهدفة:
                    </label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white font-medium"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      placeholder="عنوان الدرس الرئيسي"
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                      required
                    />
                    <input
                      type="text"
                      value={lessonDuration}
                      onChange={(e) => setLessonDuration(e.target.value)}
                      placeholder="مدة الدرس (مثال: 55 دقيقة)"
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                      required
                    />
                    <input
                      type="url"
                      value={lessonUrl}
                      onChange={(e) => setLessonUrl(e.target.value)}
                      placeholder="رابط فيديو الدرس (يوتيوب أو Drive)"
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                    <button
                      type="submit"
                      disabled={lessonLoading}
                      className="w-full bg-slate-700 text-white p-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition"
                    >
                      تأكيد ونشر الدرس
                    </button>
                  </form>
                </div>

                {/* 3. بث التنبيهات */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                  <h2 className="text-xs font-black text-slate-800 mb-3">
                    3. مركز بث الإعلانات (Carousel)
                  </h2>
                  {announcementSuccess && (
                    <div className="bg-amber-50 text-amber-800 p-2 rounded-lg mb-3 text-[11px] font-bold text-center">
                      {announcementSuccess}
                    </div>
                  )}
                  <form
                    onSubmit={handlePostAnnouncement}
                    className="space-y-2.5"
                  >
                    <select
                      value={announcementType}
                      onChange={(e) => setAnnouncementType(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white font-medium"
                    >
                      <option value="تنبيه عاجل">🚨 تنبيه عاجل</option>
                      <option value="دورة جديدة">
                        🎓 دورة جديدة متاح التسجيل بها
                      </option>
                      <option value="تحديث هام">📢 تحديث عام للمنصة</option>
                    </select>
                    <textarea
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      placeholder="اكتب نص البانر الحين..."
                      rows="2"
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs resize-none"
                      required
                    />
                    <button
                      type="submit"
                      disabled={announcementLoading}
                      className="w-full bg-amber-600 text-white p-2 rounded-lg text-xs font-bold hover:bg-amber-700 transition"
                    >
                      بث التنبيه للطلاب
                    </button>
                  </form>
                </div>
              </div>

              {/* عمود جداول المراجعة والحذف */}
              <div className="lg:col-span-2 space-y-6">
                {/* 🛠️ جدول حذف وتعديل الدروس الحية للكورس المختار بالـ Select */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-sm font-black text-slate-800">
                      الدروس المنشورة بداخل الدورة المختارة حالياً
                    </h2>
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">
                      إدارة مستقلة للدروس
                    </span>
                  </div>
                  {lessonsFetchLoading ? (
                    <p className="text-slate-400 text-xs animate-pulse">
                      جاري تحميل الدروس فرعياً...
                    </p>
                  ) : currentCourseLessons.length === 0 ? (
                    <p className="text-slate-400 text-xs py-2 bg-slate-50 text-center rounded-xl">
                      لا توجد دروس مضافة بداخل هذه الدورة بعد. يمكنكِ إضافة درس
                      من النموذج الجانبي.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs md:text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-bold">
                            <th className="py-2 px-2">عنوان الدرس</th>
                            <th className="py-2 px-2">المدة</th>
                            <th className="py-2 px-2 text-center">الإجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {currentCourseLessons.map((lesson) => (
                            <tr
                              key={lesson.id}
                              className="hover:bg-slate-50 transition text-slate-700"
                            >
                              <td className="py-3 px-2 font-bold text-slate-800">
                                {lesson.title}
                              </td>
                              <td className="py-3 px-2 font-mono text-slate-500">
                                {lesson.duration}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <button
                                  onClick={() => handleDeleteLesson(lesson.id)}
                                  className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded text-xs font-bold transition"
                                >
                                  حذف الدرس 🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* جدول الكورسات */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                  <h2 className="text-sm font-black text-slate-800 mb-3">
                    المقررات الحالية المنشورة
                  </h2>
                  {fetchLoading ? (
                    <p className="text-slate-400 text-xs animate-pulse">
                      جاري التحميل...
                    </p>
                  ) : courses.length === 0 ? (
                    <p className="text-slate-400 text-xs py-2">
                      لا توجد دورات منشورة.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs md:text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-bold">
                            <th className="py-2 px-2">اسم الدورة التدريبية</th>
                            <th className="py-2 px-2 text-center">الإجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {courses.map((course) => (
                            <tr
                              key={course.id}
                              className="hover:bg-slate-50 transition"
                            >
                              <td className="py-3 px-2 font-bold text-slate-900">
                                {course.name}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <button
                                  onClick={() => handleDeleteCourse(course.id)}
                                  className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded text-xs font-bold transition"
                                >
                                  حذف الكورس بالكامل
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* جدول الإعلانات */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                  <h2 className="text-sm font-black text-slate-800 mb-3">
                    الإعلانات النشطة في البانر المتنقل
                  </h2>
                  {announcementsLoading ? (
                    <p className="text-slate-400 text-xs animate-pulse">
                      جاري جلب البانرات...
                    </p>
                  ) : announcements.length === 0 ? (
                    <p className="text-slate-400 text-xs py-2">
                      لا توجد تنبيهات منشورة.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs md:text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-bold">
                            <th className="py-2 px-2">النوع</th>
                            <th className="py-2 px-2">النص</th>
                            <th className="py-2 px-2 text-center">الإجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {announcements.map((ann) => (
                            <tr
                              key={ann.id}
                              className="hover:bg-slate-50 transition text-slate-700"
                            >
                              <td className="py-3 px-2 whitespace-nowrap">
                                <span className="bg-slate-100 font-bold px-2 py-0.5 rounded text-[10px]">
                                  {ann.type}
                                </span>
                              </td>
                              <td className="py-3 px-2 max-w-xs truncate font-medium">
                                {ann.text}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <button
                                  onClick={() =>
                                    handleDeleteAnnouncement(ann.id)
                                  }
                                  className="bg-red-50 text-red-600 font-bold px-2.5 py-1 rounded text-xs transition"
                                >
                                  إزالة
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* التبويب الثاني للطلاب */}
        {activeTab === "students" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                لوحة الرقابة والمتابعة الحية للطلاب
              </h1>
              <p className="text-slate-500 text-xs mt-1">
                تتبع أسماء الطلاب ومستويات إنجازهم لدروس الخطة.
              </p>
            </div>

            {studentsLoading ? (
              <p className="text-xs text-slate-400 animate-pulse font-bold">
                جاري تحديث سجلات الرقابة حياً...
              </p>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs md:text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200/60">
                        <th className="py-3 px-4">
                          اسم الطالب / البريد الإلكتروني
                        </th>
                        <th className="py-3 px-4 text-center">
                          النقاط الإجمالية
                        </th>
                        <th className="py-3 px-4 text-center">
                          الدروس المكتملة
                        </th>
                        <th className="py-3 px-4 text-center">
                          🏦 مهمة بنك المهام
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((student) => {
                        const completedCount = student.completedLessons
                          ? student.completedLessons.length
                          : 0;
                        const taskKeys = student.submittedTasks
                          ? Object.keys(student.submittedTasks)
                          : [];
                        const hasSubmittedTask = taskKeys.length > 0;

                        return (
                          <tr
                            key={student.id}
                            className="hover:bg-slate-50/80 transition text-slate-700"
                          >
                            <td className="py-3 px-4 font-medium">
                              <span className="block font-black text-slate-900 text-sm">
                                {student.displayName || "طالب مستعار"}
                              </span>
                              <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                                {student.email}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-blue-600 font-mono text-sm">
                              {student.points || 0} pts
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-bold font-mono">
                                📊 {completedCount} درس مكتمل
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {hasSubmittedTask ? (
                                <div className="space-y-1">
                                  {taskKeys.map((cId) => (
                                    <a
                                      key={cId}
                                      href={student.submittedTasks[cId]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-1 rounded-md hover:bg-emerald-100 transition shadow-2xs"
                                    >
                                      🔗 فتح حل التاسك برمجياً
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                  🔒 لم يسلم أي مهمة بعد
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
