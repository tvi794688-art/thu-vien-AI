import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  Book,
  Loan,
  Profile,
  Fine,
  LibrarySettings,
} from "@/types";
import { PageHeader, LoadingSpinner } from "@/components/UI";
import { FileText, Download, FileSpreadsheet, BookMarked, ArrowLeftRight, Users, AlertTriangle } from "lucide-react";
import { formatDate, getDaysOverdue, formatCurrency, exportToCSV } from "@/lib/utils";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [readers, setReaders] = useState<Profile[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [settings, setSettings] = useState<LibrarySettings | null>(null);

  useEffect(() => {
    async function load() {
      const [b, l, r, f, s] = await Promise.all([
        supabase
          .from("books")
          .select("*")
          .neq("status", "archived")
          .order("title"),

        supabase
          .from("loans")
          .select("*, books(*)")
          .order("created_at", { ascending: false }),

        supabase
          .from("profiles")
          .select("*")
          .eq("role", "reader")
          .order("full_name"),

        supabase
          .from("fines")
          .select("*, loans(*, books(*)), profiles(*)")
          .order("created_at", { ascending: false }),

        supabase
          .from("settings")
          .select("*")
          .eq("id", 1)
          .maybeSingle(),
      ]);

      const readerMap = new Map(
        ((r.data || []) as Profile[]).map((reader) => [
          reader.id,
          reader,
        ])
      );

      const hydratedLoans = ((l.data || []) as unknown as Loan[]).map((loan) => ({
        ...loan,
        profiles: loan.user_id
          ? readerMap.get(loan.user_id)
          : undefined,
      }));

      setBooks((b.data || []) as Book[]);
      setLoans(hydratedLoans);
      setReaders((r.data || []) as Profile[]);
      setFines((f.data || []) as unknown as Fine[]);
      setSettings(s.data as LibrarySettings | null);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner label="Đang tải báo cáo..." />;
  const finePerDay = settings?.fine_per_day ?? 0;
  const overdueCount = loans.filter(
    (l) => l.status !== "returned" && getDaysOverdue(l.due_date) > 0
  ).length;
  const totalFines = fines.filter((f) => !f.paid).reduce((sum, f) => sum + f.amount, 0);

  const reportCards = [
    {
      title: "Danh sách sách",
      desc: `${books.length} đầu sách`,
      icon: <BookMarked className="w-5 h-5" />,
      color: "blue",
      onExport: () => exportToCSV("bao-cao-sach.csv",
        ["Mã", "Tên", "Tác giả", "Thể loại", "NXB", "Năm", "ISBN", "Số lượng", "Còn lại"],
        books.map((b) => [b.book_code, b.title, b.author, b.category, b.publisher || "", b.publish_year || "", b.isbn || "", b.quantity, b.available]),
      ),
    },
    {
      title: "Phiếu mượn/trả",
      desc: `${loans.length} phiếu`,
      icon: <ArrowLeftRight className="w-5 h-5" />,
      color: "violet",
      onExport: () => exportToCSV("bao-cao-phieu-muon.csv",
        ["Độc giả", "Sách", "Ngày mượn", "Hạn trả", "Ngày trả", "Trạng thái", "Gia hạn"],
        loans.map((l) => [
          l.profiles?.full_name || "",
          l.books?.title || "",
          l.borrow_date ? formatDate(l.borrow_date) : "—",
          formatDate(l.due_date),
          l.return_date ? formatDate(l.return_date) : "—",
          l.status || "",
          l.renewal_count,
        ]),
      ),
    },
    {
      title: "Danh sách độc giả",
      desc: `${readers.length} độc giả`,
      icon: <Users className="w-5 h-5" />,
      color: "emerald",
      onExport: () => exportToCSV("bao-cao-doc-gia.csv",
        ["Họ tên", "Email", "SĐT", "Loại", "Trạng thái thẻ", "Địa chỉ"],
        readers.map((r) => [r.full_name, r.email || "", r.phone || "", r.reader_type, r.card_status, r.address || ""]),
      ),
    },
    {
      title: "Sách quá hạn",
      desc: `${overdueCount} sách quá hạn`,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "rose",
      onExport: () => exportToCSV("bao-cao-sach-qua-han.csv",
        ["Độc giả", "Sách", "Hạn trả", "Số ngày trễ", "Tiền phạt dự kiến"],
        loans
          .filter((l) => l.status !== "returned" && getDaysOverdue(l.due_date) > 0).map((l) => {
            const days = getDaysOverdue(l.due_date);
            return [l.profiles?.full_name || "", l.books?.title || "", formatDate(l.due_date), days, formatCurrency(days * finePerDay)];
          }),
      ),
    },
    {
      title: "Lịch sử phạt",
      desc: `${formatCurrency(totalFines)} chưa thu`,
      icon: <FileText className="w-5 h-5" />,
      color: "amber",
      onExport: () => exportToCSV("bao-cao-phat.csv",
        ["Độc giả", "Sách", "Số ngày trễ", "Tiền phạt", "Đã thu"],
        fines.map((f) => [f.profiles?.full_name || "", f.loans?.books?.title || "", f.days_overdue, formatCurrency(f.amount), f.paid ? "Rồi" : "Chưa"]),
      ),
    },
    {
      title: "Báo cáo tổng hợp",
      desc: "Tất cả dữ liệu thư viện",
      icon: <FileSpreadsheet className="w-5 h-5" />,
      color: "slate",
      onExport: () => exportToCSV("bao-cao-tong-hop.csv",
        ["Loại báo cáo", "Số lượng", "Chi tiết"],
        [
          ["Tổng số sách", books.length, `Tổng ${books.reduce((s, b) => s + b.quantity, 0)} bản`],
          ["Sách còn", books.reduce((s, b) => s + b.available, 0), ""],
          [
            "Sách đang mượn",
            loans.filter(
              (l) => l.status === "active" || l.status === "overdue"
            ).length,
            "",
          ],
          ["Sách quá hạn", overdueCount, ""],
          ["Tổng độc giả", readers.length, ""],
          ["Phiếu mượn", loans.length, ""],
          ["Phiếu phạt", fines.length, `Chưa thu: ${formatCurrency(totalFines)}`],
        ],
      ),
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    violet: "from-violet-500 to-violet-600",
    emerald: "from-emerald-500 to-emerald-600",
    rose: "from-rose-500 to-rose-600",
    amber: "from-amber-500 to-amber-600",
    slate: "from-slate-500 to-slate-600",
  };

  return (
    <div>
      <PageHeader title="Báo cáo & Xuất dữ liệu" subtitle="Xuất báo cáo thư viện ra file CSV" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Tổng sách", value: books.length, color: "text-blue-600" },
          {
            label: "Đang mượn",
            value: loans.filter(
              (l) => l.status === "active" || l.status === "overdue"
            ).length,
            color: "text-violet-600",
          },
          { label: "Quá hạn", value: overdueCount, color: "text-rose-600" },
          { label: "Phạt chưa thu", value: formatCurrency(totalFines), color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-5">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportCards.map((card) => (
          <div key={card.title} className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-lg transition group">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[card.color]} text-white mb-4 group-hover:scale-110 transition`}>
              {card.icon}
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">{card.title}</h3>
            <p className="text-sm text-slate-500 mb-4">{card.desc}</p>
            <button onClick={card.onExport} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition">
              <Download className="w-4 h-4" /> Xuất CSV
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
