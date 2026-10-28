import { useState } from "react";
import { aiRecommendBooks } from "@/lib/ai";
import { PageHeader } from "@/components/UI";
import { Sparkles, RefreshCw, BookHeart } from "lucide-react";

export default function AIRecommendPage() {
  const [recommendation, setRecommendation] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);

  async function handleRecommend() {
    setLoading(true);
    setHasResult(true);
    try {
      const res = await aiRecommendBooks();
      setRecommendation(res.response);
    } catch (err: unknown) {
      setRecommendation(`Lỗi: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="AI Đề Xuất Cá Nhân Hóa" subtitle="Phân tích sở thích đọc và lộ trình học tập để gợi ý tác phẩm giá trị nhất cho bạn" />

      <div className="max-w-3xl mx-auto">
        {!hasResult ? (
          <div className="bg-white rounded-3xl border border-cream-300 p-8 lg:p-14 text-center shadow-warm">
            <div className="w-20 h-20 bg-cream-100 border border-cream-300 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-warm-xs text-butter-700">
              <BookHeart className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-extrabold text-charcoal-900 mb-2.5 tracking-tight">Bộ Sưu Tập Tuyển Chọn Thông Minh</h2>
            <p className="text-sm text-charcoal-600 max-w-md mx-auto mb-8 leading-relaxed">
              Trợ lý Gemini AI sẽ phân tích lịch sử đọc sách của bạn (đã được ẩn danh thông tin cá nhân) để đề xuất những cuốn sách phù hợp nhất với phong cách và chuyên ngành của bạn.
            </p>
            <button
              onClick={handleRecommend}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-butter hover:bg-butter-400 border border-butter-300 text-charcoal-900 rounded-xl text-sm font-bold transition shadow-warm-sm hover:shadow-warm hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-5 h-5 text-charcoal-900" /> Khám phá đề xuất ngay
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={handleRecommend}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-cream-300 rounded-xl text-xs font-bold text-charcoal-800 hover:bg-cream-100 transition disabled:opacity-50 shadow-warm-xs"
              >
                <RefreshCw className={`w-4 h-4 text-butter-700 ${loading ? "animate-spin" : ""}`} /> Làm mới danh sách gợi ý
              </button>
            </div>
            <div className="bg-white rounded-3xl border border-cream-300 p-6 lg:p-8 shadow-warm">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-12 h-12 border-3 border-butter-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm font-bold text-charcoal-800">AI đang tổng hợp và phân tích danh mục sách phù hợp...</p>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-cream-100 via-ivory to-cream-50 rounded-2xl p-6 border border-cream-300 shadow-warm-xs">
                  <div className="flex items-start gap-3.5">
                    <Sparkles className="w-6 h-6 text-butter-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-charcoal-700 uppercase tracking-widest mb-3">
                        Danh Mục Sách Đề Xuất Cho Bạn (Curated Shelf)
                      </p>
                      <p className="text-sm text-charcoal-900 leading-relaxed whitespace-pre-wrap">{recommendation}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
