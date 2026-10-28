import { useState, useRef, useEffect } from "react";
import { aiSearchBooks } from "@/lib/ai";
import type { ChatMessage } from "@/types";
import { Bot, Send, Sparkles, User } from "lucide-react";

const SUGGESTED_QUESTIONS = [
  "Tôi muốn tìm sách dễ đọc về trí tuệ nhân tạo cho người mới bắt đầu",
  "Có sách nào về lập trình Python không?",
  "Gợi ý sách về tâm lý học giao tiếp",
  "Sách về kinh tế và đầu tư phù hợp sinh viên",
  "Tìm sách văn học kinh điển",
];

export default function AIChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Xin chào! Tôi là trợ lý AI tra cứu sách. Bạn có thể hỏi tôi bằng ngôn ngữ tự nhiên, ví dụ: 'Tôi muốn tìm sách về trí tuệ nhân tạo cho người mới bắt đầu'. Tôi sẽ gợi ý sách phù hợp từ thư viện." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  async function handleSend(text?: string) {
    const query = text || input.trim();
    if (!query || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setLoading(true);

    try {
      const res = await aiSearchBooks(query, messages);
      setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [...prev, { role: "assistant", content: `Xin lỗi, đã có lỗi: ${message}. Vui lòng thử lại.` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-cream-100 via-butter-100/60 to-cream-200/50 border border-cream-300 rounded-3xl p-6 text-charcoal-900 mb-6 relative overflow-hidden shadow-warm">
        <div className="absolute top-0 right-0 w-60 h-60 bg-butter/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="w-13 h-13 p-3 bg-white border border-butter-300 rounded-2xl flex items-center justify-center text-butter-700 shadow-warm-xs">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-charcoal-900">AI Tra Cứu Sách Thông Minh</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-butter/25 text-charcoal-900 border border-butter-300">
                Gemini Pro
              </span>
            </div>
            <p className="text-sm text-charcoal-600 mt-1">Trợ lý thủ thư số hỏi đáp bằng ngôn ngữ tự nhiên và gợi ý tài liệu chính xác</p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="bg-white rounded-3xl border border-cream-300 shadow-warm flex flex-col overflow-hidden" style={{ height: "calc(100vh - 280px)", minHeight: "420px" }}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 bg-ivory/60">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-warm-xs ${
                msg.role === "user" ? "bg-butter border border-butter-300 text-charcoal-900" : "bg-white border border-cream-300 text-butter-700"
              }`}>
                {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-warm-xs ${
                msg.role === "user"
                  ? "bg-butter text-charcoal-900 font-semibold border border-butter-300"
                  : "bg-white border border-cream-300 text-charcoal-900"
              }`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-cream-300 text-butter-700 flex items-center justify-center flex-shrink-0 shadow-warm-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white border border-cream-300 rounded-2xl px-4 py-3 shadow-warm-xs flex items-center">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-butter-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-sage-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-cream-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suggested questions */}
        {messages.length <= 1 && (
          <div className="px-4 lg:px-6 py-3 border-t border-cream-200 bg-white">
            <p className="text-xs font-bold text-charcoal-600 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-butter-700" /> Gợi ý câu hỏi phổ biến:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-xs px-3.5 py-1.5 bg-cream-100 hover:bg-butter/25 text-charcoal-800 hover:text-charcoal-900 rounded-xl transition border border-cream-200 font-medium shadow-warm-xs"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-cream-200 p-4 bg-white">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi tìm kiếm hoặc nhờ AI tư vấn tài liệu..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-cream-50/60 border border-cream-300 rounded-xl text-sm focus:outline-none focus:border-butter focus:ring-2 focus:ring-butter/30 disabled:opacity-50 text-charcoal-900 placeholder-charcoal-400"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-5 py-2.5 bg-butter hover:bg-butter-400 border border-butter-300 text-charcoal-900 rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center gap-2 shadow-warm-sm hover:shadow-warm"
            >
              <Send className="w-4 h-4 text-charcoal-900" /> Gửi câu hỏi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
