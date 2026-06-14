"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateSupplierProfile } from "@/app/en/supplier-portal/profile/actions";

interface Props {
  email: string;
  name: string;
  phone: string;
  companyName: string;
  website: string;
  productDescription: string;
}

export default function ProfileForm({ email, name, phone, companyName, website, productDescription }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await updateSupplierProfile(formData);
    setSaving(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setSaved(true);
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPwSaving(true);
    setPwMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setPwSaving(false);
    if (error) {
      setPwMessage(error.message);
    } else {
      setPwMessage("Password updated.");
      setPassword("");
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1.5">Email</label>
          <input type="email" value={email} disabled className="dark-input opacity-60 cursor-not-allowed" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1.5">Your name</label>
          <input name="name" defaultValue={name} className="dark-input" placeholder="Your name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1.5">Phone</label>
          <input name="phone" defaultValue={phone} className="dark-input" placeholder="+972..." />
        </div>
        <div className="border-t border-white/10 pt-4">
          <label className="block text-sm font-medium text-slate-200 mb-1.5">Company name</label>
          <input name="company_name" defaultValue={companyName} className="dark-input" placeholder="Company name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1.5">Website</label>
          <input name="website" defaultValue={website} className="dark-input" placeholder="https://" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1.5">About your company</label>
          <textarea name="product_description" defaultValue={productDescription} rows={4} className="dark-input resize-none" />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {saved && <p className="text-xs text-green-400">Saved.</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      <form onSubmit={handlePasswordChange} className="space-y-4 border-t border-white/10 pt-6">
        <h2 className="text-sm font-semibold text-white">Change password</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="dark-input"
          placeholder="New password"
          minLength={6}
        />
        {pwMessage && <p className="text-xs text-slate-400">{pwMessage}</p>}
        <button
          type="submit"
          disabled={pwSaving || password.length < 6}
          className="btn-ghost px-5 py-2.5 rounded-md text-sm font-medium disabled:opacity-60"
        >
          {pwSaving ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
