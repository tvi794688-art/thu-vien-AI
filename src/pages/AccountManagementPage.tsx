import { useCallback, useEffect, useState } from "react";
import { Edit2, Eye, Plus, Search, ShieldCheck, UserCog, UserRoundCheck, UserRoundX } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { CardStatus, Profile, ReaderType, UserRole } from "@/types";
import { Badge, EmptyState, LoadingSpinner, PageHeader } from "@/components/UI";
import Modal from "@/components/Modal";

type AccountStatus = Profile["account_status"];
type AccountChange = { account: Profile; role: UserRole; accountStatus: AccountStatus };
type AccountCounts = Record<UserRole, number> & { total: number };
type ProfileDraft = Pick<Profile, "full_name" | "phone" | "address" | "reader_type">;
const PAGE_SIZE = 10;
const ROLE_LABEL: Record<UserRole, string> = { admin: "Admin", librarian: "Thủ thư", reader: "Độc giả" };
const ROLE_DESCRIPTION: Record<UserRole, string> = {
  reader: "Được sử dụng các chức năng dành cho người đọc, xem sách và quản lý giao dịch của chính mình.",
  librarian: "Được thực hiện các nghiệp vụ thư viện theo quyền hiện có; không thể tự cấp quyền Admin.",
  admin: "Được truy cập khu vực quản trị và quản lý tài khoản theo chính sách bảo mật.",
};
const CARD_STATUS_LABEL: Record<CardStatus, string> = { active: "Thẻ hoạt động", suspended: "Thẻ tạm khóa", expired: "Thẻ hết hạn" };
const EMPTY_COUNTS: AccountCounts = { total: 0, admin: 0, librarian: 0, reader: 0 };

