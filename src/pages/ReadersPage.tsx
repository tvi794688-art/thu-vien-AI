import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";
import { PageHeader, EmptyState, LoadingSpinner, Badge } from "@/components/UI";
import Modal from "@/components/Modal";
import { Search, Plus, Edit2, Users, Mail, Phone, Download } from "lucide-react";
import { exportToCSV } from "@/lib/utils";

const READER_TYPES: Record<string, string> = { student: "Học sinh", teacher: "Giáo viên", staff: "Nhân viên", guest: "Khách" };
const CARD_STATUSES: Record<string, string> = { active: "Hoạt động", suspended: "Tạm khóa", expired: "Hết hạn" };

export default function ReadersPage() {
  const [readers, setReaders] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState({ full_name: "", phone: "", reader_type: "student", card_status: "active", address: "" });

  const load = useCallback(async () => {
    setLoading(true);

    // 1. Lấy thông tin user đang đăng nhập để xác định role
    const { data: { user } } = await supabase.auth.getUser();

    let currentUserRole = "reader";
    if (user) {
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (myProfile?.role) {
        currentUserRole = myProfile.role;
      }
    }

    // 2. Phân quyền lọc dữ liệu:
    // Admin: lấy cả thủ thư và độc giả (in ['reader', 'librarian'])
    // Thủ thư: chỉ lấy độc giả (eq 'reader')
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });

    if (currentUserRole === "admin") {
      query = query.in("role", ["reader", "librarian"]);
    } else {
      query = query.eq("role", "reader");
    }

    const { data } = await query;
    setReaders((data || []) as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = readers.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.full_name.toLowerCase().includes(q) || (r.email || "").toLowerCase().includes(q);
  });

  function openAdd() {
    setEditing(null);
    setForm({ full_name: "", phone: "", reader_type: "student", card_status: "active", address: "" });
    setModalOpen(true);
  }

  function openEdit(r: Profile) {
    setEditing(r);
    setForm({ full_name: r.full_name, phone: r.phone || "", reader_type: r.reader_type, card_status: r.card_status, address: r.address || "" });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      await supabase.from("profiles").update({
        full_name: form.full_name,
        phone: form.phone || null,
        reader_type: form.reader_type as Profile["reader_type"],
        card_status: form.card_status as Profile["card_status"],
        address: form.address || null,
      }).eq("id", editing.id);
    }
    setModalOpen(false);
    load();
  }

  function handleExport() {
    exportToCSV("danh-sach-doc-gia.csv",
      ["Họ tên", "Email", "SĐT", "Vai trò / Loại", "Trạng thái thẻ", "Địa chỉ"],
      filtered.map((r) => [
        r.full_name,
        r.email || "",
        r.phone || "",
        r.role === "librarian" ? "Thủ thư" : (READER_TYPES[r.reader_type] || r.reader_type),
        CARD_STATUSES[r.card_status] || r.card_status,
        r.address || ""
      ]),
    );
  }

  const statusColors: Record<string, string> = { active: "green", suspended: "amber", expired: "red" };

  return (
    <div>
      <PageHeader title="Quản lý độc giả" subtitle={`${readers.length} tài khoản trong danh sách`} action={
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" /> Cập nhật độc giả
        </button>
      } />

      <div className="bg-white rounded-xl border border-slate-100 p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên hoặc email..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
          <Download className="w-4 h-4" /> Xuất CSV
        </button>
      </div>

      {loading ? <LoadingSpinner label="Đang tải..." /> : filtered.length === 0 ? (
        <EmptyState icon={<Users className="w-12 h-12" />} title="Chưa có độc giả nào" />
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Độc giả</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Liên hệ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Loại / Vai trò</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium text-slate-600">{r.full_name?.charAt(0) || "U"}</div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{r.full_name}</p>
                          <p className="text-xs text-slate-400">{r.address || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 text-xs text-slate-500">
                        {r.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {r.email}</span>}
                        {r.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {r.phone}</span>}
                        {!r.email && !r.phone && <span>—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.role === "librarian" ? (
                        <Badge color="purple">Thủ thư</Badge>
                      ) : (
                        <Badge color="blue">{READER_TYPES[r.reader_type] || r.reader_type || "Độc giả"}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3"><Badge color={statusColors[r.card_status] || "green"}>{CARD_STATUSES[r.card_status] || "Hoạt động"}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(r)} className="inline-flex items-center justify-center w-8 h-8 text-slate-500 hover:bg-slate-100 rounded-lg transition">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Chỉnh sửa độc giả" : "Thêm độc giả"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Họ và tên *</label>
            <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Loại độc giả</label>
              <select value={form.reader_type} onChange={(e) => setForm({ ...form, reader_type: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(READER_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Số điện thoại</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Trạng thái thẻ</label>
              <select value={form.card_status} onChange={(e) => setForm({ ...form, card_status: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(CARD_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Địa chỉ</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Hủy</button>
            <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">{editing ? "Cập nhật" : "Thêm"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
