export interface HebrewCategoryMeta {
  title: string;
  icon: string;
  description: string;
  retailNotes: string;
}

export const HEBREW_CATEGORY_NAMES: Record<string, HebrewCategoryMeta> = {
  "Oils & Fats": {
    title: "שמנים ושמן זית",
    icon: "🫒",
    description: "שמן זית כתית מעולה (EVOO), שמני חמניות, קנולה ושמני תיבול מספרד, איטליה ויוון.",
    retailNotes: "מותג פרטי, כשרות רבנות ראשית/בד״ץ, בקבוקי 750 מ״ל ופחים למוסדי.",
  },
  "Tomato Products": {
    title: "עגבניות, רסקים ורטבים",
    icon: "🍅",
    description: "עגבניות איטלקיות מרוסקות (Polpa), רסקי עגבניות מרוכזים (Passata) ורוטבי פיצה ופסטה.",
    retailNotes: "איטליה וספרד, כשרות מהדרין, אריזות קמעונאיות 400 גרם ודליי 5 ק״ג.",
  },
  "Fish & Seafood": {
    title: "שימורי דגים וטונה",
    icon: "🥫",
    description: "שימורי טונה בהירה בשמן צמחי ובשמן זית (Skipjack / Yellowfin), סרדינים, מקרל ופילטים.",
    retailNotes: "ספרד ופורטוגל, כשרות בד״ץ/רבנות, רביעיות 4x160 גרם ופחיות מוסדיות.",
  },
  "Frozen Foods": {
    title: "מזון קפוא וירקות",
    icon: "🍟",
    description: "צ׳יפס בלגי והולנדי מובחר, ירקות קפואים (אפונה, שעועית, תירס), פירות יער ופילטים קפואים.",
    retailNotes: "מכולות Reefer, כשרות רבנות מהדרין, שקיות 2.5 ק״ג ו-1 ק״ג.",
  },
  "Pasta & Grains": {
    title: "פסטה, אורז ודגנים",
    icon: "🍝",
    description: "פסטה איטלקית מסמולינת חיטת דורום, קמחי פיצה ומאפה (Tipo 00), אורז ודגנים.",
    retailNotes: "איטליה, כשרות רבנות יבוא, אריזות 500 גרם ו-1 ק״ג מותג פרטי.",
  },
  "Sweet Biscuits & Bars": {
    title: "עוגיות, ביסקוויטים ומתוקים",
    icon: "🍪",
    description: "ביסקוויטים אירופאיים, ופלים, חטיפי שוקולד ועוגיות ללא גלוטן.",
    retailNotes: "בלגיה, ספרד ופולין, כשרות אפייה מיוחדת, מותג פרטי לרשתות.",
  },
  Snacks: {
    title: "חטיפים וקרקרים",
    icon: "🥨",
    description: "קרקרים מלוחים, חטיפי תפוחי אדמה, פופקורן וטורטיות פרימיום.",
    retailNotes: "אירופה, ת״י 1145, אריזות שקיות קמעונאיות.",
  },
  "Sauces & Condiments": {
    title: "רטבים, ממרחים ומיונז",
    icon: "🥣",
    description: "מיונז אירופאי (דליים ובקבוקים לחיצים), חרדל דיז׳ון, קטשופ ורטבי שף.",
    retailNotes: "כשרות מהדרין, דליי 5 ק״ג לשוק המוסדי ובקבוקים לרשתות.",
  },
  "Breakfast Cereals": {
    title: "דגני בוקר וגרנולה",
    icon: "🥣",
    description: "גרנולה קראנצ׳ית, דגני בוקר מצופים, שיבולת שועל ודגנים מלאים.",
    retailNotes: "בד״ץ מוכר, ללא תוספת סוכר, אריזות קרטון ממותגות.",
  },
  Bakery: {
    title: "מאפים, קמחים ותערובות",
    icon: "🥖",
    description: "בסיסי פיצה קפואים, לחמים מיוחדים, קמחים איטלקיים ותערובות אפייה.",
    retailNotes: "קמח ישובי, כשרות מהדרין ואישור מחלקת יבוא.",
  },
  "Canned Foods": {
    title: "שימורי ירקות וקטניות",
    icon: "🫘",
    description: "שימורי חומוס, שעועית, תירס, פטריות מובחרות וזיתים ספרדיים.",
    retailNotes: "ספרד ויוון, מחירים תחרותיים במכולות FCL.",
  },
  "Organic & Natural": {
    title: "מזון אורגני וטבעי",
    icon: "🌱",
    description: "מוצרים בעלי תקן אורגני אירופאי (EU Organic), ללא חומרים משמרים ו-Non-GMO.",
    retailNotes: "תקני Bio / Organic, תיוג בעברית לפי דרישות משרד החקלאות.",
  },
  Beverages: {
    title: "משקאות ומיצים",
    icon: "🧃",
    description: "מיצי פירות טבעיים, מים מינרליים מוגזים ומשקאות צמחיים.",
    retailNotes: "איטליה וספרד, בקבוקי זכוכית ופחיות.",
  },
  Dairy: {
    title: "מוצרי חלב וגבינות",
    icon: "🧀",
    description: "גבינות קשות (פרמזן, גרנה פדנו, גאודה) וחמאה אירופאית.",
    retailNotes: "כשרות חלב ישראל ברבנות, רישיונות יבוא מזון רגיש.",
  },
  "Plant-Based Proteins": {
    title: "תחליפי חלבון וחלב",
    icon: "🥛",
    description: "משקאות שיבולת שועל, שקדים וסויה, תחליפי בשר על בסיס אפונה וסויה.",
    retailNotes: "טבעוני / פרווה, כשרות מהדרין.",
  },
  "Confectionery & Chocolate": {
    title: "ממתקים ושוקולד",
    icon: "🍫",
    description: "טבלאות שוקולד בלגי ושוויצרי, סוכריות גומי ופרלינים.",
    retailNotes: "אירופה, כשרות חלב עכו״ם או בד״ץ לפי דרישה.",
  },
  "Spices & Herbs": {
    title: "תבלינים ועשבי תיבול",
    icon: "🧂",
    description: "זעפרן ספרדי, פפריקה מעושנת, אורגנו איטלקי ותערובות תיבול לשוק המוסדי.",
    retailNotes: "ללא חרקים, כשרות בד״ץ מהדרין.",
  },
  "Pulses & Legumes": {
    title: "קטניות וגרגרים יבשים",
    icon: "🌾",
    description: "עדשים (אדומות, ירוקות, שחורות), גרגרי חומוס ושעועית מיובשת בשקים ומכולות.",
    retailNotes: "איכות נקייה, בדיקות מעבדה והסגר בישראל.",
  },
  "Meat & Poultry": {
    title: "בשר ועוף (שחיטת חו״ל)",
    icon: "🥩",
    description: "בשר בקר קפוא וחלקי פנים בפיקוח שחיטה רבנות ראשית / גלאט.",
    retailNotes: "אישורי יבוא משרד החקלאות וצוותי שחיטה מוכרים.",
  },
  "Ingredients & Additives": {
    title: "חומרי גלם לתעשיית המזון",
    icon: "🧪",
    description: "פקטין, עמילנים, סיבים תזונתיים וחומצות מאכל למפעלי מזון מקומיים.",
    retailNotes: "תעודות אנליזה (COA), BRC/IFS וכשרות.",
  },
  "Dairy-Free Desserts": {
    title: "קינוחים ללא חלב",
    icon: "🍨",
    description: "גלידות וקינוחים על בסיס קוקוס ושקדים, פרווה בכשרות מהדרין.",
    retailNotes: "אירופה, שרשרת קירור והקפאה עמוקה.",
  },
  "Sugars & Sweeteners": {
    title: "סוכרים וממתיקים",
    icon: "🍯",
    description: "סוכר קנים אורגני, סירופ אגבה, ממתיקים טבעיים ודבש מובחר.",
    retailNotes: "אריזות תעשייתיות וקמעונאיות.",
  },
  Other: {
    title: "מוצרים נוספים",
    icon: "📦",
    description: "מגוון קטגוריות מזון מיוחדות ממפעלים מאושרים ברחבי אירופה.",
    retailNotes: "איתור מותאם אישית לפי דרישה.",
  },
};

export function getHebrewCategoryMeta(cat: string): HebrewCategoryMeta {
  return (
    HEBREW_CATEGORY_NAMES[cat] ?? {
      title: cat,
      icon: "📦",
      description: `מגוון מוצרי ${cat} מיצרנים אירופאים מאומתים.`,
      retailNotes: "איתור מותאם אישית לפי מפרט הרשת.",
    }
  );
}