export default function AccountManagementPage() {
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<Profile[]>([]);
  const [counts, setCounts] = useState<AccountCounts>(EMPTY_COUNTS);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AccountStatus>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [confirmation, setConfirmation] = useState<AccountChange | null>(null);
  const [roleEditor, setRoleEditor] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>("reader");
  const [profileEditor, setProfileEditor] = useState<Profile | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({ full_name: "", phone: null, address: null, reader_type: "student" });
  const [addOpen, setAddOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({ fullName: "", email: "", role: "reader" as UserRole });

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from("profiles").select("*", { count: "exact" }).order("created_at", { ascending: false });
      if (roleFilter !== "all") query = query.eq("role", roleFilter);
      if (statusFilter !== "all") query = query.eq("account_status", statusFilter);
      const term = search.trim();
      if (term) {
        const escaped = term.replace(/[\\(),]/g, "\\$&");
        const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);
        query = uuid
          ? query.or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,id.eq.${escaped}`)
          : query.or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
      }
      const [listResult, totalResult, adminResult, librarianResult, readerResult] = await Promise.all([
        query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "librarian"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "reader"),
      ]);
      const failed = [listResult, totalResult, adminResult, librarianResult, readerResult].find((result) => result.error);
      if (failed?.error) throw failed.error;
      setAccounts((listResult.data || []) as Profile[]);
      setTotal(listResult.count ?? 0);
      setCounts({
        total: totalResult.count ?? 0,
        admin: adminResult.count ?? 0,
        librarian: librarianResult.count ?? 0,
        reader: readerResult.count ?? 0,
      });
    } catch (queryError: unknown) {
      const message = queryError instanceof Error ? queryError.message : "Lỗi kết nối không xác định.";
      setError(`Không thể tải dữ liệu tài khoản: ${message}`);
      setAccounts([]);
      setTotal(0);
      setCounts(EMPTY_COUNTS);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search, statusFilter]);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);

  function startRoleChange(account: Profile) {
    setError(null);
    setNewRole(account.role);
    setRoleEditor(account);
  }

  function requestAccountChange(account: Profile, role = account.role, accountStatus = account.account_status) {
    setError(null);
    setNotice(null);
    setConfirmation({ account, role, accountStatus });
  }

  async function saveAccountChange() {
    if (!confirmation || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    const { account, role, accountStatus } = confirmation;
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("manage-account", {
        body: { action: "update", targetId: account.id, role, accountStatus },
      });
      if (invokeError || data?.error) throw new Error(invokeError?.message || String(data.error));
      setConfirmation(null);
      setRoleEditor(null);
      setSelected((current) => current?.id === account.id ? { ...current, role, account_status: accountStatus } : current);
      await loadAccounts();
      setNotice(`Đã cập nhật tài khoản ${account.full_name}.`);
    } catch (saveError: unknown) {
      const message = saveError instanceof Error ? saveError.message : "Không thể cập nhật tài khoản.";
      await loadAccounts();
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function startProfileEdit(account: Profile) {
    setError(null);
    setProfileDraft({
      full_name: account.full_name || "",
      phone: account.phone,
      address: account.address,
      reader_type: account.reader_type || "student",
    });
    setProfileEditor(account);
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profileEditor || saving) return;
    setSaving(true);
    setError(null);
    const account = profileEditor;
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("manage-account", {
        body: { action: "update_profile", targetId: account.id, profile: profileDraft },
      });
      if (invokeError || data?.error) throw new Error(invokeError?.message || String(data.error));
      setProfileEditor(null);
      setSelected((current) => current?.id === account.id ? { ...current, ...profileDraft } : current);
      await loadAccounts();
      setNotice(`Đã lưu thông tin hồ sơ ${account.full_name}.`);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu hồ sơ.");
    } finally {
      setSaving(false);
    }
  }

  async function createAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("manage-account", {
        body: { action: "create", fullName: newAccount.fullName.trim(), email: newAccount.email.trim().toLowerCase(), role: newAccount.role },
      });
      if (invokeError || data?.error) throw new Error(invokeError?.message || String(data.error));
      setAddOpen(false);
      setNewAccount({ fullName: "", email: "", role: "reader" });
      await loadAccounts();
      setNotice(`Đã tạo tài khoản ${newAccount.fullName.trim()} và gửi email thiết lập truy cập.`);
    } catch (createError: unknown) {
      setError(createError instanceof Error ? createError.message : "Không thể tạo tài khoản.");
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quản lý tài khoản & phân quyền"
        subtitle={`${counts.total} tài khoản trong hệ thống`}
        action={<button type="button" onClick={() => { setError(null); setAddOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 bg-butter hover:bg-butter-400 border border-butter-300 text-charcoal-900 rounded-xl text-sm font-bold shadow-warm-sm"><Plus className="w-4 h-4" /> Thêm tài khoản</button>}
      />

      {(error || notice) && <div role={error ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm font-medium ${error ? "border-terracotta-200 bg-terracotta-50 text-terracotta-700" : "border-sage-300 bg-sage-50 text-sage-900"}`}>{error || notice}</div>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {([
          ["Tổng tài khoản", counts.total, "cream"], ["Độc giả", counts.reader, "sage"],
          ["Thủ thư", counts.librarian, "butter"], ["Quản trị viên", counts.admin, "ivory"],
        ] as const).map(([label, value, color]) => <div key={label} className="bg-white rounded-2xl border border-cream-300 p-4 shadow-warm-xs"><p className="text-xs font-semibold text-charcoal-500">{label}</p><p className="text-2xl font-extrabold text-charcoal-900 mt-1">{loading ? "—" : value}</p><span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${color === "sage" ? "bg-sage-100 text-sage-900" : color === "butter" ? "bg-butter-100 text-charcoal-900" : "bg-cream-100 text-charcoal-800"}`}>Từ dữ liệu tài khoản</span></div>)}
      </div>

      <div className="bg-white rounded-3xl border border-cream-300 p-4 shadow-warm flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" /><input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Tìm theo tên, email hoặc mã tài khoản..." className="w-full pl-10 pr-4 py-2.5 bg-cream-50/60 border border-cream-300 rounded-xl text-sm text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:border-butter" /></div>
        <select value={roleFilter} onChange={(event) => { setPage(1); setRoleFilter(event.target.value as "all" | UserRole); }} className="px-4 py-2.5 bg-cream-50/60 border border-cream-300 rounded-xl text-sm text-charcoal-900"><option value="all">Tất cả vai trò</option><option value="admin">Admin</option><option value="librarian">Thủ thư</option><option value="reader">Độc giả</option></select>
        <select value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value as "all" | AccountStatus); }} className="px-4 py-2.5 bg-cream-50/60 border border-cream-300 rounded-xl text-sm text-charcoal-900"><option value="all">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="locked">Đã khóa</option></select>
      </div>

      {loading ? <LoadingSpinner label="Đang tải tài khoản..." /> : error && accounts.length === 0 ? null : accounts.length === 0 ? <EmptyState icon={<UserCog className="w-10 h-10" />} title="Chưa có tài khoản phù hợp" description="Thêm tài khoản mới hoặc thay đổi từ khóa và bộ lọc." /> : (
        <div className="bg-white rounded-3xl border border-cream-300 overflow-hidden shadow-warm">
          <div className="overflow-x-auto"><table className="w-full min-w-[1040px]">
            <thead className="bg-cream-100/70 border-b border-cream-200"><tr>{["STT", "Họ và tên", "Email", "Vai trò", "Trạng thái", "Ngày tạo", "Thao tác"].map((title) => <th key={title} className="px-4 py-3.5 text-left text-xs font-bold text-charcoal-700 uppercase tracking-wider">{title}</th>)}</tr></thead>
            <tbody className="divide-y divide-cream-100">{accounts.map((account, index) => {
              const isSelf = account.id === profile?.id;
              return <tr key={account.id} className="hover:bg-cream-50/70">
                <td className="px-4 py-4 text-xs text-charcoal-500">{(page - 1) * PAGE_SIZE + index + 1}</td>
                <td className="px-4 py-4"><p className="text-sm font-bold text-charcoal-900">{account.full_name || "Chưa cập nhật"}</p><p className="text-[11px] text-charcoal-400 mt-0.5">{account.id}</p></td>
                <td className="px-4 py-4 text-sm text-charcoal-700">{account.email || "Chưa cập nhật"}</td>
                <td className="px-4 py-4"><Badge color={account.role === "admin" ? "butter" : account.role === "librarian" ? "cream" : "sage"}>{ROLE_LABEL[account.role]}</Badge></td>
                <td className="px-4 py-4"><Badge color={account.account_status === "active" ? "sage" : "terracotta"}>{account.account_status === "active" ? "Đang hoạt động" : "Đã khóa"}</Badge></td>
                <td className="px-4 py-4 text-xs text-charcoal-600">{account.created_at ? new Date(account.created_at).toLocaleDateString("vi-VN") : "Chưa cập nhật"}</td>
                <td className="px-4 py-4"><div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => setSelected(account)} title="Xem chi tiết" className="p-2 text-charcoal-600 hover:bg-cream-100 rounded-lg"><Eye className="w-4 h-4" /></button>
                  <button type="button" onClick={() => startProfileEdit(account)} title="Chỉnh sửa hồ sơ" className="p-2 text-charcoal-600 hover:bg-cream-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                  <button type="button" disabled={isSelf} onClick={() => startRoleChange(account)} className="px-2.5 py-2 text-xs font-bold border border-cream-300 rounded-lg text-charcoal-800 hover:bg-cream-100 disabled:opacity-40">Phân quyền</button>
                  <button type="button" disabled={isSelf} onClick={() => requestAccountChange(account, account.role, account.account_status === "active" ? "locked" : "active")} className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold border border-cream-300 rounded-lg text-charcoal-800 hover:bg-cream-100 disabled:opacity-40">{account.account_status === "active" ? <><UserRoundX className="w-3.5 h-3.5 text-terracotta-600" />Khóa</> : <><UserRoundCheck className="w-3.5 h-3.5 text-sage-700" />Mở khóa</>}</button>
                  {isSelf && <span className="text-[10px] text-charcoal-400">Không thể tự phân quyền/khóa</span>}
                </div></td>
              </tr>;
            })}</tbody>
          </table></div>
        </div>
      )}

      {total > PAGE_SIZE && <div className="flex items-center justify-between"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="px-4 py-2 bg-white border border-cream-300 rounded-xl text-xs font-bold disabled:opacity-50">Trang trước</button><span className="text-xs font-bold text-charcoal-700">Trang {page} / {totalPages}</span><button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages} className="px-4 py-2 bg-white border border-cream-300 rounded-xl text-xs font-bold disabled:opacity-50">Trang sau</button></div>}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Thông tin tài khoản" size="md">
        {selected && <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">{[["Họ tên", selected.full_name], ["Email", selected.email], ["Mã tài khoản", selected.id], ["Điện thoại", selected.phone], ["Địa chỉ", selected.address], ["Vai trò", ROLE_LABEL[selected.role]], ["Loại độc giả", selected.reader_type], ["Trạng thái tài khoản", selected.account_status === "active" ? "Đang hoạt động" : "Đã khóa"], ["Trạng thái thẻ", CARD_STATUS_LABEL[selected.card_status]], ["Ngày tạo", selected.created_at ? new Date(selected.created_at).toLocaleString("vi-VN") : null]].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-charcoal-500">{label}</dt><dd className="mt-1 text-charcoal-900 break-words">{value || "Chưa cập nhật"}</dd></div>)}</dl>}
      </Modal>

      <Modal isOpen={addOpen} onClose={() => !saving && setAddOpen(false)} title="Thêm tài khoản" size="md">
        <form onSubmit={createAccount} className="space-y-4">
          {error && <p role="alert" className="p-3 rounded-xl bg-terracotta-50 border border-terracotta-200 text-sm text-terracotta-700">{error}</p>}
          <label className="block text-xs font-bold text-charcoal-700">Họ và tên<input required maxLength={120} value={newAccount.fullName} onChange={(event) => setNewAccount({ ...newAccount, fullName: event.target.value })} className="mt-1.5 w-full px-3.5 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm" /></label>
          <label className="block text-xs font-bold text-charcoal-700">Email<input required type="email" autoComplete="email" value={newAccount.email} onChange={(event) => setNewAccount({ ...newAccount, email: event.target.value })} className="mt-1.5 w-full px-3.5 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm" /></label>
          <RoleSelect value={newAccount.role} onChange={(role) => setNewAccount({ ...newAccount, role })} />
          <p className="text-xs text-charcoal-500">Hệ thống sẽ gửi email mời để người dùng tự thiết lập thông tin đăng nhập. Không nhập hoặc lưu mật khẩu tại đây.</p>
          <div className="flex gap-2"><button type="button" onClick={() => setAddOpen(false)} disabled={saving} className="flex-1 px-4 py-2.5 border border-cream-300 rounded-xl text-sm font-bold">Hủy</button><button disabled={saving} className="flex-1 px-4 py-2.5 bg-butter hover:bg-butter-400 border border-butter-300 rounded-xl text-sm font-bold">{saving ? "Đang tạo..." : "Tạo và gửi lời mời"}</button></div>
        </form>
      </Modal>

      <Modal isOpen={!!profileEditor} onClose={() => !saving && setProfileEditor(null)} title="Chỉnh sửa hồ sơ" size="md">
        {profileEditor && <form onSubmit={saveProfile} className="space-y-4">
          {error && <p role="alert" className="p-3 rounded-xl bg-terracotta-50 border border-terracotta-200 text-sm text-terracotta-700">{error}</p>}
          <p className="text-xs text-charcoal-500">Email xác thực: <strong className="text-charcoal-800">{profileEditor.email || "Chưa cập nhật"}</strong> (không thể sửa tại đây)</p>
          <label className="block text-xs font-bold text-charcoal-700">Họ và tên<input required maxLength={120} value={profileDraft.full_name} onChange={(event) => setProfileDraft({ ...profileDraft, full_name: event.target.value })} className="mt-1.5 w-full px-3.5 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm" /></label>
          <label className="block text-xs font-bold text-charcoal-700">Số điện thoại<input value={profileDraft.phone || ""} onChange={(event) => setProfileDraft({ ...profileDraft, phone: event.target.value || null })} className="mt-1.5 w-full px-3.5 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm" /></label>
          <label className="block text-xs font-bold text-charcoal-700">Địa chỉ<textarea rows={3} value={profileDraft.address || ""} onChange={(event) => setProfileDraft({ ...profileDraft, address: event.target.value || null })} className="mt-1.5 w-full px-3.5 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm" /></label>
          <label className="block text-xs font-bold text-charcoal-700">Loại độc giả<select value={profileDraft.reader_type || "student"} onChange={(event) => setProfileDraft({ ...profileDraft, reader_type: event.target.value as ReaderType })} className="mt-1.5 w-full px-3.5 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm">{[["student", "Học sinh"], ["teacher", "Giáo viên"], ["staff", "Nhân viên"], ["guest", "Khách"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div className="flex gap-2"><button type="button" onClick={() => setProfileEditor(null)} disabled={saving} className="flex-1 px-4 py-2.5 border border-cream-300 rounded-xl text-sm font-bold">Hủy</button><button disabled={saving} className="flex-1 px-4 py-2.5 bg-butter hover:bg-butter-400 border border-butter-300 rounded-xl text-sm font-bold">{saving ? "Đang lưu..." : "Lưu hồ sơ"}</button></div>
        </form>}
      </Modal>

      <Modal isOpen={!!roleEditor} onClose={() => !saving && setRoleEditor(null)} title="Phân quyền tài khoản" size="md">
        {roleEditor && <div className="space-y-4">
          {error && <p role="alert" className="p-3 rounded-xl bg-terracotta-50 border border-terracotta-200 text-sm text-terracotta-700">{error}</p>}
          <div className="rounded-2xl border border-cream-300 bg-cream-50 p-4"><p className="text-sm font-bold text-charcoal-900">{roleEditor.full_name}</p><p className="text-xs text-charcoal-500 mt-1">{roleEditor.email || "Chưa cập nhật email"}</p><p className="text-xs text-charcoal-600 mt-3">Vai trò hiện tại: <strong>{ROLE_LABEL[roleEditor.role]}</strong></p></div>
          <RoleSelect value={newRole} onChange={setNewRole} />
          <div className="flex items-start gap-2 p-3 rounded-xl bg-ivory border border-cream-200 text-xs text-charcoal-600"><ShieldCheck className="w-4 h-4 shrink-0 text-butter-700" />{ROLE_DESCRIPTION[newRole]}</div>
          <div className="flex gap-2"><button type="button" onClick={() => setRoleEditor(null)} className="flex-1 px-4 py-2.5 border border-cream-300 rounded-xl text-sm font-bold">Hủy</button><button type="button" disabled={newRole === roleEditor.role} onClick={() => requestAccountChange(roleEditor, newRole, roleEditor.account_status)} className="flex-1 px-4 py-2.5 bg-butter hover:bg-butter-400 border border-butter-300 rounded-xl text-sm font-bold disabled:opacity-50">Lưu thay đổi</button></div>
        </div>}
      </Modal>

      <Modal isOpen={!!confirmation} onClose={() => !saving && setConfirmation(null)} title="Xác nhận thay đổi" size="sm">
        {confirmation && <div className="space-y-4">
          {error && <p role="alert" className="p-3 rounded-xl bg-terracotta-50 border border-terracotta-200 text-sm text-terracotta-700">{error}</p>}
          <div className="rounded-2xl border border-cream-300 bg-cream-50 p-4 text-sm text-charcoal-800"><p>Bạn sắp cập nhật tài khoản <strong>{confirmation.account.full_name}</strong>.</p><p className="mt-2">Vai trò: <strong>{ROLE_LABEL[confirmation.account.role]}</strong> → <strong>{ROLE_LABEL[confirmation.role]}</strong></p><p className="mt-1">Trạng thái: <strong>{confirmation.account.account_status === "active" ? "Đang hoạt động" : "Đã khóa"}</strong> → <strong>{confirmation.accountStatus === "active" ? "Đang hoạt động" : "Đã khóa"}</strong></p></div>
          <p className="text-xs text-charcoal-500 flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0 text-butter-700" />Database xác minh quyền Admin và bảo vệ Admin hoạt động cuối cùng.</p>
          <div className="flex gap-2"><button type="button" onClick={() => setConfirmation(null)} disabled={saving} className="flex-1 px-4 py-2.5 bg-white border border-cream-300 rounded-xl text-sm font-bold">Hủy</button><button type="button" onClick={() => void saveAccountChange()} disabled={saving} className="flex-1 px-4 py-2.5 bg-butter hover:bg-butter-400 border border-butter-300 rounded-xl text-sm font-bold disabled:opacity-50">{saving ? "Đang lưu..." : "Xác nhận"}</button></div>
        </div>}
      </Modal>
    </div>
  );
}

function RoleSelect({ value, onChange }: { value: UserRole; onChange: (role: UserRole) => void }) {
  return <label className="block text-xs font-bold text-charcoal-700">Vai trò<select value={value} onChange={(event) => onChange(event.target.value as UserRole)} className="mt-1.5 w-full px-3.5 py-2.5 border border-cream-300 bg-white rounded-xl text-sm text-charcoal-900"><option value="reader">Độc giả</option><option value="librarian">Thủ thư</option><option value="admin">Admin</option></select></label>;
}
