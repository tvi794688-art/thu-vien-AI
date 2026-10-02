import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Book } from "@/types";
import { PageHeader, EmptyState, LoadingSpinner, Badge } from "@/components/UI";
import Modal from "@/components/Modal";
import { Search, Plus, Edit2, Trash2, BookMarked, Sparkles, Download } from "lucide-react";
import { getCoverColor, exportToCSV } from "@/lib/utils";
import { aiSummarizeBook } from "@/lib/ai";

const CATEGORIES = ["Công nghệ", "Kinh tế", "Tâm lý học", "Văn học", "Khoa học", "Lịch sử", "Tự lực", "Giáo dục", "Khác"];
const COVER_OPTIONS = ["blue", "green", "amber", "rose", "emerald", "violet", "cyan", "orange", "slate", "indigo"];
const PAGE_SIZE = 12;

export default function BooksPage() {
  const { profile } = useAuth();
  const isStaff = profile?.role === "admin" || profile?.role === "librarian";

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [summaryModal, setSummaryModal] = useState<{ book: Book; summary: string; loading: boolean } | null>(null);

  const [form, setForm] = useState({
    book_code: "",
    title: "",
    author: "",
    category: "Công nghệ",
    publisher: "",
    publish_year: "",
    isbn: "",
    quantity: "1",
    description: "",
    cover_color: "blue",
  });

  const loadBooks = useCallback(async () => {
    setLoading(true);

    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("books")
      .select("*", { count: "exact" })
      .neq("status", "archived")
      .order("created_at", { ascending: false });

    if (category !== "all") {
      query = query.eq("category", category);
    }

    if (statusFilter === "available") {
      query = query.gt("available", 0);
    }

    if (statusFilter === "borrowed") {
      query = query.eq("available", 0);
    }

    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      query = query.or(
        `title.ilike.%${trimmedSearch}%,author.ilike.%${trimmedSearch}%,book_code.ilike.%${trimmedSearch}%`
      );
    }

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      alert(`Không thể tải danh sách sách: ${error.message}`);
      setBooks([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setBooks((data || []) as Book[]);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [category, statusFilter, currentPage, search]);

  useEffect(() => { loadBooks(); }, [loadBooks]);

  const filtered = books;

  async function openAdd() {
    setEditing(null);

    const { data, error } = await supabase
      .from("books")
      .select("book_code")
      .order("book_code", { ascending: false })
      .limit(1);

    if (error) {
      alert(`Không thể tạo mã sách mới: ${error.message}`);
      return;
    }

    const lastCode = data?.[0]?.book_code || "BV000";
    const lastNumber = parseInt(lastCode.replace(/\D/g, ""), 10) || 0;
    const nextCode = `BV${String(lastNumber + 1).padStart(3, "0")}`;

    setForm({
      book_code: nextCode,
      title: "",
      author: "",
      category: "Công nghệ",
      publisher: "",
      publish_year: "",
      isbn: "",
      quantity: "1",
      description: "",
      cover_color: "blue",
    });

    setModalOpen(true);
  }

  function openEdit(book: Book) {
    setEditing(book);
    setForm({
      book_code: book.book_code,
      title: book.title,
      author: book.author,
      category: book.category,
      publisher: book.publisher || "",
      publish_year: book.publish_year?.toString() || "",
      isbn: book.isbn || "",
      quantity: book.quantity.toString(),
      description: book.description || "",
      cover_color: book.cover_color,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (saving) {
      return;
    }

    const quantity = Number(form.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      alert("Số lượng sách phải là số nguyên lớn hơn hoặc bằng 1.");
      return;
    }

    if (!form.book_code.trim()) {
      alert("Mã sách không được để trống.");
      return;
    }

    if (!form.title.trim()) {
      alert("Tên sách không được để trống.");
      return;
    }

    if (!form.author.trim()) {
      alert("Tác giả không được để trống.");
      return;
    }

    const payload = {
      book_code: form.book_code.trim(),
      title: form.title.trim(),
      author: form.author.trim(),
      category: form.category,
      publisher: form.publisher.trim() || null,
      publish_year: form.publish_year
        ? parseInt(form.publish_year)
        : null,
      isbn: form.isbn.trim() || null,
      quantity,
      description: form.description.trim() || null,
      cover_color: form.cover_color,
    };

    try {
      setSaving(true);
      let savedBookId: string | null = null;
      if (editing) {
        const borrowedCopies =
          editing.quantity - editing.available;

        if (quantity < borrowedCopies) {
          alert(
            `Không thể giảm tổng số lượng xuống ${quantity} vì hiện đang có ${borrowedCopies} bản được mượn.`
          );
          return;
        }

        const newAvailable =
          quantity - borrowedCopies;

        const { error } = await supabase
          .from("books")
          .update({
            ...payload,
            available: newAvailable,
          })
          .eq("id", editing.id);

        if (error) {
          throw error;
        }

        savedBookId = editing.id;

        alert("Cập nhật sách thành công.");
      } else {
        const { data: newBook, error } = await supabase
          .from("books")
          .insert({
            ...payload,
            available: quantity,
          })
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        savedBookId = newBook.id;

        alert("Thêm sách thành công.");
      }

      if (savedBookId) {
        const { error: embeddingError } =
          await supabase.functions.invoke("ai-library", {
            body: {
              action: "refresh_book_embedding",
              bookId: savedBookId,
            },
          });

        if (embeddingError) {
          console.error(
            "Không thể cập nhật embedding:",
            embeddingError,
          );
        }
      }

      setModalOpen(false);
      await loadBooks();
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Không thể lưu thông tin sách.";

      alert(`Lỗi: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(book: Book) {
    const confirmed = confirm(
      `Loại bỏ sách "${book.title}" khỏi danh sách?\n\n` +
      "Lịch sử mượn/trả và đặt trước sẽ được giữ lại."
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase.rpc("remove_book", {
      p_book_id: book.id,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Đã lưu trữ sách thành công.");
    await loadBooks();
  }

  async function handleSummary(book: Book) {
    setSummaryModal({ book, summary: "", loading: true });
    try {
      const res = await aiSummarizeBook(book.id);
      setSummaryModal({ book, summary: res.response, loading: false });
    } catch (err: any) {
      setSummaryModal({ book, summary: `Lỗi: ${err.message}`, loading: false });
    }
  }

  async function handleExport() {
    let query = supabase
      .from("books")
      .select("*")
      .neq("status", "archived")
      .order("created_at", { ascending: false });

    if (category !== "all") {
      query = query.eq("category", category);
    }

    if (statusFilter === "available") {
      query = query.gt("available", 0);
    }

    if (statusFilter === "borrowed") {
      query = query.eq("available", 0);
    }

    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      query = query.or(
        `title.ilike.%${trimmedSearch}%,author.ilike.%${trimmedSearch}%,book_code.ilike.%${trimmedSearch}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      alert(`Không thể xuất CSV: ${error.message}`);
      return;
    }

    const exportBooks = (data || []) as Book[];

    exportToCSV(
      "danh-sach-sach.csv",
      [
        "Mã sách",
        "Tên sách",
        "Tác giả",
        "Thể loại",
        "NXB",
        "Năm XB",
        "Tổng số",
        "Còn lại",
      ],
      exportBooks.map((b) => [
        b.book_code,
        b.title,
        b.author,
        b.category,
        b.publisher || "",
        b.publish_year || "",
        b.quantity,
        b.available,
      ])
    );
  }

  return (
    <div>
      <PageHeader
        title="Quản lý sách"
        subtitle={`${totalCount} đầu sách trong thư viện`}
        action={isStaff && (
          <div className="flex gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
              <Download className="w-4 h-4" /> Xuất CSV
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
              <Plus className="w-4 h-4" /> Thêm sách
            </button>
          </div>
        )}
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setCurrentPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Tìm theo tên, tác giả, mã sách..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <select value={category} onChange={(e) => {
          setCurrentPage(1);
          setCategory(e.target.value);
        }} className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">Tất cả thể loại</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => {
          setCurrentPage(1);
          setStatusFilter(e.target.value);
        }} className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">Tất cả trạng thái</option>
          <option value="available">Còn sách</option>
          <option value="borrowed">Đang mượn hết</option>
        </select>
      </div>

      {/* Book grid */}
      {loading ? (
        <LoadingSpinner label="Đang tải sách..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<BookMarked className="w-12 h-12" />} title="Không tìm thấy sách" description="Thử thay đổi bộ lọc hoặc từ khóa" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((book) => {
            const cc = getCoverColor(book.cover_color);
            const isAvailable = book.available > 0;
            return (
              <div key={book.id} className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-lg transition group">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-lg ${cc.bg} ${cc.text} flex items-center justify-center font-bold text-lg`}>
                    {book.title.charAt(0)}
                  </div>
                  <Badge color={isAvailable ? "green" : "red"}>
                    {isAvailable ? `Còn ${book.available}` : "Đã mượn hết"}
                  </Badge>
                </div>
                <h3 className="font-semibold text-slate-800 text-sm leading-snug mb-1 line-clamp-2">{book.title}</h3>
                <p className="text-xs text-slate-500 mb-2">{book.author}</p>
                <div className="flex items-center gap-2 mb-3">
                  <Badge color="blue">{book.category}</Badge>
                  <span className="text-xs text-slate-400">{book.book_code}</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">Số lượng: {book.quantity} • Còn: {book.available}</p>

                <div className="flex gap-1.5 pt-3 border-t border-slate-50">
                  <button onClick={() => handleSummary(book)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition">
                    <Sparkles className="w-3.5 h-3.5" /> Tóm tắt AI
                  </button>
                  {isStaff && (
                    <>
                      <button onClick={() => openEdit(book)} className="flex items-center justify-center w-8 h-8 text-slate-500 hover:bg-slate-100 rounded-lg transition">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(book)} className="flex items-center justify-center w-8 h-8 text-rose-500 hover:bg-rose-50 rounded-lg transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trang trước
          </button>

          <span className="text-sm text-slate-500">
            Trang {currentPage} / {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
          </span>

          <button
            type="button"
            onClick={() =>
              setCurrentPage((page) =>
                Math.min(Math.ceil(totalCount / PAGE_SIZE), page + 1)
              )
            }
            disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trang sau
          </button>
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Chỉnh sửa sách" : "Thêm sách mới"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Mã sách *</label>
              <input type="text" value={form.book_code} onChange={(e) => setForm({ ...form, book_code: e.target.value })} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Số lượng *</label>
              <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tên sách *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tác giả *</label>
            <input type="text" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Thể loại</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Năm xuất bản</label>
              <input type="number" value={form.publish_year} onChange={(e) => setForm({ ...form, publish_year: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nhà xuất bản</label>
              <input type="text" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">ISBN</label>
              <input type="text" value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Mô tả sách</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" placeholder="Mô tả ngắn về nội dung sách..." />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Màu bìa</label>
            <div className="flex gap-2 flex-wrap">
              {COVER_OPTIONS.map((c) => {
                const cc = getCoverColor(c);
                return (
                  <button key={c} type="button" onClick={() => setForm({ ...form, cover_color: c })} className={`w-8 h-8 rounded-lg ${cc.bg} border-2 ${form.cover_color === c ? "border-blue-500" : "border-transparent"} transition`} />
                );
              })}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Đang lưu..." : editing ? "Cập nhật" : "Thêm sách"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Summary modal */}
      <Modal isOpen={!!summaryModal} onClose={() => setSummaryModal(null)} title="AI Tóm tắt sách" size="md">
        {summaryModal && (
          <div>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
              <div className={`w-12 h-12 rounded-lg ${getCoverColor(summaryModal.book.cover_color).bg} ${getCoverColor(summaryModal.book.cover_color).text} flex items-center justify-center font-bold text-lg`}>
                {summaryModal.book.title.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{summaryModal.book.title}</h3>
                <p className="text-sm text-slate-500">{summaryModal.book.author}</p>
              </div>
            </div>
            {summaryModal.loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-slate-500">AI đang tóm tắt nội dung...</p>
                </div>
              </div>
            ) : (
              <div className="bg-violet-50 rounded-xl p-5">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{summaryModal.summary}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
