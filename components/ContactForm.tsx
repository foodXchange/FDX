'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type LeadType = 'buyer' | 'supplier';
type Lang = 'en' | 'he';

interface ContactFormProps {
  lang?: Lang;
  leadType?: LeadType;          // initial type from page
  hideTitle?: boolean;          // if page already has a title
  allowSwitch?: boolean;        // allow user to switch buyer/supplier
}

const translations = {
  en: {
    title: 'Let’s Start a Conversation',
    intro:
      'Share a few details and we’ll respond personally. The more specific you are, the faster we can help.',
    handledAs: 'This request will be handled as',
    buyer: 'Buyer / Importer',
    supplier: 'Manufacturer / Supplier',

    switchLabel: 'Not you?',
    switchBuyer: 'I’m a Buyer',
    switchSupplier: 'I’m a Manufacturer',

    nameLabel: 'Full Name',
    namePlaceholder: 'Your full name',

    emailLabel: 'Email',
    emailPlaceholder: 'you@company.com',

    companyLabel: 'Company (optional)',
    companyPlaceholder: 'Company name',

    messageLabel: 'Message',
    messagePlaceholder:
      'Briefly describe your needs: category, volumes, must-haves.',

    resetTemplate: 'Reset template',

    trustLineA: 'We respond within 24 hours (business days).',
    trustLineB: 'Confidential & partnership-first. No spam.',
    whatsappAlt: 'Prefer WhatsApp? Tap here',
    emailAlt: 'Prefer email? Click here',

    submit: 'Start the Conversation',
    required: 'This field is required',
    invalidEmail: 'Please enter a valid email address',
    success: 'We received your message — we’ll review it and get back to you shortly.',
    error: 'Something went wrong. Please try again.',
    sending: 'Sending...',
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
    messagePlaceholder:
      'תארו בקצרה: קטגוריה, היקפים, דרישות חובה.',

    resetTemplate: 'איפוס תבנית',

    trustLineA: 'אנחנו חוזרים בתוך 24 שעות (ימי עסקים).',
    trustLineB: 'דיסקרטי, ממוקד ומקצועי. ללא ספאם.',
    whatsappAlt: 'מעדיפים וואטסאפ? לחצו כאן',
    emailAlt: 'מעדיפים מייל? לחצו כאן',

    submit: 'בואו נתקדם',
    required: 'שדה זה הוא חובה',
    invalidEmail: 'אנא הזן כתובת דוא״ל תקינה',
    success: 'קיבלנו את ההודעה — נבדוק ונחזור אליכם בקרוב.',
    error: 'משהו השתבש. אנא נסו שוב.',
    sending: 'שולח...',
  },
} as const;

/** ✅ Your EXACT short templates (copy-ready) */
function buyerTemplateEN() {
  return `Hi, I’m a buyer/importer.
Category:
Target volumes:
Must-haves (kosher/halal/format/price):
Goal:`;
}

function supplierTemplateEN() {
  return `Hi, I’m a manufacturer/supplier.
Products/categories:
Private label/OEM:
Certifications:
Capacity & lead time:
Export markets:
Kosher/Halal:`;
}

// Optional: short Hebrew equivalents (keeps UX consistent on /he/contact)
function buyerTemplateHE() {
  return `שלום, אני קניין/יבואן.
קטגוריה:
היקפים:
דרישות חובה (כשרות/הלל/אריזה/מחיר):
מטרה:`;
}

function supplierTemplateHE() {
  return `שלום, אני יצרן/ספק.
מוצרים/קטגוריות:
Private label/OEM:
תקנים:
קיבולת ו‑Lead time:
שוקי יעד:
כשרות/הלל:`;
}

function getTemplate(type: LeadType, lang: Lang) {
  if (lang === 'he') return type === 'buyer' ? buyerTemplateHE() : supplierTemplateHE();
  return type === 'buyer' ? buyerTemplateEN() : supplierTemplateEN();
}

