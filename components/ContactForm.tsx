'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type LeadType = 'buyer' | 'supplier';
type Lang = 'en' | 'he';

interface ContactFormProps {
  lang?: Lang;
  leadType?: LeadType;
  hideTitle?: boolean;
  allowSwitch?: boolean;
}

const translations = {
  en: {
    title: "What are you looking for?",
    intro: "Tell us in a sentence or two and we’ll take it from there. No long forms, no commitment — just a conversation.",
    handledAs: "Handling this as",
    buyer: "Buyer / Importer",
    supplier: "Manufacturer / Supplier",

    switchLabel: "Not you?",
    switchBuyer: "I’m a Buyer",
    switchSupplier: "I’m a Manufacturer",

    nameLabel: "Your name",
    namePlaceholder: "First name + company name is enough",

    emailLabel: "Email address",
    emailPlaceholder: "you@company.com",

    companyLabel: "Company (optional)",
    companyPlaceholder: "Company name",

    messageLabel: "What are you looking for?",
    messagePlaceholder: "e.g. a frozen food supplier for private label, or a buyer for our pasta range in Israel",

    resetTemplate: "Reset template",

    trustLineA: "Confidential — we never share your details.",
    trustLineB: "No obligation — just a conversation.",

    submit: "Start the Conversation →",
    required: "This field is required",
    invalidEmail: "Please enter a valid email address",
    success: "We received your message and we’ll reply personally within 24 hours.",
    error: "Something went wrong. Please try again.",
    sending: "Sending...",
  },

  he: {
    title: 'בואו נתחיל שיחה',
    intro:
      'שתפו כמה פרטים קצרים ונחזור אליכם אישית. ככל שתהיו מדויקים יותר — נוכל לעזור מהר יותר.',
    handledAs: 'הפנייה תטופל כ',
    buyer: 'קניין / יבואן',
    supplier: 'יצרן / ספק',

    switchLabel: 'לא אתם?',
    switchBuyer: 'אני קניין',
    switchSupplier: 'אני יצרן',

    nameLabel: 'שם מלא',
    namePlaceholder: 'השם המלא שלך',

    emailLabel: 'דוא״ל',
    emailPlaceholder: 'name@company.com',

    companyLabel: 'חברה (אופציונלי)',
    companyPlaceholder: 'שם החברה',

    messageLabel: 'הודעה',
    messagePlaceholder: 'תארו בקצרה: קטגוריה, היקפים, דרישות חובה.',

    resetTemplate: 'איפוס תבנית',

    trustLineA: 'אנחנו חוזרים בתוך 24 שעות (ימי עסקים).',
    trustLineB: 'דיסקרטי, ממוקד ומקצועי. ללא ספאם.',

    submit: 'בואו נתקדם',
    required: 'שדה זה הוא חובה',
    invalidEmail: 'אנא הזן כתובת דוא״ל תקינה',
    success: 'קיבלנו את ההודעה — נבדוק ונחזור אליכם בקרוב.',
    error: 'משהו השתבש. אנא נסו שוב.',
    sending: 'שולח...',
  },
} as const;

/** Templates */
const buyerTemplateEN = `Hi, I’m a buyer/importer.
Category:
Target volumes:
Must-haves (kosher/halal/format/price):
Goal:`;

const supplierTemplateEN = `Hi, I’m a manufacturer/supplier.
Products/categories:
Private label/OEM:
Certifications:
Capacity & lead time:
Export markets:
Kosher/Halal:`;

const buyerTemplateHE = `שלום, אני קניין/יבואן.
קטגוריה:
היקפים:
דרישות חובה (כשרות/הלל/אריזה/מחיר):
מטרה:`;

const supplierTemplateHE = `שלום, אני יצרן/ספק.
מוצרים/קטגוריות:
Private label/OEM:
תקנים:
קיבולת ו‑Lead time:
שוקי יעד:
כשרות/הלל:`;

function getTemplate(type: LeadType, lang: Lang) {
  if (lang === 'he') return type === 'buyer' ? buyerTemplateHE : supplierTemplateHE;
  return type === 'buyer' ? buyerTemplateEN : supplierTemplateEN;
}

