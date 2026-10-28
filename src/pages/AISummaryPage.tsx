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
    } catch (err: unknown) {
      setSummary(`Lỗi: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSummaryLoading(false);
    }
  }

  const filtered = books.filter((b) => {
    const q = search.toLowerCase();
    return !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
  });

  if (loading) return <LoadingSpinner label="Đang tải sách..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="AI Tóm Tắt Tác Phẩm" subtitle="Chọn bất kỳ đầu sách nào để Trợ lý Gemini AI trích xuất nội dung cốt lõi trong 3 giây" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Book list */}
        <div className="bg-white rounded-3xl border border-cream-300 p-5 lg:p-6 shadow-warm">
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên tác phẩm, tác giả..."
              className="w-full pl-10 pr-4 py-2.5 bg-cream-50/60 border border-cream-300 rounded-xl text-sm focus:outline-none focus:border-butter focus:ring-2 focus:ring-butter/30 text-charcoal-900 placeholder-charcoal-400"
            />
          </div>
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <EmptyState icon={<BookOpen className="w-10 h-10 text-sage-400" />} title="Không tìm thấy cuốn sách nào" description="Thử tìm kiếm với từ khóa khác" />
            ) : (
              filtered.map((book) => {
                const isSelected = selected?.id === book.id;
                return (
                  <button
                    key={book.id}
                    onClick={() => handleSummarize(book)}
                    className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left ${
                      isSelected
                        ? "border-butter-400 bg-butter/15 shadow-warm-xs"
                        : "border-cream-200 bg-cream-50/50 hover:bg-cream-100 hover:border-cream-300"
                    }`}
                  >
                    <div className={`w-10 h-14 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-warm-xs overflow-hidden border ${
                      isSelected ? "border-butter-400 bg-cream-100 text-charcoal-900" : "bg-cream-100 text-charcoal-800 border-cream-200"
                    }`}>
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        book.title.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-charcoal-900 truncate">{book.title}</p>
                      <p className="text-xs text-charcoal-500 mt-0.5">{book.author} • <span className="font-semibold text-charcoal-800">{book.category}</span></p>
                    </div>
                    {isSelected ? (
                      <Sparkles className="w-4 h-4 text-butter-700 flex-shrink-0" />
                    ) : (
                      <BookOpen className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Summary display */}
        <div>
          {!selected ? (
            <div className="bg-white rounded-3xl border border-cream-300 p-8 flex flex-col items-center justify-center text-center shadow-warm" style={{ minHeight: "420px" }}>
              <div className="w-16 h-16 bg-cream-100 border border-cream-300 rounded-2xl flex items-center justify-center mb-4 shadow-warm-xs text-butter-700">
                <Sparkles className="w-8 h-8" />
              </div>
              <p className="text-charcoal-900 font-bold text-lg">Chọn một tác phẩm từ danh sách</p>
              <p className="text-xs text-charcoal-500 mt-1.5 max-w-xs leading-relaxed">Trợ lý Gemini AI sẽ phân tích và lập bản tóm tắt nội dung học thuật cho bạn</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-cream-300 p-6 shadow-warm sticky top-24">
              <div className="flex items-center gap-3.5 mb-5 pb-5 border-b border-cream-200">
                <div className="w-14 h-20 rounded-xl bg-cream-100 border border-cream-300 text-charcoal-900 flex items-center justify-center font-extrabold text-xl shadow-warm-xs overflow-hidden flex-shrink-0">
                  {selected.cover_url ? (
                    <img src={selected.cover_url} alt={selected.title} className="w-full h-full object-cover" />
                  ) : (
                    selected.title.charAt(0)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-charcoal-900 text-base sm:text-lg truncate">{selected.title}</h3>
                  <p className="text-xs text-charcoal-500 mt-0.5">{selected.author} • <span className="font-semibold text-charcoal-800">{selected.category}</span></p>
                </div>
              </div>

              {summaryLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-10 h-10 border-2 border-butter-500 border-t-transparent rounded-full animate-spin mb-3.5" />
                  <p className="text-xs font-bold text-charcoal-800">AI đang phân tích và trích xuất tinh hoa tác phẩm...</p>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-cream-100 via-ivory to-cream-50 rounded-2xl p-5 sm:p-6 border border-cream-300 shadow-warm-xs">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-butter-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-charcoal-700 uppercase tracking-widest mb-2.5">
                        Bản Tóm Tắt Tác Phẩm (AI Monograph)
                      </p>
                      <p className="text-sm text-charcoal-900 leading-relaxed whitespace-pre-wrap">{summary}</p>
                    </div>
                  </div>
                </div>
              )}

              {selected.description && (
                <div className="mt-5 pt-4 border-t border-cream-200">
                  <p className="text-xs font-bold text-charcoal-600 uppercase tracking-wider mb-2">Mô tả xuất bản gốc</p>
                  <p className="text-xs text-charcoal-600 leading-relaxed">{selected.description}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
