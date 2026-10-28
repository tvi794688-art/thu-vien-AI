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
          .select("*, books(*)"),

        supabase
          .from("fines")
          .select("*, loans(*, books(*)), profiles(*)")
          .eq("paid", false),

        supabase
          .from("books")
          .select("*")
          .neq("status", "archived"),

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

      const hydratedLoans = (loans || []).map((loan: any) => ({
        ...loan,
        profiles: loan.user_id
          ? readersById.get(loan.user_id)
          : undefined,
      }));

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
      const overdue = hydratedLoans.filter(
        (l: any) =>
          l.status !== "returned" &&
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
      <PageHeader
        title="Thống kê thư viện"
        subtitle="Báo cáo phân tích chuyên sâu về tuần hoàn sách và hoạt động bạn đọc"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Popular books */}
        <div className="bg-white rounded-3xl border border-cream-300 p-6 shadow-warm">
          <h3 className="font-bold text-charcoal-900 text-base flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-butter-700" /> Sách được mượn nhiều nhất
          </h3>
          {popularBooks.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu mượn sách" />
          ) : (
            <div className="space-y-2">
              {popularBooks.map(({ book, count }, idx) => {
                const cc = getCoverColor(book.cover_color);
                return (
                  <div
                    key={book.id}
                    className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-cream-50/80 transition"
                  >
                    <span className="text-sm font-extrabold text-butter-700 w-6 flex-shrink-0 text-center">
                      #{idx + 1}
                    </span>
                    <div
                      className={`w-9 h-11 rounded-xl ${cc.bg} ${cc.text} flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-warm-xs border border-cream-200 overflow-hidden`}
                    >
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        book.title.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-charcoal-900 truncate">
                        {book.title}
                      </p>
                      <p className="text-xs text-charcoal-500 font-medium truncate">
                        {book.author}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-butter/25 text-charcoal-900 border border-butter-300">
                      {count} lượt
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active readers */}
        <div className="bg-white rounded-3xl border border-cream-300 p-6 shadow-warm">
          <h3 className="font-bold text-charcoal-900 text-base flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-butter-700" /> Độc giả hoạt động tích cực
          </h3>
          {activeReaders.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu bạn đọc" />
          ) : (
            <div className="space-y-2">
              {activeReaders.map(({ reader, count }, idx) => (
                <div
                  key={reader.id}
                  className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-cream-50/80 transition"
                >
                  <span className="text-sm font-extrabold text-butter-700 w-6 flex-shrink-0 text-center">
                    #{idx + 1}
                  </span>
                  <div className="w-9 h-9 bg-cream-200 text-charcoal-900 rounded-2xl flex items-center justify-center text-xs font-bold border border-cream-300 shadow-warm-xs flex-shrink-0">
                    {reader.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-charcoal-900 truncate">
                      {reader.full_name}
                    </p>
                    <p className="text-xs font-mono text-charcoal-500">
                      {reader.reader_type}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-sage-100 text-charcoal-900 border border-sage-300">
                    {count} lượt mượn
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category distribution */}
      <div className="bg-white rounded-3xl border border-cream-300 p-6 shadow-warm mb-6">
        <h3 className="font-bold text-charcoal-900 text-base flex items-center gap-2 mb-5">
          <BarChart3 className="w-5 h-5 text-butter-700" /> Quy mô tài liệu theo thể loại
        </h3>
        {categoryStats.length === 0 ? (
          <EmptyState title="Chưa có dữ liệu danh mục" />
        ) : (
          <div className="space-y-3.5">
            {categoryStats.map((cat) => (
              <div key={cat.category} className="flex items-center gap-4">
                <span className="text-sm font-semibold text-charcoal-800 w-28 flex-shrink-0 truncate">
                  {cat.category}
                </span>
                <div className="flex-1 bg-cream-100 rounded-full h-7 overflow-hidden border border-cream-200 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-butter-300 via-butter-400 to-sage-300 rounded-full flex items-center justify-end px-3 transition-all duration-500 shadow-warm-xs"
                    style={{ width: `${Math.max((cat.count / maxCatCount) * 100, 8)}%` }}
                  >
                    <span className="text-xs text-charcoal-900 font-bold">
                      {cat.count} cuốn
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overdue loans */}
      <div className="bg-white rounded-3xl border border-cream-300 overflow-hidden shadow-warm mb-6">
        <div className="p-6 border-b border-cream-200 flex items-center justify-between">
          <h3 className="font-bold text-charcoal-900 text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-terracotta-600" /> Sách quá hạn ({overdueLoans.length})
          </h3>
        </div>
        {overdueLoans.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Không có lượt mượn nào bị quá hạn" />
          </div>
        ) : (
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
                    Hạn trả
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                    Trễ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {overdueLoans.map((loan) => {
                  const days = getDaysOverdue(loan.due_date);
                  return (
                    <tr key={loan.id} className="hover:bg-cream-50/70 transition">
                      <td className="px-5 py-3.5 text-sm font-bold text-charcoal-900">
                        {loan.profiles?.full_name}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-charcoal-900">
                        {loan.books?.title}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-charcoal-600">
                        {formatDate(loan.due_date)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge color="terracotta">{days} ngày</Badge>
                      </td>
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
        <div className="bg-white rounded-3xl border border-cream-300 overflow-hidden shadow-warm">
          <div className="p-6 border-b border-cream-200">
            <h3 className="font-bold text-charcoal-900 text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-terracotta-600" />
              Phạt chưa thanh toán ({unpaidFines.length})
            </h3>
          </div>

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
                    Số ngày trễ
                  </th>

                  <th className="text-left px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                    Tiền phạt
                  </th>

                  {isStaff && (
                    <th className="text-right px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                      Thao tác
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-cream-100">
                {unpaidFines.map((fine) => (
                  <tr key={fine.id} className="hover:bg-cream-50/70 transition">
                    <td className="px-5 py-3.5 text-sm font-bold text-charcoal-900">
                      {fine.profiles?.full_name}
                    </td>

                    <td className="px-5 py-3.5 text-sm font-medium text-charcoal-900">
                      {fine.loans?.books?.title || "—"}
                    </td>

                    <td className="px-5 py-3.5 text-sm text-charcoal-700">
                      {fine.days_overdue} ngày
                    </td>

                    <td className="px-5 py-3.5 text-sm font-bold text-terracotta-700">
                      {formatCurrency(fine.amount)}
                    </td>

                    {isStaff && (
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleMarkFinePaid(fine.id)}
                          className="px-4 py-1.5 bg-butter hover:bg-butter-400 text-charcoal-900 border border-butter-300 rounded-xl text-xs font-bold shadow-warm-xs hover:shadow-warm transition"
                        >
                          Xác nhận thu phạt
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