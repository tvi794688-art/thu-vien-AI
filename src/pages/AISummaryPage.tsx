import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { aiSummarizeBook } from "@/lib/ai";
import type { Book } from "@/types";
import { PageHeader, LoadingSpinner, EmptyState } from "@/components/UI";
import { Sparkles, Search, BookOpen } from "lucide-react";
import { getCoverColor } from "@/lib/utils";

export default function AISummaryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Book | null>(null);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("books").select("*").order("title");
      setBooks((data || []) as Book[]);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSummarize(book: Book) {
    setSelected(book);
    setSummaryLoading(true);
    setSummary("");
    try {
      const res = await aiSummarizeBook(book.id);
      setSummary(res.response);
    } catch (err: any) {
      setSummary(`Lỗi: ${err.message}`);
    }
    setSummaryLoading(false);
  }

  const filtered = books.filter((b) => {
    const q = search.toLowerCase();
    return !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
  });

  if (loading) return <LoadingSpinner label="Đang tải sách..." />;

  return (
    <div>
      <PageHeader title="AI Tóm tắt sách" subtitle="Chọn sách để AI tạo tóm tắt nội dung tự động" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Book list */}
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm sách..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filtered.length === 0 ? <EmptyState icon={<BookOpen className="w-10 h-10" />} title="Không tìm thấy sách" /> : (
              filtered.map((book) => {
                const cc = getCoverColor(book.cover_color);
                const isSelected = selected?.id === book.id;
                return (
                  <button key={book.id} onClick={() => handleSummarize(book)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                    isSelected ? "border-violet-300 bg-violet-50" : "border-slate-100 bg-white hover:bg-slate-50"
                  }`}>
                    <div className={`w-10 h-10 rounded-lg ${cc.bg} ${cc.text} flex items-center justify-center font-bold text-sm flex-shrink-0`}>{book.title.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{book.title}</p>
                      <p className="text-xs text-slate-500">{book.author} • {book.category}</p>
                    </div>
                    {isSelected && <Sparkles className="w-4 h-4 text-violet-500 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Summary display */}
        <div>
          {!selected ? (
            <div className="bg-white rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center text-center" style={{ minHeight: "400px" }}>
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-violet-500" />
              </div>
              <p className="text-slate-500 font-medium">Chọn một cuốn sách</p>
              <p className="text-sm text-slate-400 mt-1">AI sẽ tạo tóm tắt nội dung tự động</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-slate-100">
                <div className={`w-14 h-14 rounded-xl ${getCoverColor(selected.cover_color).bg} ${getCoverColor(selected.cover_color).text} flex items-center justify-center font-bold text-xl`}>
                  {selected.title.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{selected.title}</h3>
                  <p className="text-sm text-slate-500">{selected.author} • {selected.category}</p>
                </div>
              </div>

              {summaryLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm text-slate-500">AI đang đọc và tóm tắt...</p>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2">Tóm tắt AI</p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{summary}</p>
                    </div>
                  </div>
                </div>
              )}

              {selected.description && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Mô tả gốc</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{selected.description}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
