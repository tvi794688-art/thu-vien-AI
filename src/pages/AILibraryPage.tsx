import { useState } from "react";
import { BookMarked, BookOpen, MessageCircle, Sparkles } from "lucide-react";
import AIChatPage from "@/pages/AIChatPage";
import AISummaryPage from "@/pages/AISummaryPage";
import AIRecommendPage from "@/pages/AIRecommendPage";
import AIFastSummaryPage from "@/pages/AIFastSummaryPage";

const FEATURES = [
  { id: "chat", title: "Tra cứu sách", description: "Hỏi đáp và tìm sách bằng ngôn ngữ tự nhiên.", icon: MessageCircle },
  { id: "summary", title: "Tóm tắt tác phẩm", description: "Chọn sách để AI phân tích nội dung.", icon: BookOpen },
  { id: "recommend", title: "Gợi ý cá nhân hóa", description: "Nhận đề xuất dựa trên lịch sử đọc.", icon: Sparkles },
  { id: "quick-summary", title: "Tóm tắt nhanh", description: "Chọn sách và xem bản tóm tắt ngay tại đây.", icon: BookOpen },
] as const;

type FeatureId = (typeof FEATURES)[number]["id"];

export default function AILibraryPage() {
  const [active, setActive] = useState<FeatureId>("chat");
  const [mounted, setMounted] = useState<Set<FeatureId>>(() => new Set(["chat"]));

  function selectFeature(feature: FeatureId) {
    setActive(feature);
    setMounted((previous) => new Set(previous).add(feature));
  }

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-cream-100 via-butter-100/60 to-cream-200/50 border border-cream-300 rounded-3xl p-5 sm:p-6 shadow-warm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white border border-butter-300 text-butter-700 shadow-warm-xs flex items-center justify-center">
            <BookMarked className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-charcoal-900">AI Thư viện</h2>
            <p className="text-sm text-charcoal-600 mt-0.5">Chọn công cụ AI phù hợp với nhu cầu của bạn.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3" role="tablist" aria-label="Chức năng AI thư viện">
        {FEATURES.map(({ id, title, description, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`ai-tab-${id}`}
            aria-selected={active === id}
            aria-controls={`ai-panel-${id}`}
            onClick={() => selectFeature(id)}
            className={`text-left p-4 rounded-2xl border transition shadow-warm-xs ${active === id
              ? "bg-butter/20 border-butter-400 text-charcoal-900"
              : "bg-white border-cream-300 text-charcoal-700 hover:bg-cream-100 hover:border-butter-300"}`}
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <Icon className="w-4 h-4 text-butter-700" />{title}
            </span>
            <span className="block text-xs text-charcoal-500 mt-1.5 leading-relaxed">{description}</span>
          </button>
        ))}
      </div>

      <section id="ai-panel-chat" role="tabpanel" aria-labelledby="ai-tab-chat" hidden={active !== "chat"}>
        {mounted.has("chat") && <AIChatPage />}
      </section>
      <section id="ai-panel-summary" role="tabpanel" aria-labelledby="ai-tab-summary" hidden={active !== "summary"}>
        {mounted.has("summary") && <AISummaryPage />}
      </section>
      <section id="ai-panel-recommend" role="tabpanel" aria-labelledby="ai-tab-recommend" hidden={active !== "recommend"}>
        {mounted.has("recommend") && <AIRecommendPage />}
      </section>
      <section id="ai-panel-quick-summary" role="tabpanel" aria-labelledby="ai-tab-quick-summary" hidden={active !== "quick-summary"}>
        {mounted.has("quick-summary") && <AIFastSummaryPage />}
      </section>
    </div>
  );
}
