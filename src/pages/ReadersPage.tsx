import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";
import { PageHeader, EmptyState, LoadingSpinner, Badge } from "@/components/UI";
import Modal from "@/components/Modal";
import { Search, Plus, Edit2, Users, Mail, Phone, Download } from "lucide-react";
import { exportToCSV } from "@/lib/utils";

const READER_TYPES: Record<string, string> = { student: "Học sinh", teacher: "Giáo viên", staff: "Nhân viên", guest: "Khách" };
const CARD_STATUSES: Record<string, string> = { active: "Hoạt động", suspended: "Tạm khóa", expired: "Hết hạn" };
const PAGE_SIZE = 10;

export default function ReadersPage() {
  const [readers, setReaders] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    reader_type: "student",
    card_status: "active",
    address: "",
  });

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

    const { data, error } = await query;

    if (error) {
      alert(`Không thể tải danh sách độc giả: ${error.message}`);
      setReaders([]);
      setLoading(false);
      return;
    }

    setReaders((data || []) as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = readers.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.full_name.toLowerCase().includes(q) || (r.email || "").toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const paginatedReaders = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  function openAdd() {
    setEditing(null);

    setForm({
      full_name: "",
      email: "",
      password: "",
      phone: "",
      reader_type: "student",
      card_status: "active",
      address: "",
    });

    setModalOpen(true);
  }

  function openEdit(r: Profile) {
    setEditing(r);

    setForm({
      full_name: r.full_name,
      email: r.email || "",
      password: "",
      phone: r.phone || "",
      reader_type: r.reader_type,
      card_status: r.card_status,
      address: r.address || "",
    });

    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (saving) return;

    const fullName = form.full_name.trim();
    const email = form.email.trim().toLowerCase();

    if (!fullName) {
      alert("Vui lòng nhập họ và tên.");
      return;
    }

    if (!editing) {
      if (!email) {
        alert("Vui lòng nhập email.");
        return;
      }

      if (form.password.length < 6) {
        alert("Mật khẩu phải có ít nhất 6 ký tự.");
        return;
      }
    }

    setSaving(true);

    try {
      if (editing) {
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            phone: form.phone.trim() || null,
            reader_type: form.reader_type as Profile["reader_type"],
            card_status: form.card_status as Profile["card_status"],
            address: form.address.trim() || null,
          })
          .eq("id", editing.id);

        if (error) {
          alert(error.message);
          return;
        }
      } else {
        const { data, error } = await supabase.functions.invoke(
          "create-reader",
          {
            body: {
              full_name: fullName,
              email,
              password: form.password,
              phone: form.phone.trim(),
              reader_type: form.reader_type,
              address: form.address.trim(),
            },
          }
        );

        if (error) {
          alert(error.message);
          return;
        }

        if (data?.error) {
          alert(data.error);
          return;
        }

        alert("Tạo độc giả thành công.");
      }

      setModalOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
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

  const statusColors: Record<string, string> = { active: "sage", suspended: "butter", expired: "terracotta" };

  return (
    <div>
      <PageHeader
        title="Quản lý độc giả"
        subtitle={`${readers.length} tài khoản thành viên trong hệ thống`}
        action={
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-butter hover:bg-butter-400 text-charcoal-900 rounded-xl text-sm font-bold border border-butter-300 shadow-warm-sm hover:shadow-warm transition-all"
          >
            <Plus className="w-4 h-4 text-charcoal-900" />
            Thêm độc giả
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-cream-300 p-3 mb-6 shadow-warm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo họ tên hoặc địa chỉ email..."
            className="w-full pl-10 pr-4 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:border-butter transition"
          />
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-cream-100 border border-cream-300 rounded-xl text-sm font-bold text-charcoal-800 shadow-warm-xs transition-all"
        >
          <Download className="w-4 h-4 text-charcoal-700" />
          Xuất CSV
        </button>
      </div>

      {loading ? (
        <LoadingSpinner label="Đang tải danh sách độc giả..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-12 h-12 text-sage-500" />}
          title="Chưa tìm thấy độc giả nào"
        />
      ) : (
        <div className="bg-white rounded-3xl border border-cream-300 overflow-hidden shadow-warm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cream-100/70 border-b border-cream-200">
                <tr>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                    Độc giả
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                    Liên hệ
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                    Loại / Vai trò
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="text-right px-5 py-3.5 text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {paginatedReaders.map((r) => (
                  <tr key={r.id} className="hover:bg-cream-50/70 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 bg-cream-200 text-charcoal-900 rounded-2xl flex items-center justify-center font-bold text-sm shadow-warm-xs border border-cream-300 flex-shrink-0">
                          {r.full_name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-charcoal-900">
                            {r.full_name}
                          </p>
                          <p className="text-xs text-charcoal-500 mt-0.5">
                            {r.address || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1 text-xs text-charcoal-700 font-medium">
                        {r.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-charcoal-400" />
                            {r.email}
                          </span>
                        )}
                        {r.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-charcoal-400" />
                            {r.phone}
                          </span>
                        )}
                        {!r.email && !r.phone && <span className="text-charcoal-400">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {r.role === "librarian" ? (
                        <Badge color="butter">Thủ thư</Badge>
                      ) : (
                        <Badge color="sage">
                          {READER_TYPES[r.reader_type] || r.reader_type || "Độc giả"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge color={(statusColors[r.card_status] || "sage") as any}>
                        {CARD_STATUSES[r.card_status] || "Hoạt động"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => openEdit(r)}
                        title="Chỉnh sửa độc giả"
                        className="inline-flex items-center justify-center w-8 h-8 text-charcoal-500 hover:text-charcoal-900 hover:bg-cream-100 rounded-xl border border-transparent hover:border-cream-300 transition"
                      >
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

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-6 px-1">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-cream-300 rounded-xl text-sm font-bold text-charcoal-800 bg-white hover:bg-cream-100 shadow-warm-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trang trước
          </button>

          <span className="text-sm font-bold text-charcoal-800">
            Trang {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
            disabled={currentPage >= totalPages}
            className="px-4 py-2 border border-cream-300 rounded-xl text-sm font-bold text-charcoal-800 bg-white hover:bg-cream-100 shadow-warm-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trang sau
          </button>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Chỉnh sửa thông tin độc giả" : "Thêm độc giả mới"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-charcoal-800 mb-1.5 block">
              Họ và tên *
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) =>
                setForm({ ...form, full_name: e.target.value })
              }
              required
              className="w-full px-4 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm text-charcoal-900 focus:outline-none focus:border-butter transition"
            />
          </div>

          {!editing && (
            <>
              <div>
                <label className="text-sm font-bold text-charcoal-800 mb-1.5 block">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm text-charcoal-900 focus:outline-none focus:border-butter transition"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-charcoal-800 mb-1.5 block">
                  Mật khẩu *
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm text-charcoal-900 focus:outline-none focus:border-butter transition"
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-charcoal-800 mb-1.5 block">
                Loại độc giả
              </label>
              <select
                value={form.reader_type}
                onChange={(e) =>
                  setForm({ ...form, reader_type: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm text-charcoal-900 focus:outline-none focus:border-butter transition"
              >
                {Object.entries(READER_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-charcoal-800 mb-1.5 block">
                Số điện thoại
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm text-charcoal-900 focus:outline-none focus:border-butter transition"
              />
            </div>
          </div>
          {editing && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold text-charcoal-800 mb-1.5 block">
                  Trạng thái thẻ
                </label>
                <select
                  value={form.card_status}
                  onChange={(e) =>
                    setForm({ ...form, card_status: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm text-charcoal-900 focus:outline-none focus:border-butter transition"
                >
                  {Object.entries(CARD_STATUSES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-bold text-charcoal-800 mb-1.5 block">
              Địa chỉ
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-4 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm text-charcoal-900 focus:outline-none focus:border-butter transition"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="flex-1 px-4 py-2.5 border border-cream-300 rounded-xl text-sm font-bold text-charcoal-700 bg-white hover:bg-cream-100 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-warm-xs"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-butter hover:bg-butter-400 text-charcoal-900 border border-butter-300 rounded-xl text-sm font-bold shadow-warm-sm hover:shadow-warm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Đang lưu..." : editing ? "Cập nhật" : "Thêm mới"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
