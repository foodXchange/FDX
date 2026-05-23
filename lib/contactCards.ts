export interface CtaButton {
  label: string;
  labelHe?: string;
  audience: "buyer" | "supplier" | "both";
  waMessage: string;
  waMessageHe?: string;
}

interface PersonaContent {
  title?: string;
  titleHe?: string;
  tagline?: string;
  taglineHe?: string;
  pitch?: string;
  pitchHe?: string;
  currentlySourcing?: string[];
  currentlySourcingHe?: string[];
  ctaButtons?: CtaButton[];
}

interface ContactCardData {
  handle: string;
  name: string;
  nameHe?: string;
  firstName: string;
  lastName: string;
  title: string;
  titleHe?: string;
  company: string;
  tagline: string;
  taglineHe?: string;
  pitch?: string;
  pitchHe?: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  linkedin?: string;
  imageUrl?: string;
  currentlySourcing?: string[];
  currentlySourcingHe?: string[];
  defaultCtaButtons?: CtaButton[];
  personas?: Record<string, PersonaContent>;
}

export interface ContactCard {
  handle: string;
  persona: string;
  name: string;
  nameHe?: string;
  firstName: string;
  lastName: string;
  title: string;
  titleHe?: string;
  company: string;
  tagline: string;
  taglineHe?: string;
  pitch?: string;
  pitchHe?: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  linkedin?: string;
  imageUrl?: string;
  currentlySourcing?: string[];
  currentlySourcingHe?: string[];
  ctaButtons: CtaButton[];
}

const rawCards: ContactCardData[] = [
  {
    handle: "udi",
    name: "Udi Stryk",
    nameHe: "אודי סטריק",
    firstName: "Udi",
    lastName: "Stryk",
    title: "Founder & Operator",
    titleHe: "מייסד ומנהל",
    company: "FoodXchange",
    tagline: "Connecting European manufacturers with the Israeli food market.",
    taglineHe: "מחברים יצרנים אירופאים עם שוק המזון הישראלי.",
    pitch:
      "I help Israeli food buyers find the right European manufacturer — pre-screened for specs, kosher path, and volume capacity. And I help European manufacturers enter Israel with a local partner who knows the market.",
    pitchHe:
      "אני עוזר לקמעונאים ישראלים למצוא את היצרן האירופאי הנכון, ועוזר ליצרנים אירופאים להיכנס לשוק הישראלי.",
    email: "info@foodz-x.com",
    phone: "+972525222291",
    whatsapp: "972525222291",
    website: "https://foodz-x.com",
    linkedin: "https://www.linkedin.com/in/udi-stryk/",
    imageUrl: "/founder-udi.jpeg",
    defaultCtaButtons: [
      {
        label: "WhatsApp — I'm a Buyer",
        labelHe: "WhatsApp — אני קונה",
        audience: "buyer",
        waMessage:
          "Hi Udi, I'm a buyer in Israel. I saw your contact card and want to discuss sourcing.",
        waMessageHe:
          "שלום אודי, אני קונה בישראל. ראיתי את כרטיס הביקור שלך ורוצה לדון ברכש.",
      },
      {
        label: "WhatsApp — I'm a Manufacturer",
        labelHe: "WhatsApp — אני יצרן",
        audience: "supplier",
        waMessage:
          "Hi Udi, I'm a manufacturer/exporter. I want to explore entering the Israeli market through FoodXchange.",
        waMessageHe:
          "שלום אודי, אני יצרן/יצואן ורוצה לבדוק כניסה לשוק הישראלי דרך FoodXchange.",
      },
    ],
    personas: {
      buyer: {
        title: "Food Sourcing Partner",
        titleHe: "שותף לרכש מזון",
        tagline:
          "I find the European manufacturer that fits your specs, kosher path, and volume.",
        taglineHe:
          "אני מוצא את היצרן האירופאי שמתאים לתכולה, לנתיב הכשר ולנפח שלך.",
        currentlySourcing: [
          "Frozen vegetables — private label, 3+ containers/month",
          "Plant-based dairy alternatives",
          "Ambient sauces and condiments — kosher certified",
        ],
        currentlySourcingHe: [
          "ירקות קפואים — מותג פרטי, 3+ מכולות בחודש",
          "תחליפי חלב צמחיים",
          "רטבות ותבלינים — עם כשרות",
        ],
        ctaButtons: [
          {
            label: "WhatsApp — Tell Me What You Need",
            labelHe: "WhatsApp — ספר לי מה אתה צריך",
            audience: "buyer",
            waMessage:
              "Hi Udi, I'm a buyer looking to source [product] for Israel. Can we talk?",
            waMessageHe:
              "שלום אודי, אני קונה המחפש לייבא [מוצר] לישראל. נוכל לדבר?",
          },
        ],
      },
      supplier: {
        title: "Israeli Market Entry Partner",
        titleHe: "שותף לכניסה לשוק הישראלי",
        tagline:
          "I open the door to Israeli retailers for European food manufacturers.",
        taglineHe:
          "אני פותח את הדלת לקמעונאים הישראלים עבור יצרני מזון אירופאים.",
        ctaButtons: [
          {
            label: "WhatsApp — Let's Talk Israel",
            labelHe: "WhatsApp — נדבר על ישראל",
            audience: "supplier",
            waMessage:
              "Hi Udi, I'm a manufacturer/exporter interested in the Israeli market. I'd like to explore working together.",
            waMessageHe:
              "שלום אודי, אני יצרן/יצואן המתעניין בשוק הישראלי. אשמח לבחון שיתוף פעולה.",
          },
        ],
      },
    },
  },
];

export function getCard(handle: string): ContactCard | null {
  const lower = handle.toLowerCase();

  let baseHandle = lower;
  let persona = "default";
  const lastDash = lower.lastIndexOf("-");
  if (lastDash > 0) {
    const potentialBase = lower.slice(0, lastDash);
    const potentialPersona = lower.slice(lastDash + 1);
    const candidate = rawCards.find((c) => c.handle === potentialBase);
    if (candidate?.personas?.[potentialPersona]) {
      baseHandle = potentialBase;
      persona = potentialPersona;
    }
  }

  const data = rawCards.find((c) => c.handle === baseHandle);
  if (!data) return null;

  const p = persona !== "default" ? data.personas?.[persona] : undefined;

  return {
    handle: lower,
    persona,
    name: data.name,
    nameHe: data.nameHe,
    firstName: data.firstName,
    lastName: data.lastName,
    title: p?.title ?? data.title,
    titleHe: p?.titleHe ?? data.titleHe,
    company: data.company,
    tagline: p?.tagline ?? data.tagline,
    taglineHe: p?.taglineHe ?? data.taglineHe,
    pitch: p?.pitch ?? data.pitch,
    pitchHe: p?.pitchHe ?? data.pitchHe,
    email: data.email,
    phone: data.phone,
    whatsapp: data.whatsapp,
    website: data.website,
    linkedin: data.linkedin,
    imageUrl: data.imageUrl,
    currentlySourcing: p?.currentlySourcing ?? data.currentlySourcing,
    currentlySourcingHe: p?.currentlySourcingHe ?? data.currentlySourcingHe,
    ctaButtons: p?.ctaButtons ?? data.defaultCtaButtons ?? [],
  };
}
