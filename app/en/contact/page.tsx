import ContactForm from '@/components/ContactForm';

export default function EnglishContactPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-6 py-12">
      <div className="w-full max-w-xl">
        <h1 className="mb-4 text-center text-3xl font-bold text-slate-900">Contact Us</h1>
        <p className="text-center text-slate-600 mb-8">
          Choose the right path below — WhatsApp or email — and we’ll respond within 24 hours.
        </p>

        <ContactForm lang="en" leadType="supplier" allowSwitch />
      </div>
    </main>
  );
}
