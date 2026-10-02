import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, Library, User, Lock, Mail, UserPlus, LogIn } from "lucide-react";

export default function LoginPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <Library className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Hệ thống quản lý thư viện</h1>
          <p className="text-slate-400 mt-1 text-sm">Tích hợp AI tra cứu, tóm tắt và gợi ý sách</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === "signin" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                }`}
            >
              <LogIn className="w-4 h-4" /> Đăng nhập
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === "signup" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                }`}
            >
              <UserPlus className="w-4 h-4" /> Đăng ký
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Họ và tên</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {mode === "signin" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  Quên mật khẩu?
                </button>
              </div>
            )}

            {mode === "signup" && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Loại độc giả</label>
                <select
                  value={readerType}
                  onChange={(e) =>
                    setReaderType(
                      e.target.value as "student" | "teacher" | "staff" | "guest"
                    )
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="student">Học sinh</option>
                  <option value="teacher">Giáo viên</option>
                  <option value="staff">Nhân viên</option>
                  <option value="guest">Khách</option>
                </select>
              </div>
            )}

            {error && (
              <div className={`text-sm rounded-lg px-4 py-2.5 ${error.includes("thành công") || error.includes("Đã gửi email")
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === "signin" ? (
                <><LogIn className="w-4 h-4" /> Đăng nhập</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Tạo tài khoản</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-start gap-2 text-xs text-slate-500">
              <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>Tài khoản thủ thư/quản trị có thể quản lý sách, độc giả, phiếu mượn. Tài khoản độc giả có thể tra cứu, đặt trước và dùng AI gợi ý sách.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
