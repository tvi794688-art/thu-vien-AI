import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, Library, User, Lock, Mail, UserPlus, LogIn, ArrowLeft } from "lucide-react";

interface LoginPageProps {
  onBackToLanding?: () => void;
}

export default function LoginPage({ onBackToLanding }: LoginPageProps) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [readerType, setReaderType] = useState<
    "student" | "teacher" | "staff" | "guest"
  >("student");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleForgotPassword() {
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Vui lòng nhập email trước.");
      return;
    }

    setLoading(true);

    const { error } = await resetPassword(trimmedEmail);

    if (error) {
      setError(error);
    } else {
      setError("Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.");
    }

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Vui lòng nhập email.");
      setLoading(false);
      return;
    }

    if (mode === "signin") {
      const { error } = await signIn(trimmedEmail, password);
      if (error) setError(error);
    } else {
      if (password.length < 6) {
        setError("Mật khẩu phải có ít nhất 6 ký tự");
        setLoading(false);
        return;
      }

      if (!fullName.trim()) {
        setError("Vui lòng nhập họ và tên");
        setLoading(false);
        return;
      }

      const { error } = await signUp(
        trimmedEmail,
        password,
        fullName.trim(),
        readerType
      );

      if (error) setError(error);
      else setError("Tạo tài khoản thành công! Vui lòng đăng nhập.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center p-4 relative overflow-hidden selection:bg-butter selection:text-charcoal-900">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-10 w-80 h-80 bg-butter-200/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-80 h-80 bg-cream-300/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-60 h-60 bg-sage-200/30 rounded-full blur-3xl pointer-events-none" />

      {onBackToLanding && (
        <button
          onClick={onBackToLanding}
          className="absolute top-6 left-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 hover:bg-cream-100 text-charcoal-700 hover:text-charcoal-900 border border-cream-300 text-sm font-semibold transition-all backdrop-blur-md shadow-warm-xs"
        >
          <ArrowLeft className="w-4 h-4 text-butter-700" />
          <span>Về trang chủ</span>
        </button>
      )}

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-butter to-cream-200 border border-butter-400 rounded-2xl mb-3 shadow-warm-md">
            <Library className="w-8 h-8 text-charcoal-900" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">SmartLib AI</h1>
          <p className="text-charcoal-500 mt-1 text-sm font-medium">Hệ thống Thư viện Hàn lâm & Trợ lý Trí tuệ Nhân tạo</p>
        </div>

        <div className="bg-white rounded-3xl shadow-warm-lg border border-cream-300 p-7 sm:p-8">
          <div className="flex gap-2 mb-6 p-1 bg-ivory-200 rounded-2xl border border-cream-200">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                mode === "signin"
                  ? "bg-butter text-charcoal-900 shadow-warm-xs border border-butter-400/60"
                  : "text-charcoal-600 hover:text-charcoal-900 hover:bg-cream-100"
              }`}
            >
              <LogIn className="w-4 h-4" /> Đăng nhập
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                mode === "signup"
                  ? "bg-butter text-charcoal-900 shadow-warm-xs border border-butter-400/60"
                  : "text-charcoal-600 hover:text-charcoal-900 hover:bg-cream-100"
              }`}
            >
              <UserPlus className="w-4 h-4" /> Đăng ký
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Họ và tên</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-10 pr-4 py-2.5 bg-ivory-200/50 border border-cream-300 rounded-xl focus:outline-none focus:border-butter-500 focus:ring-2 focus:ring-butter/20 text-charcoal-900 text-sm transition placeholder:text-charcoal-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-ivory-200/50 border border-cream-300 rounded-xl focus:outline-none focus:border-butter-500 focus:ring-2 focus:ring-butter/20 text-charcoal-900 text-sm transition placeholder:text-charcoal-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-ivory-200/50 border border-cream-300 rounded-xl focus:outline-none focus:border-butter-500 focus:ring-2 focus:ring-butter/20 text-charcoal-900 text-sm transition placeholder:text-charcoal-400"
                />
              </div>
            </div>

            {mode === "signin" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-xs text-charcoal-600 hover:text-charcoal-950 font-bold disabled:opacity-50 transition-colors"
                >
                  Quên mật khẩu?
                </button>
              </div>
            )}

            {mode === "signup" && (
              <div>
                <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Phân loại độc giả</label>
                <select
                  value={readerType}
                  onChange={(e) =>
                    setReaderType(
                      e.target.value as "student" | "teacher" | "staff" | "guest"
                    )
                  }
                  className="w-full px-4 py-2.5 bg-ivory-200/50 border border-cream-300 rounded-xl focus:outline-none focus:border-butter-500 text-charcoal-900 text-sm transition font-medium"
                >
                  <option value="student">Học sinh / Sinh viên</option>
                  <option value="teacher">Giáo viên / Giảng viên</option>
                  <option value="staff">Cán bộ / Nhân viên</option>
                  <option value="guest">Khách vãng lai</option>
                </select>
              </div>
            )}

            {error && (
              <div className={`text-xs rounded-xl px-4 py-2.5 font-medium ${
                error.includes("thành công") || error.includes("Đã gửi email")
                  ? "bg-sage-100 text-sage-900 border border-sage-300"
                  : "bg-terracotta-50 text-terracotta-700 border border-terracotta-200"
              }`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-butter hover:bg-butter-400 text-charcoal-900 font-extrabold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-warm-xs text-sm border border-butter-400"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-charcoal-900 border-t-transparent rounded-full animate-spin" />
              ) : mode === "signin" ? (
                <><LogIn className="w-4 h-4" /> Đăng nhập hệ thống</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Hoàn tất đăng ký</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-cream-200">
            <div className="flex items-start gap-2.5 text-xs text-charcoal-500 leading-relaxed bg-cream-100/70 p-3 rounded-xl border border-cream-200/80">
              <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0 text-butter-700" />
              <p>Tài khoản thủ thư/quản trị quản lý toàn diện thư viện. Tài khoản độc giả có thể tra cứu, đặt giữ chỗ sách FIFO và sử dụng trợ lý Gemini AI.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
