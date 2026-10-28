import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import LoginPage from "@/pages/LoginPage";
import Layout, { type PageKey } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import BooksPage from "@/pages/BooksPage";
import ReadersPage from "@/pages/ReadersPage";
import LoansPage from "@/pages/LoansPage";
import ReservationsPage from "@/pages/ReservationsPage";
import StatisticsPage from "@/pages/StatisticsPage";
import ReportsPage from "@/pages/ReportsPage";
import AILibraryPage from "@/pages/AILibraryPage";
import SettingsPage from "@/pages/SettingsPage";
import AccountManagementPage from "@/pages/AccountManagementPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import LandingPage from "@/pages/LandingPage";
import { LoadingSpinner } from "@/components/UI";

function AppContent() {
  const { session, profile, loading, signOut } = useAuth();
  const isResetPasswordPage =
    window.location.pathname === "/reset-password";
  const [unauthView, setUnauthView] = useState<"landing" | "login">(
    window.location.pathname === "/login" ? "login" : "landing"
  );
  const [page, setPage] = useState<PageKey>("dashboard");

  const isStaff =
    profile?.role === "admin" || profile?.role === "librarian";

  useEffect(() => {
    if (!profile) return;

    const staffOnly: PageKey[] = [
      "readers",
      "statistics",
      "reports",
    ];

    const unauthorizedStaffPage =
      !isStaff && staffOnly.includes(page);

    const unauthorizedSettingsPage =
      page === "settings" && profile.role !== "admin";
    const unauthorizedAccountsPage =
      page === "accounts" && profile.role !== "admin";

    if (unauthorizedStaffPage || unauthorizedSettingsPage || unauthorizedAccountsPage) {
      setPage("dashboard");
    }
  }, [page, isStaff, profile]);

  if (isResetPasswordPage) {
    return <ResetPasswordPage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner label="Đang tải..." />
      </div>
    );
  }

  if (!session || !profile) {
    if (unauthView === "login") {
      return <LoginPage onBackToLanding={() => setUnauthView("landing")} />;
    }
    return <LandingPage onOpenDirectLogin={() => setUnauthView("login")} />;
  }

  if (profile.account_status === "locked") {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center p-5">
        <div className="max-w-md w-full bg-white border border-cream-300 rounded-3xl p-7 text-center shadow-warm">
          <h1 className="text-xl font-extrabold text-charcoal-900">Tài khoản đã bị khóa</h1>
          <p className="text-sm text-charcoal-600 mt-2">Bạn không thể sử dụng các chức năng thư viện. Hãy liên hệ quản trị viên nếu cần hỗ trợ.</p>
          <button onClick={() => void signOut()} className="mt-5 px-5 py-2.5 bg-butter hover:bg-butter-400 border border-butter-300 rounded-xl text-sm font-bold text-charcoal-900">Đăng xuất</button>
        </div>
      </div>
    );
  }

  function renderPage() {
    switch (page) {
      case "dashboard": return <Dashboard onNavigate={setPage} />;
      case "books": return <BooksPage />;
      case "readers": return isStaff ? <ReadersPage /> : <Dashboard onNavigate={setPage} />;
      case "loans": return <LoansPage />;
      case "reservations": return <ReservationsPage />;
      case "statistics": return isStaff ? <StatisticsPage /> : <Dashboard onNavigate={setPage} />;
      case "reports": return isStaff ? <ReportsPage /> : <Dashboard onNavigate={setPage} />;
      case "ai-library":
      case "ai-chat":
      case "ai-summary":
      case "ai-recommend": return <AILibraryPage />;
      case "settings": return profile?.role === "admin" ? <SettingsPage /> : <Dashboard onNavigate={setPage} />;
      case "accounts": return profile?.role === "admin" ? <AccountManagementPage /> : <Dashboard onNavigate={setPage} />;
      default: return <Dashboard onNavigate={setPage} />;
    }
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
