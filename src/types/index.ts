export type UserRole = "admin" | "librarian" | "reader";
export type CardStatus = "active" | "suspended" | "expired";
export type ReaderType = "student" | "teacher" | "staff" | "guest";
export type LoanStatus = "active" | "returned" | "overdue";
export type ReservationStatus = "pending" | "fulfilled" | "cancelled";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  reader_type: ReaderType;
  card_status: CardStatus;
  address: string | null;
  created_at: string;
}

export interface Book {
  id: string;
  book_code: string;
  title: string;
  author: string;
  category: string;
  publisher: string | null;
  publish_year: number | null;
  isbn: string | null;
  quantity: number;
  available: number;
  description: string | null;
  cover_color: string;
  created_at: string;
}

export interface Loan {
  id: string;
  user_id: string | null;
  book_id: string | null;
  borrow_date: string | null;
  due_date: string;
  return_date: string | null;
  status: LoanStatus | null;
  fine_amount: number | null;
  created_at: string | null;
  updated_at: string | null;
  books?: Book;
  profiles?: Profile;
}

export interface Reservation {
  id: string;
  book_id: string;
  reader_id: string;
  reserved_date: string;
  status: ReservationStatus;
  note: string | null;
  created_at: string;
  books?: Book;
  profiles?: Profile;
}

export interface Fine {
  id: string;
  loan_id: string;
  reader_id: string;
  amount: number;
  days_overdue: number;
  paid: boolean;
  created_at: string;
  loans?: Loan;
  profiles?: Profile;
}

export interface LibrarySettings {
  id: number;
  library_name: string;
  loan_period_days: number;
  max_renewals: number;
  fine_per_day: number;
  renewal_days: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIResponse {
  response: string;
  success: boolean;
  error?: string;
}
