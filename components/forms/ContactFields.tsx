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
  onNameBlur?: () => void;
  company?: string;
  onCompanyChange?: (v: string) => void;
  onCompanyBlur?: () => void;
  whatsapp: string;
  onWhatsappChange: (v: string) => void;
  onWhatsappBlur?: () => void;
  email: string;
  onEmailChange: (v: string) => void;
  onEmailBlur?: () => void;
  errors: ContactFieldsErrors;
  defaultCountry?: string;
  companyOptional?: boolean;
  lang?: "en" | "he";
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
  onNameBlur,
  company,
  onCompanyChange,
  onCompanyBlur,
  whatsapp,
  onWhatsappChange,
  onWhatsappBlur,
  email,
  onEmailChange,
  onEmailBlur,
  errors,
  defaultCountry,
  companyOptional,
  lang = "en",
}: ContactFieldsProps) {
  const isHe = lang === "he";
  const resolvedCountry = (defaultCountry || (isHe ? "IL" : undefined)) as Country | undefined;

  return (
    <div className="space-y-4" dir={isHe ? "rtl" : "ltr"}>
      {onCompanyChange !== undefined && (
        <div className="space-y-1">
          <Label htmlFor="cf-company">
            {isHe
              ? `שם החברה / רשת שיווק${companyOptional ? " (רשות)" : ""}`
              : `Your company${companyOptional ? " (optional)" : ""}`}
          </Label>
          <input
            id="cf-company"
            type="text"
            value={company ?? ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            onBlur={onCompanyBlur}
            placeholder={isHe ? "לדוגמה: יוחננוף, ויקטורי, שופרסל, טעמן" : "e.g. Yochananof, ABC Imports"}
            className="dark-input"
          />
          <FieldError msg={errors.company} />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="cf-name">{isHe ? "שם מלא *" : "Your name *"}</Label>
          <input
            id="cf-name"
            type="text"
            required
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={onNameBlur}
            placeholder={isHe ? "שם פרטי ומשפחה" : "Full name"}
            className="dark-input"
          />
          <FieldError msg={errors.name} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cf-whatsapp">{isHe ? "מספר וואטסאפ (למענה מהיר)" : "WhatsApp number"}</Label>
          <div
            className="flex items-center bg-[#162330] border border-white/12 rounded-lg px-3 py-2.5 gap-2"
            style={{ "--PhoneInputCountrySelectArrow-color": "#94a3b8" } as React.CSSProperties}
            dir="ltr"
          >
            <PhoneInput
              defaultCountry={resolvedCountry}
              value={whatsapp || undefined}
              onChange={(v) => onWhatsappChange(v ?? "")}
              numberInputProps={{
                id: "cf-whatsapp",
                className: "flex-1 bg-transparent outline-none text-[#f1f5f9] placeholder-slate-500 text-sm min-w-0",
                onBlur: onWhatsappBlur,
              }}
            />
          </div>
          <FieldError msg={errors.whatsapp} />
          <p className="mt-1 text-xs text-slate-500">
            {isHe
              ? "אנו מגיבים מהר יותר בוואטסאפ — בדרך כלל בתוך שעתיים."
              : "We respond faster on WhatsApp — usually within 2 hours."}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="cf-email">{isHe ? "כתובת אימייל" : "Email address"}</Label>
        <input
          id="cf-email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          onBlur={onEmailBlur}
          placeholder="you@company.com"
          className="dark-input"
          dir="ltr"
        />
        <FieldError msg={errors.email} />
        <p className="mt-1 text-xs text-slate-500">
          {isHe
            ? "אנא ספקו אימייל או מספר וואטסאפ כדי שנוכל לחזור אליכם עם הצעות יצרנים."
            : "Please provide an email or WhatsApp number so we can reach you."}
        </p>
      </div>
    </div>
  );
}
