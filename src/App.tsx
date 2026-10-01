import { useState } from "react";
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
import AIChatPage from "@/pages/AIChatPage";
import AISummaryPage from "@/pages/AISummaryPage";
import AIRecommendPage from "@/pages/AIRecommendPage";
import SettingsPage from "@/pages/SettingsPage";
import { LoadingSpinner } from "@/components/UI";

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [page, setPage] = useState<PageKey>("dashboard");

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner label="Đang tải..." />
      </div>
    );
  }

  if (!session || !profile) {
    return <LoginPage />;
  }

  const isStaff = profile.role === "admin" || profile.role === "librarian";

  // Guard: readers can't access staff-only pages
  const staffOnly: PageKey[] = ["readers", "statistics", "reports", "settings"];
  if (!isStaff && staffOnly.includes(page)) {
    setPage("dashboard");
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
      case "ai-chat": return <AIChatPage />;
      case "ai-summary": return <AISummaryPage />;
      case "ai-recommend": return <AIRecommendPage />;
      case "settings": return profile?.role === "admin" ? <SettingsPage /> : <Dashboard onNavigate={setPage} />;
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
