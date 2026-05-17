import Container from "./Container";

export default function Section({
  children,
  className = "",
  containerClassName = "",
  variant = "white",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  variant?: "white" | "alt" | "dark";
  id?: string;
}) {
  const bg =
    variant === "dark"
      ? "bg-slate-900 text-white"
      : variant === "alt"
      ? "bg-slate-50"
      : "bg-white";

  const border = variant === "white" ? "border-t border-slate-100" : "";

  return (
    <section id={id} className={`${bg} ${border} py-20 sm:py-24 ${className}`}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}