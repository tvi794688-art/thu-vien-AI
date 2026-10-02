import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { BookMarked, Users, ArrowLeftRight, AlertTriangle, TrendingUp, CalendarClock, Sparkles } from "lucide-react";
import type { Book, Loan } from "@/types";
import { formatDate, getDaysOverdue, getCoverColor } from "@/lib/utils";
import type { PageKey } from "@/components/Layout";

export default function Dashboard({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ totalBooks: 0, totalReaders: 0, activeLoans: 0, overdueLoans: 0 });
  const [recentLoans, setRecentLoans] = useState<Loan[]>([]);
  const [popularBooks, setPopularBooks] = useState<{ book: Book; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10);
      const isStaff =
        profile?.role === "admin" ||
        profile?.role === "librarian";

      let activeLoansQuery = supabase
        .from("loans")
        .select("id", { count: "exact", head: true })
        .in("status", ["active", "overdue"]);

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
    { label: "Tổng số sách", value: stats.totalBooks, icon: <BookMarked className="w-5 h-5" />, color: "blue", page: "books" as PageKey },
    ...(isStaff
      ? [
        { label: "Độc giả", value: stats.totalReaders, icon: <Users className="w-5 h-5" />, color: "emerald", page: "readers" as PageKey },
        { label: "Đang mượn", value: stats.activeLoans, icon: <ArrowLeftRight className="w-5 h-5" />, color: "violet", page: "loans" as PageKey },
        { label: "Quá hạn", value: stats.overdueLoans, icon: <AlertTriangle className="w-5 h-5" />, color: "rose", page: "loans" as PageKey },
      ]
      : [
        { label: "Đang mượn", value: stats.activeLoans, icon: <ArrowLeftRight className="w-5 h-5" />, color: "violet", page: "loans" as PageKey },
      ]),
  ];

  const colorMap: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    violet: "from-violet-500 to-violet-600",
    rose: "from-rose-500 to-rose-600",
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <h2 className="text-2xl font-bold mb-2">Xin chào, {profile?.full_name}!</h2>
          <p className="text-slate-300 text-sm max-w-lg">
            Hệ thống quản lý thư viện tích hợp AI — tra cứu sách bằng ngôn ngữ tự nhiên, tóm tắt nội dung và gợi ý sách thông minh.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={() => onNavigate("ai-chat")} className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 text-sm font-medium transition">
              <Sparkles className="w-4 h-4" /> Tra cứu bằng AI
            </button>
            <button onClick={() => onNavigate("books")} className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 text-sm font-medium transition">
              <BookMarked className="w-4 h-4" /> Xem sách
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <button
            key={card.label}
            onClick={() => onNavigate(card.page)}
            className="bg-white rounded-xl p-5 border border-slate-100 hover:shadow-lg transition text-left group"
          >
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[card.color]} text-white mb-3 group-hover:scale-110 transition`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
            <p className="text-sm text-slate-500">{card.label}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent loans */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-blue-500" /> Mượn gần đây
            </h3>
            <button onClick={() => onNavigate("loans")} className="text-sm text-blue-600 hover:underline">Xem tất cả</button>
          </div>
          {recentLoans.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Chưa có phiếu mượn nào</p>
          ) : (
            <div className="space-y-3">
              {recentLoans.map((loan) => {
                const cc = getCoverColor(loan.books?.cover_color || "blue");
                const overdue =
                  loan.status !== "returned" &&
                  getDaysOverdue(loan.due_date) > 0;
                return (
                  <div key={loan.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition">
                    <div className={`w-10 h-10 rounded-lg ${cc.bg} ${cc.text} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                      {loan.books?.title?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{loan.books?.title}</p>
                      <p className="text-xs text-slate-500">{loan.profiles?.full_name} • {formatDate(loan.borrow_date)}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${loan.status === "returned" ? "bg-emerald-100 text-emerald-700" :
                      overdue ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
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
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" /> Sách mượn nhiều
            </h3>
            <button onClick={() => onNavigate("statistics")} className="text-sm text-blue-600 hover:underline">Thống kê</button>
          </div>
          {popularBooks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-3">
              {popularBooks.map(({ book, count }, idx) => {
                const cc = getCoverColor(book.cover_color);
                return (
                  <div key={book.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition">
                    <span className="text-lg font-bold text-slate-300 w-6">{idx + 1}</span>
                    <div className={`w-10 h-10 rounded-lg ${cc.bg} ${cc.text} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                      {book.title.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{book.title}</p>
                      <p className="text-xs text-slate-500">{book.author}</p>
                    </div>
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full flex-shrink-0">{count} lượt</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
