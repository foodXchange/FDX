import ContactForm from '@/components/ContactForm';

export default function EnglishContactPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-6 py-12">
      <div className="w-full max-w-xl">
        <h1 className="mb-4 text-center text-3xl font-bold text-slate-900">
          Contact Us
        </h1>
        <p className="text-center text-slate-600 mb-8">
          Tell us what you offer — we’ll guide the next step clearly and efficiently.
        </p>

        <ContactForm lang="en" leadType="supplier" hideTitle />
      </div>
    </main>
  );
}