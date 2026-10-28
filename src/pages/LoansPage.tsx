import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Book, Profile, Loan, Fine, LibrarySettings } from "@/types";
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

const PAGE_SIZE = 10;

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
export default function LoansPage() {
  const { profile } = useAuth();

  const isStaff =
    profile?.role === "admin" || profile?.role === "librarian";

  const [loans, setLoans] = useState<Loan[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [readers, setReaders] = useState<Profile[]>([]);
  const [settings, setSettings] = useState<LibrarySettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [borrowing, setBorrowing] = useState(false);
  const [processingLoanId, setProcessingLoanId] = useState<string | null>(null);

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
          .in("status", ["active", "borrowing"])
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

      // Load fines (Reader sees own fines, Staff sees all)
      let finesQuery = supabase
        .from("fines")
        .select("*, loans(*, books(*))")
        .order("created_at", { ascending: false });

      if (!isStaff && profile) {
        finesQuery = finesQuery.eq("reader_id", profile.id);
      }

      const { data: fineData, error: fineError } = await finesQuery;
      if (!fineError && fineData) {
        setFines(fineData as unknown as Fine[]);
      }

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
      alert(
        getErrorMessage(
          err,
          "Lỗi khi tạo phiếu mượn."
        )
      );
    } finally {
      setBorrowing(false);
    }
  }

  async function handleReturn(loan: Loan) {
    if (processingLoanId) {
      return;
    }

    if (!confirm("Xác nhận độc giả đã trả sách?")) {
      return;
    }

    setProcessingLoanId(loan.id);

    try {
      const { error } = await supabase.rpc("return_book", {
        p_loan_id: loan.id,
      });

      if (error) {
        throw error;
      }

      alert("Trả sách thành công.");

      await load();
    } catch (err: unknown) {
      alert(
        getErrorMessage(
          err,
          "Lỗi khi trả sách."
        )
      );
    } finally {
      setProcessingLoanId(null);
    }
  }

  async function handleRenew(loan: Loan) {
    if (processingLoanId) {
      return;
    }

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

    setProcessingLoanId(loan.id);

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
      alert(
        getErrorMessage(
          err,
          "Lỗi khi gia hạn sách."
        )
      );
    } finally {
      setProcessingLoanId(null);
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
        color: "sage",
      };
    }

    if (
      loan.status === "overdue" ||
      getDaysOverdue(loan.due_date) > 0
    ) {
      return {
        label: "Quá hạn",
        color: "terracotta",
      };
    }

    return {
      label: "Đang mượn",
      color: "butter",
    };
  }

  const loanPeriodDays = settings?.loan_period_days ?? 14;

  const totalPages = Math.max(1, Math.ceil(loans.length / PAGE_SIZE));

  const finesByLoanId = new Map<string, Fine>();
  fines.forEach((f) => {
    if (f.loan_id) finesByLoanId.set(f.loan_id, f);
  });

  const readerUnpaidFines = fines.filter((f) => !f.paid);
  const readerUnpaidTotal = readerUnpaidFines.reduce(
    (sum, f) => sum + (f.amount || 0),
    0
  );

  const paginatedLoans = loans.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div>
      <PageHeader
        title="Mượn / Trả sách"
        subtitle={
          statusFilter === "fines"
            ? `${fines.length} khoản phạt`
            : `${loans.length} phiếu mượn`
        }
        action={
          isStaff && (
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-cream-100 border border-cream-300 rounded-xl text-sm font-bold text-charcoal-800 shadow-warm-xs transition-all"
              >
                <Download className="w-4 h-4 text-charcoal-700" />
                Xuất CSV
              </button>

              <button
                onClick={() => {
                  setForm({
                    book_id: "",
                    reader_id: "",
                  });

                  setModalOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-butter hover:bg-butter-400 text-charcoal-900 rounded-xl text-sm font-bold border border-butter-300 shadow-warm-sm hover:shadow-warm transition-all"
              >
                <Plus className="w-4 h-4 text-charcoal-900" />
                Tạo phiếu mượn
              </button>
            </div>
          )
        }
      />

      <div className="bg-white rounded-2xl border border-cream-300 p-3 mb-6 shadow-warm flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "Tất cả" },
            { key: "active", label: "Đang mượn" },
            { key: "overdue", label: "Quá hạn" },
            { key: "returned", label: "Đã trả" },
            ...(!isStaff ? [{ key: "fines", label: `Tiền phạt của tôi (${fines.length})` }] : []),
          ].map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setCurrentPage(1);
                  setStatusFilter(tab.key);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? "bg-butter text-charcoal-900 shadow-warm-xs border border-butter-400"
                    : "bg-cream-50 text-charcoal-700 hover:bg-cream-100 border border-cream-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {!isStaff && readerUnpaidFines.length > 0 && (
          <div className="text-xs text-terracotta-700 font-semibold flex items-center gap-2 bg-terracotta-50 border border-terracotta-200 px-4 py-2 rounded-xl shadow-warm-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-terracotta-600" />
            <span>Phạt chưa thanh toán: <strong className="font-extrabold text-terracotta-800">{formatCurrency(readerUnpaidTotal)}</strong> ({readerUnpaidFines.length} khoản)</span>
          </div>
        )}
      </div>

      {statusFilter === "fines" ? (
        fines.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-12 h-12 text-sage-600" />}
            title="Bạn không có khoản phạt nào"
          />
        ) : (
          <div className="bg-white rounded-3xl border border-cream-300 overflow-hidden shadow-warm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cream-100/70 border-b border-cream-200">
                  <tr>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                      Sách
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                      Số ngày trễ
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                      Tiền phạt
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th className="text-right px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-100">
                  {fines.map((fine) => (
                    <tr key={fine.id} className="hover:bg-cream-50/70 transition">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold text-charcoal-900">
                          {fine.loans?.books?.title || "Sách đã mượn"}
                        </p>
                        <p className="text-xs font-mono text-charcoal-500 mt-0.5">
                          {fine.loans?.books?.book_code || ""}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-charcoal-700">
                        {fine.days_overdue} ngày
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold text-charcoal-900">
                        {formatCurrency(fine.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-charcoal-500">
                        {formatDate(fine.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold ${
                            fine.paid
                              ? "bg-sage-100 text-charcoal-900 border border-sage-300"
                              : "bg-terracotta-50 text-terracotta-700 border border-terracotta-200"
                          }`}
                        >
                          {fine.paid ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-sage-600" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-terracotta-600" />
                          )}
                          {fine.paid ? "Đã nộp" : "Chưa thanh toán"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : loading ? (
        <LoadingSpinner label="Đang tải phiếu mượn..." />
      ) : loans.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="w-12 h-12 text-sage-500" />}
          title="Chưa có phiếu mượn nào"
        />
      ) : (
        <div className="bg-white rounded-3xl border border-cream-300 overflow-hidden shadow-warm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cream-100/70 border-b border-cream-200">
                <tr>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                    Độc giả
                  </th>

                  <th className="text-left px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                    Sách
                  </th>

                  <th className="text-left px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                    Ngày mượn
                  </th>

                  <th className="text-left px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                    Hạn trả
                  </th>

                  <th className="text-left px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                    Trạng thái
                  </th>

                  <th className="text-right px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-cream-100">
                {paginatedLoans.map((loan) => {
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
                      className="hover:bg-cream-50/70 transition"
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-bold text-charcoal-900">
                          {loan.profiles?.full_name || "—"}
                        </p>

                        <p className="text-xs font-mono text-charcoal-500 mt-0.5">
                          {loan.profiles?.reader_type || ""}
                        </p>
                      </td>

                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-charcoal-900">
                          {loan.books?.title || "—"}
                        </p>

                        <p className="text-xs font-mono text-charcoal-500 mt-0.5">
                          {loan.books?.book_code || ""}
                        </p>
                      </td>

                      <td className="px-5 py-3.5 text-sm text-charcoal-600">
                        {loan.borrow_date
                          ? formatDate(loan.borrow_date)
                          : "—"}
                      </td>

                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-charcoal-900">
                          {formatDate(loan.due_date)}
                        </p>

                        {(() => {
                          const existingFine = finesByLoanId.get(loan.id);
                          if (existingFine) {
                            return (
                              <p
                                className={`text-xs flex items-center gap-1 font-bold mt-1 ${
                                  existingFine.paid
                                    ? "text-sage-700"
                                    : "text-terracotta-700"
                                }`}
                              >
                                {existingFine.paid ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-sage-600" />
                                    Đã nộp: {formatCurrency(existingFine.amount)}
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-3.5 h-3.5 text-terracotta-600" />
                                    Phạt chưa nộp: {formatCurrency(existingFine.amount)}
                                  </>
                                )}
                              </p>
                            );
                          }
                          if (daysLate > 0 && loan.status !== "returned") {
                            return (
                              <p className="text-xs text-terracotta-700 flex items-center gap-1 mt-1 font-bold">
                                <AlertTriangle className="w-3.5 h-3.5 text-terracotta-600" />
                                Phạt dự kiến: {formatCurrency(calculatedFine)}
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </td>

                      <td className="px-5 py-3.5">
                        <Badge color={status.color as any}>
                          {status.label}
                        </Badge>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        {isStaff && loan.status !== "returned" && (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleRenew(loan)}
                              disabled={processingLoanId === loan.id}
                              title="Gia hạn"
                              className="inline-flex items-center justify-center px-3 py-1.5 bg-cream-100 hover:bg-butter/25 text-charcoal-900 border border-cream-300 rounded-xl text-xs font-bold shadow-warm-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processingLoanId === loan.id ? "Đang xử lý..." : "Gia hạn"}
                            </button>

                            <button
                              onClick={() => handleReturn(loan)}
                              disabled={processingLoanId === loan.id}
                              title="Trả sách"
                              className="inline-flex items-center justify-center px-3 py-1.5 bg-sage-100 hover:bg-sage-200 text-charcoal-900 border border-sage-300 rounded-xl text-xs font-bold shadow-warm-xs gap-1 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-sage-700" />
                              <span>Trả sách</span>
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

      {loans.length > PAGE_SIZE && (
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
            <label className="text-sm font-bold text-charcoal-800 mb-1.5 block">
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
              className="w-full px-4 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm text-charcoal-900 focus:outline-none focus:border-butter transition"
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
            <label className="text-sm font-bold text-charcoal-800 mb-1.5 block">
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
              className="w-full px-4 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm text-charcoal-900 focus:outline-none focus:border-butter transition"
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

          <div className="rounded-2xl border border-cream-300 bg-gradient-to-br from-cream-100 to-ivory px-4 py-3.5 shadow-warm-xs">
            <p className="text-sm font-bold text-charcoal-900">
              Thời hạn mượn hiện tại:{" "}
              <strong className="text-charcoal-900 underline decoration-butter-400">{loanPeriodDays} ngày</strong>.
            </p>

            <p className="text-xs text-charcoal-600 mt-1">
              Hạn trả được hệ thống tự tính từ cấu hình thư
              viện và không thể chỉnh trực tiếp tại đây.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={borrowing}
              className="flex-1 px-4 py-2.5 border border-cream-300 rounded-xl text-sm font-bold text-charcoal-700 bg-white hover:bg-cream-100 transition disabled:opacity-50 shadow-warm-xs"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={borrowing}
              className="flex-1 px-4 py-2.5 bg-butter hover:bg-butter-400 text-charcoal-900 border border-butter-300 rounded-xl text-sm font-bold shadow-warm-sm hover:shadow-warm transition disabled:opacity-50"
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