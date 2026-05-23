import Header from "@/components/Header";
import Footer from "@/components/ui/Footer";
import FloatingSourcingButton from "@/components/FloatingSourcingButton";

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div className="public-page">
        {children}
      </div>
      <FloatingSourcingButton />
      <Footer />
    </>
  );
}
