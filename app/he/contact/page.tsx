import ContactForm from '@/components/ContactForm';

export default function HebrewContactPage() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-6 py-12"
    >
      <div className="w-full max-w-xl">
        <h1 className="mb-4 text-center text-3xl font-bold text-slate-900">
          צור קשר
        </h1>
        <p className="text-center text-slate-600 mb-8">
          ספרו לנו מה אתם מחפשים — ונעזור להתקדם בצורה ברורה ומדויקת.
        </p>

        <ContactForm lang="he" leadType="buyer" hideTitle />
      </div>
    </main>
  );
}