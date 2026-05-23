import type { ContactCard } from "./contactCards";

export async function generateVCard(
  card: ContactCard,
  photoBase64?: string
): Promise<string> {
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${card.name}`,
    `N:${card.lastName};${card.firstName};;;`,
    `ORG:${card.company}`,
    `TITLE:${card.title}`,
    `TEL;TYPE=CELL:${card.phone}`,
    `EMAIL;TYPE=INTERNET:${card.email}`,
    `URL:${card.website}`,
  ];
  if (card.linkedin) lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${card.linkedin}`);
  if (card.pitch) lines.push(`NOTE:${card.pitch.replace(/\n/g, "\\n")}`);
  if (photoBase64) lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${photoBase64}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}