async function submitContactForm(payload: {
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

export default function ContactForm({
  lang = 'en',
  leadType = 'buyer',
  hideTitle = false,
  allowSwitch = true,
}: ContactFormProps) {
  const t = translations[lang];
  const isHe = lang === 'he';

  // Qualification selection (can switch if allowSwitch)
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

  // Track whether user has edited the message (so we don't overwrite their text)
  const messageTouchedRef = useRef(false);

  // Auto-prefill template on first load OR when switching type (only if user hasn't edited message)
  useEffect(() => {
    const shouldFill =
      !formData.message.trim() || (formData.message.trim() && !messageTouchedRef.current);

    if (!shouldFill) return;

    setFormData((prev) => ({
      ...prev,
      message: getTemplate(selectedLeadType, lang),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeadType, lang]);

  const roleText = selectedLeadType === 'buyer' ? t.buyer : t.supplier;

  // WhatsApp prefill uses current form values (higher conversion)
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
  }, [selectedLeadType, formData.name, formData.company, formData.email, formData.message]);

  // Email fallback (mailto)
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
  }, [selectedLeadType, formData.name, formData.company, formData.email, formData.message]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = t.required;

    if (!formData.email.trim()) {
      newErrors.email = t.required;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t.invalidEmail;
    }

    if (!formData.message.trim()) newErrors.message = t.required;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    // Mark message as touched so we don't overwrite it on type switch
    if (name === 'message') messageTouchedRef.current = true;

    setFormData((prev) => ({
      ...prev,
      [name]: value, // ✅ correct computed property
    }));

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (errorMsg) setErrorMsg('');
  };

  const handleResetTemplate = () => {
    messageTouchedRef.current = false;
    setFormData((prev) => ({
      ...prev,
      message: getTemplate(selectedLeadType, lang),
    }));
    if (errors.message) setErrors((prev) => ({ ...prev, message: '' }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSwitch = (nextType: LeadType) => {
    setSelectedLeadType(nextType);
    // if user hasn't edited message, it will auto-update via useEffect
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrorMsg('');

    try {
      await submitContactForm({
        name: formData.name.trim(),
        email: formData.email.trim(),
        company: formData.company.trim() || undefined,
        message: formData.message.trim(),
        lead_type: selectedLeadType,
        lang,
      });

      setSubmitted(true);
      messageTouchedRef.current = false;
      setFormData({ name: '', email: '', company: '', message: '' });

      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error('Error submitting form:', err);
      setErrorMsg(t.error);
    } finally {
      setLoading(false);
    }
  };

  // Brand-aligned styles
  const labelClass = 'block text-sm font-semibold text-slate-800';

  const baseInput =
    'mt-2 w-full rounded-md border px-4 py-2.5 text-sm font-semibold text-slate-900 ' +
    'placeholder:text-slate-500 bg-white caret-orange-600 ' +
    'outline-none transition disabled:bg-slate-100 disabled:text-slate-700';

  const okInput =
    'border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200';

  const errInput =
    'border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200';

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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {t.title}
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">{t.intro}</p>

          {/* Type badge + optional switch */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">
              {t.handledAs}:
            </span>

            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800">
              {roleText}
            </span>

            {allowSwitch && (
              <div className="flex items-center gap-2 ml-0 sm:ml-auto">
                <span className="text-xs text-slate-500">{t.switchLabel}</span>
                <button
                  type="button"
                  onClick={() => handleSwitch('buyer')}
                  className={toggleBtn(selectedLeadType === 'buyer')}
                >
                  {t.switchBuyer}
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitch('supplier')}
                  className={toggleBtn(selectedLeadType === 'supplier')}
                >
                  {t.switchSupplier}
                </button>
              </div>
            )}
          </div>

          {/* Trust signals */}
          <div className="mt-4 grid gap-1 text-xs text-slate-500">
            <div>✓ {t.trustLineA}</div>
            <div>✓ {t.trustLineB}</div>
          </div>

          {/* WhatsApp + Email fallback */}
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
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="message" className={labelClass}>{t.messageLabel}</label>
            <button
              type="button"
              onClick={handleResetTemplate}
              className="text-xs font-semibold text-slate-600 hover:text-orange-600 transition"
            >
              {t.resetTemplate}
            </button>
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
      </form>
    </div>
  );
}