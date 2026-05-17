export default function Card({
  children,
  className = "",
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        hover ? "transition hover:-translate-y-0.5 hover:shadow-md" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}