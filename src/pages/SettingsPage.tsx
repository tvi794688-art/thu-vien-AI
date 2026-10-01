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
        subtitle="Cấu hình tham số thư viện"
      />

      <form
        onSubmit={handleSave}
        className="bg-white rounded-xl border border-slate-100 p-6 space-y-5"
      >
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <SettingsIcon className="w-5 h-5 text-slate-500" />
          <h3 className="font-semibold text-slate-800">
            Tham số thư viện
          </h3>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-sm text-rose-600">{error}</p>
          </div>
        )}

        {saved && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm text-emerald-600 font-medium">
              Đã lưu cài đặt thành công!
            </p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">
            Tên thư viện
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
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Số ngày mượn mặc định
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Tiền phạt mỗi ngày (VNĐ)
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Đang lưu..." : "Lưu cài đặt"}
          </button>
        </div>
      </form>
    </div>
  );
}