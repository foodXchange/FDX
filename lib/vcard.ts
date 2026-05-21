import type { ContactCard } from "./contactCards";

export function generateVCard(card: ContactCard): string {
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
  lines.push("END:VCARD");
  return lines.join("\r\n");
}
