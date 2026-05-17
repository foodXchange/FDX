import Link from "next/link";

export default function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-md font-semibold transition focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2";
  const styles =
    variant === "primary"
      ? "bg-orange-500 text-white hover:bg-orange-600 shadow-sm"
      : "border border-slate-300 text-slate-800 hover:bg-slate-50";

  return (
    <Link href={href} className={`${base} ${styles} px-6 py-3 ${className}`}>
      {children}
    </Link>
  );
}
``