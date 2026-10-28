import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BookData {
  id: string;
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
  action:
  | "search"
  | "summarize"
  | "recommend"
  | "backfill_embeddings"
  | "refresh_book_embedding";
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

const SUMMARY_SYSTEM_PROMPT = `Bạn là hệ thống tóm tắt dữ liệu sách của thư viện.

QUY TẮC BẮT BUỘC:
1. Chỉ được sử dụng những thông tin xuất hiện trực tiếp trong dữ liệu sách được cung cấp.
2. Không được sử dụng kiến thức có sẵn của bạn về cuốn sách, tác giả hoặc tác phẩm.
3. Không suy diễn cốt truyện, nhân vật, hành trình, sự kiện, bài học hoặc chủ đề nếu dữ liệu không nói rõ.
4. Không bổ sung thông tin chỉ vì bạn biết nó là đúng ngoài đời.
5. Nếu dữ liệu ít, hãy viết 2-3 câu ngắn bằng cách diễn đạt lại đúng dữ liệu hiện có.
6. Nếu dữ liệu đủ, có thể viết 3-5 câu.
7. Trả lời bằng tiếng Việt, tự nhiên và không thêm lời mở đầu.`;

const RECOMMEND_SYSTEM_PROMPT = `Bạn là hệ thống gợi ý sách của thư viện.

QUY TẮC BẮT BUỘC:
1. CHỈ được gợi ý những sách xuất hiện trong danh sách sách được cung cấp.
2. Không được tự tạo tên sách, mã sách, tác giả, thể loại hoặc tình trạng sách.
3. Lý do gợi ý chỉ được dựa trên dữ liệu được cung cấp như thể loại, tác giả, mô tả và lịch sử mượn.
4. Không sử dụng kiến thức có sẵn của bạn về nội dung sách hoặc tác giả.
5. Không suy diễn chủ đề, cốt truyện, cảm xúc, thông điệp hoặc giá trị của sách nếu dữ liệu không nói rõ.
6. Nếu gợi ý dựa trên thể loại giống lịch sử mượn, hãy nói rõ điều đó.
7. Nếu gợi ý dựa trên cùng tác giả, hãy nói rõ điều đó.
8. Tối đa 5 sách.
9. Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng.
10. Nếu available = 0, phải nói sách hiện đang hết bản.`;

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

Hãy tóm tắt cuốn sách chỉ dựa trên thông tin ở trên. Nếu dữ liệu không đủ để viết 3-5 câu thì viết ngắn hơn, tuyệt đối không bổ sung thông tin ngoài dữ liệu.`;
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

  if (matched.length === 0) return [];
  return matched.slice(0, 10).map((s) => s.book);
}

// --- Gemini embedding and AI calls ---
function buildBookEmbeddingText(book: BookData): string {
  return [
    `Tên sách: ${book.title}`,
    `Tác giả: ${book.author}`,
    `Thể loại: ${book.category}`,
    `Nhà xuất bản: ${book.publisher || "Không rõ"}`,
    `Năm xuất bản: ${book.publish_year || "Không rõ"}`,
    `Mô tả: ${book.description || "Không có mô tả"}`,
  ].join("\n");
}
async function createEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY chưa được cấu hình");
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: {
          parts: [
            {
              text,
            },
          ],
        },
        outputDimensionality: 768,
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();

    throw new Error(
      `Gemini embedding error: ${response.status} - ${errText}`,
    );
  }

  const data = await response.json();
  const values = data?.embedding?.values;

  if (!Array.isArray(values) || values.length !== 768) {
    throw new Error("Gemini returned invalid embedding");
  }

  return values;
}

async function callAI(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    return fallbackResponse(systemPrompt);
  }

  let response: Response | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: systemPrompt,
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: userPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 2000,
            thinkingConfig: {
              thinkingLevel: "MINIMAL",
            },
          },
        }),
      },
    );

    if (response.ok) {
      break;
    }

    if (![429, 503].includes(response.status) || attempt === 3) {
      break;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, attempt * 1000)
    );

  }

  if (!response) {
    throw new Error("Không nhận được phản hồi từ Gemini");
  }

  if (!response.ok) {
    const errText = await response.text();

    throw new Error(
      `Gemini service error: ${response.status} - ${errText}`,
    );
  }

  const data = await response.json();

  const content = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || "")
    .join("")
    .trim();

  if (!content) {
    throw new Error("Gemini returned empty response");
  }

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
      .select("role, account_status")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || !profile || profile.account_status !== "active" || !["admin", "librarian", "reader"].includes(profile.role)) {
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

    if (action === "backfill_embeddings") {
      if (profile.role !== "admin") {
        return new Response(
          JSON.stringify({
            error: "Chỉ Admin được phép tạo embedding",
            success: false,
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: booksToEmbed, error: booksError } = await supabase
        .from("books")
        .select("id, book_code, title, author, category, publisher, publish_year, available, quantity, description")
        .neq("status", "archived")
        .is("embedding", null);

      if (booksError) {
        throw new Error(`Lỗi đọc sách cần embedding: ${booksError.message}`);
      }
      let updatedCount = 0;

      for (const book of (booksToEmbed || []) as BookData[]) {
        const embeddingText = buildBookEmbeddingText(book);
        const embedding = await createEmbedding(embeddingText);

        const { error: updateError } = await supabase
          .from("books")
          .update({ embedding })
          .eq("id", book.id);

        if (updateError) {
          throw new Error(
            `Lỗi cập nhật embedding cho sách ${book.title}: ${updateError.message}`,
          );
        }

        updatedCount += 1;
      }

      return new Response(
        JSON.stringify({
          response: `Đã tạo embedding cho ${updatedCount} sách.`,
          success: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "refresh_book_embedding") {
      if (!["admin", "librarian"].includes(profile.role)) {
        return new Response(
          JSON.stringify({
            error: "Chỉ Admin hoặc Librarian được phép cập nhật embedding",
            success: false,
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (!bookId) {
        throw new Error("Thiếu ID sách");
      }

      const { data: book, error: bookError } = await supabase
        .from("books")
        .select("id, book_code, title, author, category, publisher, publish_year, available, quantity, description")
        .eq("id", bookId)
        .maybeSingle();

      if (bookError) {
        throw new Error(`Lỗi đọc sách: ${bookError.message}`);
      }

      if (!book) {
        throw new Error("Không tìm thấy sách");
      }

      const embeddingText = buildBookEmbeddingText(book as BookData);
      const embedding = await createEmbedding(embeddingText);

      const { error: updateError } = await supabase
        .from("books")
        .update({ embedding })
        .eq("id", bookId);

      if (updateError) {
        throw new Error(`Lỗi cập nhật embedding: ${updateError.message}`);
      }

      return new Response(
        JSON.stringify({
          response: "Đã cập nhật embedding cho sách.",
          success: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "search") {
      if (!query) throw new Error("Thiếu câu hỏi tra cứu");

      const queryEmbedding = await createEmbedding(query);

      const { data: matchedBooks, error } = await supabase
        .rpc("match_books", {
          query_embedding: queryEmbedding,
          match_count: 10,
          match_threshold: 0.50,
        });

      if (error) {
        throw new Error(`Lỗi semantic search: ${error.message}`);
      }

      books = (matchedBooks || []) as BookData[];

      if (books.length === 0) {
        return new Response(
          JSON.stringify({
            response:
              "Không tìm thấy sách phù hợp trong dữ liệu thư viện. Bạn hãy thử từ khóa khác.",
            success: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      systemPrompt = SEARCH_SYSTEM_PROMPT;
      userPrompt = buildSearchPrompt(query, books);
    } else if (action === "summarize") {
      if (!bookId) throw new Error("Thiếu ID sách");

      const { data: book, error } = await supabase
        .from("books")
        .select("id, book_code, title, author, category, publisher, publish_year, available, quantity, description")
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
        .select("id, book_code, title, author, category, publisher, publish_year, available, quantity, description")
        .neq("status", "archived");

      if (bookErr) throw new Error(`Lỗi đọc sách: ${bookErr.message}`);
      books = (allBooks || []) as BookData[];

      // Get reader's loan history (anonymized - only titles and categories)
      let readerHistory: string[] = [];
      let preferredCategories: string[] = [];
      let preferredAuthors: string[] = [];
      let borrowedBookIds: string[] = [];

      if (profile.role === "reader") {
        const { data: loans, error: loansError } = await supabase
          .from("loans")
          .select("book_id, books(title, category, author)")
          .eq("user_id", user.id)
          .order("borrow_date", { ascending: false })
          .limit(20);

        if (loansError) {
          throw new Error(
            `Lỗi đọc lịch sử mượn: ${loansError.message}`,
          );
        }

        readerHistory = (loans || [])
          .map((loan) =>
            loan.books && !Array.isArray(loan.books)
              ? `"${loan.books.title}" (${loan.books.category}, tác giả: ${loan.books.author})`
              : ""
          )
          .filter(Boolean);

        borrowedBookIds = (loans || [])
          .map((loan) => loan.book_id)
          .filter(Boolean);

        preferredCategories = Array.from(
          new Set(
            (loans || [])
              .map((loan) =>
                loan.books && !Array.isArray(loan.books)
                  ? loan.books.category
                  : null
              )
              .filter(Boolean)
          )
        ) as string[];

        preferredAuthors = Array.from(
          new Set(
            (loans || [])
              .map((loan) =>
                loan.books && !Array.isArray(loan.books)
                  ? loan.books.author
                  : null
              )
              .filter(Boolean)
          )
        ) as string[];

        let personalizedBooks: BookData[] = [];

        if (
          preferredCategories.length > 0 ||
          preferredAuthors.length > 0
        ) {
          personalizedBooks = books.filter(
            (book) =>
              !borrowedBookIds.includes(book.id) &&
              (
                preferredCategories.includes(book.category) ||
                preferredAuthors.includes(book.author)
              )
          );
        }

        if (personalizedBooks.length > 0) {
          books = personalizedBooks.slice(0, 10);
        } else {
          const { data: popularBooksData, error: popularError } =
            await supabase.rpc("get_popular_books", {
              limit_count: 10,
            });

          if (popularError) {
            throw new Error(
              `Lỗi lấy sách phổ biến: ${popularError.message}`,
            );
          }

          const popularBookIds = (popularBooksData || []).map(
            (item: { book_id: string }) => item.book_id,
          );

          const popularBooks = books.filter(
            (book) =>
              popularBookIds.includes(book.id) &&
              !borrowedBookIds.includes(book.id)
          );

          if (popularBooks.length > 0) {
            books = popularBooks.slice(0, 10);
          } else {
            books = books
              .filter((book) => !borrowedBookIds.includes(book.id))
              .slice(0, 10);
          }
        }
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
