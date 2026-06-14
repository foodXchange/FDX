import type { Metadata } from "next";
import SupplierRegistrationForm from "@/components/suppliers/SupplierRegistrationForm";

export const metadata: Metadata = {
  title: "Become a Supplier | FoodXchange",
  description:
    "Register your company with FoodXchange in a few guided steps — tell us about your products, certifications, and contact details, and we'll review your fit with active buyer requests in Israel.",
  keywords: [
    "supplier registration",
    "become a supplier",
    "food manufacturer Israel",
    "export food to Israel",
  ],
  openGraph: {
    title: "Become a Supplier | FoodXchange",
    description:
      "Register your company in a few guided steps. We review every submission personally.",
    type: "website",
  },
};

export default function SupplierRegisterPage() {
  return (
    <main className="bg-slate-900">
      {/* ── HERO ── */}
      <section className="px-6 py-16 text-center border-b border-slate-800">
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          Become a Supplier
        </h1>
        <p className="mt-4 text-slate-300 max-w-xl mx-auto leading-relaxed">
          Tell us about your company and products in a few guided steps. We review every
          registration personally and follow up if there is a fit with our active buyer
          requests in Israel.
        </p>
      </section>

      {/* ── FORM ── */}
      <section className="px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <SupplierRegistrationForm />
        </div>
      </section>
    </main>
  );
}
