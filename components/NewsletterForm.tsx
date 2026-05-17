'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface NewsletterFormProps {
  lang?: 'en' | 'he';
}

const translations = {
  en: {
    emailLabel: 'Email Address',
    emailPlaceholder: 'your@email.com',
    submit: 'Subscribe',
    required: 'Email is required',
    invalidEmail: 'Please enter a valid email address',
    success: 'Welcome! Check your email for confirmation. Thank you for joining.',
    error: 'Something went wrong. Please try again.',
    alreadySubscribed: 'This email is already subscribed.',
  },
  he: {
    emailLabel: 'כתובת דוא״ל',
    emailPlaceholder: 'your@email.com',
    submit: 'הירשם',
    required: 'דוא״ל נדרש',
    invalidEmail: 'אנא הזן כתובת דוא״ל תקינה',
    success: 'ברוכים הצטרפו! בדוק את תיבת הדוא״ל שלך. תודה על ההצטרפות.',
    error: 'משהו השתבש. אנא נסה שוב.',
    alreadySubscribed: 'כתובת דוא״ל זו כבר רשומה.',
  },
};

const submitNewsletterForm = async (email: string, lang: 'en' | 'he') => {
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .insert([{ email, lang }])
    .select();

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation
      throw new Error('alreadySubscribed');
    }
    throw new Error(error.message);
  }

  return { success: true, data };
};

export default function NewsletterForm({ lang = 'en' }: NewsletterFormProps) {
  const t = translations[lang];
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEmail = () => {
    if (!email.trim()) {
      setError(t.required);
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t.invalidEmail);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!validateEmail()) {
      return;
    }

    setLoading(true);

    try {
      await submitNewsletterForm(email, lang);
      setSubmitted(true);
      setEmail('');

      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    } catch (err: any) {
      console.error('Error subscribing:', err);
      const errorKey = err.message === 'alreadySubscribed' ? 'alreadySubscribed' : 'error';
      setError(t[errorKey as keyof typeof t]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir={lang === 'he' ? 'rtl' : 'ltr'}
      className="w-full max-w-md"
    >
      {submitted && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700 text-sm">
          {t.success}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor="email" className="sr-only">
            {t.emailLabel}
          </label>
          <input
            id="email"
            type="email"
            placeholder={t.emailPlaceholder}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            disabled={loading}
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {loading ? '...' : t.submit}
        </button>
      </form>
    </div>
  );
}