async function insertToSupabase(payload: {
  name: string;
  email: string;
  company?: string;
  message: string;
  lead_type: LeadType;
  lang: Lang;
}) {
  const { error } = await supabase.from('contacts').insert([payload]);
  if (error) throw new Error(error.message);
}

async function notifyByEmail(payload: {
  name: string;
  email: string;
  company?: string;
  message: string;
  lead_type: LeadType;
  lang: Lang;
}): Promise<{ intentSummary?: string }> {
  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Contact email failed');
  }
  return (await res.json().catch(() => ({}))) as { intentSummary?: string };
}

export default function ContactForm({
  lang = 'en',
  leadType = 'buyer',
  hideTitle = false,
  allowSwitch = true,
}: ContactFormProps) {
  const t = translations[lang];
  const isHe = lang === 'he';

  const [selectedLeadType, setSelectedLeadType] = useState<LeadType>(leadType);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [intentSummary, setIntentSummary] = useState<string>('');

  // important: track if user typed in message
  const messageTouchedRef = useRef(false);

  // Reset message field when lead type switches (but don't pre-fill a template)
  useEffect(() => {
    if (messageTouchedRef.current && formData.message.trim()) return;
    setFormData((prev) => ({ ...prev, message: '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeadType]);

  const roleText = selectedLeadType === 'buyer' ? t.buyer : t.supplier;

  const whatsappUrl = useMemo(() => {
    const phone = '972525222291';
    const header =
      selectedLeadType === 'buyer'
        ? 'Buyer/Importer inquiry'
        : 'Manufacturer/Supplier inquiry';

    const msg = `${header}
Name: ${formData.name || ''}
Company: ${formData.company || ''}
Email: ${formData.email || ''}

${formData.message || ''}`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(msg.trim())}`;
  }, [selectedLeadType, formData]);

  const emailFallback = useMemo(() => {
    const to = 'info@foodz-x.com';
    const subject =
      selectedLeadType === 'buyer'
        ? 'Buyer inquiry via FoodXchange website'
        : 'Manufacturer inquiry via FoodXchange website';

    const body = `Name: ${formData.name || ''}
Company: ${formData.company || ''}
Email: ${formData.email || ''}

${formData.message || ''}`;

    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [selectedLeadType, formData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = t.required;

    if (!formData.email.trim()) newErrors.email = t.required;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = t.invalidEmail;

    if (!formData.message.trim()) newErrors.message = t.required;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'message') messageTouchedRef.current = true;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (errorMsg) setErrorMsg('');
  };

  // ✅ Reset template MUST override any typed content
  const handleResetTemplate = () => {
    messageTouchedRef.current = false; // allow template to be restored
    setFormData((prev) => ({
      ...prev,
      message: getTemplate(selectedLeadType, lang),
    }));
    setErrors((prev) => ({ ...prev, message: '' }));
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrorMsg('');

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      company: formData.company.trim() || undefined,
      message: formData.message.trim(),
      lead_type: selectedLeadType,
      lang,
    };

    try {
      // 1) Save to DB
      await insertToSupabase(payload);

      // 2) Notify via email (Resend)
      const data = await notifyByEmail(payload);

      setSubmitted(true);
      setIntentSummary(data.intentSummary ?? payload.message);
      messageTouchedRef.current = false;
      setFormData({ name: '', email: '', company: '', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error('Contact submit error:', err);
      setErrorMsg(t.error);
    } finally {
      setLoading(false);
    }
  };

  function buildWhatsAppUrl(summary: string): string {
    const phone = '972525222291';
    const message = encodeURIComponent(
      `Hi, I just submitted a sourcing request on FoodXchange.\n\n` +
      `My request: ${summary}\n\n` +
      `Looking forward to hearing from you.`
    );
    return `https://wa.me/${phone}?text=${message}`;
  }

  const labelClass = 'block text-sm font-semibold text-slate-800';

  const baseInput =
    'mt-2 w-full rounded-md border px-4 py-2.5 text-sm font-semibold text-slate-900 ' +
    'placeholder:text-slate-500 bg-white caret-orange-600 ' +
    'outline-none transition disabled:bg-slate-100 disabled:text-slate-700';

  const okInput = 'border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200';
  const errInput = 'border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200';

  const toggleBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-semibold transition ${
      active ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
    }`;

  return (
    <div
      dir={isHe ? 'rtl' : 'ltr'}
      className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-md border-t-4 border-t-orange-500"
    >
      {!hideTitle && (
        <div className="mb-5">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t.title}</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">{t.intro}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">{t.handledAs}:</span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800">
              {roleText}
            </span>

            {allowSwitch && (
              <div className="flex items-center gap-2 ml-0 sm:ml-auto">
                <span className="text-xs text-slate-500">{t.switchLabel}</span>
                <button type="button" onClick={() => setSelectedLeadType('buyer')} className={toggleBtn(selectedLeadType === 'buyer')}>
                  {t.switchBuyer}
                </button>
                <button type="button" onClick={() => setSelectedLeadType('supplier')} className={toggleBtn(selectedLeadType === 'supplier')}>
                  {t.switchSupplier}
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-1 text-xs text-slate-500">
            <div>✓ {t.trustLineA}</div>
            <div>✓ {t.trustLineB}</div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600 transition shadow-sm"
            >
              💬 WhatsApp
            </a>

            <a
              href={emailFallback}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              ✉️ Email
            </a>
          </div>
        </div>
      )}

      {submitted && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-900 font-medium">
          {t.success}
        </div>
      )}

      {intentSummary && (
        <div className="mb-5 pt-5 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500 mb-4">
            Want a faster response? Message us directly:
          </p>
          <a
            href={buildWhatsAppUrl(intentSummary)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-green-500 hover:bg-green-600 active:scale-95 transition-all duration-150 text-white font-semibold px-8 py-4 rounded-xl text-base shadow-lg shadow-green-500/20"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.121 1.532 5.856L0 24l6.336-1.51A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.488-5.19-1.345l-.37-.217-3.84.915.977-3.717-.24-.386A9.95 9.95 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
            Continue on WhatsApp
          </a>
          <p className="text-xs text-slate-400 mt-3">
            Opens WhatsApp with your request pre-filled
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        <div>
          <label htmlFor="name" className={labelClass}>{t.nameLabel}</label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder={t.namePlaceholder}
            value={formData.name}
            onChange={handleChange}
            disabled={loading}
            className={`${baseInput} ${errors.name ? errInput : okInput}`}
            autoComplete="name"
          />
          {errors.name && <p className="mt-1 text-sm text-red-700 font-medium">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>{t.emailLabel}</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder={t.emailPlaceholder}
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
            className={`${baseInput} ${errors.email ? errInput : okInput}`}
            autoComplete="email"
          />
          {errors.email && <p className="mt-1 text-sm text-red-700 font-medium">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="company" className={labelClass}>{t.companyLabel}</label>
          <input
            id="company"
            name="company"
            type="text"
            placeholder={t.companyPlaceholder}
            value={formData.company}
            onChange={handleChange}
            disabled={loading}
            className={`${baseInput} ${okInput}`}
            autoComplete="organization"
          />
        </div>

        <div>
          <div className="flex items-center gap-3">
            <label htmlFor="message" className={labelClass}>{t.messageLabel}</label>
          </div>

          <textarea
            id="message"
            name="message"
            placeholder={t.messagePlaceholder}
            rows={7}
            value={formData.message}
            onChange={handleChange}
            disabled={loading}
            className={`${baseInput} resize-none ${errors.message ? errInput : okInput}`}
          />
          {errors.message && <p className="mt-1 text-sm text-red-700 font-medium">{errors.message}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          {loading ? t.sending : t.submit}
        </button>

        <div className="pt-1 grid gap-1 text-xs text-slate-400">
          <div>✓ {t.trustLineA}</div>
          <div>✓ {t.trustLineB}</div>
        </div>
      </form>
    </div>
  );
}