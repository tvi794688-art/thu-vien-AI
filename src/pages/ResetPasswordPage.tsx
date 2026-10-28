import { useState } from "react";
import { Lock, Library } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setMessage("Đặt lại mật khẩu thành công.");
    setLoading(false);
  }

  async function goToLogin() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center p-4 relative overflow-hidden selection:bg-butter selection:text-charcoal-900">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-10 w-80 h-80 bg-butter-200/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-80 h-80 bg-cream-300/60 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-butter to-cream-200 border border-butter-400 rounded-2xl mb-4 shadow-warm-md">
            <Library className="w-8 h-8 text-charcoal-900" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
            Khôi Phục Mật Khẩu
          </h1>

          <p className="text-charcoal-500 mt-1 text-sm font-medium">
            Nhập mật khẩu mới cho tài khoản thư viện của bạn
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-warm-lg border border-cream-300 p-7 sm:p-8">
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">
                  Mật khẩu mới
                </label>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-ivory-200/50 border border-cream-300 rounded-xl focus:outline-none focus:border-butter-500 focus:ring-2 focus:ring-butter/20 text-charcoal-900 text-sm transition placeholder:text-charcoal-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">
                  Xác nhận mật khẩu
                </label>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-ivory-200/50 border border-cream-300 rounded-xl focus:outline-none focus:border-butter-500 focus:ring-2 focus:ring-butter/20 text-charcoal-900 text-sm transition placeholder:text-charcoal-400"
                  />
                </div>
              </div>

              {message && (
                <div className="text-xs rounded-xl px-4 py-2.5 font-medium bg-terracotta-50 text-terracotta-700 border border-terracotta-200">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-butter hover:bg-butter-400 text-charcoal-900 font-extrabold py-3 rounded-xl transition flex items-center justify-center disabled:opacity-50 shadow-warm-xs text-sm border border-butter-400"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-charcoal-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Đổi mật khẩu"
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-xs rounded-xl px-4 py-3 font-medium bg-sage-100 text-sage-900 border border-sage-300 text-center">
                {message}
              </div>

              <button
                type="button"
                onClick={goToLogin}
                className="w-full bg-butter hover:bg-butter-400 text-charcoal-900 font-extrabold py-3 rounded-xl transition shadow-warm-xs text-sm border border-butter-400"
              >
                Quay lại đăng nhập
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}