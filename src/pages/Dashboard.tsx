import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { BookMarked, Users, ArrowLeftRight, AlertTriangle, TrendingUp, CalendarClock, Sparkles } from "lucide-react";
import type { Book, Loan } from "@/types";
import { formatDate, formatCurrency, getDaysOverdue, getCoverColor } from "@/lib/utils";
import type { PageKey } from "@/components/Layout";

export default function Dashboard({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ totalBooks: 0, totalReaders: 0, activeLoans: 0, overdueLoans: 0 });
  const [readerFineSummary, setReaderFineSummary] = useState({ total: 0, count: 0 });
  const [recentLoans, setRecentLoans] = useState<Loan[]>([]);
  const [popularBooks, setPopularBooks] = useState<{ book: Book; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const now = new Date();
      const today =
        `${now.getFullYear()}-` +
        `${String(now.getMonth() + 1).padStart(2, "0")}-` +
        `${String(now.getDate()).padStart(2, "0")}`;

      const isStaff =
        profile?.role === "admin" ||
        profile?.role === "librarian";

      let activeLoansQuery = supabase
        .from("loans")
        .select("id", { count: "exact", head: true })
        .in("status", ["active", "borrowing", "overdue"]);

      let overdueLoansQuery = supabase
        .from("loans")
        .select("id", { count: "exact", head: true })
        .neq("status", "returned")
        .lt("due_date", today);

      let recentLoansQuery = supabase
        .from("loans")
        .select("*, books(*)")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!isStaff && profile?.id) {
        activeLoansQuery = activeLoansQuery.eq("user_id", profile.id);
        overdueLoansQuery = overdueLoansQuery.eq("user_id", profile.id);
        recentLoansQuery = recentLoansQuery.eq("user_id", profile.id);
      }

      const [
        booksRes,
        readersRes,
        activeLoansRes,
        overdueLoansRes,
        recentRes,
      ] = await Promise.all([
        supabase
          .from("books")
          .select("id", { count: "exact", head: true })
          .neq("status", "archived"),

        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "reader"),

        activeLoansQuery,

        overdueLoansQuery,

        recentLoansQuery,
      ]);

      const recentLoanRows = (recentRes.data || []) as unknown as Loan[];

      const recentUserIds = [
        ...new Set(
          recentLoanRows
            .map((loan) => loan.user_id)
            .filter(Boolean)
        ),
      ];

      let recentProfiles: any[] = [];

      if (recentUserIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", recentUserIds);

        recentProfiles = data || [];
      }

      const profileMap = new Map(
        recentProfiles.map((reader) => [
          reader.id,
          reader,
        ])
      );

      const loans = recentLoanRows.map((loan) => ({
        ...loan,
        profiles: profileMap.get(loan.user_id),
      })) as Loan[];

      setStats({
        totalBooks: booksRes.count || 0,
        totalReaders: readersRes.count || 0,
        activeLoans: activeLoansRes.count || 0,
        overdueLoans: overdueLoansRes.count || 0,
      });

      setRecentLoans(loans);

      // Reader fines query
      if (!isStaff && profile?.id) {
        const { data: finesData } = await supabase
          .from("fines")
          .select("amount, paid")
          .eq("reader_id", profile.id)
          .eq("paid", false);

        if (finesData) {
          const fineTotal = finesData.reduce((sum, item) => sum + (item.amount || 0), 0);
          setReaderFineSummary({
            total: fineTotal,
            count: finesData.length,
          });
        }
      }

      // Popular books
      let popularLoansQuery = supabase
        .from("loans")
        .select("book_id, books(*)");

      if (!isStaff && profile?.id) {
        popularLoansQuery = popularLoansQuery.eq(
          "user_id",
          profile.id
        );
      }

      const { data: loanBooks } = await popularLoansQuery;

      const counts: Record<
        string,
        { book: Book; count: number }
      > = {};

      (loanBooks || []).forEach((l: any) => {
        if (!l.books || !l.book_id) {
          return;
        }

        if (!counts[l.book_id]) {
          counts[l.book_id] = {
            book: l.books as Book,
            count: 0,
          };
        }

        counts[l.book_id].count++;
      });

      setPopularBooks(
        Object.values(counts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      );

      setLoading(false);
    }
    load();
  }, [profile]);

  const isStaff = profile?.role === "admin" || profile?.role === "librarian";

  const statCards = [
    { label: "Tổng số sách", value: stats.totalBooks, icon: <BookMarked className="w-5 h-5" />, color: "butter", page: "books" as PageKey },
    ...(isStaff
      ? [
        { label: "Độc giả thư viện", value: stats.totalReaders, icon: <Users className="w-5 h-5" />, color: "sage", page: "readers" as PageKey },
        { label: "Phiếu đang mượn", value: stats.activeLoans, icon: <ArrowLeftRight className="w-5 h-5" />, color: "cream", page: "loans" as PageKey },
        { label: "Sách quá hạn", value: stats.overdueLoans, icon: <AlertTriangle className="w-5 h-5" />, color: "terracotta", page: "loans" as PageKey },
      ]
      : [
        { label: "Sách đang mượn", value: stats.activeLoans, icon: <ArrowLeftRight className="w-5 h-5" />, color: "butter", page: "loans" as PageKey },
        { label: "Sách quá hạn", value: stats.overdueLoans, icon: <AlertTriangle className="w-5 h-5" />, color: "terracotta", page: "loans" as PageKey },
        { label: "Phạt chưa nộp", value: formatCurrency(readerFineSummary.total), icon: <AlertTriangle className="w-5 h-5" />, color: "gold", page: "loans" as PageKey },
      ]),
  ];

  const colorStyles: Record<string, { bg: string; text: string; border: string }> = {
    forest: { bg: "bg-forest-50", text: "text-forest-800", border: "border-forest-200" },
    sage: { bg: "bg-sage-100", text: "text-forest-900", border: "border-sage-300" },
    cream: { bg: "bg-cream-300", text: "text-forest-900", border: "border-cream-500" },
    terracotta: { bg: "bg-terracotta-50", text: "text-terracotta-700", border: "border-terracotta-200" },
    gold: { bg: "bg-butter/20", text: "text-charcoal-900", border: "border-butter-300" },
    butter: { bg: "bg-butter/25", text: "text-charcoal-900", border: "border-butter-300" },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-butter-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-br from-cream-100 via-butter-100/60 to-cream-200/50 border border-cream-300 rounded-3xl p-6 lg:p-8 text-charcoal-900 relative overflow-hidden shadow-warm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-butter/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-sage-200/40 rounded-full blur-2xl translate-y-1/2 pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/95 border border-butter-300 text-charcoal-800 text-xs font-bold tracking-wider mb-3 shadow-warm-xs">
            <Sparkles className="w-3.5 h-3.5 text-butter-700" />
            Hệ thống Thư viện Hàn lâm 4.0
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold mb-2 tracking-tight text-charcoal-900">
            Xin chào, <span className="underline decoration-butter-400 decoration-wavy underline-offset-4">{profile?.full_name}</span>!
          </h2>
          <p className="text-charcoal-600 text-sm max-w-xl leading-relaxed">
            Hệ thống quản lý thư viện tích hợp trí tuệ nhân tạo Gemini AI — tra cứu sách bằng ngôn ngữ tự nhiên, tóm tắt nội dung và gợi ý sách thông minh.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <button
              onClick={() => onNavigate("ai-library")}
              className="inline-flex items-center gap-2 bg-butter hover:bg-butter-400 text-charcoal-900 border border-butter-300 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-warm-sm hover:shadow-warm hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4 text-charcoal-900" /> Tra cứu bằng AI
            </button>
            <button
              onClick={() => onNavigate("books")}
              className="inline-flex items-center gap-2 bg-white hover:bg-cream-100 border border-cream-300 rounded-xl px-4 py-2.5 text-xs font-bold text-charcoal-800 hover:text-charcoal-900 transition-all shadow-warm-xs hover:border-butter"
            >
              <BookMarked className="w-4 h-4 text-butter-700" /> Xem kho sách
            </button>
          </div>
        </div>
      </div>

      {/* Reader Fine Alert Banner */}
      {!isStaff && readerFineSummary.count > 0 && (
        <div className="bg-terracotta-50 border border-terracotta-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-warm-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-terracotta-100 text-terracotta-700 flex items-center justify-center flex-shrink-0 border border-terracotta-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-terracotta-800">
                Bạn có {readerFineSummary.count} khoản tiền phạt chưa thanh toán
              </p>
              <p className="text-xs text-terracotta-700 mt-0.5">
                Tổng số tiền: <span className="font-extrabold text-terracotta-800">{formatCurrency(readerFineSummary.total)}</span>. Vui lòng thanh toán tại quầy thủ thư.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("loans")}
            className="px-4 py-2 bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold rounded-xl transition flex-shrink-0 shadow-warm-xs"
          >
            Xem phiếu mượn & nộp phạt
          </button>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const style = colorStyles[card.color] || colorStyles.butter;
          return (
            <button
              key={card.label}
              onClick={() => onNavigate(card.page)}
              className="bg-white rounded-2xl p-5 border border-cream-300 hover:border-butter-400 shadow-warm hover:shadow-warm-md transition-all text-left group"
            >
              <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${style.bg} ${style.text} border ${style.border} mb-3.5 group-hover:scale-105 transition-transform`}>
                {card.icon}
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">{card.value}</p>
              <p className="text-xs font-bold text-charcoal-500 mt-1 uppercase tracking-wider">{card.label}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent loans */}
        <div className="bg-white rounded-2xl border border-cream-300 p-5 lg:p-6 shadow-warm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-cream-200">
            <h3 className="font-bold text-charcoal-900 flex items-center gap-2 text-base">
              <CalendarClock className="w-5 h-5 text-butter-700" /> Mượn gần đây
            </h3>
            <button onClick={() => onNavigate("loans")} className="text-xs font-bold text-charcoal-700 hover:text-charcoal-900 hover:underline">
              Xem tất cả &rarr;
            </button>
          </div>
          {recentLoans.length === 0 ? (
            <p className="text-sm text-charcoal-400 text-center py-8">Chưa có phiếu mượn nào</p>
          ) : (
            <div className="space-y-2.5">
              {recentLoans.map((loan) => {
                const overdue =
                  loan.status !== "returned" &&
                  getDaysOverdue(loan.due_date) > 0;
                return (
                  <div key={loan.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-cream-100/60 transition border border-transparent hover:border-cream-300">
                    <div className="w-10 h-14 rounded-lg bg-cream-100 border border-cream-300 text-charcoal-800 flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden shadow-warm-xs">
                      {loan.books?.cover_url ? (
                        <img src={loan.books.cover_url} alt={loan.books.title} className="w-full h-full object-cover" />
                      ) : (
                        loan.books?.title?.charAt(0) || "?"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-charcoal-900 truncate">{loan.books?.title}</p>
                      <p className="text-xs text-charcoal-500">{loan.profiles?.full_name} • Hạn trả: {formatDate(loan.due_date)}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex-shrink-0 border ${
                      loan.status === "returned"
                        ? "bg-sage-100 text-charcoal-900 border-sage-300"
                        : overdue
                        ? "bg-terracotta-50 text-terracotta-700 border-terracotta-200"
                        : "bg-cream-200 text-charcoal-900 border-cream-300"
                    }`}>
                      {loan.status === "returned" ? "Đã trả" : overdue ? "Quá hạn" : "Đang mượn"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Popular books */}
        <div className="bg-white rounded-2xl border border-cream-300 p-5 lg:p-6 shadow-warm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-cream-200">
            <h3 className="font-bold text-charcoal-900 flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-butter-700" /> Sách mượn nhiều nhất
            </h3>
            <button onClick={() => onNavigate("statistics")} className="text-xs font-bold text-charcoal-700 hover:text-charcoal-900 hover:underline">
              Xem báo cáo &rarr;
            </button>
          </div>
          {popularBooks.length === 0 ? (
            <p className="text-sm text-charcoal-400 text-center py-8">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-2.5">
              {popularBooks.map(({ book, count }, idx) => (
                <div key={book.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-cream-100/60 transition border border-transparent hover:border-cream-300">
                  <span className="text-base font-extrabold text-butter-700 w-6 text-center">#{idx + 1}</span>
                  <div className="w-10 h-14 rounded-lg bg-cream-100 text-charcoal-900 flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-warm-xs overflow-hidden border border-cream-300">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      book.title.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-charcoal-900 truncate">{book.title}</p>
                    <p className="text-xs text-charcoal-500">{book.author}</p>
                  </div>
                  <span className="text-xs font-bold text-charcoal-900 bg-butter/25 border border-butter-300 px-2.5 py-1 rounded-full flex-shrink-0">
                    {count} lượt mượn
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
