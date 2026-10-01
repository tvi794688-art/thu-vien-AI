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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col z-40 transition-transform duration-300 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Library className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Thư viện AI</p>
            <p className="text-xs text-slate-400">Quản lý thông minh</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {groups.map((group) => (
            <div key={group} className="mb-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">{group}</p>
              {items.filter((i) => i.group === group).map((item) => (
                <button
                  key={item.key}
                  onClick={() => { onNavigate(item.key); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5 ${
                    currentPage === item.key
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {profile?.full_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{profile?.full_name}</p>
              <p className="text-xs text-slate-400">{ROLE_LABELS[role]}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <LogOut className="w-5 h-5" /> Đăng xuất
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden text-slate-600">
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-lg font-semibold text-slate-800">{currentLabel}</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="hidden sm:inline">{new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}</span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
