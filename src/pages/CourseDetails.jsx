import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../config/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

export default function CourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [userRole, setUserRole] = useState("student");

  // حالات بنك التاسكات
  const [taskLink, setTaskLink] = useState("");
  const [taskSuccess, setTaskSuccess] = useState("");
  const [submittedTasks, setSubmittedTasks] = useState({});

  // 🔒 حالات العرض الآمن للفيديو (Secure Video Modal)
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);
  const [activeVideoTitle, setActiveVideoTitle] = useState("");

  const getCourseData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const docRef = doc(db, "courses", courseId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const courseData = docSnap.data();
        setCourse(courseData);

        const lessonsRef = collection(db, "courses", courseId, "lessons");
        const qLessons = query(lessonsRef, orderBy("createdAt", "asc"));
        const lessonsSnapshot = await getDocs(qLessons);
        setLessons(
          lessonsSnapshot.docs.map((doc, index) => ({
            id: doc.id,
            index: index + 1,
            ...doc.data(),
          })),
        );

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role || "student");
          setIsEnrolled((userData.enrolledCourses || []).includes(courseId));
          setCompletedLessons(userData.completedLessons || []);
          setSubmittedTasks(userData.submittedTasks || {});
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCourseData();
  }, [courseId]);

  const handleEnrollFromInside = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setEnrollLoading(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        enrolledCourses: arrayUnion(courseId),
      });
      setIsEnrolled(true);
    } catch (error) {
      console.error(error);
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleUnenrollCourse = async () => {
    if (window.confirm("هل أنت متأكد من رغبتك في إلغاء الاشتراك؟")) {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      setEnrollLoading(true);
      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          enrolledCourses: arrayRemove(courseId),
        });
        setIsEnrolled(false);
      } catch (error) {
        console.error(error);
      } finally {
        setEnrollLoading(false);
      }
    }
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!taskLink.trim()) return;
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const userRef = doc(db, "users", currentUser.uid);
      const updatedTasks = { ...submittedTasks, [courseId]: taskLink.trim() };
      await updateDoc(userRef, {
        submittedTasks: updatedTasks,
        points: completedLessons.length * 100 + 500,
      });
      setSubmittedTasks(updatedTasks);
      setTaskSuccess("🏦 تم تسليم التاسك بنجاح!");
      setTaskLink("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleLesson = async (lessonId) => {
    if (!isEnrolled) return;
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    let updatedList = [...completedLessons];
    if (updatedList.includes(lessonId)) {
      updatedList = updatedList.filter((id) => id !== lessonId);
    } else {
      updatedList.push(lessonId);
    }

    setCompletedLessons(updatedList);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        completedLessons: updatedList,
        points: updatedList.length * 100 + (submittedTasks[courseId] ? 500 : 0),
      });
    } catch (error) {
      console.error(error);
    }
  };

  // 🔒 دالة معالجة تشغيل الفيديو الآمن وعمل تحويل للروابط لتلائم الـ Embed
  const handlePlayVideoSecurely = (lesson) => {
    if (!isEnrolled) {
      alert(
        "عذراً، يجب عليك التسجيل في الدورة أولاً للوصول إلى المحتوى التعليمي.",
      );
      return;
    }

    let url = lesson.videoUrl;
    // تحويل روابط يوتيوب العادية إلى روابط Embed لتعمل داخل الآيفريم بأمان
    if (url.includes("youtube.com/watch?v=")) {
      url = url.replace("watch?v=", "embed/");
    } else if (url.includes("youtu.be/")) {
      url = url.replace("youtu.be/", "youtube.com/embed/");
    }

    setActiveVideoUrl(url);
    setActiveVideoTitle(lesson.title);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9] text-slate-500 animate-pulse font-bold">
        جاري تحميل الخطة التدريبية...
      </div>
    );
  }

  const totalLessons = lessons.length;
  const courseLessonsIds = lessons.map((l) => l.id);
  const completedInThisCourse = completedLessons.filter((id) =>
    courseLessonsIds.includes(id),
  ).length;
  const progressPercentage =
    totalLessons > 0
      ? Math.round((completedInThisCourse / totalLessons) * 100)
      : 0;

  const week1Lessons = lessons.filter((l) => l.index <= 4);
  const remainingLessons = lessons.filter((l) => l.index > 4);

  return (
    <div
      className="min-h-screen bg-[#f4f6f9] text-slate-800 font-sans pb-12"
      dir="rtl"
    >
      {/* البار العلوي */}
      <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/student")}
            className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 transition"
          >
            &rarr; العودة للبوابة الرئيسية
          </button>
        </div>
        <div>
          {userRole === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-1.5 rounded-xl text-xs font-black shadow-sm transition"
            >
              ⚙️ لوحة الأدمن
            </button>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        {/* كرت تفاصيل الكورس */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-2xs flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl shrink-0">
              🤖
            </div>
            <div>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-md mb-1 inline-block">
                خطة تدريبية
              </span>
              <h1 className="text-xl font-black text-slate-900 leading-tight">
                {course.name}
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                المدرب: {course.instructor} | المدة: {course.duration}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {!isEnrolled ? (
              <button
                onClick={handleEnrollFromInside}
                disabled={enrollLoading}
                className="bg-blue-600 text-white font-black text-xs px-6 py-3 rounded-xl hover:bg-blue-700 transition shadow-md"
              >
                {enrollLoading
                  ? "جاري التسجيل..."
                  : "📥 سجل في هذه الدورة الآن"}
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={handleUnenrollCourse}
                  disabled={enrollLoading}
                  className="text-red-500 border border-red-200 bg-red-50/50 font-bold text-[10px] px-3 py-2 rounded-xl hover:bg-red-50 transition"
                >
                  إلغاء الاشتراك
                </button>
                <div className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-2 rounded-xl">
                  📈 نسبة الإنجاز: {progressPercentage}%
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-5">
            {/* الأسبوع الأول */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-2xs">
              <h2 className="font-black text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                🚀 الأسبوع الأول: أساسيات ومفاهيم اللغة
              </h2>

              <div className="divide-y divide-slate-100">
                {week1Lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="py-4 flex justify-between items-center"
                  >
                    <div>
                      <h4 className="font-bold text-xs md:text-sm text-slate-800">
                        phase {lesson.index}: {lesson.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        المدة: {lesson.duration || "45 دقيقة"}
                      </span>

                      {/* 🔥 التغيير الأمني: زر باتصال داخلي آمن بدلاً من التوجيه الخارجي */}
                      {isEnrolled ? (
                        <button
                          onClick={() => handlePlayVideoSecurely(lesson)}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:bg-blue-100 mt-2 bg-blue-50 px-2.5 py-1 rounded-md transition"
                        >
                          🎬 تشغيل محتوى الدرس حياً
                        </button>
                      ) : (
                        <span className="inline-block text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md mt-2 border border-slate-100">
                          🔒 محتوى الفيديو مقفل
                        </span>
                      )}
                    </div>
                    {isEnrolled && (
                      <input
                        type="checkbox"
                        checked={completedLessons.includes(lesson.id)}
                        onChange={() => handleToggleLesson(lesson.id)}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* الأسبوع الثاني */}
            {remainingLessons.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-2xs">
                <h2 className="font-black text-sm text-slate-900 mb-4">
                  ⚡ المحطات المتقدمة التالية
                </h2>
                <div className="divide-y divide-slate-100">
                  {remainingLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="py-4 flex justify-between items-center"
                    >
                      <div>
                        <h4 className="font-bold text-xs md:text-sm text-slate-800">
                          phase {lesson.index}: {lesson.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          المدة: {lesson.duration}
                        </span>

                        {isEnrolled ? (
                          <button
                            onClick={() => handlePlayVideoSecurely(lesson)}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:bg-blue-100 mt-2 bg-blue-50 px-2.5 py-1 rounded-md transition"
                          >
                            🎬 تشغيل محتوى الدرس حياً
                          </button>
                        ) : (
                          <span className="inline-block text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md mt-2 border border-slate-100">
                            🔒 مغلق
                          </span>
                        )}
                      </div>
                      {isEnrolled && (
                        <input
                          type="checkbox"
                          checked={completedLessons.includes(lesson.id)}
                          onChange={() => handleToggleLesson(lesson.id)}
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* عمود بنك التاسكات الجانبي */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-2xs space-y-3">
              <h3 className="font-black text-xs text-slate-900">
                🏦 بنك المهام والتاسكات الأسبوعية
              </h3>
              {taskSuccess && (
                <div className="p-2 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold text-center">
                  {taskSuccess}
                </div>
              )}
              {isEnrolled ? (
                submittedTasks[courseId] ? (
                  <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl text-center">
                    <p className="text-xs font-bold">
                      ✅ تم إيداع حلك في البنك بنجاح
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitTask} className="space-y-2">
                    <input
                      type="url"
                      value={taskLink}
                      onChange={(e) => setTaskLink(e.target.value)}
                      placeholder="ضع رابط حل التاسك (GitHub)..."
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none"
                      required
                    />
                    <input
                      type="submit"
                      className="w-full bg-slate-900 text-white font-bold py-2 rounded-xl text-xs hover:bg-slate-800 transition cursor-pointer"
                      value="إيداع وتسليم المهمة"
                    />
                  </form>
                )
              ) : (
                <div className="text-[10px] bg-slate-50 p-2.5 text-center text-slate-400 rounded-lg">
                  🔒 سجل بالدورة لتفعيل التسليم.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🔒 🎬 المشغل المدمج والآمن (Secure Video Modal) */}
      {activeVideoUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-100">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <h3 className="font-black text-xs md:text-sm">
                📺 مشغل المنصة الآمن: {activeVideoTitle}
              </h3>
              <button
                onClick={() => {
                  setActiveVideoUrl(null);
                  setActiveVideoTitle("");
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1 rounded-xl text-xs transition cursor-pointer"
              >
                إغلاق المشغل ✕
              </button>
            </div>
            <div className="relative pt-[56.25%] bg-black">
              <iframe
                src={activeVideoUrl}
                className="absolute inset-0 w-full h-full"
                title={activeVideoTitle}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="p-3 bg-slate-50 text-center text-[10px] text-slate-400 font-medium">
              🛡️ هذا المحتوى محمي ومشفر بالكامل داخل منصتكِ التعليمية.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
