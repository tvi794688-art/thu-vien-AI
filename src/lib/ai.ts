import type { AIResponse, ChatMessage } from "@/types";
import { AI_FUNCTION_URL } from "@/lib/supabase";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
};

export async function aiSearchBooks(query: string, history?: ChatMessage[]): Promise<AIResponse> {
  const res = await fetch(AI_FUNCTION_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "search", query, history }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "AI tra cứu thất bại");
  return data;
}

export async function aiSummarizeBook(bookId: string): Promise<AIResponse> {
  const res = await fetch(AI_FUNCTION_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "summarize", bookId }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "AI tóm tắt thất bại");
  return data;
}

export async function aiRecommendBooks(readerId?: string): Promise<AIResponse> {
  const res = await fetch(AI_FUNCTION_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "recommend", readerId }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "AI gợi ý thất bại");
  return data;
}
