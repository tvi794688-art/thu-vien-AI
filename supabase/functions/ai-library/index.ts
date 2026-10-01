import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BookData {
  book_code: string;
  title: string;
  author: string;
  category: string;
  publisher: string | null;
  publish_year: number | null;
  available: number;
  quantity: number;
  description: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  action: "search" | "summarize" | "recommend";
  query?: string;
  bookId?: string;
  history?: ChatMessage[];
}

// --- Prompt templates (kept server-side so they can be tuned without redeploying UI) ---

const SEARCH_SYSTEM_PROMPT = `Bạn là trợ lý tra cứu thư viện thông minh và thân thiện. Nhiệm vụ của bạn là giúp độc giả tìm sách phù hợp.

QUY TẮC NGHIÊM NGẶT:
1. CHỈ gợi ý sách có trong dữ liệu được cung cấp. KHÔNG bịa đặt mã sách, tên sách, tác giả hoặc tình trạng sách.
2. Nếu không có sách phù hợp, hãy nói rõ và gợi ý từ khóa khác.
3. Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu.
4. Với mỗi sách gợi ý, kèm lý do ngắn gọn vì sao phù hợp với nhu cầu độc giả.
5. Tối đa 5 cuốn sách gợi ý.
6. Nếu sách còn available = 0, hãy thông báo sách đang được mượn.`;

const SUMMARY_SYSTEM_PROMPT = `Bạn là chuyên gia tóm tắt nội dung sách cho thư viện. Nhiệm vụ:
1. Tạo tóm tắt ngắn (3-5 câu) từ mô tả sách được cung cấp.
2. Nhấn mạnh chủ đề chính, đối tượng phù hợp và giá trị cốt lõi.
3. KHÔNG bịa đặt nội dung không có trong mô tả. Chỉ dùng thông tin được cung cấp.
4. Trả lời bằng tiếng Việt, rõ ràng, hấp dẫn để thu hút độc giả.`;

const RECOMMEND_SYSTEM_PROMPT = `Bạn là hệ thống gợi ý sách thông minh cho thư viện. Nhiệm vụ:
1. Dựa vào thể loại, tác giả và lịch sử mượn của độc giả để gợi ý sách.
2. CHỈ gợi ý sách có trong dữ liệu được cung cấp.
3. Với mỗi sách, giải thích lý do gợi ý dựa trên sở thích và lịch sử mượn.
4. KHÔNG gửi thông tin cá nhân nhạy cảm của độc giả cho AI. Chỉ dùng lịch sử mượn đã ẩn danh.
5. Tối đa 5 gợi ý, trả lời bằng tiếng Việt.`;

function buildSearchPrompt(query: string, books: BookData[]): string {
  const bookList = books
    .map(
      (b) =>
        `- Mã: ${b.book_code}, Tên: "${b.title}", Tác giả: ${b.author}, Thể loại: ${b.category}, NXB: ${b.publisher || "N/A"}, Năm: ${b.publish_year || "N/A"}, Còn: ${b.available}/${b.quantity} bản${b.description ? `, Mô tả: ${b.description.substring(0, 150)}` : ""}`,
    )
    .join("\n");

  return `Câu hỏi của độc giả: "${query}"

Dữ liệu sách trong thư viện:
${bookList}

Hãy gợi ý tối đa 5 cuốn sách phù hợp nhất, kèm lý do. Nếu sách đang hết (available=0), hãy thông báo.`;
}

function buildSummaryPrompt(book: BookData): string {
  return `Thông tin sách:
- Tên: ${book.title}
- Tác giả: ${book.author}
- Thể loại: ${book.category}
- NXB: ${book.publisher || "N/A"}
- Năm: ${book.publish_year || "N/A"}
- Mô tả: ${book.description || "Không có mô tả chi tiết."}

Hãy tạo tóm tắt ngắn gọn (3-5 câu) về cuốn sách này, nhấn mạnh giá trị và đối tượng phù hợp.`;
}

function buildRecommendPrompt(
  books: BookData[],
  readerHistory: string[],
): string {
  const bookList = books
    .map(
      (b) =>
        `- Mã: ${b.book_code}, Tên: "${b.title}", Tác giả: ${b.author}, Thể loại: ${b.category}, Còn: ${b.available}/${b.quantity} bản${b.description ? `, Mô tả: ${b.description.substring(0, 100)}` : ""}`,
    )
    .join("\n");

  const history = readerHistory.length > 0
    ? readerHistory.join(", ")
    : "Chưa có lịch sử mượn";

  return `Lịch sử mượn sách (ẩn danh): ${history}

Danh sách sách có thể gợi ý:
${bookList}

Hãy gợi ý tối đa 5 cuốn sách phù hợp với sở thích độc giả, kèm lý do cho mỗi gợi ý.`;
}

