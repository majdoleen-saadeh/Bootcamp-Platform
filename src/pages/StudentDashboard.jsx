import React, { useEffect, useState } from "react";
import { db, auth } from "../config/firebase";
import { collection, getDocs, getDoc, doc, query, orderBy, limit, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allStudents, setAllStudents] = useState([]);
  const [topThree, setTopThree] = useState([]);

  // حالات منيو الإعدادات والتبويبات بداخل المنيو (profile, my_courses, leaderboard)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [menuTab, setMenuTab] = useState("profile"); 

  const [studentProfile, setStudentProfile] = useState({ email: "", uid: "", displayName: "" });
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [newName, setNewName] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState("");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) { console.error(error); }
  };

  const nextAnnouncement = () => {
    if (announcements.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setUpdateLoading(true);
    setUpdateSuccess("");
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updateDoc(doc(db, "users", currentUser.uid), { displayName: newName.trim() });
        setStudentProfile(prev => ({ ...prev, displayName: newName.trim() }));
        setUpdateSuccess("🎉 تم حفظ الاسم بنجاح!");
        fetchLeaderboardData();
      }
    } catch (error) { console.error(error); } 
    finally { setUpdateLoading(false); }
  };

  const fetchLeaderboardData = async () => {
    try {
      const qUsers = query(collection(db, "users"), orderBy("points", "desc"));
      const usersSnapshot = await getDocs(qUsers);
      const list = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.role !== "admin"); 

      setAllStudents(list);
      
      const dynamicTopThree = [
        { 
          displayName: list[0]?.displayName || "في انتظار بطل", 
          points: list[0]?.points || 0, 
          avatar: "👩‍💻" 
        },
        { 
          displayName: list[1]?.displayName || "في انتظار منافس", 
          points: list[1]?.points || 0, 
          avatar: "👨‍💻" 
        },
        { 
          displayName: list[2]?.displayName || "في انتظار منافس", 
          points: list[2]?.points || 0, 
          avatar: "👩‍🎓" 
        }
      ];
      
      setTopThree(dynamicTopThree);
    } catch (error) { 
      console.error("Error fetching leaderboard: ", error); 
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          let initialName = "";
          let userEnrolled = [];
          let userCompleted = [];
          
          if (userDoc.exists()) {
            initialName = userDoc.data().displayName || currentUser.email.split('@')[0];
            userEnrolled = userDoc.data().enrolledCourses || [];
            userCompleted = userDoc.data().completedLessons || [];
          } else {
            initialName = currentUser.email.split('@')[0];
          }

          setStudentProfile({ email: currentUser.email, uid: currentUser.uid, displayName: initialName });
          setNewName(initialName);
          setEnrolledCourses(userEnrolled);
          setCompletedLessons(userCompleted);
        }

        const qCourses = query(collection(db, "courses"), orderBy("createdAt", "desc"));
        const coursesSnapshot = await getDocs(qCourses);
        setCourses(coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const qAnnouncements = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
        const announcementSnapshot = await getDocs(qAnnouncements);
        setAnnouncements(announcementSnapshot.docs.map(doc => doc.data()));

        await fetchLeaderboardData();
      } catch (error) { 
        console.error(error); 
      } finally { 
        setLoading(false); 
      }
    };
    
    fetchData();
  }, []);

  const overallProgress = enrolledCourses.length > 0 ? 75 : 0; 
  const userEnrolledData = courses.filter(c => enrolledCourses.includes(c.id));

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-12" dir="rtl">
      
      {/* 🛑 المنيو الجانبي المطور بالكامل لتطبيق شكل كروت الصورة {84BDDB9C-4D2C-4812-99A1-98B39A58FC1C}.png */}
      <div className={`fixed inset-y-0 right-0 w-85 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-100 p-5 flex flex-col justify-between ${isSettingsOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* رأس المنيو */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">⚙️ لوحة حسابي والتحكم</h3>
            <button onClick={() => { setIsSettingsOpen(false); setUpdateSuccess(""); }} className="text-slate-400 text-xl font-bold hover:text-slate-600 transition">&times;</button>
          </div>

          {/* أشرطة التنقل الداخلية بداخل المنيو لتفعيل ضغطة "دوراتي" */}
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-bold text-slate-600">
            <button onClick={() => setMenuTab("profile")} className={`flex-1 py-1.5 text-center rounded-md transition ${menuTab === "profile" ? "bg-white text-slate-900 shadow-2xs" : ""}`}>الملف</button>
            <button onClick={() => setMenuTab("my_courses")} className={`flex-1 py-1.5 text-center rounded-md transition ${menuTab === "my_courses" ? "bg-white text-slate-900 shadow-2xs" : ""}`}>دوراتي 📚</button>
            <button onClick={() => setMenuTab("leaderboard")} className={`flex-1 py-1.5 text-center rounded-md transition ${menuTab === "leaderboard" ? "bg-white text-slate-900 shadow-2xs" : ""}`}>الترتيب العام</button>
          </div>

          {/* تبويب تعديل ملف الحساب الشخصي */}
          {menuTab === "profile" && (
            <div className="space-y-4 pt-2">
              {updateSuccess && <p className="text-[11px] bg-green-50 text-green-700 p-2 rounded text-center font-semibold">{updateSuccess}</p>}
              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <label className="block text-[11px] font-bold text-slate-500">تعديل اسمك المستعار:</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs" required />
                <button type="submit" className="w-full bg-slate-900 text-white p-2 rounded-lg text-xs font-semibold hover:bg-slate-800 transition">حفظ التعديلات</button>
              </form>
            </div>
          )}

          {/* تطبيق كروت "دوراتي" */}
          {menuTab === "my_courses" && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm border-b border-slate-50 pb-2">
                <span>📚</span> دوراتي المشتركة والمتابعة
              </div>
              
              {userEnrolledData.length === 0 ? (
                <p className="text-[11px] text-slate-400 bg-slate-50 p-4 rounded-xl text-center font-medium border border-dashed border-slate-200">لم تسجلي في أي دورة بعد.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {userEnrolledData.map(course => (
                    <div key={course.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between h-44 hover:border-blue-400 transition">
                      <div>
                        <div className="bg-slate-100 border border-slate-200 rounded-lg h-16 flex items-center justify-center text-[11px] font-black text-slate-500 shadow-inner">
                          قريباً 🎥
                        </div>
                        <span className="inline-block bg-green-50 text-green-700 text-[9px] font-black px-1.5 py-0.5 rounded mt-2">نشط حياً</span>
                        <h4 className="font-extrabold text-slate-800 text-[11px] mt-1 truncate">{course.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate">المدرب: {course.instructor}</p>
                      </div>
                      <Link 
                        to={`/course/${course.id}`}
                        onClick={() => setIsSettingsOpen(false)}
                        className="w-full text-center border border-slate-200 hover:bg-blue-50 hover:text-blue-700 font-bold py-1 px-2 rounded-lg text-[10px] text-slate-600 transition bg-slate-50/50"
                      >
                        عرض المحتوى
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* تبويب لوحة الصدارة الكاملة */}
          {menuTab === "leaderboard" && (
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-bold text-slate-700 border-b border-slate-50 pb-2">🏆 لوحة الصدارة الشاملة</h4>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {allStudents.map((s, index) => (
                  <div key={s.id} className={`flex justify-between text-xs p-2 rounded-lg ${s.id === studentProfile.uid ? "bg-blue-600 text-white font-bold" : "bg-slate-50 text-slate-700"}`}>
                    <span>#{index + 1} {s.displayName}</span>
                    <span>{s.points || 0} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-mono truncate">{studentProfile.email}</div>
      </div>
      {isSettingsOpen && <div onClick={() => setIsSettingsOpen(false)} className="fixed inset-0 bg-black/20 z-40 backdrop-blur-xs" />}

      {/* البار العلوي الكحلي الداكن */}
      <nav className="bg-[#0f172a] text-white px-6 py-4 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl font-black text-slate-900 shadow-sm">🎓</div>
            <span className="font-extrabold text-base md:text-lg">بوابة الطالب - لوحة المتابعة</span>
            
            <div className="hidden md:flex items-center gap-5 text-xs text-slate-300 font-bold mr-4">
              <button className="text-white border-b-2 border-blue-500 pb-1">الرئيسية</button>
              <button onClick={() => { setIsSettingsOpen(true); setMenuTab("my_courses"); }} className="hover:text-white transition">دوراتي</button>
              <button onClick={() => { setIsSettingsOpen(true); setMenuTab("leaderboard"); }} className="hover:text-white transition">لوحة الصدارة</button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setIsSettingsOpen(true); setMenuTab("profile"); }}
              className="bg-white text-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-slate-50 transition"
            >
              إعدادات حسابي والترتيب ⚙️
            </button>
            <button onClick={handleLogout} className="text-xs text-red-400 font-bold mr-1">خروج</button>
          </div>
        </div>
      </nav>

      {/* الترحيب ومستوى الإنجاز الخطّي */}
      <div className="max-w-7xl mx-auto px-4 mt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-lg font-bold text-slate-900">أهلاً {studentProfile.displayName}! مستواك التدريبي الحالي هو:</h2>
        <div className="w-full md:w-72 bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs flex items-center gap-3">
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }}></div>
          </div>
          <span className="text-xs font-black text-slate-600 font-mono">{overallProgress}% Complete</span>
        </div>
      </div>

      {/* مستطيل التنبيهات العاجلة */}
      {announcements.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-6">
          <div className="bg-white border border-amber-200 rounded-xl p-4 flex justify-between items-center shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="text-xl">🚨</span>
              <p className="text-xs md:text-sm font-medium text-slate-800"><span className="font-black text-red-600 ml-1">تنبيه هام:</span> {announcements[currentIndex].text}</p>
            </div>
            <button onClick={nextAnnouncement} className="text-xs font-bold text-slate-400 hover:text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg bg-slate-50 transition shrink-0">تجاهل الإعلان التالي &larr;</button>
          </div>
        </div>
      )}

      {/* الشبكة الأساسية */}
      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* منصة التتويج */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-xs flex flex-col justify-between h-full">
            <div>
              <h2 className="text-center font-black text-slate-800 text-sm md:text-base mb-8 flex items-center justify-center gap-1.5"><span>🏆</span> لوحة صدارة هذا الأسبوع (النخبة)</h2>
              <div className="flex items-end justify-center gap-3 pt-6 pb-4 max-w-xs mx-auto">
                {topThree[1] && (
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 shadow-2xs flex items-center justify-center text-lg mb-1">{topThree[1].avatar}</div>
                    <span className="text-xs font-extrabold text-slate-700 truncate max-w-[70px]">{topThree[1].displayName}</span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono mb-2">{topThree[1].points} pts</span>
                    <div className="w-full bg-[#cbd5e1] text-slate-700 h-16 rounded-t-lg flex items-center justify-center font-black text-sm">2</div>
                  </div>
                )}
                {topThree[0] && (
                  <div className="flex flex-col items-center flex-1 -mt-6">
                    <div className="w-14 h-14 rounded-full bg-amber-50 border-2 border-amber-400 shadow-xs flex items-center justify-center text-2xl mb-1 relative">{topThree[0].avatar}<span className="absolute -top-2 -right-1 text-xs">👑</span></div>
                    <span className="text-xs font-black text-slate-900 truncate max-w-[80px]">{topThree[0].displayName}</span>
                    <span className="text-[10px] font-black text-amber-600 font-mono mb-2">{topThree[0].points} pts</span>
                    <div className="w-full bg-[#f59e0b] text-white h-24 rounded-t-lg flex flex-col items-center justify-center font-black text-base">1</div>
                  </div>
                )}
                {topThree[2] && (
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-11 h-11 rounded-full bg-orange-50 border border-orange-200 shadow-2xs flex items-center justify-center text-lg mb-1">{topThree[2].avatar}</div>
                    <span className="text-xs font-extrabold text-slate-700 truncate max-w-[70px]">{topThree[2].displayName}</span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono mb-2">{topThree[2].points} pts</span>
                    <div className="w-full bg-[#d97706]/70 text-white h-12 rounded-t-lg flex items-center justify-center font-black text-sm">3</div>
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => { setIsSettingsOpen(true); setMenuTab("leaderboard"); }} className="w-full border border-slate-200 hover:bg-slate-50 font-bold py-2 px-4 rounded-xl text-xs text-slate-700 text-center transition mt-6 bg-white shadow-2xs">عرض لوحة الصدارة الكاملة</button>
          </div>
        </div>

        {/* الكورسات */}
        <div className="lg:col-span-2">
          <h2 className="text-base md:text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><span>📚</span> جميع الدورات التدريبية المتاحة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const isEnrolled = enrolledCourses.includes(course.id);
              const isAndroid = course.name?.toLowerCase().includes("android") || course.name?.toLowerCase().includes("kotlin");
              const isFlutter = course.name?.toLowerCase().includes("flutter");

              // قراءة التقييم الديناميكي من الفايرستور أو استخدام القيمة الافتراضية
              const courseRating = course.rating || 4.9;

              return (
                <div key={course.id} className="bg-white rounded-2xl border border-slate-200/60 shadow-2xs overflow-hidden flex flex-col justify-between p-4 hover:shadow-xs transition duration-200">
                  <div>
                    <div className={`w-full h-28 rounded-xl flex flex-col items-center justify-center text-white p-3 ${isAndroid ? "bg-[#022c22]" : isFlutter ? "bg-[#1e293b]" : "bg-[#1e1b4b]"}`}>
                      <span className="text-3xl mb-1">{isAndroid ? "🤖" : isFlutter ? "💙" : "💻"}</span>
                      <span className="font-black text-sm tracking-wide truncate max-w-full">{course.name}</span>
                    </div>
                    
                    {/* التقييم يظهر الآن من الخارج بشكل متناسق ومطابق تماماً لطلبكِ */}
                    <div className="flex justify-between items-center mt-3 text-[11px]">
                      <span className="text-amber-500 font-extrabold flex items-center gap-0.5">
                        ⭐ {courseRating}/5
                      </span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${isEnrolled ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                        {isEnrolled ? "مشترك متاح" : "تصفح متاح"}
                      </span>
                    </div>

                    <div className="mt-3 border-t border-slate-100 pt-2.5 space-y-1">
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full" style={{ width: isEnrolled ? "60%" : "0%" }}></div>
                      </div>
                    </div>
                    <div className="mt-3 text-[11px] text-slate-600 flex justify-between">
                      <span>المدرب: <span className="font-bold text-slate-800">{course.instructor}</span></span>
                      <span>المدة: <span className="font-bold text-slate-800">{course.duration}</span></span>
                    </div>
                  </div>
                  <Link to={`/course/${course.id}`} className={`w-full mt-4 font-bold py-2 px-4 rounded-xl text-xs text-center block transition ${isEnrolled ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"}`}>{isEnrolled ? "مواصلة التعلم" : "استكشاف الدورة"}</Link>
                </div>
              );
            })}
          </div>
        </div>

      </main>

      {/* الفوتر */}
      <footer className="max-w-7xl mx-auto px-4 mt-16 border-t border-slate-200 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400 font-medium">
        <span>منصة بوابة الطالب الحية</span>
        <div className="flex gap-4"><button className="hover:text-slate-600">اتصل بنا</button><button className="hover:text-slate-600">الشروط والأحكام</button></div>
        <button className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold text-[10px]">📱 تنزيل تطبيق الجوال</button>
      </footer>

    </div>
  );
}