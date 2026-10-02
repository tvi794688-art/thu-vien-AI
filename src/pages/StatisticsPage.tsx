import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Book, Profile, Loan, Fine } from "@/types";
import { PageHeader, LoadingSpinner, EmptyState, Badge } from "@/components/UI";
import { TrendingUp, Users, AlertTriangle, BarChart3 } from "lucide-react";
import { formatDate, getDaysOverdue, formatCurrency, getCoverColor } from "@/lib/utils";

export default function StatisticsPage() {
  const { profile } = useAuth();

  const isStaff =
    profile?.role === "admin" ||
    profile?.role === "librarian";
  const [loading, setLoading] = useState(true);
  const [popularBooks, setPopularBooks] = useState<{ book: Book; count: number }[]>([]);
  const [activeReaders, setActiveReaders] = useState<{ reader: Profile; count: number }[]>([]);
  const [overdueLoans, setOverdueLoans] = useState<Loan[]>([]);
  const [unpaidFines, setUnpaidFines] = useState<Fine[]>([]);
  const [categoryStats, setCategoryStats] = useState<{ category: string; count: number }[]>([]);

  useEffect(() => {
    async function load() {
      const [
        { data: loans },
        { data: fines },
        { data: books },
        { data: readers },
      ] = await Promise.all([
        supabase
          .from("loans")
          .select("*, books(*)")
          .limit(100),

        supabase
          .from("fines")
          .select("*, loans(*, books(*)), profiles(*)")
          .eq("paid", false),

        supabase
          .from("books")
          .select("*"),

        supabase
          .from("profiles")
          .select("*")
          .eq("role", "reader"),
      ]);

      // Popular books
      const bookCounts: Record<string, { book: Book; count: number }> = {};
      (loans || []).forEach((l: any) => {
        if (l.books) {
          if (!bookCounts[l.book_id]) bookCounts[l.book_id] = { book: l.books as Book, count: 0 };
          bookCounts[l.book_id].count++;
        }
      });
      setPopularBooks(Object.values(bookCounts).sort((a, b) => b.count - a.count).slice(0, 10));

      // Active readers
      const readersById = new Map(
        ((readers || []) as Profile[]).map((reader) => [
          reader.id,
          reader,
        ])
      );

      const readerCounts: Record<
        string,
        { reader: Profile; count: number }
      > = {};

      (loans || []).forEach((l: any) => {
        if (!l.user_id) {
          return;
        }

        const reader = readersById.get(l.user_id);

        if (!reader) {
          return;
        }

        if (!readerCounts[l.user_id]) {
          readerCounts[l.user_id] = {
            reader,
            count: 0,
          };
        }

        readerCounts[l.user_id].count++;
      });

      setActiveReaders(
        Object.values(readerCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      );

      // Overdue
      const overdue = (loans || []).filter(
        (l: any) =>
          l.status === "active" &&
          getDaysOverdue(l.due_date) > 0
      ) as Loan[];

      setOverdueLoans(overdue);
      setUnpaidFines((fines || []) as unknown as Fine[]);

      // Category stats
      const catCounts: Record<string, number> = {};
      (books || []).forEach((b: Book) => {
        catCounts[b.category] = (catCounts[b.category] || 0) + b.quantity;
      });
      setCategoryStats(Object.entries(catCounts).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count));

      setLoading(false);
    }

    load();
  }, []);

  async function handleMarkFinePaid(fineId: string) {
    if (!isStaff) return;

    const { error } = await supabase.rpc("mark_fine_paid", {
      p_fine_id: fineId,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setUnpaidFines((current) =>
      current.filter((fine) => fine.id !== fineId)
    );
  }

  if (loading) return <LoadingSpinner label="Đang thống kê..." />;

  const maxCatCount = Math.max(...categoryStats.map((c) => c.count), 1);

  return (
    <div>
      <PageHeader title="Thống kê thư viện" subtitle="Phân tích hoạt động mượn trả và thư viện" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Popular books */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Sách mượn nhiều nhất
          </h3>
          {popularBooks.length === 0 ? <EmptyState title="Chưa có dữ liệu" /> : (
            <div className="space-y-2">
              {popularBooks.map(({ book, count }, idx) => {
                const cc = getCoverColor(book.cover_color);
                return (
                  <div key={book.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition">
                    <span className="text-sm font-bold text-slate-300 w-5">{idx + 1}</span>
                    <div className={`w-8 h-8 rounded-lg ${cc.bg} ${cc.text} flex items-center justify-center font-bold text-xs`}>{book.title.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{book.title}</p>
                      <p className="text-xs text-slate-400">{book.author}</p>
                    </div>
                    <Badge color="green">{count} lượt</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active readers */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-500" /> Độc giả hoạt động tích cực
          </h3>
          {activeReaders.length === 0 ? <EmptyState title="Chưa có dữ liệu" /> : (
            <div className="space-y-2">
              {activeReaders.map(({ reader, count }, idx) => (
                <div key={reader.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition">
                  <span className="text-sm font-bold text-slate-300 w-5">{idx + 1}</span>
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium text-slate-600">{reader.full_name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{reader.full_name}</p>
                    <p className="text-xs text-slate-400">{reader.reader_type}</p>
                  </div>
                  <Badge color="blue">{count} lượt mượn</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category distribution */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 mb-6">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-violet-500" /> Sách theo thể loại
        </h3>
        {categoryStats.length === 0 ? <EmptyState title="Chưa có dữ liệu" /> : (
          <div className="space-y-3">
            {categoryStats.map((cat) => (
              <div key={cat.category} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-24 flex-shrink-0">{cat.category}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full flex items-center justify-end px-2 transition-all" style={{ width: `${(cat.count / maxCatCount) * 100}%` }}>
                    <span className="text-xs text-white font-medium">{cat.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overdue loans */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 mb-6">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-rose-500" /> Sách quá hạn ({overdueLoans.length})
        </h3>
        {overdueLoans.length === 0 ? <EmptyState title="Không có sách quá hạn" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Độc giả</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Sách</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Hạn trả</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Trễ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {overdueLoans.map((loan) => {
                  const days = getDaysOverdue(loan.due_date);
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-sm text-slate-700">{loan.profiles?.full_name}</td>
                      <td className="px-4 py-2 text-sm text-slate-700">{loan.books?.title}</td>
                      <td className="px-4 py-2 text-sm text-slate-600">{formatDate(loan.due_date)}</td>
                      <td className="px-4 py-2"><Badge color="red">{days} ngày</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unpaid fines */}
      {unpaidFines.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Phạt chưa thanh toán ({unpaidFines.length})
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">
                    Độc giả
                  </th>

                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">
                    Sách
                  </th>

                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">
                    Số ngày trễ
                  </th>

                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">
                    Tiền phạt
                  </th>

                  {isStaff && (
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">
                      Thao tác
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {unpaidFines.map((fine) => (
                  <tr key={fine.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-sm text-slate-700">
                      {fine.profiles?.full_name}
                    </td>

                    <td className="px-4 py-2 text-sm text-slate-700">
                      {fine.loans?.books?.title || "—"}
                    </td>

                    <td className="px-4 py-2 text-sm text-slate-600">
                      {fine.days_overdue} ngày
                    </td>

                    <td className="px-4 py-2 text-sm font-medium text-rose-600">
                      {formatCurrency(fine.amount)}
                    </td>

                    {isStaff && (
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleMarkFinePaid(fine.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition"
                        >
                          Đã thanh toán
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}