// --- Keyword-based filtering to reduce data sent to AI ---

function filterBooksByQuery(books: BookData[], query: string): BookData[] {
  const lower = query.toLowerCase();
  const keywords = lower.split(/\s+/).filter((k) => k.length > 1);

  const scored = books.map((b) => {
    const haystack = `${b.title} ${b.author} ${b.category} ${b.description || ""}`.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (haystack.includes(kw)) score += 1;
    }
    return { book: b, score };
  });

  const matched = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

  if (matched.length === 0) return books.slice(0, 10);
  return matched.slice(0, 10).map((s) => s.book);
}

// --- AI call via OpenAI-compatible endpoint ---

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");

  if (!apiKey) {
    // Fallback: rule-based response when no AI key is configured
    return fallbackResponse(systemPrompt);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI service error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned empty response");
  return content;
}

function fallbackResponse(systemPrompt: string): string {
  // Simple rule-based fallback when no AI key is set
  if (systemPrompt.includes("tra cứu")) {
    return "Hệ thống AI chưa được cấu hình khóa API. Tuy nhiên, bạn có thể sử dụng chức năng tra cứu sách bằng từ khóa ở trang Tìm kiếm sách. Hệ thống sẽ lọc sách theo tên, tác giả và thể loại.";
  }
  if (systemPrompt.includes("tóm tắt")) {
    return "Hệ thống tóm tắt AI chưa được cấu hình. Vui lòng đọc mô tả sách trực tiếp trong danh mục thư viện.";
  }
  if (systemPrompt.includes("gợi ý")) {
    return "Hệ thống gợi ý AI chưa được cấu hình. Bạn có thể xem sách theo thể loại tương tự trong danh mục.";
  }
  return "Chức năng AI chưa được cấu hình đầy đủ.";
}

// --- Main handler ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get("Authorization");
    const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Authentication required", success: false }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session", success: false }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Request data uses the caller's JWT so PostgreSQL RLS remains active.
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || !profile || !["admin", "librarian", "reader"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Unauthorized", success: false }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();
    const { action, query, bookId } = body;

    let systemPrompt = "";
    let userPrompt = "";
    let books: BookData[] = [];

    if (action === "search") {
      if (!query) throw new Error("Thiếu câu hỏi tra cứu");

      const { data: allBooks, error } = await supabase
        .from("books")
        .select("book_code, title, author, category, publisher, publish_year, available, quantity, description")
        .gt("available", 0)
        .limit(50);

      if (error) throw new Error(`Lỗi đọc sách: ${error.message}`);

      books = (allBooks || []) as BookData[];
      const filtered = filterBooksByQuery(books, query);

      systemPrompt = SEARCH_SYSTEM_PROMPT;
      userPrompt = buildSearchPrompt(query, filtered);
    } else if (action === "summarize") {
      if (!bookId) throw new Error("Thiếu ID sách");

      const { data: book, error } = await supabase
        .from("books")
        .select("book_code, title, author, category, publisher, publish_year, available, quantity, description")
        .eq("id", bookId)
        .maybeSingle();

      if (error) throw new Error(`Lỗi đọc sách: ${error.message}`);
      if (!book) throw new Error("Không tìm thấy sách");

      systemPrompt = SUMMARY_SYSTEM_PROMPT;
      userPrompt = buildSummaryPrompt(book as BookData);
    } else if (action === "recommend") {
      // Get all books
      const { data: allBooks, error: bookErr } = await supabase
        .from("books")
        .select("book_code, title, author, category, publisher, publish_year, available, quantity, description")
        .limit(50);

      if (bookErr) throw new Error(`Lỗi đọc sách: ${bookErr.message}`);
      books = (allBooks || []) as BookData[];

      // Get reader's loan history (anonymized - only titles and categories)
      let readerHistory: string[] = [];
      if (profile.role === "reader") {
        const { data: loans } = await supabase
          .from("loans")
          .select("book_id, books(title, category, author)")
          .eq("reader_id", user.id)
          .limit(20);

        readerHistory = (loans || []).map((loan) =>
          loan.books && !Array.isArray(loan.books)
            ? `"${loan.books.title}" (${loan.books.category})`
            : ""
        ).filter(Boolean);
      }

      systemPrompt = RECOMMEND_SYSTEM_PROMPT;
      userPrompt = buildRecommendPrompt(books, readerHistory);
    } else {
      throw new Error("Action không hợp lệ. Dùng: search, summarize, recommend");
    }

    const aiResponse = await callAI(systemPrompt, userPrompt);

    return new Response(
      JSON.stringify({ response: aiResponse, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
