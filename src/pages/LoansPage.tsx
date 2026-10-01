import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Book, Profile, Loan, LibrarySettings } from "@/types";
import { PageHeader, EmptyState, LoadingSpinner, Badge } from "@/components/UI";
import Modal from "@/components/Modal";
import { Plus, ArrowLeftRight, Download, RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDate, getDaysOverdue, formatCurrency, exportToCSV } from "@/lib/utils";

export default function LoansPage() {
  const { profile } = useAuth();
  const isStaff = profile?.role === "admin" || profile?.role === "librarian";
  const [loans, setLoans] = useState<Loan[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [readers, setReaders] = useState<Profile[]>([]);
  const [settings, setSettings] = useState<LibrarySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ book_id: "", reader_id: "", loan_days: "14", note: "" });

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("loans").select("*, books(*), profiles(*)").order("created_at", { ascending: false });
    if (!isStaff && profile) {
      query = query.eq("reader_id", profile.id);
    }
    if (statusFilter !== "all") {
      if (statusFilter === "overdue") {
        query = query.eq("status", "borrowing");
      } else {
        query = query.eq("status", statusFilter);
      }
    }
    const { data } = await query;
    setLoans((data || []) as unknown as Loan[]);

    if (isStaff) {
      const [booksRes, readersRes, settingsRes] = await Promise.all([
        supabase.from("books").select("*").gt("available", 0).order("title"),
        supabase.from("profiles").select("*").eq("role", "reader").eq("card_status", "active").order("full_name"),
        supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      setBooks((booksRes.data || []) as Book[]);
      setReaders((readersRes.data || []) as Profile[]);
      setSettings(settingsRes.data as LibrarySettings | null);
    }
    setLoading(false);
  }, [isStaff, profile, statusFilter]);

  useEffect(() => { load(); }, [load]);

async function handleBorrow(e: React.FormEvent) {
    e.preventDefault();
    const book = books.find((b) => b.id === form.book_id);
    if (!book || book.available < 1) {
      alert("Sách không khả dụng hoặc đã hết.");
      return;
    }

    const borrowDate = new Date();
    const dueDate = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + parseInt(form.loan_days));

    try {
      const { error } = await supabase.rpc("borrow_book", {
        p_book_id: form.book_id,
        p_reader_id: form.reader_id,
        p_due_date: dueDate.toISOString().split("T")[0],
        p_note: form.note || null,
      });

      if (error) throw error;

      setModalOpen(false);
      setForm({ book_id: "", reader_id: "", loan_days: "14", note: "" });
      load();
    } catch (err: any) {
      alert(err.message || "Lỗi khi tạo phiếu mượn");
    }
  }

  async function handleReturn(loanOrId: Loan | string) {
    if (!confirm("Xác nhận độc giả đã trả sách?")) return;

    const loanId = typeof loanOrId === "string" ? loanOrId : loanOrId.id;

    try {
      const { error } = await supabase.rpc("return_book", {
        p_loan_id: loanId,
      });

      if (error) throw error;

      load();
    } catch (err: any) {
      alert(err.message || "Lỗi khi trả sách");
    }
  }

  async function handleRenew(loan: Loan) {
    const maxRenewals = settings?.max_renewals || 2;
    if (loan.renewed_count >= maxRenewals) {
      alert(`Đã đạt giới hạn gia hạn (${maxRenewals} lần)`);
      return;
    }
    const newDue = new Date(loan.due_date);
    newDue.setDate(newDue.getDate() + (settings?.renewal_days || 7));
    await supabase.from("loans").update({
      due_date: newDue.toISOString().split("T")[0],
      renewed_count: loan.renewed_count + 1,
    }).eq("id", loan.id);
    load();
  }

  function handleExport() {
    exportToCSV("danh-sach-phieu-muon.csv",
      ["Độc giả", "Sách", "Ngày mượn", "Hạn trả", "Ngày trả", "Trạng thái", "Gia hạn"],
      loans.map((l) => [l.profiles?.full_name || "", l.books?.title || "", formatDate(l.borrow_date), formatDate(l.due_date), l.return_date ? formatDate(l.return_date) : "—", l.status, l.renewed_count]),
    );
  }

  const getLoanStatus = (loan: Loan) => {
    if (loan.status === "returned") return { label: "Đã trả", color: "green" };
    if (getDaysOverdue(loan.due_date) > 0) return { label: "Quá hạn", color: "red" };
    return { label: "Đang mượn", color: "blue" };
  };

  return (
    <div>
      <PageHeader title="Mượn / Trả sách" subtitle={`${loans.length} phiếu mượn`} action={isStaff && (
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            <Download className="w-4 h-4" /> Xuất
          </button>
          <button onClick={() => { setForm({ book_id: "", reader_id: "", loan_days: String(settings?.loan_period_days || 14), note: "" }); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
            <Plus className="w-4 h-4" /> Tạo phiếu mượn
          </button>
        </div>
      )} />

      <div className="bg-white rounded-xl border border-slate-100 p-4 mb-5 flex gap-3">
        {["all", "borrowing", "overdue", "returned"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}>
            {s === "all" ? "Tất cả" : s === "borrowing" ? "Đang mượn" : s === "overdue" ? "Quá hạn" : "Đã trả"}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner label="Đang tải..." /> : loans.length === 0 ? (
        <EmptyState icon={<ArrowLeftRight className="w-12 h-12" />} title="Chưa có phiếu mượn nào" />
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Độc giả</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Sách</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Ngày mượn</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Hạn trả</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loans.map((loan) => {
                  const st = getLoanStatus(loan);
                  const daysLate = getDaysOverdue(loan.due_date);
                  const fineAmount = daysLate > 0 ? daysLate * (settings?.fine_per_day || 5000) : 0;
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{loan.profiles?.full_name || "—"}</p>
                        <p className="text-xs text-slate-400">{loan.profiles?.reader_type}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">{loan.books?.title || "—"}</p>
                        <p className="text-xs text-slate-400">{loan.books?.book_code}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(loan.borrow_date)}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-600">{formatDate(loan.due_date)}</p>
                        {daysLate > 0 && loan.status === "borrowing" && (
                          <p className="text-xs text-rose-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Phạt: {formatCurrency(fineAmount)}</p>
                        )}
                        {loan.renewed_count > 0 && <p className="text-xs text-slate-400">Đã gia hạn {loan.renewed_count} lần</p>}
                      </td>
                      <td className="px-4 py-3"><Badge color={st.color}>{st.label}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        {isStaff && loan.status === "borrowing" && (
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => handleRenew(loan)} title="Gia hạn" className="inline-flex items-center justify-center w-8 h-8 text-amber-600 hover:bg-amber-50 rounded-lg transition">
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleReturn(loan)} title="Trả sách" className="inline-flex items-center justify-center w-8 h-8 text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Tạo phiếu mượn sách">
        <form onSubmit={handleBorrow} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Độc giả *</label>
            <select value={form.reader_id} onChange={(e) => setForm({ ...form, reader_id: e.target.value })} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Chọn độc giả...</option>
              {readers.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Sách *</label>
            <select value={form.book_id} onChange={(e) => setForm({ ...form, book_id: e.target.value })} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Chọn sách...</option>
              {books.map((b) => <option key={b.id} value={b.id}>{b.title} — {b.author} (còn {b.available})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Số ngày mượn</label>
            <input type="number" min="1" max="60" value={form.loan_days} onChange={(e) => setForm({ ...form, loan_days: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Ghi chú</label>
            <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Hủy</button>
            <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">Tạo phiếu</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
