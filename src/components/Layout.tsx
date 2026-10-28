import { useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types";
import {
  LayoutDashboard,
  BookMarked,
  Users,
  ArrowLeftRight,
  CalendarClock,
  BarChart3,
  FileText,
  Sparkles,
  Bot,
  FileText as FileReport,
  LogOut,
  Menu,
  X,
  Library,
  Settings,
} from "lucide-react";

export type PageKey =
  | "dashboard"
  | "books"
  | "readers"
  | "loans"
  | "reservations"
  | "statistics"
  | "reports"
  | "ai-chat"
  | "ai-summary"
  | "ai-recommend"
  | "settings";

interface NavItem {
  key: PageKey;
  label: string;
  icon: ReactNode;
  roles: UserRole[];
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Tổng quan", icon: <LayoutDashboard className="w-5 h-5" />, roles: ["admin", "librarian", "reader"], group: "Chính" },
  { key: "books", label: "Quản lý sách", icon: <BookMarked className="w-5 h-5" />, roles: ["admin", "librarian", "reader"], group: "Quản lý" },
  { key: "readers", label: "Quản lý độc giả", icon: <Users className="w-5 h-5" />, roles: ["admin", "librarian"], group: "Quản lý" },
  { key: "loans", label: "Mượn / Trả sách", icon: <ArrowLeftRight className="w-5 h-5" />, roles: ["admin", "librarian", "reader"], group: "Quản lý" },
  { key: "reservations", label: "Đặt trước sách", icon: <CalendarClock className="w-5 h-5" />, roles: ["admin", "librarian", "reader"], group: "Quản lý" },
  { key: "statistics", label: "Thống kê", icon: <BarChart3 className="w-5 h-5" />, roles: ["admin", "librarian"], group: "Quản lý" },
  { key: "reports", label: "Báo cáo & Xuất", icon: <FileReport className="w-5 h-5" />, roles: ["admin", "librarian"], group: "Quản lý" },
  { key: "ai-chat", label: "AI Tra cứu sách", icon: <Bot className="w-5 h-5" />, roles: ["admin", "librarian", "reader"], group: "Trí tuệ nhân tạo" },
  { key: "ai-summary", label: "AI Tóm tắt sách", icon: <Sparkles className="w-5 h-5" />, roles: ["admin", "librarian", "reader"], group: "Trí tuệ nhân tạo" },
  { key: "ai-recommend", label: "AI Gợi ý sách", icon: <Sparkles className="w-5 h-5" />, roles: ["admin", "librarian", "reader"], group: "Trí tuệ nhân tạo" },
  { key: "settings", label: "Cài đặt", icon: <Settings className="w-5 h-5" />, roles: ["admin"], group: "Hệ thống" },
];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Quản trị viên",
  librarian: "Thủ thư",
  reader: "Độc giả",
};

export default function Layout({ currentPage, onNavigate, children }: { currentPage: PageKey; onNavigate: (p: PageKey) => void; children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = profile?.role || "reader";
  const items = NAV_ITEMS.filter((i) => i.roles.includes(role));
  const groups = [...new Set(items.map((i) => i.group))];

  const currentLabel = NAV_ITEMS.find((i) => i.key === currentPage)?.label || "";

  return (
    <div className="min-h-screen bg-ivory flex text-charcoal font-sans selection:bg-butter selection:text-charcoal-900">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#FFFDF7] text-charcoal flex flex-col z-40 transition-transform duration-300 border-r border-cream-300 shadow-warm-md ${
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className="flex items-center gap-3.5 px-6 py-5 border-b border-cream-200 bg-ivory-200/50">
          <div className="w-10 h-10 bg-gradient-to-tr from-butter to-cream-200 rounded-xl border border-butter-400/80 flex items-center justify-center shadow-warm-xs">
            <Library className="w-5 h-5 text-charcoal-900" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-charcoal-900 font-bold text-sm tracking-tight">SmartLib AI</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-butter-200 text-charcoal-800 border border-butter-400">
                PRO
              </span>
            </div>
            <p className="text-xs text-charcoal-500 font-medium">Thư viện Thông minh 4.0</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {groups.map((group) => (
            <div key={group} className="mb-5">
              <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-widest px-3 mb-2 font-mono">{group}</p>
              {items.filter((i) => i.group === group).map((item) => (
                <button
                  key={item.key}
                  onClick={() => { onNavigate(item.key); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1 ${
                    currentPage === item.key
                      ? "bg-cream-200/90 text-charcoal-900 font-bold border-l-4 border-butter shadow-warm-xs"
                      : "text-charcoal-600 hover:text-charcoal-900 hover:bg-cream-100/80"
                  }`}
                >
                  <span className={currentPage === item.key ? "text-butter-700" : "text-charcoal-400"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-cream-200 bg-ivory-100">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-cream-300 mb-2.5 shadow-warm-xs">
            <div className="w-9 h-9 bg-gradient-to-tr from-butter to-cream-200 border border-butter-400 rounded-full flex items-center justify-center text-charcoal-900 font-bold text-sm shadow-warm-xs">
              {profile?.full_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-charcoal-900 font-semibold truncate">{profile?.full_name}</p>
              <p className="text-xs text-charcoal-500 font-medium">{ROLE_LABELS[role]}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-500 hover:text-terracotta-600 hover:bg-cream-200/60 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất hệ thống
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 bg-charcoal-900/30 backdrop-blur-sm z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col bg-ivory">
        <header className="sticky top-0 z-20 bg-ivory/85 backdrop-blur-md border-b border-cream-300 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-warm-xs">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden text-charcoal-800 p-1.5 rounded-lg hover:bg-cream-200 transition">
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-lg font-bold text-charcoal-900 tracking-tight">{currentLabel}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-2 text-xs text-charcoal-600 font-medium bg-white px-3.5 py-1.5 rounded-xl border border-cream-300 shadow-warm-xs">
              <span className="w-2 h-2 rounded-full bg-sage" />
              {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}
            </span>
            <span className="text-xs px-3 py-1 rounded-full font-semibold bg-cream-200 text-charcoal-800 border border-cream-400">
              {ROLE_LABELS[role]}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 bg-ivory">{children}</main>
      </div>
    </div>
  );
}
