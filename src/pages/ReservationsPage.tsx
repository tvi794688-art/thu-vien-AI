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
    pending: { label: "Chờ duyệt", color: "amber" },
    fulfilled: { label: "Đã xử lý", color: "green" },
    cancelled: { label: "Đã hủy", color: "red" },
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
      <PageHeader title="Đặt trước sách" subtitle="Đặt trước khi sách đang được mượn" action={
        !isStaff && (
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
            <Plus className="w-4 h-4" /> Đặt trước sách
          </button>
        )
      } />

      {loading ? <LoadingSpinner label="Đang tải..." /> : reservations.length === 0 ? (
        <EmptyState icon={<CalendarClock className="w-12 h-12" />} title="Chưa có đặt trước nào" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedReservations.map((res) => {
            const cc = getCoverColor(res.books?.cover_color || "blue");
            const st = statusMap[res.status] || statusMap.pending;
            return (
              <div key={res.id} className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-lg transition">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-lg ${cc.bg} ${cc.text} flex items-center justify-center font-bold text-lg flex-shrink-0`}>
                    {res.books?.title?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 text-sm truncate">{res.books?.title}</h3>
                    <p className="text-xs text-slate-500">{res.books?.author}</p>
                  </div>
                  <Badge color={st.color}>{st.label}</Badge>
                </div>
                <div className="text-xs text-slate-500 space-y-1 mb-3">
                  <p>Độc giả: <span className="font-medium text-slate-700">{res.profiles?.full_name}</span></p>
                  <p>Ngày đặt: {formatDate(res.reserved_date)}</p>
                  {res.note && <p>Ghi chú: {res.note}</p>}
                </div>
                {res.status === "pending" && (
                  <div className="flex gap-2 pt-3 border-t border-slate-50">
                    {isStaff && (
                      <button
                        onClick={() => handleStatus(res, "fulfilled")}
                        disabled={processingId === res.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {processingId === res.id ? "Đang xử lý..." : "Duyệt"}
                      </button>
                    )}

                    <button
                      onClick={() => handleStatus(res, "cancelled")}
                      disabled={processingId === res.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {processingId === res.id ? "Đang xử lý..." : "Hủy"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reservations.length > PAGE_SIZE && (
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
            Trang {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
            disabled={currentPage >= totalPages}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trang sau
          </button>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Đặt trước sách">
        <form onSubmit={handleReserve} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Sách muốn đặt *</label>
            <select value={form.book_id} onChange={(e) => setForm({ ...form, book_id: e.target.value })} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Chọn sách đang mượn hết...</option>
              {unavailableBooks.map((b) => <option key={b.id} value={b.id}>{b.title} — {b.author}</option>)}
            </select>
            {unavailableBooks.length === 0 && <p className="text-xs text-slate-400 mt-1">Hiện không có sách nào đang mượn hết.</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Ghi chú</label>
            <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Hủy</button>
            <button
              type="submit"
              disabled={reserving}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reserving ? "Đang đặt trước..." : "Đặt trước"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
