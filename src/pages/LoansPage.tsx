import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Book, Profile, Loan, LibrarySettings } from "@/types";
import {
  PageHeader,
  EmptyState,
  LoadingSpinner,
  Badge,
} from "@/components/UI";
import Modal from "@/components/Modal";
import {
  Plus,
  ArrowLeftRight,
  Download,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  formatDate,
  getDaysOverdue,
  formatCurrency,
  exportToCSV,
} from "@/lib/utils";

export default function LoansPage() {
  const { profile } = useAuth();

  const isStaff =
    profile?.role === "admin" || profile?.role === "librarian";

  const [loans, setLoans] = useState<Loan[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [readers, setReaders] = useState<Profile[]>([]);
  const [settings, setSettings] = useState<LibrarySettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [borrowing, setBorrowing] = useState(false);

  const [form, setForm] = useState({
    book_id: "",
    reader_id: "",
  });

  const load = useCallback(async () => {
    setLoading(true);

    try {
      let query = supabase
        .from("loans")
        .select("*, books(*)")
        .order("created_at", { ascending: false });

      // Reader chỉ xem phiếu mượn của chính mình
      if (!isStaff && profile) {
        query = query.eq("user_id", profile.id);
      }

      // Filter trạng thái dựa trên cả status và hạn trả thực tế
      const now = new Date();

      const today =
        `${now.getFullYear()}-` +
        `${String(now.getMonth() + 1).padStart(2, "0")}-` +
        `${String(now.getDate()).padStart(2, "0")}`;

      if (statusFilter === "returned") {
        query = query.eq("status", "returned");
      }

      if (statusFilter === "overdue") {
        query = query
          .neq("status", "returned")
          .lt("due_date", today);
      }

      if (statusFilter === "active") {
        query = query
          .eq("status", "active")
          .gte("due_date", today);
      }

      const { data: loanData, error: loanError } = await query;

      if (loanError) {
        throw loanError;
      }

      const rawLoans = (loanData || []) as unknown as Loan[];

      // loans.user_id tham chiếu auth.users, không có FK trực tiếp tới profiles,
      // nên lấy profile riêng rồi ghép bằng user_id.
      const userIds = [
        ...new Set(
          rawLoans
            .map((loan) => loan.user_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      let profilesById = new Map<string, Profile>();

      if (userIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .in("id", userIds);

        if (profileError) {
          throw profileError;
        }

        profilesById = new Map(
          ((profileData || []) as Profile[]).map((item) => [
            item.id,
            item,
          ])
        );
      }

      const hydratedLoans = rawLoans.map((loan) => ({
        ...loan,
        profiles: loan.user_id
          ? profilesById.get(loan.user_id)
          : undefined,
      }));

      setLoans(hydratedLoans);

      // Settings được phép đọc bởi authenticated users
      const { data: settingsData, error: settingsError } = await supabase
        .from("settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (settingsError) {
        throw settingsError;
      }

      setSettings(settingsData as LibrarySettings | null);

      if (isStaff) {
        const [booksRes, readersRes] = await Promise.all([
          supabase
            .from("books")
            .select("*")
            .neq("status", "archived")
            .gt("available", 0)
            .order("title"),

          supabase
            .from("profiles")
            .select("*")
            .eq("role", "reader")
            .eq("card_status", "active")
            .order("full_name"),
        ]);

        if (booksRes.error) {
          throw booksRes.error;
        }

        if (readersRes.error) {
          throw readersRes.error;
        }

        setBooks((booksRes.data || []) as Book[]);
        setReaders((readersRes.data || []) as Profile[]);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách mượn sách:", err);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  }, [isStaff, profile, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleBorrow(e: React.FormEvent) {
    e.preventDefault();

    if (!form.reader_id) {
      alert("Vui lòng chọn độc giả.");
      return;
    }

    if (!form.book_id) {
      alert("Vui lòng chọn sách.");
      return;
    }

    const book = books.find((item) => item.id === form.book_id);

    if (!book || book.available < 1) {
      alert("Sách không khả dụng hoặc đã hết.");
      return;
    }

    setBorrowing(true);

    try {
      /*
       * p_due_date và p_note vẫn tồn tại trong chữ ký RPC cũ
       * để giữ tương thích.
       *
       * Database Batch 3 KHÔNG tin p_due_date này.
       * Hạn trả thật được tính bằng:
       * CURRENT_DATE + settings.loan_period_days.
       */
      const compatibilityDate = new Date()
        .toISOString()
        .split("T")[0];

      const { error } = await supabase.rpc("borrow_book", {
        p_book_id: form.book_id,
        p_reader_id: form.reader_id,
        p_due_date: compatibilityDate,
        p_note: null,
      });

      if (error) {
        throw error;
      }

      setModalOpen(false);

      setForm({
        book_id: "",
        reader_id: "",
      });

      alert("Tạo phiếu mượn thành công.");

      await load();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Lỗi khi tạo phiếu mượn";

      alert(message);
    } finally {
      setBorrowing(false);
    }
  }

  async function handleReturn(loan: Loan) {
    if (!confirm("Xác nhận độc giả đã trả sách?")) {
      return;
    }

    try {
      const { error } = await supabase.rpc("return_book", {
        p_loan_id: loan.id,
      });

      if (error) {
        throw error;
      }

      await load();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Lỗi khi trả sách";

      alert(message);
    }
  }

  async function handleRenew(loan: Loan) {
    const currentCount = loan.renewal_count ?? 0;
    const maxRenewals = settings?.max_renewals ?? 0;
    const renewalDays = settings?.renewal_days ?? 0;

    if (
      !confirm(
        `Xác nhận gia hạn thêm ${renewalDays} ngày?\n` +
        `Số lần gia hạn hiện tại: ${currentCount}/${maxRenewals}`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.rpc("renew_loan", {
        p_loan_id: loan.id,
      });

      if (error) {
        throw error;
      }

      alert("Gia hạn sách thành công.");

      await load();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Lỗi khi gia hạn sách";

      alert(message);
    }
  }

  function handleExport() {
    exportToCSV(
      "danh-sach-phieu-muon.csv",
      [
        "Độc giả",
        "Sách",
        "Ngày mượn",
        "Hạn trả",
        "Ngày trả",
        "Trạng thái",
      ],
      loans.map((loan) => [
        loan.profiles?.full_name || "",
        loan.books?.title || "",
        loan.borrow_date ? formatDate(loan.borrow_date) : "—",
        formatDate(loan.due_date),
        loan.return_date ? formatDate(loan.return_date) : "—",
        loan.status || "",
      ])
    );
  }

  function getLoanStatus(loan: Loan) {
    if (loan.status === "returned") {
      return {
        label: "Đã trả",
        color: "green",
      };
    }

    if (
      loan.status === "overdue" ||
      getDaysOverdue(loan.due_date) > 0
    ) {
      return {
        label: "Quá hạn",
        color: "red",
      };
    }

    return {
      label: "Đang mượn",
      color: "blue",
    };
  }

  const loanPeriodDays = settings?.loan_period_days ?? 14;

  return (
    <div>
      <PageHeader
        title="Mượn / Trả sách"
        subtitle={`${loans.length} phiếu mượn`}
        action={
          isStaff && (
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                <Download className="w-4 h-4" />
                Xuất
              </button>

              <button
                onClick={() => {
                  setForm({
                    book_id: "",
                    reader_id: "",
                  });

                  setModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
              >
                <Plus className="w-4 h-4" />
                Tạo phiếu mượn
              </button>
            </div>
          )
        }
      />

      <div className="bg-white rounded-xl border border-slate-100 p-4 mb-5 flex gap-3 flex-wrap">
        {["all", "active", "overdue", "returned"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${statusFilter === status
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            {status === "all"
              ? "Tất cả"
              : status === "active"
                ? "Đang mượn"
                : status === "overdue"
                  ? "Quá hạn"
                  : "Đã trả"}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner label="Đang tải..." />
      ) : loans.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="w-12 h-12" />}
          title="Chưa có phiếu mượn nào"
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                    Độc giả
                  </th>

                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                    Sách
                  </th>

                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                    Ngày mượn
                  </th>

                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                    Hạn trả
                  </th>

                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                    Trạng thái
                  </th>

                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {loans.map((loan) => {
                  const status = getLoanStatus(loan);

                  const daysLate = getDaysOverdue(loan.due_date);

                  const calculatedFine =
                    daysLate > 0
                      ? daysLate *
                      (settings?.fine_per_day ?? 0)
                      : 0;

                  return (
                    <tr
                      key={loan.id}
                      className="hover:bg-slate-50 transition"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">
                          {loan.profiles?.full_name || "—"}
                        </p>

                        <p className="text-xs text-slate-400">
                          {loan.profiles?.reader_type || ""}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">
                          {loan.books?.title || "—"}
                        </p>

                        <p className="text-xs text-slate-400">
                          {loan.books?.book_code || ""}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-600">
                        {loan.borrow_date
                          ? formatDate(loan.borrow_date)
                          : "—"}
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-600">
                          {formatDate(loan.due_date)}
                        </p>

                        {daysLate > 0 &&
                          loan.status !== "returned" && (
                            <p className="text-xs text-rose-500 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Phạt:{" "}
                              {formatCurrency(calculatedFine)}
                            </p>
                          )}
                      </td>

                      <td className="px-4 py-3">
                        <Badge color={status.color}>
                          {status.label}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 text-right">
                        {isStaff && loan.status !== "returned" && (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleRenew(loan)}
                              title="Gia hạn"
                              className="inline-flex items-center justify-center px-2.5 h-8 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-medium transition"
                            >
                              Gia hạn
                            </button>

                            <button
                              onClick={() => handleReturn(loan)}
                              title="Trả sách"
                              className="inline-flex items-center justify-center w-8 h-8 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            >
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

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tạo phiếu mượn sách"
      >
        <form
          onSubmit={handleBorrow}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Độc giả *
            </label>

            <select
              value={form.reader_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  reader_id: e.target.value,
                })
              }
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">
                Chọn độc giả...
              </option>

              {readers.map((reader) => (
                <option
                  key={reader.id}
                  value={reader.id}
                >
                  {reader.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Sách *
            </label>

            <select
              value={form.book_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  book_id: e.target.value,
                })
              }
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">
                Chọn sách...
              </option>

              {books.map((book) => (
                <option
                  key={book.id}
                  value={book.id}
                >
                  {book.title} — {book.author} (còn{" "}
                  {book.available})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-sm text-blue-700">
              Thời hạn mượn hiện tại:{" "}
              <strong>{loanPeriodDays} ngày</strong>.
            </p>

            <p className="text-xs text-blue-600 mt-1">
              Hạn trả được hệ thống tự tính từ cấu hình thư
              viện và không thể chỉnh trực tiếp tại đây.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={borrowing}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={borrowing}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {borrowing
                ? "Đang tạo..."
                : "Tạo phiếu"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}