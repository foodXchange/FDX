"use client";

export default function FloatingWhatsApp() {
  const phone = "972525222291";
  const message = encodeURIComponent(
    "Hi, I came across FoodXchange and would like to explore potential collaboration."
  );

  const whatsappUrl = `https://wa.me/${phone}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="
        fixed bottom-5 right-5 z-50
        bg-green-500 hover:bg-green-600
        text-white text-sm font-semibold
        px-5 py-3
        rounded-full
        shadow-lg hover:shadow-xl
        transition duration-300
        hover:scale-[1.05]
        flex items-center gap-2
      "
    >
      <span className="text-lg">💬</span>
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}