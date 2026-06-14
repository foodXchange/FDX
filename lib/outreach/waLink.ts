export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function waLink(phone: string | null, text: string): string {
  const digits = phone?.replace(/[^\d]/g, "") ?? "";
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return digits ? `https://wa.me/${digits}${query}` : `https://wa.me/${query}`;
}
