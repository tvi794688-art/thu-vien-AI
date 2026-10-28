import { useEffect, useState } from "react";
import { BookOpen, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { aiSummarizeBook } from "@/lib/ai";
import type { Book } from "@/types";
import { EmptyState, LoadingSpinner, PageHeader } from "@/components/UI";

export default function AIFastSummaryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Book | null>(null);
  const [summary, setSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    async function loadBooks() {
      try {
        const { data, error } = await supabase.from("books").select("*").order("title");
        if (error) throw error;
        setBooks((data || []) as Book[]);
      } catch (error: unknown) {
        setLoadError(error instanceof Error ? error.message : "Không thể tải danh sách sách.");
      } finally {
        setLoadingBooks(false);
      }
    }
    void loadBooks();
  }, []);

  async function summarize(book: Book) {
    setSelected(book);
    setSummary("");
    setLoadingSummary(true);
    try {
      const result = await aiSummarizeBook(book.id);
      setSummary(result.response);
    } catch (error: unknown) {
      setSummary(`Lỗi: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoadingSummary(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Tóm tắt nhanh sách" subtitle="Chọn một cuốn sách trong thư viện để nhận bản tóm tắt từ AI." />
      {loadingBooks ? <LoadingSpinner label="Đang tải danh sách sách..." /> : loadError ? (
        <div role="alert" className="rounded-2xl border border-terracotta-200 bg-terracotta-50 p-4 text-sm text-terracotta-700">{loadError}</div>
      ) : books.length === 0 ? (
        <EmptyState icon={<BookOpen className="w-10 h-10" />} title="Chưa có sách trong danh mục" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5 items-start">
          <div className="bg-white rounded-3xl border border-cream-300 p-4 shadow-warm max-h-[560px] overflow-y-auto space-y-2">
            {books.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => void summarize(book)}
                disabled={loadingSummary}
                className={`w-full text-left p-3.5 rounded-2xl border transition disabled:opacity-60 ${selected?.id === book.id ? "border-butter-400 bg-butter/15" : "border-cream-200 bg-cream-50/50 hover:bg-cream-100"}`}
              >
                <span className="block text-sm font-bold text-charcoal-900">{book.title}</span>
                <span className="block text-xs text-charcoal-500 mt-1">{book.author} · {book.category}</span>
              </button>
            ))}
          </div>
          <div className="bg-white rounded-3xl border border-cream-300 p-5 sm:p-6 shadow-warm min-h-64">
            {!selected ? (
              <div className="h-full min-h-52 flex flex-col items-center justify-center text-center">
                <BookOpen className="w-9 h-9 text-butter-700 mb-3" />
                <p className="text-sm font-bold text-charcoal-900">Chọn sách để bắt đầu</p>
                <p className="text-xs text-charcoal-500 mt-1">Kết quả tóm tắt sẽ hiển thị tại đây.</p>
              </div>
            ) : (
              <>
                <h3 className="font-serif font-bold text-lg text-charcoal-900">{selected.title}</h3>
                <p className="text-xs text-charcoal-500 mt-1 mb-4">{selected.author} · {selected.category}</p>
                {loadingSummary ? <LoadingSpinner label="AI đang tóm tắt nội dung..." /> : (
                  <div className="rounded-2xl border border-cream-300 bg-gradient-to-br from-cream-100 via-ivory to-cream-50 p-5 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-butter-700 shrink-0 mt-0.5" />
                    <p className="text-sm text-charcoal-900 leading-relaxed whitespace-pre-wrap">{summary}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
