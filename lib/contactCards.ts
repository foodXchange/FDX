export interface ContactCard {
  handle: string;
  name: string;
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  tagline: string;
  email: string;
  phone: string;      // E.164 format: +972525222291
  whatsapp: string;   // digits only: 972525222291
  website: string;
  linkedin?: string;
  imageUrl?: string;
}

const cards: ContactCard[] = [
  {
    handle: "udi",
    name: "Udi Stryk",
    firstName: "Udi",
    lastName: "Stryk",
    title: "Founder & Operator",
    company: "FoodXchange",
    tagline: "Connecting European manufacturers with the Israeli food market.",
    email: "info@foodz-x.com",
    phone: "+972525222291",
    whatsapp: "972525222291",
    website: "https://foodz-x.com",
    linkedin: "https://www.linkedin.com/in/udi-stryk/",
    imageUrl: "/founder-udi.jpeg",
  },
];

export function getCard(handle: string): ContactCard | null {
  return cards.find((c) => c.handle === handle.toLowerCase()) ?? null;
}
