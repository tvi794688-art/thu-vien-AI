import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Book } from "@/types";
import {
  Library,
  BookOpen,
  Sparkles,
  Bot,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  UserCheck,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  LogIn,
  UserPlus,
  X,
  Mail,
  Lock,
  User,
  Zap,
  BookmarkCheck,
  Award,
  Layers,
  Flame,
} from "lucide-react";

interface LandingPageProps {
  onOpenDirectLogin?: () => void;
}

export default function LandingPage({ onOpenDirectLogin }: LandingPageProps) {
  const { signIn, signUp, resetPassword } = useAuth();

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [readerType, setReaderType] = useState<"student" | "teacher" | "staff" | "guest">("student");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Books catalog state
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // AI Interactive Demo state
  const [activeAiDemoTab, setActiveAiDemoTab] = useState<"chat" | "summary" | "recommend">("chat");
  const [demoPrompt, setDemoPrompt] = useState("Gợi ý cho tôi các cuốn sách hay về Tư duy phản biện và Trí tuệ cảm xúc");
  const [demoResponse, setDemoResponse] = useState(
    "Dựa trên yêu cầu của bạn, hệ thống AI đề xuất 2 tác phẩm tiêu biểu trong thư viện: 'Tư Duy Nhanh Và Chậm' (Daniel Kahneman) và 'Trí Tuệ Cảm Xúc 2.0'. Cả hai cuốn hiện đều đang có sẵn tại kho tầng 2 để bạn mượn ngay hôm nay!"
  );

  // FAQ Accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Load books for preview
  useEffect(() => {
    async function fetchPreviewBooks() {
      try {
        setLoadingBooks(true);
        const { data, error } = await supabase
          .from("books")
          .select("*")
          .neq("status", "archived")
          .order("created_at", { ascending: false })
          .limit(8);

        if (error || !data || data.length === 0) {
          // Fallback rich sample books if table is empty
          setBooks([
            {
              id: "sample-1",
              book_code: "BK-CN-001",
              title: "Clean Code - Nghệ Thuật Viết Mã Sạch",
              author: "Robert C. Martin",
              category: "Công nghệ",
              publisher: "NXB Thông Tin & Truyền Thông",
              publish_year: 2022,
              isbn: "978-604-80-4567-8",
              quantity: 5,
              available: 3,
              description: "Cẩm nang kinh điển về kỹ thuật phát triển phần mềm và tối ưu mã nguồn cho lập trình viên.",
              cover_color: "blue",
              cover_url: "/covers/clean-code-agile-software-craftsmanship.jpg",
              created_at: new Date().toISOString(),
            },
            {
              id: "sample-2",
              book_code: "BK-KT-002",
              title: "Kinh Tế Học Hài Hước (Freakonomics)",
              author: "Steven D. Levitt & Stephen J. Dubner",
              category: "Kinh tế",
              publisher: "NXB Thế Giới",
              publish_year: 2021,
              isbn: "978-604-77-8912-3",
              quantity: 4,
              available: 2,
              description: "Khám phá góc khuất của thế giới thực qua lăng kính kinh tế học và tư duy khác biệt.",
              cover_color: "emerald",
              cover_url: "/covers/lap-trinh-va-cuoc-song.png",
              created_at: new Date().toISOString(),
            },
            {
              id: "sample-3",
              book_code: "BK-TL-003",
              title: "Tâm Lý Học Về Tiền (The Psychology of Money)",
              author: "Morgan Housel",
              category: "Tâm lý học",
              publisher: "NXB Trẻ",
              publish_year: 2023,
              isbn: "978-604-1-18920-4",
              quantity: 6,
              available: 4,
              description: "Những bài học vượt thời gian về sự giàu có, lòng tham và hạnh phúc qua hành vi con người.",
              cover_color: "amber",
              cover_url: "/covers/an-toan-bao-mat-thong-tin-mang.jpg",
              created_at: new Date().toISOString(),
            },
            {
              id: "sample-4",
              book_code: "BK-KH-004",
              title: "Vũ Trụ Trong Vỏ Hạt Dẻ",
              author: "Stephen Hawking",
              category: "Khoa học",
              publisher: "NXB Trẻ",
              publish_year: 2020,
              isbn: "978-604-1-12345-6",
              quantity: 3,
              available: 1,
              description: "Hành trình giải mã những bí ẩn sâu xa nhất của không thời gian và vật lý vũ trụ học.",
              cover_color: "violet",
              cover_url: "/covers/tri-tue-nhan-tao-trong-ky-nguyen-so.jpg",
              created_at: new Date().toISOString(),
            },
          ]);
        } else {
          setBooks(data);
        }
      } catch {
        // Fallback
      } finally {
        setLoadingBooks(false);
      }
    }

    fetchPreviewBooks();
  }, []);

  // Filter books
  const filteredBooks = books.filter((book) => {
    const matchesCategory = selectedCategory === "all" || book.category === selectedCategory;
    const matchesQuery =
      searchQuery.trim() === "" ||
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  // Handle Auth submission
  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setAuthError("Vui lòng nhập email.");
      setAuthLoading(false);
      return;
    }

    if (authMode === "signin") {
      const { error } = await signIn(trimmedEmail, password);
      if (error) {
        setAuthError(error);
      } else {
        setAuthModalOpen(false);
      }
    } else {
      if (password.length < 6) {
        setAuthError("Mật khẩu phải có ít nhất 6 ký tự");
        setAuthLoading(false);
        return;
      }
      if (!fullName.trim()) {
        setAuthError("Vui lòng nhập họ và tên");
        setAuthLoading(false);
        return;
      }

      const { error } = await signUp(trimmedEmail, password, fullName.trim(), readerType);
      if (error) {
        setAuthError(error);
      } else {
        setAuthError("Tạo tài khoản thành công! Vui lòng đăng nhập với tài khoản vừa tạo.");
        setAuthMode("signin");
      }
    }
    setAuthLoading(false);
  }

  // Handle forgot password
  async function handleForgotPassword() {
    setAuthError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setAuthError("Vui lòng nhập email của bạn trước khi bấm Quên mật khẩu.");
      return;
    }
    setAuthLoading(true);
    const { error } = await resetPassword(trimmedEmail);
    if (error) {
      setAuthError(error);
    } else {
      setAuthError("Đã gửi email khôi phục mật khẩu. Vui lòng kiểm tra hộp thư của bạn.");
    }
    setAuthLoading(false);
  }

  function openAuth(mode: "signin" | "signup") {
    setAuthMode(mode);
    setAuthError(null);
    setAuthModalOpen(true);
  }

  const faqs = [
    {
      q: "Ai có thể đăng ký sử dụng hệ thống thư viện SmartLib AI?",
      a: "Tất cả học sinh, sinh viên, giáo viên, cán bộ nhân viên và bạn đọc tự do đều có thể đăng ký tài khoản trực tuyến hoàn toàn miễn phí chỉ trong 30 giây bằng địa chỉ email.",
    },
    {
      q: "Tính năng AI hỗ trợ người đọc như thế nào?",
      a: "SmartLib AI tích hợp mô hình trí tuệ nhân tạo Gemini AI giúp bạn tra cứu sách bằng ngôn ngữ tự nhiên, tóm tắt nhanh nội dung cuốn sách trước khi mượn, và tự động đề xuất lộ trình đọc theo sở thích cá nhân.",
    },
    {
      q: "Nếu sách tôi cần đang được người khác mượn thì sao?",
      a: "Hệ thống có cơ chế xếp hàng đặt trước tự động (FIFO). Bạn chỉ cần bấm 'Đặt trước', hệ thống sẽ ghi nhận thứ tự ưu tiên của bạn và gửi thông báo ngay khi sách được hoàn trả về kho.",
    },
    {
      q: "Thời hạn mượn và cách tính phí phạt quá hạn được quy định ra sao?",
      a: "Thời hạn mượn thông thường từ 14 - 30 ngày tùy theo loại độc giả (học sinh, giáo viên). Nếu quá hạn, hệ thống tính phí phạt minh bạch theo múi giờ Việt Nam và hiển thị chi tiết trên bảng điều khiển cá nhân.",
    },
    {
      q: "Tôi có thể mượn sách trực tiếp hay chỉ đọc online?",
      a: "Bạn có thể tra cứu, đặt giữ chỗ sách online trước trên website để đảm bảo sách không bị người khác mượn mất, sau đó đến quầy thư viện đọc mã nhận sách nhanh chóng trong vòng 30 giây.",
    },
  ];

  const categoriesList = ["all", "Công nghệ", "Kinh tế", "Tâm lý học", "Văn học", "Khoa học"];

  return (
    <div className="min-h-screen bg-ivory text-charcoal selection:bg-butter selection:text-charcoal-900 relative overflow-x-hidden font-sans">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute top-0 left-1/4 w-[650px] h-[650px] bg-butter-200/40 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[650px] right-10 w-[550px] h-[550px] bg-cream-300/45 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-[1800px] left-10 w-[600px] h-[600px] bg-sage-200/30 rounded-full blur-[140px] pointer-events-none" />

      {/* 1. STICKY NAVBAR */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-ivory/90 border-b border-cream-300 shadow-warm-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <a href="#" className="flex items-center gap-3.5 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-butter to-cream-200 border border-butter-400/80 p-0.5 shadow-warm-xs group-hover:scale-105 transition-transform flex items-center justify-center">
              <Library className="w-6 h-6 text-charcoal-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-charcoal-900">SmartLib</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-butter-200 text-charcoal-800 border border-butter-400">
                  AI 4.0
                </span>
              </div>
              <p className="text-xs text-charcoal-500 font-medium hidden sm:block">Thư viện Hàn lâm & Trợ lý Trí tuệ Nhân tạo</p>
            </div>
          </a>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-charcoal-600">
            <a href="#features" className="hover:text-charcoal-950 transition-colors">
              Tính năng
            </a>
            <a href="#ai-hub" className="hover:text-charcoal-950 transition-colors flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-butter-700" /> AI Hub
            </a>
            <a href="#catalog" className="hover:text-charcoal-950 transition-colors">
              Kho sách
            </a>
            <a href="#workflow" className="hover:text-charcoal-950 transition-colors">
              Quy trình
            </a>
            <a href="#roles" className="hover:text-charcoal-950 transition-colors">
              Đối tượng
            </a>
            <a href="#faq" className="hover:text-charcoal-950 transition-colors">
              Hỏi đáp
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => openAuth("signin")}
              className="px-4 py-2 rounded-xl text-sm font-bold text-charcoal-800 hover:text-charcoal-950 bg-white hover:bg-cream-100 border border-cream-300 transition-all flex items-center gap-2 shadow-warm-xs"
            >
              <LogIn className="w-4 h-4 text-butter-700" />
              <span>Đăng nhập</span>
            </button>
            <button
              onClick={() => openAuth("signup")}
              className="px-5 py-2.5 rounded-xl text-sm font-extrabold text-charcoal-900 bg-butter hover:bg-butter-400 border border-butter-400 shadow-warm-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-charcoal-900" />
              <span>Đăng ký ngay</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headlines & CTAs */}
            <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cream-200 border border-cream-400 text-charcoal-800 text-xs sm:text-sm font-bold shadow-warm-xs">
                <span className="flex h-2 w-2 rounded-full bg-butter-500 animate-ping" />
                <span>Nền tảng Thư viện Hàn lâm 4.0 Tích Hợp Google Gemini AI</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-charcoal-900 leading-[1.15]">
                Quản Lý Thư Viện Hiện Đại <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-butter-600 via-butter-500 to-charcoal-900">
                  Khai Phóng Tri Thức Với AI
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-charcoal-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Giải pháp số hóa toàn diện cho thư viện nhà trường và tổ chức. Tự động hóa 100% quy trình mượn -
                trả, xếp hàng đặt trước FIFO công bằng, cùng trợ lý AI thông minh hỗ trợ tra cứu và tóm tắt sách trong 3 giây.
              </p>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => openAuth("signup")}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-base font-extrabold text-charcoal-900 bg-butter hover:bg-butter-400 border border-butter-400 shadow-warm-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 group"
                >
                  <Sparkles className="w-5 h-5 text-charcoal-900 group-hover:rotate-12 transition-transform" />
                  <span>Trải nghiệm miễn phí</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <a
                  href="#catalog"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-base font-bold text-charcoal-800 hover:text-charcoal-950 bg-white hover:bg-cream-100 border border-cream-300 transition-all flex items-center justify-center gap-2 shadow-warm-xs"
                >
                  <BookOpen className="w-5 h-5 text-butter-700" />
                  <span>Khám phá kho sách</span>
                </a>
              </div>

              {/* Trust Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-cream-300">
                <div className="text-left">
                  <div className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">10,000+</div>
                  <div className="text-xs text-charcoal-500 font-medium mt-0.5">Đầu sách & Giáo trình</div>
                </div>
                <div className="text-left">
                  <div className="text-2xl sm:text-3xl font-extrabold text-butter-700 tracking-tight">3 Giây</div>
                  <div className="text-xs text-charcoal-500 font-medium mt-0.5">AI tóm tắt nội dung</div>
                </div>
                <div className="text-left">
                  <div className="text-2xl sm:text-3xl font-extrabold text-sage-700 tracking-tight">100% FIFO</div>
                  <div className="text-xs text-charcoal-500 font-medium mt-0.5">Xếp hàng giữ chỗ sách</div>
                </div>
                <div className="text-left">
                  <div className="text-2xl sm:text-3xl font-extrabold text-sage-600 tracking-tight">0đ Phạt</div>
                  <div className="text-xs text-charcoal-500 font-medium mt-0.5">Nhắc hẹn trả tự động</div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Graphic */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                {/* Decorative Aura */}
                <div className="absolute -inset-1.5 bg-gradient-to-r from-butter-200 via-cream-200 to-sage-200 rounded-3xl blur-xl opacity-60 animate-pulse-slow" />

                {/* Main Card Container */}
                <div className="relative rounded-3xl overflow-hidden border border-cream-300 bg-white shadow-warm-lg">
                  {/* Top Bar of Graphic */}
                  <div className="px-4 py-3 bg-ivory-200/80 border-b border-cream-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-terracotta" />
                      <div className="w-3 h-3 rounded-full bg-butter-500" />
                      <div className="w-3 h-3 rounded-full bg-sage" />
                      <span className="ml-2 text-xs font-mono text-charcoal-600 font-medium">smartlib-academic-v4.0</span>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-sage-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-sage animate-ping" />
                      Sẵn sàng
                    </span>
                  </div>

                  {/* Hero Showcase Image */}
                  <div className="relative h-60 sm:h-72 overflow-hidden">
                    <img
                      src="/hero-library.jpg"
                      alt="Không gian thư viện thông minh 4.0"
                      className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 via-transparent to-transparent" />

                    {/* Floating Overlay Badge */}
                    <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-cream-300 flex items-center justify-between shadow-warm-md">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cream-200 border border-butter-400 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-butter-700" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-charcoal-900">Trợ lý AI Đang Trực Tuyến</p>
                          <p className="text-[11px] text-charcoal-500 font-medium">Sẵn sàng gợi ý & giải đáp câu hỏi của bạn</p>
                        </div>
                      </div>
                      <button
                        onClick={() => openAuth("signin")}
                        className="px-3.5 py-1.5 rounded-xl bg-butter hover:bg-butter-400 border border-butter-400 text-xs font-extrabold text-charcoal-900 transition-colors shadow-warm-xs"
                      >
                        Thử ngay
                      </button>
                    </div>
                  </div>

                  {/* Mini Interactive Preview Bottom */}
                  <div className="p-5 space-y-3 bg-ivory-100/70">
                    <div className="text-xs font-bold text-charcoal-600 uppercase tracking-wider">
                      Tìm kiếm ngữ nghĩa thông minh:
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-cream-300 text-sm shadow-warm-xs">
                      <Search className="w-4 h-4 text-butter-700 flex-shrink-0" />
                      <span className="text-charcoal-800 text-xs sm:text-sm font-medium">
                        "Sách khởi nghiệp và lãnh đạo doanh nghiệp số"
                      </span>
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-cream-200 text-charcoal-800 font-mono border border-cream-400 font-semibold">
                        Gemini AI
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white border border-cream-300 flex items-center gap-2 shadow-warm-xs">
                        <BookmarkCheck className="w-4 h-4 text-sage-600" />
                        <span className="text-charcoal-700 font-semibold">Khả dụng: 14 cuốn</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-cream-300 flex items-center gap-2 shadow-warm-xs">
                        <Clock className="w-4 h-4 text-butter-700" />
                        <span className="text-charcoal-700 font-semibold">Hạn mượn: 14 ngày</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. AI CAPABILITIES SHOWCASE SECTION */}
      <section id="ai-hub" className="py-24 bg-[#FFFDF7] border-t border-b border-cream-300 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cream-200 border border-cream-400 text-charcoal-800 text-xs font-bold uppercase tracking-wider shadow-warm-xs">
              <Sparkles className="w-3.5 h-3.5 text-butter-700" />
              Công nghệ Đột Phá
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-charcoal-900 tracking-tight">
              Sức Mạnh Trí Tuệ Nhân Tạo{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-butter-600 via-butter-500 to-charcoal-900">
                Thế Hệ Mới
              </span>
            </h2>
            <p className="text-charcoal-600 text-base sm:text-lg">
              Không chỉ đơn thuần quản lý kho, SmartLib AI mang đến trợ lý đọc thông minh giúp bạn tiếp thu tri thức
              nhanh chóng và hiệu quả hơn bao giờ hết.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: AI Image Visual */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden border border-cream-300 shadow-warm-lg group bg-white">
                <img
                  src="/ai-book-feature.jpg"
                  alt="AI Quét và phân tích sách thông minh"
                  className="w-full h-80 sm:h-96 object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/50 via-transparent to-transparent opacity-70" />

                {/* Floating Tags */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/90 text-charcoal-800 border border-cream-300 text-xs font-bold backdrop-blur-md shadow-warm-xs">
                    ⚡ Natural Language Processing
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/90 text-charcoal-800 border border-cream-300 text-xs font-bold backdrop-blur-md shadow-warm-xs">
                    🧠 Semantic Vector Search
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-cream-300 shadow-warm-md">
                  <div className="text-xs font-extrabold text-charcoal-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-butter-700" /> Tóm tắt siêu tốc 3 giây
                  </div>
                  <p className="text-[11px] text-charcoal-600 mt-1 font-medium">
                    Trích xuất 3 ý tưởng cốt lõi, bài học then chốt và đối tượng phù hợp của cuốn sách.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive AI Demo Box */}
            <div className="lg:col-span-7 space-y-6">
              {/* Feature Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  onClick={() => {
                    setActiveAiDemoTab("chat");
                    setDemoPrompt("Gợi ý cho tôi các cuốn sách hay về Tư duy phản biện và Trí tuệ cảm xúc");
                    setDemoResponse(
                      "Dựa trên yêu cầu của bạn, hệ thống đề xuất: 'Tư Duy Nhanh Và Chậm' (Daniel Kahneman) và 'Trí Tuệ Cảm Xúc 2.0'. Bạn có thể mượn ngay tại quầy hoặc đọc tóm tắt AI trực tuyến!"
                    );
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    activeAiDemoTab === "chat"
                      ? "bg-butter border-butter-400 shadow-warm-xs font-bold"
                      : "bg-white border-cream-300 hover:border-butter-400 hover:bg-cream-50 shadow-warm-xs"
                  }`}
                >
                  <Bot className="w-6 h-6 text-charcoal-900 mb-2" />
                  <h3 className="font-extrabold text-charcoal-900 text-sm">Hỏi đáp Sách AI</h3>
                  <p className="text-xs text-charcoal-600 mt-1 font-medium">Tra cứu bằng ngôn ngữ tự nhiên như đang trò chuyện.</p>
                </div>

                <div
                  onClick={() => {
                    setActiveAiDemoTab("summary");
                    setDemoPrompt("Tóm tắt ngắn gọn cuốn sách Clean Code - Nghệ Thuật Viết Mã Sạch");
                    setDemoResponse(
                      "Clean Code của Robert C. Martin nhấn mạnh: Viết mã để con người đọc được quan trọng hơn cho máy chạy. 3 bài học chính: 1) Đặt tên có nghĩa, 2) Hàm ngắn gọn làm 1 việc duy nhất, 3) Viết unit test liên tục."
                    );
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    activeAiDemoTab === "summary"
                      ? "bg-butter border-butter-400 shadow-warm-xs font-bold"
                      : "bg-white border-cream-300 hover:border-butter-400 hover:bg-cream-50 shadow-warm-xs"
                  }`}
                >
                  <Sparkles className="w-6 h-6 text-charcoal-900 mb-2" />
                  <h3 className="font-extrabold text-charcoal-900 text-sm">Tóm tắt Thông minh</h3>
                  <p className="text-xs text-charcoal-600 mt-1 font-medium">Nắm bắt tinh hoa cuốn sách chỉ trong 2 phút đọc.</p>
                </div>

                <div
                  onClick={() => {
                    setActiveAiDemoTab("recommend");
                    setDemoPrompt("Tôi là sinh viên năm nhất ngành CNTT, nên bắt đầu với sách nào?");
                    setDemoResponse(
                      "Đề xuất khởi đầu hoàn hảo: 'Code Dạo Ký Sự' để hiểu nghề, tiếp nối bởi 'Cấu Trúc Dữ Liệu & Giải Thuật' và 'Tư Duy Lập Trình Hiện Đại'. Hệ thống có sẵn tại thư viện trường."
                    );
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    activeAiDemoTab === "recommend"
                      ? "bg-butter border-butter-400 shadow-warm-xs font-bold"
                      : "bg-white border-cream-300 hover:border-butter-400 hover:bg-cream-50 shadow-warm-xs"
                  }`}
                >
                  <TrendingUp className="w-6 h-6 text-charcoal-900 mb-2" />
                  <h3 className="font-extrabold text-charcoal-900 text-sm">Gợi ý Theo Hồ sơ</h3>
                  <p className="text-xs text-charcoal-600 mt-1 font-medium">Đề xuất lộ trình đọc theo chuyên ngành & mục tiêu.</p>
                </div>
              </div>

              {/* Interactive Demo Terminal */}
              <div className="rounded-3xl bg-white border border-cream-300 p-6 space-y-4 shadow-warm-md">
                <div className="flex items-center justify-between border-b border-cream-200 pb-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-charcoal-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-butter-500" />
                    Bản Demo Trực Tiếp Trợ Lý AI:
                  </div>
                  <span className="text-[11px] text-charcoal-500 font-medium">Click chọn 1 chủ đề phía trên để thử</span>
                </div>

                {/* Prompt Box */}
                <div className="p-3.5 rounded-2xl bg-ivory-200/70 border border-cream-300 flex items-start gap-3">
                  <User className="w-4 h-4 text-charcoal-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs sm:text-sm text-charcoal-800 font-medium">{demoPrompt}</div>
                </div>

                {/* Response Box */}
                <div className="p-4 rounded-2xl bg-cream-100/70 border border-cream-300 flex items-start gap-3">
                  <Bot className="w-5 h-5 text-butter-700 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1.5">
                    <div className="text-xs font-extrabold text-charcoal-900">SmartLib AI Assistant:</div>
                    <p className="text-xs sm:text-sm text-charcoal-700 leading-relaxed font-normal">{demoResponse}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-charcoal-500 font-medium">Đăng nhập tài khoản để chat không giới hạn với AI</span>
                  <button
                    onClick={() => openAuth("signin")}
                    className="px-4 py-2 rounded-xl bg-butter hover:bg-butter-400 border border-butter-400 text-xs font-extrabold text-charcoal-900 transition-colors flex items-center gap-1.5 shadow-warm-xs"
                  >
                    <span>Mở tính năng đầy đủ</span>
                    <ChevronRight className="w-3.5 h-3.5 text-charcoal-900" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. COMPREHENSIVE FEATURES GRID */}
      <section id="features" className="py-24 relative bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cream-200 border border-cream-400 text-charcoal-800 text-xs font-bold uppercase tracking-wider shadow-warm-xs">
              <Layers className="w-3.5 h-3.5 text-butter-700" />
              Tính Năng Vượt Trội
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-charcoal-900 tracking-tight">
              Hệ Sinh Thái Quản Lý Toàn Diện & Chuẩn Mực
            </h2>
            <p className="text-charcoal-600 text-base sm:text-lg">
              Được thiết kế tối ưu hóa cho cả người đọc lẫn thủ thư, giảm thiểu tối đa sai sót thủ công và nâng cao trải nghiệm học thuật.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-7 rounded-3xl bg-white border border-cream-300 hover:border-butter-400 hover:shadow-warm-md transition-all duration-300 shadow-warm-xs group">
              <div className="w-12 h-12 rounded-2xl bg-cream-200 border border-cream-300 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform text-butter-700">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-charcoal-900 mb-2">Mượn - Trả & Gia Hạn Online</h3>
              <p className="text-sm text-charcoal-600 leading-relaxed font-normal">
                Đăng ký mượn trước trên mọi thiết bị. Tính toán hạn trả chính xác theo múi giờ Việt Nam và hỗ trợ gia hạn
                sách nhanh chóng chỉ với 1 chạm.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-7 rounded-3xl bg-white border border-cream-300 hover:border-butter-400 hover:shadow-warm-md transition-all duration-300 shadow-warm-xs group">
              <div className="w-12 h-12 rounded-2xl bg-cream-200 border border-cream-300 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform text-butter-700">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-charcoal-900 mb-2">Hàng Đợi Đặt Trước FIFO</h3>
              <p className="text-sm text-charcoal-600 leading-relaxed font-normal">
                Thuật toán xếp hàng công bằng tự động kích hoạt lượt mượn cho độc giả tiếp theo ngay khi cuốn sách được
                trả về kho, không cần thủ thư can thiệp.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-7 rounded-3xl bg-white border border-cream-300 hover:border-butter-400 hover:shadow-warm-md transition-all duration-300 shadow-warm-xs group">
              <div className="w-12 h-12 rounded-2xl bg-cream-200 border border-cream-300 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform text-butter-700">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-charcoal-900 mb-2">Quản Lý Phạt Minh Bạch</h3>
              <p className="text-sm text-charcoal-600 leading-relaxed font-normal">
                Hệ thống tự động phát hiện sách quá hạn, tính phí phạt chính xác theo ngày và lưu trữ lịch sử nộp phạt rõ
                ràng cho cả độc giả và thủ thư.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-7 rounded-3xl bg-white border border-cream-300 hover:border-butter-400 hover:shadow-warm-md transition-all duration-300 shadow-warm-xs group">
              <div className="w-12 h-12 rounded-2xl bg-cream-200 border border-cream-300 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform text-butter-700">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-charcoal-900 mb-2">Phân Loại Độc Giả Đa Dạng</h3>
              <p className="text-sm text-charcoal-600 leading-relaxed font-normal">
                Hỗ trợ 4 nhóm đối tượng: Học sinh, Giáo viên, Nhân viên, Khách. Mỗi nhóm có chính sách số lượng sách và
                thời hạn mượn linh hoạt theo quy định thư viện.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-7 rounded-3xl bg-white border border-cream-300 hover:border-butter-400 hover:shadow-warm-md transition-all duration-300 shadow-warm-xs group">
              <div className="w-12 h-12 rounded-2xl bg-cream-200 border border-cream-300 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform text-butter-700">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-charcoal-900 mb-2">Báo Cáo & Thống Kê Realtime</h3>
              <p className="text-sm text-charcoal-600 leading-relaxed font-normal">
                Biểu đồ thống kê trực quan về tỉ lệ mượn trả, đầu sách mượn nhiều nhất, tình trạng kho sách và xuất báo cáo
                dữ liệu phục vụ quản lý nhà trường.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-7 rounded-3xl bg-white border border-cream-300 hover:border-butter-400 hover:shadow-warm-md transition-all duration-300 shadow-warm-xs group">
              <div className="w-12 h-12 rounded-2xl bg-cream-200 border border-cream-300 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform text-butter-700">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-charcoal-900 mb-2">Bảo Mật Cấp Doanh Nghiệp</h3>
              <p className="text-sm text-charcoal-600 leading-relaxed font-normal">
                Ứng dụng cơ chế Row-Level Security (RLS) trên nền tảng Supabase Cloud. Dữ liệu độc giả và phiếu mượn được mã hóa và phân quyền tuyệt đối an toàn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE BOOK CATALOG PREVIEW */}
      <section id="catalog" className="py-24 bg-[#FFFDF7] text-charcoal border-t border-cream-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cream-200 border border-cream-400 text-charcoal-800 text-xs font-bold uppercase tracking-wider shadow-warm-xs">
                <BookOpen className="w-3.5 h-3.5 text-butter-700" />
                Kho Tri Thức Trực Tuyến
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-charcoal-900 tracking-tight">Khám Phá Sách Nổi Bật</h2>
              <p className="text-charcoal-600 text-sm sm:text-base max-w-xl">
                Duyệt qua danh mục các đầu sách đang có sẵn tại thư viện. Bạn có thể tra cứu và đặt mượn giữ chỗ ngay online.
              </p>
            </div>

            {/* Search Input on Landing Page */}
            <div className="w-full md:w-80">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên sách, tác giả..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-cream-300 text-charcoal-900 placeholder-charcoal-400 text-sm focus:outline-none focus:border-butter-500 transition-colors shadow-warm-xs"
                />
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
            {categoriesList.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-butter text-charcoal-900 shadow-warm-xs border border-butter-400/80 font-bold"
                    : "bg-white text-charcoal-700 hover:bg-cream-100 border border-cream-300"
                }`}
              >
                {cat === "all" ? "Tất cả thể loại" : cat}
              </button>
            ))}
          </div>

          {/* Books Grid */}
          {loadingBooks ? (
            <div className="py-20 text-center text-charcoal-600">
              <div className="w-8 h-8 border-2 border-butter-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Đang tải danh mục sách...</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="py-16 text-center text-charcoal-600 bg-white rounded-3xl border border-cream-300 shadow-warm-xs">
              <BookOpen className="w-12 h-12 text-cream-400 mx-auto mb-3" />
              <p className="text-base font-bold text-charcoal-900">Không tìm thấy cuốn sách nào phù hợp</p>
              <p className="text-xs text-charcoal-500 mt-1">Vui lòng thử từ khóa khác hoặc chọn tất cả thể loại</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredBooks.map((book) => {
                const isAvailable = (book.available ?? 0) > 0;
                return (
                  <div
                    key={book.id}
                    className="rounded-3xl bg-white border border-cream-300 hover:border-butter-400 transition-all flex flex-col overflow-hidden group hover:-translate-y-1 shadow-warm-xs hover:shadow-warm-md"
                  >
                    {/* Book Cover Showcase */}
                    <div className="relative w-full h-52 bg-gradient-to-b from-ivory-200 via-cream-100/50 to-ivory-100 p-3 flex items-center justify-center overflow-hidden border-b border-cream-200 group-hover:bg-cream-100 transition-all">
                      {book.cover_url ? (
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="h-full w-auto max-w-full object-contain rounded-lg shadow-warm-sm transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-28 h-40 rounded-xl bg-cream-200 text-charcoal-900 flex flex-col items-center justify-center p-3 text-center shadow-warm-xs border border-cream-400 transition-transform duration-300 group-hover:scale-105 relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/10 border-r border-white/40" />
                          <BookOpen className="w-7 h-7 mb-2 text-butter-700 opacity-90" />
                          <span className="font-serif font-bold text-xs line-clamp-2 leading-tight opacity-95 pl-1">{book.title}</span>
                        </div>
                      )}
                      <span className="absolute top-2.5 right-2.5 text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-white/90 text-charcoal-800 border border-cream-300 shadow-warm-xs backdrop-blur-sm">
                        {book.category || "Chung"}
                      </span>
                    </div>

                    {/* Book Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="text-[11px] font-mono text-charcoal-400 font-semibold mb-1">{book.book_code}</div>
                        <h4 className="text-base font-serif font-bold text-charcoal-900 line-clamp-2 min-h-[3rem] group-hover:text-butter-800 transition-colors">
                          {book.title}
                        </h4>
                        <p className="text-xs text-charcoal-600 font-medium mt-1 line-clamp-1">Tác giả: {book.author}</p>
                        {book.description && (
                          <p className="text-xs text-charcoal-500 mt-2 line-clamp-2 leading-relaxed">
                            {book.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-cream-200 flex items-center justify-between">
                        <div>
                          {isAvailable ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sage-800">
                              <span className="w-2 h-2 rounded-full bg-sage" />
                              Còn {book.available} cuốn
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-400">
                              <span className="w-2 h-2 rounded-full bg-charcoal-300" />
                              Đang hết sách
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => openAuth("signin")}
                          className="px-3.5 py-1.5 rounded-xl bg-butter hover:bg-butter-400 text-charcoal-900 text-xs font-extrabold transition-all shadow-warm-xs border border-butter-400"
                        >
                          {isAvailable ? "Mượn sách" : "Đặt giữ chỗ"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CTA under catalog */}
          <div className="mt-12 text-center">
            <button
              onClick={() => openAuth("signup")}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-cream-100 border border-cream-300 text-sm font-extrabold text-charcoal-900 transition-all shadow-warm-xs"
            >
              <Sparkles className="w-4 h-4 text-butter-700" />
              <span>Đăng ký độc giả để khám phá hơn 10,000+ đầu sách khác</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 6. WORKFLOW: 4 BƯỚC ĐƠN GIẢN */}
      <section id="workflow" className="py-24 relative bg-ivory border-t border-cream-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cream-200 border border-cream-400 text-charcoal-800 text-xs font-bold uppercase tracking-wider shadow-warm-xs">
              <Clock className="w-3.5 h-3.5 text-butter-700" />
              Quy Trình 4 Bước
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-charcoal-900 tracking-tight">Mượn Sách Chưa Bao Giờ Dễ Dàng Đến Thế</h2>
            <p className="text-charcoal-600 text-base sm:text-lg">
              Trải nghiệm quy trình khép kín từ lúc tìm kiếm trên điện thoại đến khi nhận sách tận tay tại quầy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-3xl bg-white border border-cream-300 relative space-y-4 shadow-warm-xs hover:shadow-warm-md hover:border-butter-400 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-butter to-cream-200 text-charcoal-900 font-extrabold text-lg flex items-center justify-center border border-butter-400 shadow-warm-xs">
                01
              </div>
              <h3 className="text-lg font-bold text-charcoal-900">Đăng Ký Tài Khoản</h3>
              <p className="text-sm text-charcoal-600 leading-relaxed font-normal">
                Tạo tài khoản độc giả nhanh chóng với email. Phân nhóm học sinh, giáo viên tự động kích hoạt quyền lợi tương ứng.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl bg-white border border-cream-300 relative space-y-4 shadow-warm-xs hover:shadow-warm-md hover:border-butter-400 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-butter to-cream-200 text-charcoal-900 font-extrabold text-lg flex items-center justify-center border border-butter-400 shadow-warm-xs">
                02
              </div>
              <h3 className="text-lg font-bold text-charcoal-900">Tìm Kiếm & Hỏi AI</h3>
              <p className="text-sm text-charcoal-600 leading-relaxed font-normal">
                Tra cứu tên sách hoặc nhờ trợ lý AI tóm tắt trước nội dung, tư vấn lộ trình đọc sách phù hợp với bạn.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-3xl bg-white border border-cream-300 relative space-y-4 shadow-warm-xs hover:shadow-warm-md hover:border-butter-400 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-butter to-cream-200 text-charcoal-900 font-extrabold text-lg flex items-center justify-center border border-butter-400 shadow-warm-xs">
                03
              </div>
              <h3 className="text-lg font-bold text-charcoal-900">Đặt Giữ Chỗ Online</h3>
              <p className="text-sm text-charcoal-600 leading-relaxed font-normal">
                Bấm mượn hoặc xếp hàng đặt trước FIFO nếu sách đang hết. Hệ thống tự động giữ sách cho bạn trong 24 giờ.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-3xl bg-white border border-cream-300 relative space-y-4 shadow-warm-xs hover:shadow-warm-md hover:border-butter-400 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-butter to-cream-200 text-charcoal-900 font-extrabold text-lg flex items-center justify-center border border-butter-400 shadow-warm-xs">
                04
              </div>
              <h3 className="text-lg font-bold text-charcoal-900">Nhận Sách & Đọc</h3>
              <p className="text-sm text-charcoal-600 leading-relaxed font-normal">
                Đến quầy thư viện đọc mã nhận sách trong 30 giây. Theo dõi hạn trả trên màn hình để chủ động gia hạn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. TARGET AUDIENCES & ROLES */}
      <section id="roles" className="py-24 bg-[#FFFDF7] border-t border-cream-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cream-200 border border-cream-400 text-charcoal-800 text-xs font-bold uppercase tracking-wider shadow-warm-xs">
              <UserCheck className="w-3.5 h-3.5 text-butter-700" />
              Đối Tượng Phục Vụ
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-charcoal-900 tracking-tight">Giải Pháp Cho Mọi Thành Viên</h2>
            <p className="text-charcoal-600 text-base sm:text-lg">
              Tối ưu hóa trải nghiệm cho cả bạn đọc học thuật lẫn đội ngũ thủ thư quản lý.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* For Readers */}
            <div className="p-8 rounded-3xl bg-white border border-cream-300 space-y-6 shadow-warm-md hover:border-butter-300 transition-all">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream-200 text-charcoal-800 text-xs font-bold border border-cream-300">
                Dành cho Độc giả
              </div>
              <h3 className="text-2xl font-bold text-charcoal-900">Học Sinh, Sinh Viên & Giảng Viên</h3>
              <ul className="space-y-3.5 text-sm text-charcoal-700">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-sage flex-shrink-0 mt-0.5" />
                  <span>Tra cứu sách mọi lúc mọi nơi từ điện thoại và máy tính.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-sage flex-shrink-0 mt-0.5" />
                  <span>Hỏi đáp trực tiếp với trợ lý Gemini AI để tìm ý tưởng cho bài nghiên cứu.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-sage flex-shrink-0 mt-0.5" />
                  <span>Đặt giữ chỗ tự động và nhận thông báo khi có người trả sách.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-sage flex-shrink-0 mt-0.5" />
                  <span>Theo dõi lịch sử mượn trả và gia hạn thời gian mượn trực tuyến.</span>
                </li>
              </ul>
              <button
                onClick={() => openAuth("signup")}
                className="w-full py-3.5 rounded-2xl bg-butter hover:bg-butter-400 border border-butter-400 text-charcoal-900 font-extrabold text-sm transition-colors shadow-warm-xs"
              >
                Đăng ký tài khoản độc giả
              </button>
            </div>

            {/* For Librarians */}
            <div className="p-8 rounded-3xl bg-white border border-cream-300 space-y-6 shadow-warm-md hover:border-butter-300 transition-all">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-butter-200 text-charcoal-900 text-xs font-bold border border-butter-400">
                Dành cho Quản lý
              </div>
              <h3 className="text-2xl font-bold text-charcoal-900">Thủ Thư & Ban Giám Hiệu</h3>
              <ul className="space-y-3.5 text-sm text-charcoal-700">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-sage flex-shrink-0 mt-0.5" />
                  <span>Số hóa toàn bộ sổ sách giấy tờ, loại bỏ nguy cơ thất lạc dữ liệu.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-sage flex-shrink-0 mt-0.5" />
                  <span>Quản lý mượn - trả và tính phí phạt tự động theo ngày quá hạn.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-sage flex-shrink-0 mt-0.5" />
                  <span>Báo cáo thống kê thời gian thực phục vụ đánh giá tiêu chuẩn trường chuẩn quốc gia.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-sage flex-shrink-0 mt-0.5" />
                  <span>Cơ chế bảo mật RLS phân quyền chặt chẽ giữa thủ thư và độc giả.</span>
                </li>
              </ul>
              <button
                onClick={() => openAuth("signin")}
                className="w-full py-3.5 rounded-2xl bg-butter hover:bg-butter-400 border border-butter-400 text-charcoal-900 font-extrabold text-sm transition-colors shadow-warm-xs"
              >
                Đăng nhập tài khoản quản trị
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ ACCORDION */}
      <section id="faq" className="py-24 relative bg-ivory border-t border-cream-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cream-200 border border-cream-400 text-charcoal-800 text-xs font-bold uppercase tracking-wider shadow-warm-xs">
              <HelpCircle className="w-3.5 h-3.5 text-butter-700" />
              Giải Đáp Thắc Mắc
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-charcoal-900 tracking-tight">Câu Hỏi Thường Gặp</h2>
            <p className="text-charcoal-600 text-base">Mọi điều bạn cần biết về chính sách và cách thức hoạt động của SmartLib AI.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-3xl bg-white border border-cream-300 overflow-hidden shadow-warm-xs transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-cream-50 transition-colors"
                  >
                    <span className="font-bold text-charcoal-900 text-base sm:text-lg">{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-butter-700 flex-shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-sm sm:text-base text-charcoal-600 leading-relaxed border-t border-cream-200 bg-ivory-100/40 pt-4 font-normal">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. CALL TO ACTION BANNER */}
      <section className="py-20 relative bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden p-8 sm:p-14 bg-gradient-to-r from-cream-300 via-butter-200 to-cream-300 border border-butter-400 shadow-warm-lg text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-butter-400 text-charcoal-800 text-xs font-bold shadow-warm-xs">
              <Flame className="w-4 h-4 text-butter-700" /> Bắt Đầu Ngay Hôm Nay
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-charcoal-900 tracking-tight max-w-3xl mx-auto leading-tight">
              Sẵn Sàng Khám Phá Thư Viện Tri Thức Thông Minh?
            </h2>
            <p className="text-charcoal-700 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
              Gia nhập cùng hàng ngàn độc giả thông minh và bắt đầu hành trình nâng cao hiệu suất học tập, nghiên cứu với trợ lý AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={() => openAuth("signup")}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-extrabold text-charcoal-900 bg-butter hover:bg-butter-400 border border-butter-400 shadow-warm-md transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5 text-charcoal-900" />
                <span>Đăng ký tài khoản miễn phí</span>
              </button>
              <button
                onClick={() => openAuth("signin")}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold text-charcoal-900 bg-white hover:bg-cream-100 border border-cream-300 shadow-warm-xs transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5 text-butter-700" />
                <span>Đăng nhập hệ thống</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="bg-[#FAF7EE] border-t border-cream-300 pt-16 pb-12 text-charcoal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-cream-300">
            {/* Col 1: Brand */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-butter to-cream-200 border border-butter-400 flex items-center justify-center text-charcoal-900 shadow-warm-xs">
                  <Library className="w-5 h-5" />
                </div>
                <span className="text-xl font-extrabold text-charcoal-900 tracking-tight">SmartLib AI</span>
              </div>
              <p className="text-xs text-charcoal-600 leading-relaxed font-normal">
                Hệ thống quản lý thư viện số 4.0 tích hợp trí tuệ nhân tạo Gemini AI hàng đầu dành cho trường học và tổ chức giáo dục.
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-sage-800">
                <span className="w-2 h-2 rounded-full bg-sage animate-ping" />
                Hệ thống Cloud sẵn sàng 100%
              </div>
            </div>

            {/* Col 2: Navigation Links */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-charcoal-900 uppercase tracking-wider">Khám Phá</h4>
              <ul className="space-y-2 text-xs text-charcoal-600 font-medium">
                <li>
                  <a href="#features" className="hover:text-charcoal-950 transition-colors">
                    Tính năng nổi bật
                  </a>
                </li>
                <li>
                  <a href="#ai-hub" className="hover:text-charcoal-950 transition-colors">
                    Trợ lý Gemini AI
                  </a>
                </li>
                <li>
                  <a href="#catalog" className="hover:text-charcoal-950 transition-colors">
                    Kho sách trực tuyến
                  </a>
                </li>
                <li>
                  <a href="#workflow" className="hover:text-charcoal-950 transition-colors">
                    Quy trình mượn trả
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3: Service Policy */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-charcoal-900 uppercase tracking-wider">Chính Sách & Hỗ Trợ</h4>
              <ul className="space-y-2 text-xs text-charcoal-600 font-medium">
                <li>
                  <a href="#faq" className="hover:text-charcoal-950 transition-colors">
                    Quy định mượn trả sách
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-charcoal-950 transition-colors">
                    Chính sách phí phạt quá hạn
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-charcoal-950 transition-colors">
                    Hàng đợi đặt trước FIFO
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-charcoal-950 transition-colors">
                    Bảo mật thông tin độc giả
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Library Hours & Contact */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-charcoal-900 uppercase tracking-wider">Thời Gian Mở Cửa</h4>
              <p className="text-xs text-charcoal-700">
                <strong>Thứ Hai - Thứ Bảy:</strong> 07:30 - 21:00
              </p>
              <p className="text-xs text-charcoal-700">
                <strong>Chủ Nhật:</strong> 08:00 - 17:00
              </p>
              <p className="text-xs text-charcoal-500 mt-2">
                Địa điểm: Tòa nhà Trung tâm Thông tin Thư viện, Khuôn viên chính.
              </p>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-charcoal-500 gap-4">
            <p>© 2026 SmartLib AI. Bản quyền thuộc về Hệ thống Thư viện Số Thông Minh.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-charcoal-800 transition-colors">
                Điều khoản dịch vụ
              </a>
              <a href="#" className="hover:text-charcoal-800 transition-colors">
                Chính sách bảo mật
              </a>
              <button
                onClick={() => {
                  if (onOpenDirectLogin) onOpenDirectLogin();
                  else openAuth("signin");
                }}
                className="text-butter-800 hover:underline transition-colors font-bold"
              >
                Cổng đăng nhập quản trị
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* 11. AUTH MODAL (INTEGRATED SIGN IN / SIGN UP) */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur */}
          <div
            className="absolute inset-0 bg-charcoal-900/40 backdrop-blur-md transition-opacity"
            onClick={() => setAuthModalOpen(false)}
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-md bg-white border border-cream-300 rounded-3xl shadow-warm-lg p-6 sm:p-8 z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal-900 transition-colors p-1.5 rounded-xl hover:bg-cream-100"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-butter to-cream-200 border border-butter-400 rounded-2xl mb-3 shadow-warm-md">
                <Library className="w-7 h-7 text-charcoal-900" />
              </div>
              <h3 className="text-xl font-extrabold text-charcoal-900 tracking-tight">
                {authMode === "signin" ? "Đăng nhập hệ thống" : "Tạo tài khoản độc giả"}
              </h3>
              <p className="text-xs text-charcoal-500 mt-1 font-medium">
                {authMode === "signin"
                  ? "Truy cập kho sách, quản lý phiếu mượn và trợ lý AI"
                  : "Đăng ký thành viên chỉ trong 30 giây"}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 p-1 bg-ivory-200 rounded-2xl border border-cream-200">
              <button
                onClick={() => {
                  setAuthMode("signin");
                  setAuthError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                  authMode === "signin" ? "bg-butter text-charcoal-900 shadow-warm-xs border border-butter-400/60" : "text-charcoal-600 hover:text-charcoal-900 hover:bg-cream-100"
                }`}
              >
                <LogIn className="w-4 h-4 text-charcoal-900" /> Đăng nhập
              </button>
              <button
                onClick={() => {
                  setAuthMode("signup");
                  setAuthError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                  authMode === "signup" ? "bg-butter text-charcoal-900 shadow-warm-xs border border-butter-400/60" : "text-charcoal-600 hover:text-charcoal-900 hover:bg-cream-100"
                }`}
              >
                <UserPlus className="w-4 h-4 text-charcoal-900" /> Đăng ký
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === "signup" && (
                <div>
                  <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Họ và tên</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-10 pr-4 py-2.5 bg-ivory-200/50 border border-cream-300 rounded-xl text-charcoal-900 placeholder:text-charcoal-400 text-sm focus:outline-none focus:border-butter-500 focus:ring-2 focus:ring-butter/20 transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="email@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-ivory-200/50 border border-cream-300 rounded-xl text-charcoal-900 placeholder:text-charcoal-400 text-sm focus:outline-none focus:border-butter-500 focus:ring-2 focus:ring-butter/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-ivory-200/50 border border-cream-300 rounded-xl text-charcoal-900 placeholder:text-charcoal-400 text-sm focus:outline-none focus:border-butter-500 focus:ring-2 focus:ring-butter/20 transition"
                  />
                </div>
              </div>

              {authMode === "signin" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={authLoading}
                    className="text-xs text-charcoal-600 hover:text-charcoal-950 font-bold disabled:opacity-50"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              )}

              {authMode === "signup" && (
                <div>
                  <label className="text-xs font-bold text-charcoal-800 mb-1.5 block">Loại độc giả</label>
                  <select
                    value={readerType}
                    onChange={(e) => setReaderType(e.target.value as "student" | "teacher" | "staff" | "guest")}
                    className="w-full px-4 py-2.5 bg-ivory-200/50 border border-cream-300 rounded-xl text-charcoal-900 text-sm focus:outline-none focus:border-butter-500 transition font-medium"
                  >
                    <option value="student">Học sinh / Sinh viên</option>
                    <option value="teacher">Giáo viên / Giảng viên</option>
                    <option value="staff">Cán bộ / Nhân viên</option>
                    <option value="guest">Khách vãng lai</option>
                  </select>
                </div>
              )}

              {authError && (
                <div
                  className={`text-xs rounded-xl px-4 py-2.5 font-medium ${
                    authError.includes("thành công") || authError.includes("Đã gửi email")
                      ? "bg-sage-100 text-sage-900 border border-sage-300"
                      : "bg-terracotta-50 text-terracotta-700 border border-terracotta-200"
                  }`}
                >
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-butter hover:bg-butter-400 border border-butter-400 text-charcoal-900 font-extrabold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm shadow-warm-xs"
              >
                {authLoading ? (
                  <span className="w-5 h-5 border-2 border-charcoal-900 border-t-transparent rounded-full animate-spin" />
                ) : authMode === "signin" ? (
                  <>
                    <LogIn className="w-4 h-4 text-charcoal-900" /> Đăng nhập hệ thống
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 text-charcoal-900" /> Hoàn tất đăng ký
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-cream-200 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthModalOpen(false);
                  if (onOpenDirectLogin) onOpenDirectLogin();
                }}
                className="text-xs text-charcoal-500 hover:text-charcoal-900 font-semibold transition-colors"
              >
                Chuyển sang trang đăng nhập độc lập &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
