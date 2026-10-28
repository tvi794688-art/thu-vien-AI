import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { LibrarySettings } from "@/types";
import { PageHeader, LoadingSpinner } from "@/components/UI";
import { Save, Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<LibrarySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      const { data, error: loadError } = await supabase
        .from("settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (loadError) {
        setError("Không thể tải cài đặt hệ thống.");
        setSettings(null);
      } else {
        setSettings(data as LibrarySettings | null);
      }

      setLoading(false);
    }

    load();
  }, []);

  function validateSettings() {
    if (!settings) {
      return "Không tìm thấy dữ liệu cài đặt.";
    }

    if (!settings.library_name.trim()) {
      return "Tên thư viện không được để trống.";
    }

    if (!Number.isInteger(settings.loan_period_days) || settings.loan_period_days < 1) {
      return "Số ngày mượn mặc định phải từ 1 trở lên.";
    }

    if (!Number.isInteger(settings.renewal_days) || settings.renewal_days < 1) {
      return "Số ngày gia hạn phải từ 1 trở lên.";
    }

    if (!Number.isInteger(settings.max_renewals) || settings.max_renewals < 0) {
      return "Số lần gia hạn tối đa không được nhỏ hơn 0.";
    }

    if (
      typeof settings.fine_per_day !== "number" ||
      !Number.isFinite(settings.fine_per_day) ||
      settings.fine_per_day < 0
    ) {
      return "Tiền phạt mỗi ngày không được nhỏ hơn 0.";
    }

    return "";
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateSettings();

    if (validationError) {
      setSaved(false);
      setError(validationError);
      return;
    }

    if (!settings) return;

    setSaving(true);
    setSaved(false);
    setError("");

    const { error: saveError } = await supabase
      .from("settings")
      .update({
        library_name: settings.library_name.trim(),
        loan_period_days: settings.loan_period_days,
        max_renewals: settings.max_renewals,
        fine_per_day: settings.fine_per_day,
        renewal_days: settings.renewal_days,
      })
      .eq("id", 1);

    setSaving(false);

    if (saveError) {
      setError("Không thể lưu cài đặt. Vui lòng kiểm tra quyền truy cập hoặc dữ liệu nhập.");
      return;
    }

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 3000);
  }

  if (loading) {
    return <LoadingSpinner label="Đang tải..." />;
  }

  if (!settings) {
    return (
      <div className="max-w-2xl">
        <PageHeader title="Cài đặt hệ thống" subtitle="Cấu hình tham số thư viện" />

        <div className="bg-white rounded-xl border border-rose-200 p-6">
          <p className="text-sm text-rose-600">
            {error || "Không tìm thấy dữ liệu cài đặt."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Cài đặt hệ thống"
        subtitle="Cấu hình quy định mượn trả, mức phí phạt và chính sách thư viện"
      />

      <form
        onSubmit={handleSave}
        className="bg-white rounded-3xl border border-cream-300 p-8 space-y-6 shadow-warm"
      >
        <div className="flex items-center gap-2.5 pb-5 border-b border-cream-200">
          <SettingsIcon className="w-5 h-5 text-butter-700" />
          <h3 className="font-bold text-charcoal-900 text-lg">
            Quy định & Tham số vận hành
          </h3>
        </div>

        {error && (
          <div className="rounded-2xl border border-terracotta-200 bg-terracotta-50 px-4 py-3.5 shadow-warm-xs">
            <p className="text-sm font-semibold text-terracotta-700">{error}</p>
          </div>
        )}

        {saved && (
          <div className="rounded-2xl border border-sage-300 bg-sage-50 px-4 py-3.5 shadow-warm-xs">
            <p className="text-sm font-bold text-charcoal-900">
              Cập nhật tham số hệ thống thành công!
            </p>
          </div>
        )}

        <div>
          <label className="text-sm font-bold text-charcoal-800 mb-1.5 block">
            Tên thư viện / Học viện
          </label>

          <input
            type="text"
            value={settings.library_name}
            onChange={(e) =>
              setSettings({
                ...settings,
                library_name: e.target.value,
              })
            }
            className="w-full px-4 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm text-charcoal-900 focus:outline-none focus:border-butter transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-bold text-charcoal-800 mb-1.5 block">
              Thời hạn mượn mặc định (ngày)
            </label>

            <input
              type="number"
              min="1"
              value={settings.loan_period_days}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  loan_period_days: Number(e.target.value),
                })
              }
              className="w-full px-4 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm text-charcoal-900 focus:outline-none focus:border-butter transition"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-charcoal-800 mb-1.5 block">
              Số ngày gia hạn mỗi lần
            </label>

            <input
              type="number"
              min="1"
              value={settings.renewal_days}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  renewal_days: Number(e.target.value),
                })
              }
              className="w-full px-4 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm text-charcoal-900 focus:outline-none focus:border-butter transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-bold text-charcoal-800 mb-1.5 block">
              Số lần gia hạn tối đa
            </label>

            <input
              type="number"
              min="0"
              value={settings.max_renewals}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  max_renewals: Number(e.target.value),
                })
              }
              className="w-full px-4 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm text-charcoal-900 focus:outline-none focus:border-butter transition"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-charcoal-800 mb-1.5 block">
              Tiền phạt mỗi ngày quá hạn (VNĐ)
            </label>

            <input
              type="number"
              min="0"
              value={settings.fine_per_day}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  fine_per_day: Number(e.target.value),
                })
              }
              className="w-full px-4 py-2.5 border border-cream-300 bg-cream-50/60 rounded-xl text-sm text-charcoal-900 focus:outline-none focus:border-butter transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-5 border-t border-cream-200">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-butter hover:bg-butter-400 text-charcoal-900 rounded-xl text-sm font-bold border border-butter-300 shadow-warm-sm hover:shadow-warm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-charcoal-900" />
            {saving ? "Đang lưu cấu hình..." : "Lưu cài đặt"}
          </button>
        </div>
      </form>
    </div>
  );
}