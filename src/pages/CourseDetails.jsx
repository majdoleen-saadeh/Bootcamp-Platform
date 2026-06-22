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

  // حالات صندوق الأسئلة
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [questionLoading, setQuestionLoading] = useState(false);

  const getCourseData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const docRef = doc(db, "courses", courseId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const courseData = docSnap.data();
        setCourse(courseData);

        // 1. جلب الدروس
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

        // 2. فحص رتبة المستخدم والتسجيل والمهام المسلمة
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role || "student");
          setIsEnrolled((userData.enrolledCourses || []).includes(courseId));
          setCompletedLessons(userData.completedLessons || []);
          setSubmittedTasks(userData.submittedTasks || {});
        }

        // 3. جلب الأسئلة
        const questionsRef = collection(db, "courses", courseId, "questions");
        const qQuestions = query(questionsRef, orderBy("createdAt", "desc"));
        const questionsSnapshot = await getDocs(qQuestions);
        setQuestions(
          questionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
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
    if (
      window.confirm("هل أنت متأكد من رغبتك في إلغاء الاشتراك بهذه الدورة؟")
    ) {
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
      setTaskSuccess("🏦 تم إيداع وتسليم التاسك بنجاح!");
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

  const handlePostQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    setQuestionLoading(true);
    try {
      await addDoc(collection(db, "courses", courseId, "questions"), {
        text: newQuestion,
        createdAt: new Date(),
      });
      setNewQuestion("");
      getCourseData();
    } catch (error) {
      console.error(error);
    } finally {
      setQuestionLoading(false);
    }
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

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (progressPercentage / 100) * circumference;

  const week1Lessons = lessons.filter((l) => l.index <= 4);
  const remainingLessons = lessons.filter((l) => l.index > 4);

  return (
    <div
      className="min-h-screen bg-[#f4f6f9] text-slate-800 font-sans pb-12"
      dir="rtl"
    >
      {/* البار العلوي المحسن الذكي يدعم الأدمن والطلاب */}
      <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/student")}
            className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 transition"
          >
            <span>&rarr;</span> العودة للبوابة رئيسية
          </button>
          <button
            onClick={() => navigate("/student")}
            className="text-sm p-1.5 bg-slate-800 hover:bg-slate-700 rounded-full transition"
          >
            🏠
          </button>
        </div>

        <div className="flex items-center gap-3">
          {userRole === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-1.5 rounded-xl text-xs font-black shadow-sm transition"
            >
              ⚙️ لوحة الإدارة (الأدمن)
            </button>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        {/* البانر الترحيبي وحالة زر التسجيل الذكي */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-2xs flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl shadow-inner shrink-0">
              🤖
            </div>
            <div>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-md mb-1 inline-block">
                خطة تدريبية موجهة
              </span>
              <h1 className="text-xl font-black text-slate-900 leading-tight">
                {course.name}
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                المدرب: {course.instructor} | إجمالي المدة: {course.duration}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {!isEnrolled ? (
              <button
                onClick={handleEnrollFromInside}
                disabled={enrollLoading}
                className="bg-blue-600 text-white font-black text-xs px-6 py-3 rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-600/10 cursor-pointer"
              >
                {enrollLoading ? "جاري تسجيلك..." : "📥 سجل في هذه الدورة الآن"}
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={handleUnenrollCourse}
                  disabled={enrollLoading}
                  className="text-red-500 border border-red-200 bg-red-50/50 font-bold text-[10px] px-3 py-2 rounded-xl hover:bg-red-50 transition cursor-pointer"
                >
                  إلغاء الاشتراك
                </button>
                <div className="relative w-16 h-16 flex flex-col items-center justify-center">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      stroke="#f1f5f9"
                      strokeWidth="4"
                      fill="transparent"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      stroke="#2563eb"
                      strokeWidth="4"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 26}
                      strokeDashoffset={
                        2 * Math.PI * 26 -
                        (progressPercentage / 100) * (2 * Math.PI * 26)
                      }
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-center">
                    <span className="text-[11px] font-black text-slate-900 font-mono">
                      {progressPercentage}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 📅 قسم الاجتماعات الديناميكي */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-xl"></div>
          <div className="space-y-1 relative z-10">
            <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded border border-blue-500/30">
              📅 موعد اللقاء الحي والدعم المباشر
            </span>
            <h3 className="font-bold text-sm md:text-base text-slate-100">
              {course.meetingTime || "لم يتم تحديد موعد اللقاء القادم بعد"}
            </h3>
            <p className="text-xs text-slate-400">
              موضوع النقاش:{" "}
              {course.meetingTopic || "سيتم تحديده من قبل الإدارة قريباً."}
            </p>
          </div>
          <span className="text-3xl hidden sm:block">💬</span>
        </div>

        {/* تقسيم المحتوى */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-5">
            {/* الأسبوع الأول - إعادة إضافة روابط فتح محتوى الفيديو حياً */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-2xs">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h2 className="font-black text-sm md:text-base text-slate-900 flex items-center gap-2">
                  <span>🚀</span> الأسبوع الأول: أساسيات ومفاهيم اللغة (مستهدف
                  100%)
                </h2>
                <p className="text-amber-700 bg-amber-50 text-[11px] p-2 rounded-lg mt-2 font-medium leading-relaxed">
                  💡 <b>تنبيه موجه:</b> بالمجمل وعند الغالبية العظمى من الطلاب
                  الأساسيات سهلة. هذا القسم لازم يخلص معك سريعاً لتبدأ بالطحن
                  الفعلي للقدرات المتقدمة!
                </p>
              </div>

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

                      {/* 🔥 إظهار رابط محتوى الفيديو هنا إذا الطالب مشترك ومسجل */}
                      {isEnrolled ? (
                        lesson.videoUrl && (
                          <a
                            href={lesson.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline mt-2 bg-blue-50 px-2 py-0.5 rounded-md"
                          >
                            🎥 فتح محتوى درس {lesson.title}
                          </a>
                        )
                      ) : (
                        <span className="inline-block text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md mt-2 font-medium border border-slate-100">
                          🔒 محتوى الفيديو مقفل (سجل للعرض)
                        </span>
                      )}
                    </div>
                    {isEnrolled && (
                      <input
                        type="checkbox"
                        checked={completedLessons.includes(lesson.id)}
                        onChange={() => handleToggleLesson(lesson.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* الأسبوع الثاني - إعادة إظهار روابط الفيديوهات حياً */}
            {remainingLessons.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-2xs">
                <h2 className="font-black text-sm md:text-base text-slate-900 mb-4 flex items-center gap-2">
                  <span>⚡</span> الأسبوع الثاني والمحطات المتقدمة (OOP &
                  Architecture)
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

                        {/* 🔥 إظهار رابط محتوى الفيديو هنا إذا الطالب مشترك ومسجل */}
                        {isEnrolled ? (
                          lesson.videoUrl && (
                            <a
                              href={lesson.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline mt-2 bg-blue-50 px-2 py-0.5 rounded-md"
                            >
                              🎥 فتح محتوى درس {lesson.title}
                            </a>
                          )
                        ) : (
                          <span className="inline-block text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md mt-2 font-medium border border-slate-100">
                            🔒 مغلق
                          </span>
                        )}
                      </div>
                      {isEnrolled && (
                        <input
                          type="checkbox"
                          checked={completedLessons.includes(lesson.id)}
                          onChange={() => handleToggleLesson(lesson.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* عمود بنك التاسكات */}
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-2xs space-y-3">
              <h3 className="font-black text-xs md:text-sm text-slate-900 flex items-center gap-1.5">
                <span>🏦</span> بنك المهام والتاسكات الأسبوعية
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                يرجى رفع حلك البرمجي على حسابك في GitHub أو Drive وإرفاق الرابط
                هنا للإيداع والتقييم الحقيقي.
              </p>
              {taskSuccess && (
                <div className="p-2 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold text-center border border-green-100">
                  {taskSuccess}
                </div>
              )}
              {isEnrolled ? (
                submittedTasks[courseId] ? (
                  <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl text-center">
                    <p className="text-xs font-bold">
                      ✅ تم إيداع حلك في البنك بنجاح
                    </p>
                    <a
                      href={submittedTasks[courseId]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] underline block mt-1 font-mono truncate"
                    >
                      {submittedTasks[courseId]}
                    </a>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitTask} className="space-y-2">
                    <input
                      type="url"
                      value={taskLink}
                      onChange={(e) => setTaskLink(e.target.value)}
                      placeholder="ضع رابط حل التاسك (GitHub)..."
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                    <input
                      type="submit"
                      className="w-full bg-slate-900 text-white font-bold py-2 px-3 rounded-xl text-xs hover:bg-slate-800 transition text-center cursor-pointer"
                      value="إيداع وتسليم المهمة"
                    />
                  </form>
                )
              ) : (
                <div className="text-[10px] bg-slate-50 p-2.5 text-center text-slate-400 rounded-lg">
                  🔒 يتطلب التسجيل بالدورة لتفعيل تسليم المهام.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
