import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Book } from "@/types";
import { PageHeader, EmptyState, LoadingSpinner, Badge } from "@/components/UI";
import Modal from "@/components/Modal";
import { Search, Plus, Edit2, Trash2, BookMarked, Sparkles, Download, Upload, Image, X, Eye } from "lucide-react";
import { getCoverColor, exportToCSV } from "@/lib/utils";
import { aiSummarizeBook } from "@/lib/ai";

const CATEGORIES = ["Công nghệ", "Kinh tế", "Tâm lý học", "Văn học", "Khoa học", "Lịch sử", "Tự lực", "Giáo dục", "Khác"];
const COVER_OPTIONS = ["blue", "green", "amber", "rose", "emerald", "violet", "cyan", "orange", "slate", "indigo"];
const PRESET_COVERS = [
  { label: "Đề thi Công nghệ 3", url: "/covers/kiem-tra-ky-nang-3.png" },
  { label: "Lập trình & Cuộc sống", url: "/covers/lap-trinh-va-cuoc-song.png" },
  { label: "Kiểm thử Web", url: "/covers/kiem-thu-ung-dung-web.png" },
  { label: "Công nghệ 4", url: "/covers/sach-kiem-thu-batch-4.png" },
];
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
  const [detail, setDetail] = useState<{ book: Book | null; loading: boolean; error: string | null } | null>(null);
  const [requestBook, setRequestBook] = useState<Book | null>(null);
  const [requestDate, setRequestDate] = useState("");
  const [requestSaving, setRequestSaving] = useState(false);
  const [requestNotice, setRequestNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    cover_url: "",
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
      cover_url: "",
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
      cover_url: book.cover_url || "",
    });
    setModalOpen(true);
  }

  function handleCoverFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setForm((prev) => ({ ...prev, cover_url: event.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
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
      cover_url: form.cover_url.trim() || null,
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSummaryModal({ book, summary: `Lỗi: ${message}`, loading: false });
    }
  }

  async function handleViewDetails(book: Book) {
    setDetail({ book: null, loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", book.id)
        .maybeSingle();

      if (error) {
        setDetail({ book: null, loading: false, error: `Không thể tải thông tin sách: ${error.message}` });
        return;
      }
      if (!data) {
        setDetail({ book: null, loading: false, error: "Không tìm thấy sách hoặc bạn không có quyền xem sách này." });
        return;
      }
      setDetail({ book: data as Book, loading: false, error: null });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Lỗi kết nối không xác định.";
      setDetail({ book: null, loading: false, error: `Không thể tải thông tin sách: ${message}` });
    }
  }

  function detailValue(value: string | number | null | undefined) {
    return value === null || value === undefined || value === "" ? "Chưa cập nhật" : value;
  }

  async function submitBorrowRequest() {
    if (!requestBook || profile?.role !== "reader" || requestSaving) return;
    setRequestSaving(true);
    setRequestNotice(null);
    try {
      const { error } = await supabase.rpc("submit_loan_request", {
        p_book_id: requestBook.id,
        p_expected_borrow_date: requestDate || null,
      });
      if (error) throw error;
      setRequestNotice({ type: "success", text: `Yêu cầu mượn “${requestBook.title}” đã được gửi và đang chờ Thủ thư phê duyệt.` });
      setRequestBook(null);
      setRequestDate("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Không thể gửi yêu cầu mượn.";
      setRequestNotice({ type: "error", text: message });
    } finally {
      setRequestSaving(false);
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
    <div className="space-y-6">
      <PageHeader
        title="Quản Lý Kho Sách"
        subtitle={`Hiện có ${totalCount} đầu sách & giáo trình được lưu trữ`}
        action={isStaff && (
          <div className="flex gap-2.5">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-cream-300 rounded-xl text-xs font-bold text-charcoal-800 hover:bg-cream-100 transition shadow-warm-xs"
            >
              <Download className="w-4 h-4 text-charcoal-700" /> Xuất danh sách CSV
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-butter hover:bg-butter-400 text-charcoal-900 border border-butter-300 rounded-xl text-xs font-bold transition shadow-warm-sm hover:shadow-warm"
            >
              <Plus className="w-4 h-4 text-charcoal-900" /> Thêm sách mới
            </button>
          </div>
        )}
      />

      {requestNotice && <div role={requestNotice.type === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${requestNotice.type === "error" ? "border-terracotta-200 bg-terracotta-50 text-terracotta-700" : "border-sage-300 bg-sage-50 text-sage-900"}`}>{requestNotice.text}<button type="button" onClick={() => setRequestNotice(null)} className="ml-3 underline">Đóng</button></div>}

      {/* Filters */}
      <div className="bg-white rounded-3xl border border-cream-300 p-4 lg:p-5 shadow-warm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setCurrentPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Tìm theo tên tác phẩm, tác giả, mã định danh ISBN..."
            className="w-full pl-10 pr-4 py-2.5 bg-cream-50/60 border border-cream-300 rounded-xl focus:outline-none focus:border-butter focus:ring-2 focus:ring-butter/30 text-sm text-charcoal-900 placeholder-charcoal-400"
          />
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCurrentPage(1);
            setCategory(e.target.value);
          }}
          className="px-4 py-2.5 bg-cream-50/60 border border-cream-300 rounded-xl text-sm focus:outline-none focus:border-butter text-charcoal-900 font-medium"
        >
          <option value="all">Tất cả thể loại</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setCurrentPage(1);
            setStatusFilter(e.target.value);
          }}
          className="px-4 py-2.5 bg-cream-50/60 border border-cream-300 rounded-xl text-sm focus:outline-none focus:border-butter text-charcoal-900 font-medium"
        >
          <option value="all">Tất cả trạng thái kho</option>
          <option value="available">Còn sách trong kho</option>
          <option value="borrowed">Đang mượn hết</option>
        </select>
      </div>

      {/* Book grid */}
      {loading ? (
        <LoadingSpinner label="Đang tải danh mục sách..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<BookMarked className="w-12 h-12 text-sage-500" />} title="Không tìm thấy cuốn sách nào" description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((book) => {
            const isAvailable = book.available > 0;
            return (
              <div key={book.id} className="bg-white rounded-3xl border border-cream-300 p-4 lg:p-5 hover:border-butter-400 shadow-warm hover:shadow-warm-md transition-all flex flex-col justify-between group">
                <div>
                  {/* Book Cover Showcase */}
                  <div className="relative w-full h-56 bg-gradient-to-b from-cream-100 via-ivory to-cream-50 rounded-2xl overflow-hidden mb-4 flex items-center justify-center p-3 border border-cream-200 shadow-inner group-hover:shadow-warm transition">
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="h-full w-auto max-w-full object-contain rounded-lg shadow-warm transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className={`w-32 h-44 rounded-xl ${getCoverColor(book.cover_color).bg} ${getCoverColor(book.cover_color).text} flex flex-col items-center justify-center p-3 text-center shadow-warm border border-black/10 transition-transform duration-300 group-hover:scale-105 relative overflow-hidden`}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/15 border-r border-white/20" />
                        <BookMarked className="w-8 h-8 mb-2 opacity-80" />
                        <span className="font-serif font-bold text-xs line-clamp-3 leading-tight opacity-95 pl-1">{book.title}</span>
                        <span className="text-[10px] opacity-75 mt-1 pl-1 line-clamp-1">{book.author}</span>
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5">
                      <Badge color={isAvailable ? "sage" : "terracotta"}>
                        {isAvailable ? `Còn ${book.available} cuốn` : "Hết sách"}
                      </Badge>
                    </div>
                  </div>

                  <h3 className="font-serif font-bold text-charcoal-900 text-sm leading-snug mb-1 line-clamp-2 min-h-[2.5rem] group-hover:text-butter-700 transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-xs text-charcoal-500 font-medium mb-2.5 line-clamp-1">Tác giả: {book.author}</p>
                  <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <Badge color="sage">{book.category}</Badge>
                    <span className="text-[11px] font-mono text-charcoal-500 font-semibold">{book.book_code}</span>
                  </div>
                  <p className="text-xs text-charcoal-600 mb-3 font-medium">Tổng kho: {book.quantity} • Khả dụng: {book.available}</p>
                </div>

                <div className="flex gap-2 pt-3 border-t border-cream-200">
                  {profile?.role === "reader" && <button
                    type="button"
                    onClick={() => { setRequestNotice(null); setRequestDate(""); setRequestBook(book); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-charcoal-900 bg-butter/40 hover:bg-butter/70 rounded-xl transition border border-butter-300 shadow-warm-xs"
                    title="Đăng ký mượn sách"
                  >Đăng ký mượn</button>}
                  <button
                    onClick={() => void handleViewDetails(book)}
                    className="flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold text-charcoal-900 bg-white hover:bg-cream-100 rounded-xl transition border border-cream-300 shadow-warm-xs"
                    title="Xem chi tiết sách"
                  >
                    <Eye className="w-3.5 h-3.5" /> Chi tiết
                  </button>
                  <button
                    onClick={() => handleSummary(book)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-charcoal-900 bg-cream-100 hover:bg-butter/25 rounded-xl transition border border-cream-300 shadow-warm-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-butter-700" /> Tóm tắt AI
                  </button>
                  {isStaff && (
                    <>
                      <button
                        onClick={() => openEdit(book)}
                        className="flex items-center justify-center w-8 h-8 text-charcoal-500 hover:text-charcoal-900 hover:bg-cream-100 rounded-xl transition"
                        title="Chỉnh sửa sách"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(book)}
                        className="flex items-center justify-center w-8 h-8 text-terracotta-500 hover:bg-terracotta-50 rounded-xl transition"
                        title="Lưu trữ sách"
                      >
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

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Chi tiết sách" size="lg">
        {detail?.loading ? (
          <LoadingSpinner label="Đang tải thông tin sách..." />
        ) : detail?.error ? (
          <div className="rounded-2xl border border-terracotta-200 bg-terracotta-50 p-5 text-sm text-terracotta-700" role="alert">
            {detail.error}
          </div>
        ) : detail?.book ? (
          <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-5">
            <div className="h-56 rounded-2xl border border-cream-300 bg-cream-100 flex items-center justify-center overflow-hidden">
              {detail.book.cover_url ? (
                <img src={detail.book.cover_url} alt={`Bìa sách ${detail.book.title}`} className="h-full w-full object-contain" />
              ) : (
                <div className={`w-32 h-44 rounded-xl ${getCoverColor(detail.book.cover_color).bg} ${getCoverColor(detail.book.cover_color).text} flex flex-col items-center justify-center p-3 text-center`}>
                  <BookMarked className="w-8 h-8 mb-2" />
                  <span className="font-serif font-bold text-sm">{detail.book.title}</span>
                  <span className="text-xs mt-1">Chưa có ảnh bìa</span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-bold text-xl text-charcoal-900">{detail.book.title}</h3>
              <p className="text-sm text-charcoal-500 mt-1">{detail.book.author}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge color={detail.book.available > 0 ? "sage" : "terracotta"}>{detail.book.available > 0 ? "Còn sách" : "Hết sách"}</Badge>
                <Badge color="cream">{detailValue(detail.book.category)}</Badge>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mt-5 text-sm">
                {[
                  ["Mã sách", detail.book.book_code], ["ISBN", detail.book.isbn],
                  ["Nhà xuất bản", detail.book.publisher], ["Năm xuất bản", detail.book.publish_year],
                  ["Tổng số lượng", detail.book.quantity], ["Còn khả dụng", detail.book.available],
                  ["Ngày tạo", detail.book.created_at ? new Date(detail.book.created_at).toLocaleDateString("vi-VN") : null],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold text-charcoal-500">{label}</dt>
                    <dd className="mt-0.5 text-charcoal-900 break-words">{detailValue(value)}</dd>
                  </div>
                ))}
              </dl>
              {profile?.role === "reader" && <button type="button" onClick={() => { setRequestNotice(null); setRequestBook(detail.book); }} className="mt-5 w-full px-4 py-2.5 bg-butter hover:bg-butter-400 border border-butter-300 rounded-xl text-sm font-bold text-charcoal-900">Đăng ký mượn sách</button>}
              <div className="mt-4">
                <p className="text-xs font-semibold text-charcoal-500">Mô tả</p>
                <p className="mt-1 text-sm text-charcoal-800 whitespace-pre-wrap leading-relaxed">{detailValue(detail.book.description)}</p>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={!!requestBook} onClose={() => !requestSaving && setRequestBook(null)} title="Đăng ký mượn sách" size="md">
        {requestBook && <div className="space-y-4">
          <div className="rounded-2xl border border-cream-300 bg-cream-50 p-4">
            <h3 className="font-serif font-bold text-charcoal-900">{requestBook.title}</h3>
            <p className="text-xs text-charcoal-600 mt-1">Tác giả: {requestBook.author}</p>
            <p className="text-xs text-charcoal-600 mt-1">Mã sách: {requestBook.book_code}</p>
            <p className="text-xs text-charcoal-600 mt-1">Khả dụng hiện tại: {requestBook.available} / {requestBook.quantity}</p>
          </div>
          {requestNotice?.type === "error" && <p role="alert" className="rounded-xl border border-terracotta-200 bg-terracotta-50 p-3 text-sm text-terracotta-700">{requestNotice.text}</p>}
          <label className="block text-xs font-bold text-charcoal-700">Ngày dự kiến mượn (không bắt buộc)<input type="date" min={new Date().toISOString().slice(0, 10)} value={requestDate} onChange={(event) => setRequestDate(event.target.value)} className="mt-1.5 w-full px-3.5 py-2.5 border border-cream-300 bg-white rounded-xl text-sm" /></label>
          <p className="text-xs text-charcoal-500">Yêu cầu sẽ chờ Thủ thư duyệt. Phiếu mượn chỉ được lập khi bạn nhận sách.</p>
          <div className="flex gap-2"><button type="button" onClick={() => setRequestBook(null)} disabled={requestSaving} className="flex-1 px-4 py-2.5 border border-cream-300 rounded-xl text-sm font-bold">Hủy</button><button type="button" onClick={() => void submitBorrowRequest()} disabled={requestSaving} className="flex-1 px-4 py-2.5 bg-butter hover:bg-butter-400 border border-butter-300 rounded-xl text-sm font-bold disabled:opacity-50">{requestSaving ? "Đang gửi..." : "Gửi yêu cầu mượn"}</button></div>
        </div>}
      </Modal>

      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-cream-200">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border border-cream-300 rounded-xl text-xs font-bold text-charcoal-800 hover:bg-cream-100 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-warm-xs"
          >
            &larr; Trang trước
          </button>

          <span className="text-xs font-bold text-charcoal-800">
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
            className="px-4 py-2 bg-white border border-cream-300 rounded-xl text-xs font-bold text-charcoal-800 hover:bg-cream-100 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-warm-xs"
          >
            Trang sau &rarr;
          </button>
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Chỉnh sửa thông tin sách" : "Thêm sách mới vào kho"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Mã sách *</label>
              <input
                type="text"
                value={form.book_code}
                onChange={(e) => setForm({ ...form, book_code: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-cream-50/60 border border-cream-300 rounded-xl focus:outline-none focus:border-butter text-sm text-charcoal-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Số lượng nhập kho *</label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-cream-50/60 border border-cream-300 rounded-xl focus:outline-none focus:border-butter text-sm text-charcoal-900"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Tên tác phẩm *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full px-4 py-2.5 bg-cream-50/60 border border-cream-300 rounded-xl focus:outline-none focus:border-butter text-sm text-charcoal-900"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Tác giả *</label>
            <input
              type="text"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              required
              className="w-full px-4 py-2.5 bg-cream-50/60 border border-cream-300 rounded-xl focus:outline-none focus:border-butter text-sm text-charcoal-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Thể loại</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2.5 bg-cream-50/60 border border-cream-300 rounded-xl text-sm focus:outline-none focus:border-butter text-charcoal-900 font-medium"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Năm xuất bản</label>
              <input
                type="number"
                value={form.publish_year}
                onChange={(e) => setForm({ ...form, publish_year: e.target.value })}
                className="w-full px-4 py-2.5 bg-cream-50/60 border border-cream-300 rounded-xl focus:outline-none focus:border-butter text-sm text-charcoal-900"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Nhà xuất bản</label>
              <input
                type="text"
                value={form.publisher}
                onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                className="w-full px-4 py-2.5 bg-cream-50/60 border border-cream-300 rounded-xl focus:outline-none focus:border-butter text-sm text-charcoal-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Mã ISBN</label>
              <input
                type="text"
                value={form.isbn}
                onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                className="w-full px-4 py-2.5 bg-cream-50/60 border border-cream-300 rounded-xl focus:outline-none focus:border-butter text-sm text-charcoal-900"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Mô tả tác phẩm</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 bg-cream-50/60 border border-cream-300 rounded-xl focus:outline-none focus:border-butter text-sm text-charcoal-900 resize-none"
              placeholder="Mô tả tóm lược về chủ đề và nội dung cuốn sách..."
            />
          </div>
          <div>
            <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Màu nhận diện bìa sách</label>
            <div className="flex gap-2 flex-wrap">
              {COVER_OPTIONS.map((c) => {
                const cc = getCoverColor(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, cover_color: c })}
                    className={`w-8 h-8 rounded-xl ${cc.bg} border-2 ${form.cover_color === c ? "border-butter-600 ring-2 ring-butter/50 scale-105" : "border-transparent"} transition`}
                  />
                );
              })}
            </div>
          </div>

          {/* Cover image upload / URL / preset */}
          <div className="bg-cream-50 border border-cream-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-serif font-bold text-charcoal-900 flex items-center gap-1.5">
                <Image className="w-4 h-4 text-butter-700" /> Ảnh bìa sách
              </label>
              {form.cover_url && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, cover_url: "" })}
                  className="text-xs font-bold text-terracotta-600 hover:text-terracotta-800 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Xóa ảnh bìa
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* Preview */}
              <div className="w-24 h-32 rounded-xl bg-white border border-cream-300 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-warm-xs relative group">
                {form.cover_url ? (
                  <img
                    src={form.cover_url}
                    alt="Preview"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <div className="text-center p-2 text-charcoal-400">
                    <BookMarked className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <span className="text-[10px] block leading-tight">Chưa có ảnh</span>
                  </div>
                )}
              </div>

              {/* Input fields & controls */}
              <div className="flex-1 space-y-2.5 w-full">
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.cover_url}
                      onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                      placeholder="Dán URL ảnh bìa (VD: /covers/..., https://...)"
                      className="w-full pl-3 pr-24 py-2 bg-white border border-cream-300 rounded-xl text-xs text-charcoal-900 focus:outline-none focus:border-butter"
                    />
                    <label className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-cream-200 hover:bg-butter/30 text-charcoal-800 rounded-lg text-[11px] font-bold cursor-pointer border border-cream-300 flex items-center gap-1 transition">
                      <Upload className="w-3 h-3 text-butter-700" /> Tải tệp
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-[11px] text-charcoal-500 mt-1">
                    Nhập đường dẫn trực tiếp hoặc tải ảnh từ máy tính
                  </p>
                </div>

                {/* Quick Presets */}
                <div>
                  <p className="text-[11px] font-bold text-charcoal-800 mb-1.5">Ảnh bìa mẫu sẵn có:</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {PRESET_COVERS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setForm({ ...form, cover_url: preset.url })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                          form.cover_url === preset.url
                            ? "bg-butter text-charcoal-900 border-butter-400 shadow-warm-xs"
                            : "bg-white text-charcoal-700 border-cream-300 hover:bg-cream-100"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-cream-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-white border border-cream-300 rounded-xl text-xs font-bold text-charcoal-700 hover:bg-cream-100 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-warm-xs"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-butter hover:bg-butter-400 border border-butter-300 text-charcoal-900 rounded-xl text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-warm-sm hover:shadow-warm"
            >
              {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Thêm vào kho"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Summary modal */}
      <Modal isOpen={!!summaryModal} onClose={() => setSummaryModal(null)} title="AI Tóm tắt tác phẩm" size="md">
        {summaryModal && (
          <div>
            <div className="flex items-center gap-3.5 mb-4 pb-4 border-b border-cream-200">
              <div className="w-14 h-18 rounded-xl bg-cream-100 border border-cream-300 text-charcoal-900 flex items-center justify-center font-bold text-lg shadow-warm-xs overflow-hidden flex-shrink-0">
                {summaryModal.book.cover_url ? (
                  <img src={summaryModal.book.cover_url} alt={summaryModal.book.title} className="w-full h-full object-cover" />
                ) : (
                  summaryModal.book.title.charAt(0)
                )}
              </div>
              <div>
                <h3 className="font-bold text-charcoal-900 text-base">{summaryModal.book.title}</h3>
                <p className="text-xs text-charcoal-500 mt-0.5">{summaryModal.book.author} • <span className="font-semibold text-charcoal-800">{summaryModal.book.category}</span></p>
              </div>
            </div>
            {summaryModal.loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-butter-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-charcoal-700">Trợ lý Gemini AI đang đọc và tóm lược...</p>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-cream-100 via-ivory to-cream-50 rounded-2xl p-5 border border-cream-300 shadow-warm-xs">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-5 h-5 text-butter-700 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-charcoal-900 leading-relaxed whitespace-pre-wrap">{summaryModal.summary}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
