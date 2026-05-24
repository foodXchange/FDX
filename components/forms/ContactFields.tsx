"use client";

import PhoneInput from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface ContactFieldsErrors {
  name?: string;
  company?: string;
  whatsapp?: string;
  email?: string;
}

interface ContactFieldsProps {
  name: string;
  onNameChange: (v: string) => void;
  company?: string;
  onCompanyChange?: (v: string) => void;
  whatsapp: string;
  onWhatsappChange: (v: string) => void;
  email: string;
  onEmailChange: (v: string) => void;
  errors: ContactFieldsErrors;
  defaultCountry?: string;
  companyOptional?: boolean;
}

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-300 mb-1">
      {children}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-400">{msg}</p>;
}

export default function ContactFields({
  name,
  onNameChange,
  company,
  onCompanyChange,
  whatsapp,
  onWhatsappChange,
  email,
  onEmailChange,
  errors,
  defaultCountry,
  companyOptional,
}: ContactFieldsProps) {
  return (
    <div className="space-y-4">
      {onCompanyChange !== undefined && (
        <div className="space-y-1">
          <Label htmlFor="cf-company">
            Your company{companyOptional ? " (optional)" : ""}
          </Label>
          <input
            id="cf-company"
            type="text"
            value={company ?? ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            placeholder="e.g. Yochananof, ABC Imports"
            className="dark-input"
          />
          <FieldError msg={errors.company} />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="cf-name">Your name *</Label>
          <input
            id="cf-name"
            type="text"
            required
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Full name"
            className="dark-input"
          />
          <FieldError msg={errors.name} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cf-whatsapp">WhatsApp number</Label>
          <div
            className="flex items-center bg-[#162330] border border-white/12 rounded-lg px-3 py-2.5 gap-2"
            style={{ "--PhoneInputCountrySelectArrow-color": "#94a3b8" } as React.CSSProperties}
          >
            <PhoneInput
              defaultCountry={defaultCountry as Country | undefined}
              value={whatsapp || undefined}
              onChange={(v) => onWhatsappChange(v ?? "")}
              inputClassName="flex-1 bg-transparent outline-none text-[#f1f5f9] placeholder-slate-500 text-sm min-w-0"
              numberInputProps={{ id: "cf-whatsapp" }}
            />
          </div>
          <FieldError msg={errors.whatsapp} />
          <p className="mt-1 text-xs text-slate-500">
            We respond faster on WhatsApp — usually within 2 hours.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="cf-email">Email address *</Label>
        <input
          id="cf-email"
          type="email"
          required
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="you@company.com"
          className="dark-input"
        />
        <FieldError msg={errors.email} />
      </div>
    </div>
  );
}
