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
    }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader title="AI Gợi ý sách" subtitle="Gợi ý sách cá nhân hóa dựa trên thể loại, tác giả và lịch sử mượn" />

      <div className="max-w-3xl mx-auto">
        {!hasResult ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 lg:p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-500/20">
              <BookHeart className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Gợi ý sách thông minh</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              AI sẽ phân tích lịch sử mượn sách của bạn (đã ẩn danh thông tin cá nhân) và gợi ý những cuốn sách phù hợp với sở thích của bạn.
            </p>
            <button onClick={handleRecommend} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-violet-500/20">
              <Sparkles className="w-5 h-5" /> Nhận gợi ý sách
            </button>
          </div>
        ) : (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={handleRecommend} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Làm mới gợi ý
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:p-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-12 h-12 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-slate-500">AI đang phân tích và gợi ý sách...</p>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-6 h-6 text-violet-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-3">Gợi ý từ AI</p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{recommendation}</p>
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
