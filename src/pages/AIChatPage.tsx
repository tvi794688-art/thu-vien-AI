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
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Xin lỗi, đã có lỗi: ${err.message}. Vui lòng thử lại.` }]);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl p-6 text-white mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">AI Tra cứu sách</h1>
            <p className="text-sm text-violet-100">Hỏi bằng ngôn ngữ tự nhiên, AI gợi ý sách phù hợp</p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="bg-white rounded-2xl border border-slate-100 flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                msg.role === "user" ? "bg-blue-100 text-blue-600" : "bg-violet-100 text-violet-600"
              }`}>
                {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
              }`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-slate-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suggested questions */}
        {messages.length <= 1 && (
          <div className="px-4 lg:px-6 pb-3">
            <p className="text-xs text-slate-400 mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Gợi ý câu hỏi:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button key={q} onClick={() => handleSend(q)} className="text-xs px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-full transition border border-violet-100">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-100 p-4">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi về sách..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
            />
            <button type="submit" disabled={loading || !input.trim()} className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-2">
              <Send className="w-4 h-4" /> Gửi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
