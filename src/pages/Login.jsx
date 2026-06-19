import React, { useState } from "react";
import { auth, db } from "../config/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsSuccess(false);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocSnap = await getDoc(doc(db, "users", user.uid));

      if (userDocSnap.exists() && userDocSnap.data().role === "admin") {
        navigate("/admin");
      } else {
        navigate("/student");
      }
    } catch (error) {
      console.error(error);
      setMessage("❌ البريد الإلكتروني أو كلمة المرور غير صحيحة.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsSuccess(false);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "student",
        createdAt: new Date()
      });

      setIsSuccess(true);
      setMessage("🎉 تم إنشاء حسابك كطالب بنجاح! جاري توجيهك...");
      
      setTimeout(() => {
        navigate("/student");
      }, 2000);

    } catch (error) {
      console.error(error);
      if (error.code === "auth/email-already-in-use") {
        setMessage("⚠️ هذا البريد الإلكتروني مستخدم بالفعل.");
      } else if (error.code === "auth/weak-password") {
        setMessage("⚠️ يجب أن تكون كلمة المرور من 6 خانات أو أكثر.");
      } else {
        setMessage("❌ حدث خطأ أثناء إنشاء الحساب.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 md:p-8" dir="rtl">
      
      {/* الحاوية الرئيسية الكبرى بتأثيرات الـ UI الحديثة */}
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[550px] border border-slate-100">
        
        {/* 🎨 الجانب الأيمن: اللوحة التحفيزية الفخمة (تختفي على الشاشات الصغيرة جداً لتناسق الـ Mobile) */}
        <div className="bg-[#0f172a] text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* تأثير دوائر الخلفية الفنية */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-600/20 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl shadow-inner font-black mb-6">🎓</div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wide leading-tight">منصتك التعليمية الذكية</h1>
            <p className="text-slate-400 text-xs md:text-sm mt-3 leading-relaxed">
              مكانك الأنسب لاستكشاف الخرائط البرمجية المتقدمة، وتطوير مهاراتك، والوصول إلى لوحة الشرف للأوائل!
            </p>
          </div>

          <div className="relative z-10 mt-8 pt-6 border-t border-white/10 text-[11px] text-slate-400 font-medium">
            <p>⚡ انضم إلينا اليوم وابدأ رحلة الطحن البرمجي الفعلي.</p>
          </div>
        </div>

        {/* 🔐 الجانب الأيسر: صندوق نماذج الدخول والتسجيل التفاعلي */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
          
          <div className="mb-6">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 transition-all">
              {isSignUp ? "إنشاء حساب طالب جديد" : "تسجيل الدخول للمنصة"}
            </h2>
            <p className="text-slate-400 text-xs mt-1.5 font-medium">
              {isSignUp ? "يرجى ملء البيانات للانضمام الفوري كطالب" : "أهلاً بك مجدداً، أدخل بياناتك للمتابعة"}
            </p>
          </div>

          {/* رسائل الخطأ أو النجاح المصممة بعناية */}
          {message && (
            <div className={`p-3 rounded-xl text-xs font-bold mb-4 text-center border ${
              isSuccess ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-600 border-red-100"
            }`}>
              {message}
            </div>
          )}

          {/* الفورم التفاعلي */}
          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full p-3 border border-slate-200 bg-slate-50/50 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition duration-150"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 border border-slate-200 bg-slate-50/50 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition duration-150"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white p-3 rounded-xl text-xs font-bold hover:bg-blue-700 transition duration-150 shadow-md shadow-blue-600/10 disabled:bg-blue-400 cursor-pointer mt-2"
            >
              {loading ? "جاري معالجة طلبك الحين..." : isSignUp ? "تأكيد وإنشاء حساب الطالب" : "تسجيل الدخول"}
            </button>
          </form>

          {/* روابط التبديل السفلية التفاعلية */}
          <div className="mt-8 text-center border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500 font-medium">
              {isSignUp ? "لديك حساب مسجل بالفعل؟" : "هل أنت طالب جديد في المنصة؟"}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setMessage("");
                }}
                className="text-blue-600 font-black hover:underline mr-1.5 focus:outline-none cursor-pointer"
              >
                {isSignUp ? "سجل دخولك من هنا" : "أنشئ حسابك كطالب الآن"}
              </button>
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}