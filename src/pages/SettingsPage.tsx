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

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
      setSettings(data as LibrarySettings | null);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    await supabase.from("settings").update({
      library_name: settings.library_name,
      loan_period_days: settings.loan_period_days,
      max_renewals: settings.max_renewals,
      fine_per_day: settings.fine_per_day,
      renewal_days: settings.renewal_days,
    }).eq("id", 1);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <LoadingSpinner label="Đang tải..." />;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Cài đặt hệ thống" subtitle="Cấu hình tham số thư viện" />

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-100 p-6 space-y-5">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <SettingsIcon className="w-5 h-5 text-slate-500" />
          <h3 className="font-semibold text-slate-800">Tham số thư viện</h3>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tên thư viện</label>
          <input type="text" value={settings?.library_name || ""} onChange={(e) => setSettings({ ...settings!, library_name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Số ngày mượn mặc định</label>
            <input type="number" min="1" value={settings?.loan_period_days || 14} onChange={(e) => setSettings({ ...settings!, loan_period_days: parseInt(e.target.value) || 14 })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Số ngày gia hạn mỗi lần</label>
            <input type="number" min="1" value={settings?.renewal_days || 7} onChange={(e) => setSettings({ ...settings!, renewal_days: parseInt(e.target.value) || 7 })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Số lần gia hạn tối đa</label>
            <input type="number" min="0" value={settings?.max_renewals || 2} onChange={(e) => setSettings({ ...settings!, max_renewals: parseInt(e.target.value) || 2 })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tiền phạt mỗi ngày (VNĐ)</label>
            <input type="number" min="0" value={settings?.fine_per_day || 5000} onChange={(e) => setSettings({ ...settings!, fine_per_day: parseInt(e.target.value) || 5000 })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu cài đặt"}
          </button>
          {saved && <span className="text-sm text-emerald-600 font-medium">Đã lưu thành công!</span>}
        </div>
      </form>
    </div>
  );
}
