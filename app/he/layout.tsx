import Header from "@/components/Header";
import Footer from "@/components/ui/Footer";

export default function HeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" lang="he" className="min-h-screen bg-slate-900 text-white font-sans selection:bg-orange-500 selection:text-white">
      <Header />
      {children}
      <Footer lang="he" />
    </div>
  );
}
