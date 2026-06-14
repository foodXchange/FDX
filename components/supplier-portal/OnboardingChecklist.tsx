import Link from "next/link";

type ChecklistItem = {
  label: string;
  done: boolean;
  href: string;
};

export default function OnboardingChecklist({
  productCount,
  publishedCount,
  profileComplete,
}: {
  productCount: number;
  publishedCount: number;
  profileComplete: boolean;
}) {
  const items: ChecklistItem[] = [
    {
      label: "Add a product",
      done: productCount > 0,
      href: "/en/supplier-portal/products",
    },
    {
      label: "Publish a product",
      done: publishedCount > 0,
      href: "/en/supplier-portal/products",
    },
    {
      label: "Complete your company profile",
      done: profileComplete,
      href: "/en/supplier-portal/profile",
    },
  ];

  return (
    <div className="dark-card p-5 mb-6">
      <h2 className="text-sm font-semibold text-white mb-3">Get started on FoodXchange</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full text-xs shrink-0 ${
                  item.done ? "bg-green-500/20 text-green-400" : "bg-white/5 text-slate-500"
                }`}
              >
                {item.done ? "✓" : ""}
              </span>
              <span className={`text-sm ${item.done ? "text-slate-400 line-through" : "text-white"}`}>
                {item.label}
              </span>
            </div>
            {!item.done && (
              <Link href={item.href} className="text-xs text-orange-400 hover:text-orange-300 font-medium">
                Go →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
