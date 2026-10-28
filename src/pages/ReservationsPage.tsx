import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Reservation, Book, Profile } from "@/types";
import { PageHeader, EmptyState, LoadingSpinner, Badge } from "@/components/UI";
import Modal from "@/components/Modal";
import { CalendarClock, Plus, CheckCircle2, XCircle } from "lucide-react";
import { formatDate, getCoverColor } from "@/lib/utils";
const PAGE_SIZE = 9;

function getErrorMessage(err: unknown, fallback: string) {
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message?: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }

  return fallback;
}

export default function ReservationsPage() {
  const { profile } = useAuth();
  const isStaff = profile?.role === "admin" || profile?.role === "librarian";
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [unavailableBooks, setUnavailableBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ book_id: "", note: "" });

  const load = useCallback(async () => {
    setLoading(true);

    try {
      let query = supabase
        .from("reservations")
        .select("*, books(*), profiles(*)")
        .order("reserved_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (!isStaff && profile) {
        query = query.eq("reader_id", profile.id);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setReservations((data || []) as unknown as Reservation[]);

      if (!isStaff && profile) {
        const { data: books, error: booksError } = await supabase
          .from("books")
          .select("*")
          .eq("available", 0)
          .order("title");

        if (booksError) {
          throw booksError;
        }

        setUnavailableBooks((books || []) as Book[]);
      } else {
        setUnavailableBooks([]);
      }
    } catch (err: unknown) {
      alert(
        getErrorMessage(
          err,
          "Không thể tải dữ liệu đặt trước."
        )
      );

      setReservations([]);
      setUnavailableBooks([]);
    } finally {
      setLoading(false);
    }
  }, [isStaff, profile]);

  useEffect(() => { load(); }, [load]);

  async function handleReserve(e: React.FormEvent) {
    e.preventDefault();

    if (!form.book_id) {
      alert("Vui lòng chọn sách muốn đặt trước.");
      return;
    }

    if (reserving) {
      return;
    }

    setReserving(true);

    try {
      const { error } = await supabase.rpc("create_reservation", {
        p_book_id: form.book_id,
        p_note: form.note.trim() || null,
      });

      if (error) {
        throw error;
      }

      alert("Đặt trước sách thành công.");

      setModalOpen(false);
      setForm({ book_id: "", note: "" });

      await load();
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Lỗi khi đặt trước sách."));
    } finally {
      setReserving(false);
    }
  }

  async function handleStatus(
    res: Reservation,
    status: "fulfilled" | "cancelled"
  ) {
    if (processingId) {
      return;
    }

    setProcessingId(res.id);

    try {
      if (status === "fulfilled") {
        const { error } = await supabase.rpc("fulfill_reservation", {
          p_reservation_id: res.id,
        });

        if (error) {
          throw error;
        }

        alert("Đã xử lý đặt trước và tạo phiếu mượn thành công.");
      } else {
        const { error } = await supabase.rpc("cancel_reservation", {
          p_reservation_id: res.id,
        });

        if (error) {
          throw error;
        }

        alert("Đã hủy yêu cầu đặt trước.");
      }

      await load();
    } catch (err: unknown) {
      alert(
        getErrorMessage(
          err,
          "Lỗi khi xử lý yêu cầu đặt trước."
        )
      );
    } finally {
      setProcessingId(null);
    }
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: "Chờ duyệt", color: "butter" },
    fulfilled: { label: "Đã xử lý", color: "sage" },
    cancelled: { label: "Đã hủy", color: "terracotta" },
  };

  const totalPages = Math.max(
    1,
    Math.ceil(reservations.length / PAGE_SIZE)
  );

  const paginatedReservations = reservations.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div>
      <PageHeader
        title="Đặt trước sách"
        subtitle="Hàng chờ ưu tiên cho các tác phẩm hiện đang được mượn"
        action={
          !isStaff && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-butter hover:bg-butter-400 text-charcoal-900 rounded-xl text-sm font-bold border border-butter-300 shadow-warm-sm hover:shadow-warm transition-all"
            >
              <Plus className="w-4 h-4 text-charcoal-900" />
              Đặt trước sách
            </button>
          )
        }
      />

      {loading ? (
        <LoadingSpinner label="Đang tải danh sách đặt trước..." />
      ) : reservations.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="w-12 h-12 text-sage-500" />}
          title="Chưa có yêu cầu đặt trước nào"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedReservations.map((res, idx) => {
            const cc = getCoverColor(res.books?.cover_color || "blue");
            const st = statusMap[res.status] || statusMap.pending;
            const queueNum = (currentPage - 1) * PAGE_SIZE + idx + 1;

            return (
              <div
                key={res.id}
                className="bg-white rounded-3xl border border-cream-300 p-5 shadow-warm hover:shadow-warm-md hover:border-butter-400 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-3.5 mb-3.5">
                    <div
                      className={`w-12 h-16 rounded-xl ${cc.bg} ${cc.text} flex items-center justify-center font-serif font-bold text-lg flex-shrink-0 shadow-warm-xs border border-black/5 overflow-hidden`}
                    >
                      {res.books?.cover_url ? (
                        <img src={res.books.cover_url} alt={res.books.title} className="w-full h-full object-cover" />
                      ) : (
                        res.books?.title?.charAt(0) || "?"
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-butter text-charcoal-900 border border-butter-300 shadow-warm-xs">
                          #{queueNum}
                        </span>
                        <h3 className="font-serif font-bold text-charcoal-900 text-sm truncate group-hover:text-butter-700 transition">
                          {res.books?.title}
                        </h3>
                      </div>
                      <p className="text-xs text-charcoal-500 font-medium truncate">
                        {res.books?.author}
                      </p>
                    </div>

                    <Badge color={st.color as any}>{st.label}</Badge>
                  </div>

                  <div className="rounded-2xl bg-cream-50/70 border border-cream-200/80 p-3 space-y-1.5 text-xs text-charcoal-700 mb-3">
                    <p className="flex justify-between">
                      <span className="text-charcoal-500">Độc giả:</span>
                      <span className="font-bold text-charcoal-900">
                        {res.profiles?.full_name}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-charcoal-500">Ngày đặt:</span>
                      <span className="font-medium text-charcoal-800">
                        {formatDate(res.reserved_date)}
                      </span>
                    </p>
                    {res.note && (
                      <p className="pt-1 border-t border-cream-200 text-charcoal-600 italic">
                        &ldquo;{res.note}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {res.status === "pending" && (
                  <div className="flex gap-2 pt-3 border-t border-cream-200">
                    {isStaff && (
                      <button
                        onClick={() => handleStatus(res, "fulfilled")}
                        disabled={processingId === res.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-charcoal-900 bg-butter hover:bg-butter-400 rounded-xl border border-butter-300 shadow-warm-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-charcoal-900" />
                        {processingId === res.id ? "Đang xử lý..." : "Duyệt mượn"}
                      </button>
                    )}

                    <button
                      onClick={() => handleStatus(res, "cancelled")}
                      disabled={processingId === res.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-terracotta-700 bg-terracotta-50 hover:bg-terracotta-100 border border-terracotta-200 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {processingId === res.id ? "Đang xử lý..." : "Hủy đặt"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reservations.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-6 px-1">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-cream-300 rounded-xl text-sm font-bold text-charcoal-800 bg-white hover:bg-cream-100 shadow-warm-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trang trước
          </button>

          <span className="text-sm font-bold text-charcoal-800">
            Trang {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
            disabled={currentPage >= totalPages}
            className="px-4 py-2 border border-cream-300 rounded-xl text-sm font-bold text-charcoal-800 bg-white hover:bg-cream-100 shadow-warm-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trang sau
          </button>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Đặt trước sách">
        <form onSubmit={handleReserve} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-charcoal-800 mb-1.5 block">
              Sách muốn đặt *
            </label>
            <select
              value={form.book_id}
              onChange={(e) => setForm({ ...form, book_id: e.target.value })}
              required
              className="w-full px-4 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm text-charcoal-900 focus:outline-none focus:border-butter transition"
            >
              <option value="">Chọn sách đang mượn hết...</option>
              {unavailableBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} — {b.author}
                </option>
              ))}
            </select>
            {unavailableBooks.length === 0 && (
              <p className="text-xs text-charcoal-500 mt-1.5">
                Hiện không có sách nào đang mượn hết để cần đặt trước.
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-bold text-charcoal-800 mb-1.5 block">
              Ghi chú
            </label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="VD: Cần đọc cho đề tài nghiên cứu..."
              className="w-full px-4 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm text-charcoal-900 focus:outline-none focus:border-butter transition"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-cream-300 rounded-xl text-sm font-bold text-charcoal-700 bg-white hover:bg-cream-100 transition shadow-warm-xs"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={reserving}
              className="flex-1 px-4 py-2.5 bg-butter hover:bg-butter-400 text-charcoal-900 border border-butter-300 rounded-xl text-sm font-bold shadow-warm-sm hover:shadow-warm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reserving ? "Đang đặt trước..." : "Đặt trước"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
