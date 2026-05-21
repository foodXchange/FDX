import PortfolioForm from "@/components/admin/PortfolioForm";
import { createPortfolioItem } from "@/app/admin/portfolio/actions";

export default function NewPortfolioPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <a href="/admin/portfolio" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
          ← Portfolio
        </a>
        <span className="text-sm font-semibold text-gray-800">New item</span>
      </div>
      <PortfolioForm action={createPortfolioItem} redirectOnCreate="/admin/portfolio" />
    </main>
  );
}
