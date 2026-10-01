import type { AIResponse, ChatMessage } from "@/types";
import { AI_FUNCTION_URL, supabase } from "@/lib/supabase";

async function invokeAI(body: Record<string, unknown>): Promise<AIResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Cần đăng nhập để sử dụng AI");
  const res = await fetch(AI_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Yêu cầu AI thất bại");
  return data;
}

export async function aiSearchBooks(query: string, history?: ChatMessage[]): Promise<AIResponse> {
  return invokeAI({ action: "search", query, history });
}

export async function aiSummarizeBook(bookId: string): Promise<AIResponse> {
  return invokeAI({ action: "summarize", bookId });
}

export async function aiRecommendBooks(): Promise<AIResponse> {
  return invokeAI({ action: "recommend" });
}
