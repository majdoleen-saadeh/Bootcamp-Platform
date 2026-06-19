import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../config/firebase";
import { doc, getDoc, collection, getDocs, addDoc, deleteDoc, query, orderBy, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

export default function CourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);

  // حالات صندوق الأسئلة
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [questionLoading, setQuestionLoading] = useState(false);

  // حالة قائمة الأكشن (الترس ⚙️) المنسدلة مثل الصورة
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // حالة تقييم النجوم التفاعلي الجديد
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const getCourseData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const docRef = doc(db, "courses", courseId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const courseData = docSnap.data();
        setCourse(courseData);
        
        // قراءة التقييم إذا كان الطالب قد قيم مسبقاً (افتراضياً 5 نجوم أو حسب المحفوظ)
        setUserRating(courseData.rating || 0);

        // 1. جلب الدروس
        const lessonsRef = collection(db, "courses", courseId, "lessons");
        const qLessons = query(lessonsRef, orderBy("createdAt", "asc"));
        const lessonsSnapshot = await getDocs(qLessons);
        setLessons(lessonsSnapshot.docs.map((doc, index) => ({
          id: doc.id,
          index: index + 1,
          ...doc.data()
        })));

        // 2. فحص التسجيل والمكتمل
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userEnrolled = userDoc.data().enrolledCourses || [];
          setIsEnrolled(userEnrolled.includes(courseId));
          setCompletedLessons(userDoc.data().completedLessons || []);
        }

        // 3. جلب الأسئلة
        const questionsRef = collection(db, "courses", courseId, "questions");
        const qQuestions = query(questionsRef, orderBy("createdAt", "desc"));
        const questionsSnapshot = await getDocs(qQuestions);
        setQuestions(questionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { getCourseData(); }, [courseId]);

  // دالة إرسال تقييم النجوم للفايرستور
  const handleRateCourse = async (ratingValue) => {
    if (!isEnrolled) return alert("يجب التسجيل في الدورة أولاً لتقييمها!");
    setUserRating(ratingValue);
    try {
      const courseRef = doc(db, "courses", courseId);
      await updateDoc(courseRef, {
        rating: ratingValue
      });
    } catch (error) {
      console.error("Error updating rating:", error);
    }
  };

  const handleEnrollFromInside = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setEnrollLoading(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        enrolledCourses: arrayUnion(courseId)
      });
      setIsEnrolled(true);
    } catch (error) { console.error(error); } 
    finally { setEnrollLoading(false); }
  };

  const handleUnenrollCourse = async () => {
    if (window.confirm("هل أنت متأكد من رغبتك في إزالة هذه الدورة من حسابك؟")) {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      setEnrollLoading(true);
      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          enrolledCourses: arrayRemove(courseId)
        });
        setIsEnrolled(false);
        setIsMenuOpen(false);
      } catch (error) { console.error(error); } 
      finally { setEnrollLoading(false); }
    }
  };

  const handleToggleLesson = async (lessonId) => {
    if (!isEnrolled) return;
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    let updatedList = [...completedLessons];
    if (updatedList.includes(lessonId)) {
      updatedList = updatedList.filter(id => id !== lessonId);
    } else { updatedList.push(lessonId); }

    setCompletedLessons(updatedList);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        completedLessons: updatedList,
        points: updatedList.length * 100
      });
    } catch (error) { console.error(error); }
  };

  const handlePostQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    setQuestionLoading(true);
    try {
      await addDoc(collection(db, "courses", courseId, "questions"), { text: newQuestion, createdAt: new Date() });
      setNewQuestion("");
      getCourseData();
    } catch (error) { console.error(error); } 
    finally { setQuestionLoading(false); }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm("هل تريد حذف هذا الاستفسار؟")) {
      try {
        await deleteDoc(doc(db, "courses", courseId, "questions", questionId));
        getCourseData();
      } catch (error) { console.error(error); }
    }
  };

  const totalLessons = lessons.length;
  const courseLessonsIds = lessons.map(l => l.id);
  const completedInThisCourse = completedLessons.filter(id => courseLessonsIds.includes(id)).length;
  const progressPercentage = totalLessons > 0 ? Math.round((completedInThisCourse / totalLessons) * 100) : 0;

  // معادلة الدائرة الرياضية للـ Circular Progress Bar
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9] text-slate-500 animate-pulse font-bold">جاري تحميل المحتوى الدراسي...</div>;
  }

  // تحديد الرموز التعبيرية بناءً على نوع الكورس لمحاكاة اللوغو بالصورة
  const isAndroid = course.name?.toLowerCase().includes("android") || course.name?.toLowerCase().includes("kotlin");
  const isFlutter = course.name?.toLowerCase().includes("flutter");

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-800 font-sans pb-12" dir="rtl">
      
      {/* 1️⃣ الشريط العلوي البسيط النظيف - متطابق مع أعلى الصورة `image_7fa6f0.jpg` */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-2xs">
        <button onClick={() => navigate("/student")} className="text-sm font-bold text-slate-700 hover:text-slate-900 flex items-center gap-2 transition">
          <span>&rarr;</span> العودة إلى لوحة المتابعة
        </button>
        <button onClick={() => navigate("/student")} className="text-xl p-1 bg-slate-50 hover:bg-slate-100 rounded-full transition">🏠</button>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-6">
        
        {/* بانر حث غير المشتركين على التسجيل */}
        {!isEnrolled && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xs">
            <div className="space-y-0.5">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5"><span>🎓</span> تصفح خطة ومحتوى الدورة المتاحة</h3>
              <p className="text-slate-600 text-xs">سجل الآن لتتمكن من مشاهدة الفيديوهات الحية وتقييم الكورس والمشاركة بالنقاشات!</p>
            </div>
            <button onClick={handleEnrollFromInside} disabled={enrollLoading} className="w-full sm:w-auto shrink-0 bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs md:text-sm shadow hover:bg-blue-700 transition">
              {enrollLoading ? "جاري التسجيل..." : "📝 سجل في هذه الدورة الآن"}
            </button>
          </div>
        )}

        {/* 2️⃣ الكرت الرئيسي الفخم للكورس المنسق بالكامل مع الصورة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start relative mb-8">
          
          {/* كرت تفاصيل الكورس (ياخذ 3 أعمدة) */}
          <div className="md:col-span-3 bg-white rounded-2xl border border-slate-200/60 p-6 shadow-2xs flex justify-between items-center gap-4 relative overflow-hidden">
            <div className="flex items-center gap-4">
              {/* مربع اللوغو المصاحب للمادة مثل لوغو الأندرويد بالصورة */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner shrink-0 ${
                isAndroid ? "bg-emerald-50 text-emerald-600" : isFlutter ? "bg-blue-50 text-blue-500" : "bg-indigo-50 text-indigo-600"
              }`}>
                {isAndroid ? "🤖" : isFlutter ? "💙" : "💻"}
              </div>
              
              <div>
                <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-md mb-1.5 ${isEnrolled ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {isEnrolled ? "Completed" : "تصفح الخطة"}
                </span>
                <h1 className="text-lg md:text-xl font-black text-slate-900 leading-tight">{course.name}</h1>
                <p className="text-slate-500 text-xs mt-1 font-medium">المدرب: {course.instructor} | المدة: {course.duration}</p>
                
                {/* ⭐️ نظام تقييم النجوم التفاعلي المضاف حديثاً داخل الكورس */}
                {isEnrolled && (
                  <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 ml-1">قيّم هذه الدورة:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleRateCourse(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className={`text-base transition-colors ${
                          star <= (hoverRating || userRating) ? "text-amber-500" : "text-slate-200"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    {userRating > 0 && <span className="text-[10px] font-mono text-amber-600 font-bold mr-1">({userRating} نجوم)</span>}
                  </div>
                )}
              </div>
            </div>

            {/* 🔄 مؤشر التقدم الدائري (Circular Progress Bar) الفخم المماثل للصورة تماماً */}
            {isEnrolled && (
              <div className="flex flex-col items-center justify-center shrink-0 ml-2 relative">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r={radius} stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                  <circle cx="40" cy="40" r={radius} stroke="#2563eb" strokeWidth="6" fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-in-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[9px] font-black text-slate-400 block -mb-0.5">إنجازك:</span>
                  <span className="text-sm font-black text-slate-900 font-mono">{progressPercentage}%</span>
                </div>
              </div>
            )}
          </div>

          {/* ⚙️ منيو الأكشن المنسدل للترس - متطابق هندسياً مع الصورة */}
          {isEnrolled && (
            <div className="md:col-span-1 relative self-stretch flex md:justify-end items-start">
              <div className="w-full md:w-auto relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="w-full md:w-auto bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition"
                >
                  ⚙️ خيارات الدورة <span className="text-[10px]">&nbsp;&darr;</span>
                </button>

                {isMenuOpen && (
                  <div className="absolute left-0 md:right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-fade-in">
                    <button onClick={() => navigate("/student")} className="w-full text-right px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2">
                      <span>&larr;</span> لوحة المتابعة
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    <button 
                      onClick={handleUnenrollCourse}
                      className="w-full text-right px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-bold transition flex items-center gap-2"
                    >
                      <span>&times;</span> إلغاء التسجيل بالدورة
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* 3️⃣ خطة الدروس والأسئلة المصممة على شكل كروت بيضاء كاملة التناسق */}
        <div className="space-y-6">
          
          {/* كرت الخطة الدراسية والدروس */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 md:p-6 shadow-2xs">
            <h2 className="text-base md:text-lg font-black text-slate-900 mb-4 flex items-center gap-1.5">
              <span>📋</span> الخطة الدراسية والدروس المتاحة
            </h2>
            
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
              {lessons.map((lesson) => {
                const isCompleted = completedLessons.includes(lesson.id);
                return (
                  <div key={lesson.id} className={`p-4 flex justify-between items-center transition ${isCompleted ? "bg-slate-50/50" : "bg-white"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs ${isCompleted ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}`}>
                        {lesson.index}
                      </span>
                      <div>
                        <h3 className="font-extrabold text-xs md:text-sm text-slate-800">{lesson.title}</h3>
                        <span className="text-[11px] text-slate-400 block mt-0.5">المدة: {lesson.duration}</span>
                        {isEnrolled ? (
                          lesson.videoUrl && <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline mt-1.5 bg-blue-50 px-2 py-0.5 rounded-md">🎥 فتح محتوى الدرس</a>
                        ) : (
                          <span className="inline-block text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md mt-1.5 font-medium border border-slate-100">🔒 محتوى الفيديو مقفل (سجل للعرض)</span>
                        )}
                      </div>
                    </div>

                    {isEnrolled && (
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={isCompleted} onChange={() => handleToggleLesson(lesson.id)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                        <span className={`text-xs font-black ${isCompleted ? "text-green-600" : "text-slate-400"}`}>{isCompleted ? "مكتمل" : "إتمام"}</span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* كرت قسم النقاشات وأسئلة الطلاب المصممة بمرونة تامة */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 md:p-6 shadow-2xs">
            <h2 className="text-base md:text-lg font-black text-slate-900 mb-4 flex items-center gap-1.5">
              <span>💬</span> أسئلة الطلاب واستفساراتهم
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              {/* تصفح الأسئلة المطروحة مسبقاً */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {questions.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-100 rounded-xl">لا يوجد أي استفسارات مطروحة حالياً بالدورة.</p>
                ) : (
                  questions.map((q) => (
                    <div key={q.id} className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl text-xs flex justify-between items-start gap-2 shadow-2xs">
                      <div className="space-y-1 flex-1">
                        <p className="font-extrabold text-slate-800 leading-relaxed break-words">س: {q.text}</p>
                        <span className="text-[10px] text-slate-400 block font-mono">تاريخ النشر: 2026-06</span>
                      </div>
                      {isEnrolled && (
                        <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-500 hover:text-red-700 font-bold text-[10px] bg-white rounded-md px-2 py-1 border border-red-100 shrink-0 shadow-2xs transition">حذف</button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* فورم طرح سؤال جديد */}
              {isEnrolled ? (
                <form onSubmit={handlePostQuestion} className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200/50">
                  <textarea value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="لديك استفسار حول أحد دروس الخطة الدراسية؟ اكتبه هنا..." rows="3" className="w-full p-3 border border-slate-200 bg-white rounded-xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs" required></textarea>
                  <button type="submit" disabled={questionLoading} className="w-full bg-blue-600 text-white p-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-xs">اطرح سؤالك</button>
                </form>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-center p-6 rounded-xl text-xs font-semibold">🔒 صندوق طرح الأسئلة والنقاش يفتح بمجرد ضغطك على زر التسجيل بالدورة بالملف.</div>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* فوتر التحميل */}
      <footer className="max-w-5xl mx-auto px-4 mt-12 text-center text-xs text-slate-400 font-medium">
        <p>© 2026 majdoleen </p>
      </footer>

    </div>
  );
}