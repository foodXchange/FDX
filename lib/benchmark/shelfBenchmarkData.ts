export interface ShelfBenchmarkItem {
  id: string;
  category: string;
  category_he: string;
  category_icon: string;

  // Israeli Shelf Brand
  brand_name_he: string;
  brand_name_en: string;
  brand_importer_he: string;
  brand_importer_en: string;
  shelf_price_ils: number;
  shelf_format_he: string;
  shelf_format_en: string;
  brand_estimated_margin_pct: number;

  // European Factory Replacement
  replacement_name_he: string;
  replacement_name_en: string;
  supplier_name: string;
  supplier_country: string;
  supplier_country_he: string;
  supplier_flag: string;
  factory_fob_eur: number;
  estimated_landed_cost_ils: number;
  target_retail_price_ils: number;
  target_retail_margin_pct: number;

  // Logistics & Commercial
  units_per_container: number;
  container_type: "20ft" | "40ft HC" | "40ft Reefer";
  kosher_type_he: string;
  kosher_type_en: string;
  certifications: string[];
  packshot_url: string;
  sensory_notes_he: string;
  sensory_notes_en: string;
  shelf_life_months: number;
  moq_containers: number;
}

export const SHELF_BENCHMARKS: ShelfBenchmarkItem[] = [
  {
    id: "olive-oil-750ml",
    category: "Oils & Fats",
    category_he: "שמנים ושומנים",
    category_icon: "🫒",
    brand_name_he: "שמן זית כתית מעולה — יד מרדכי / פיליפו בריו",
    brand_name_en: "Extra Virgin Olive Oil 750ml — Yad Mordechai / Filippo Berio",
    brand_importer_he: "שטראוס / דיפלומט מפיצים",
    brand_importer_en: "Strauss / Diplomat Distributors",
    shelf_price_ils: 37.90,
    shelf_format_he: "בקבוק זכוכית כהה 750 מ״ל",
    shelf_format_en: "750ml Dark Marasca Glass Bottle",
    brand_estimated_margin_pct: 16,

    replacement_name_he: "שמן זית כתית מעולה חמיצות <0.4% מסיק אנדלוסי",
    replacement_name_en: "Extra Virgin Olive Oil <0.4% Acidity, Andalusian Harvest",
    supplier_name: "Aceites del Sur - Coosur S.A.",
    supplier_country: "Spain",
    supplier_country_he: "ספרד",
    supplier_flag: "🇪🇸",
    factory_fob_eur: 3.10,
    estimated_landed_cost_ils: 17.60,
    target_retail_price_ils: 28.90,
    target_retail_margin_pct: 39,

    units_per_container: 22800,
    container_type: "40ft HC",
    kosher_type_he: "בד״ץ מהדרין ורבנות יבוא",
    kosher_type_en: "Badatz Mehadrin & Chief Rabbinate",
    certifications: ["IFS Food Higher Level", "BRCGS A+", "ISO 22000"],
    packshot_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80",
    sensory_notes_he: "ארומת עשבוניות רעננה (זני פיקואל וארבקינה), חמיצות מדודה 0.35%, איזון פירותי עדין המותאם לחך הישראלי לתיבול ולבישול.",
    sensory_notes_en: "Fresh herbaceous aroma (Picual & Arbequina blend), tested acidity 0.35%, delicate fruity balance tailored for retail cooking and salads.",
    shelf_life_months: 24,
    moq_containers: 1,
  },
  {
    id: "crushed-tomatoes-400g",
    category: "Tomato Products",
    category_he: "שימורי עגבניות ורטבים",
    category_icon: "🍅",
    brand_name_he: "עגבניות מרוסקות מוטי (Mutti Polpa 400g)",
    brand_name_en: "Mutti Polpa Fine Crushed Tomatoes 400g",
    brand_importer_he: "דיפלומט מפיצים בע״מ",
    brand_importer_en: "Diplomat Distributors Ltd",
    shelf_price_ils: 6.90,
    shelf_format_he: "פחית 400 גרם פתיחה קלה (Easy-Open)",
    shelf_format_en: "400g Easy-Open Can with White Lacquer",
    brand_estimated_margin_pct: 18,

    replacement_name_he: "עגבניות איטלקיות מרוסקות דק (100% עגבניות פארמה וקמפניה)",
    replacement_name_en: "100% Italian Fine Crushed Tomatoes (Parma / Campania)",
    supplier_name: "Consorzio Casalasco del Pomodoro",
    supplier_country: "Italy",
    supplier_country_he: "איטליה",
    supplier_flag: "🇮🇹",
    factory_fob_eur: 0.46,
    estimated_landed_cost_ils: 2.65,
    target_retail_price_ils: 4.90,
    target_retail_margin_pct: 46,

    units_per_container: 45600,
    container_type: "40ft HC",
    kosher_type_he: "כשרות מהדרין רבנות יבוא (בד״ץ זמין)",
    kosher_type_en: "Chief Rabbinate Mehadrin (Badatz available)",
    certifications: ["IFS Food", "BRCGS Food", "NON-GMO"],
    packshot_url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
    sensory_notes_he: "מתיקות טבעית ללא תוספת סוכר, רמת בריקס 7.0+, צבע אדום עמוק וסמיכות עשירה ללא עודפי מים.",
    sensory_notes_en: "Natural sweetness with zero added sugar, Brix 7.0+, deep red pigmentation, dense rich texture without excess water.",
    shelf_life_months: 36,
    moq_containers: 1,
  },
  {
    id: "tuna-in-olive-oil-4pack",
    category: "Canned Fish & Tuna",
    category_he: "טונה ושימורי דגים",
    category_icon: "🐟",
    brand_name_he: "טונה ריו מרה בשמן זית (Rio Mare 4x80g)",
    brand_name_en: "Rio Mare Tuna in Olive Oil (4x80g pack)",
    brand_importer_he: "שסטוביץ בע״מ",
    brand_importer_en: "C.H. Schestowitz Ltd",
    shelf_price_ils: 28.90,
    shelf_format_he: "רביעיית פחיות 80 גרם במארז קרטון",
    shelf_format_en: "4x80g cluster pack with outer sleeve",
    brand_estimated_margin_pct: 15,

    replacement_name_he: "פילה טונה בהירה (Yellowfin) בשמן זית כתית מעולה",
    replacement_name_en: "Yellowfin Tuna Fillets in Extra Virgin Olive Oil 4x80g",
    supplier_name: "Conservas Antonio Alonso S.A. (Palacio de Oriente)",
    supplier_country: "Spain",
    supplier_country_he: "ספרד",
    supplier_flag: "🇪🇸",
    factory_fob_eur: 2.45,
    estimated_landed_cost_ils: 13.90,
    target_retail_price_ils: 22.90,
    target_retail_margin_pct: 39,

    units_per_container: 18400,
    container_type: "40ft HC",
    kosher_type_he: "בד״ץ בית יוסף ורבנות הראשית לישראל",
    kosher_type_en: "Badatz Beit Yosef & Chief Rabbinate",
    certifications: ["Friend of the Sea", "MSC Sustainable", "IFS", "BRC"],
    packshot_url: "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=600&auto=format&fit=crop&q=80",
    sensory_notes_he: "נתחי פילה בהירים שלמים ללא פירורים, ספיגת שמן זית עדינה ומרקם נימוח. עומד בתקן הישראלי לתכולה מסוננת.",
    sensory_notes_en: "Solid light fillets without flakes, delicate olive oil infusion and tender texture. 100% compliant with Israeli drained weight regulations.",
    shelf_life_months: 60,
    moq_containers: 1,
  },
  {
    id: "durum-pasta-500g",
    category: "Pasta & Grains",
    category_he: "פסטה, קמחים ודגנים",
    category_icon: "🍝",
    brand_name_he: "פסטה ברילה (Barilla 500g)",
    brand_name_en: "Barilla Italian Durum Wheat Pasta 500g",
    brand_importer_he: "אסם-נסטלה / שסטוביץ",
    brand_importer_en: "Osem-Nestle / Schestowitz",
    shelf_price_ils: 8.50,
    shelf_format_he: "אריזת קרטון כחולה 500 גרם",
    shelf_format_en: "500g premium retail carton box",
    brand_estimated_margin_pct: 20,

    replacement_name_he: "פסטה איטלקית 100% חיטת דורום במשיכת ברונזה (Trafilata al Bronzo)",
    replacement_name_en: "100% Italian Durum Wheat Pasta (Bronze Die Cut - Trafilata al Bronzo)",
    supplier_name: "Pastificio Di Martino Gaetano & F.lli S.p.A.",
    supplier_country: "Italy",
    supplier_country_he: "איטליה",
    supplier_flag: "🇮🇹",
    factory_fob_eur: 0.52,
    estimated_landed_cost_ils: 2.95,
    target_retail_price_ils: 5.90,
    target_retail_margin_pct: 50,

    units_per_container: 48000,
    container_type: "40ft HC",
    kosher_type_he: "כשר פרווה למהדרין (בד״ץ באישור הרבנות)",
    kosher_type_en: "Kosher Parve Mehadrin (Rabbinate approved)",
    certifications: ["IGP Gragnano", "IFS Food", "BRCGS A+", "ISO 9001"],
    packshot_url: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=600&auto=format&fit=crop&q=80",
    sensory_notes_he: "מרקם מחוספס במשיכת ברונזה שתופס את הרוטב בצורה מושלמת, רמת חלבון גבוהה של 14% השומרת על יציבות אל-דנטה בבישול.",
    sensory_notes_en: "Rough bronze-die surface holding sauces perfectly, high 14% protein content preserving authentic al-dente bite without turning soggy.",
    shelf_life_months: 36,
    moq_containers: 1,
  },
  {
    id: "frozen-green-peas-800g",
    category: "Frozen Foods",
    category_he: "מוצרים קפואים",
    category_icon: "❄️",
    brand_name_he: "אפונה עדינה סנפרוסט (Sunfrost 800g)",
    brand_name_en: "Sunfrost Tender Green Peas 800g",
    brand_importer_he: "תנובה (סנפרוסט בע״מ)",
    brand_importer_en: "Tnuva (Sunfrost Ltd)",
    shelf_price_ils: 19.90,
    shelf_format_he: "שקית פוליאתילן מודפסת 800 גרם",
    shelf_format_en: "800g retail printed pillow pouch",
    brand_estimated_margin_pct: 22,

    replacement_name_he: "אפונה עדינה מוקפאת IQF Grade-A מגידול בלגי ופולני",
    replacement_name_en: "Tender Petite Green Peas IQF Grade-A (Belgium / Poland)",
    supplier_name: "Ardo NV / Greenyard Frozen",
    supplier_country: "Belgium",
    supplier_country_he: "בלגיה",
    supplier_flag: "🇧🇪",
    factory_fob_eur: 1.05,
    estimated_landed_cost_ils: 6.80,
    target_retail_price_ils: 13.90,
    target_retail_margin_pct: 51,

    units_per_container: 26400,
    container_type: "40ft Reefer",
    kosher_type_he: "בד״ץ חתם סופר / רבנות מהדרין יבוא",
    kosher_type_en: "Badatz Chatam Sofer / Mehadrin",
    certifications: ["BRCGS Food", "IFS Higher", "GlobalGAP"],
    packshot_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80",
    sensory_notes_he: "הקפאה מהירה תוך שעתיים מהקטיף, צבע ירוק חי, גרעינים זעירים מתוקים ונימוחים ללא תוספת סוכר.",
    sensory_notes_en: "Flash frozen within 2 hours of harvest, vibrant green hue, small tender sweet caliber with zero added sugar.",
    shelf_life_months: 24,
    moq_containers: 1,
  },
  {
    id: "crispy-wafers-250g",
    category: "Bakery & Biscuits",
    category_he: "מאפים, ופלים וביסקוויטים",
    category_icon: "🧇",
    brand_name_he: "ופל לואקר קוביות אגוזים (Loacker Quadratini 250g)",
    brand_name_en: "Loacker Quadratini Hazelnut Wafers 250g",
    brand_importer_he: "ליימן שליסל בע״מ",
    brand_importer_en: "Leiman Schlussel Ltd",
    shelf_price_ils: 15.90,
    shelf_format_he: "שקית עומדת רב-שכבתית 250 גרם",
    shelf_format_en: "250g stand-up resealable metallic bag",
    brand_estimated_margin_pct: 22,

    replacement_name_he: "קוביות ופל פריכות 5 שכבות במילוי 74% קרם אגוזי לוז מובחר",
    replacement_name_en: "Crispy 5-Layer Wafer Cubes with 74% Italian Hazelnut Cream",
    supplier_name: "Lago Group S.p.A. / Manner OEM",
    supplier_country: "Italy",
    supplier_country_he: "איטליה",
    supplier_flag: "🇮🇹",
    factory_fob_eur: 0.90,
    estimated_landed_cost_ils: 5.40,
    target_retail_price_ils: 10.90,
    target_retail_margin_pct: 50,

    units_per_container: 32000,
    container_type: "40ft HC",
    kosher_type_he: "כשר חלבי (לאוכלי אבקת חלב עכו״ם) או פרווה מהדרין",
    kosher_type_en: "Kosher Dairy or Parve Mehadrin",
    certifications: ["IFS Food", "BRCGS A+", "UTZ Cocoa Certified"],
    packshot_url: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80",
    sensory_notes_he: "דפי ופל פריכים במיוחד ללא שמנים מוקשים (ללא שומן טראנס), מילוי עשיר באגוזי לוז אמיתיים מאירופה.",
    sensory_notes_en: "Extra-crisp wafer sheets without hydrogenated oils (zero trans fat), rich real European hazelnut filling.",
    shelf_life_months: 18,
    moq_containers: 1,
  },
  {
    id: "green-olives-manzanilla-560g",
    category: "Pickles & Vegetables",
    category_he: "חמוצים, זיתים וירקות משומרים",
    category_icon: "🫒",
    brand_name_he: "זיתים ירוקים ללא חרצנים — בית השיטה 560 גרם",
    brand_name_en: "Beit HaShita Pitted Green Olives 560g Jar",
    brand_importer_he: "אסם-נסטלה (בית השיטה)",
    brand_importer_en: "Osem-Nestle (Beit HaShita)",
    shelf_price_ils: 12.50,
    shelf_format_he: "צנצנת זכוכית 560 גרם (משקל מסונן 300 גרם)",
    shelf_format_en: "560g glass jar (drained weight 300g)",
    brand_estimated_margin_pct: 24,

    replacement_name_he: "זיתי מנזנילה סביליאנית מובחרים מגולענים במי מלח עדינים",
    replacement_name_en: "Premium Sevillian Manzanilla Pitted Green Olives in Delicate Brine",
    supplier_name: "Aceitunas Guadalquivir S.L. (AGUSA)",
    supplier_country: "Spain",
    supplier_country_he: "ספרד",
    supplier_flag: "🇪🇸",
    factory_fob_eur: 0.72,
    estimated_landed_cost_ils: 4.30,
    target_retail_price_ils: 8.50,
    target_retail_margin_pct: 49,

    units_per_container: 36000,
    container_type: "40ft HC",
    kosher_type_he: "בד״ץ מהדרין ורבנות יבוא (ללא חשש תרומות ומעשרות)",
    kosher_type_en: "Badatz Mehadrin & Chief Rabbinate",
    certifications: ["IFS Food", "BRCGS Food", "ISO 14001"],
    packshot_url: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=600&auto=format&fit=crop&q=80",
    sensory_notes_he: "מרקם בשרני ומוצק ללא רכות יתר, רמת מליחות מדודה שאינה מכסה את טעם הזית, גודל אחיד (קליבר 240/260).",
    sensory_notes_en: "Meaty firm flesh without mushiness, measured salinity preserving pure olive taste, uniform 240/260 caliber.",
    shelf_life_months: 36,
    moq_containers: 1,
  },
  {
    id: "ketchup-squeeze-700g",
    category: "Condiments & Sauces",
    category_he: "רטבים וממרחים",
    category_icon: "🍟",
    brand_name_he: "קטשופ היינץ בקבוק לחיץ (Heinz Ketchup 700g)",
    brand_name_en: "Heinz Tomato Ketchup 700g Top-Down Squeeze Bottle",
    brand_importer_he: "דיפלומט מפיצים בע״מ",
    brand_importer_en: "Diplomat Distributors Ltd",
    shelf_price_ils: 14.90,
    shelf_format_he: "בקבוק לחיץ Top-Down עם פיית סיליקון 700 גרם",
    shelf_format_en: "700g Top-Down Squeeze Bottle with Silicone Valve",
    brand_estimated_margin_pct: 19,

    replacement_name_he: "קטשופ פרימיום 100% עגבניות אירופאיות בבקבוק Top-Down",
    replacement_name_en: "Premium European Tomato Ketchup 700g Top-Down No-Drip Bottle",
    supplier_name: "Develey Senf & Feinkost GmbH / Remia OEM",
    supplier_country: "Germany",
    supplier_country_he: "גרמניה",
    supplier_flag: "🇩🇪",
    factory_fob_eur: 0.82,
    estimated_landed_cost_ils: 5.10,
    target_retail_price_ils: 9.90,
    target_retail_margin_pct: 48,

    units_per_container: 28800,
    container_type: "40ft HC",
    kosher_type_he: "בד״ץ מהדרין ואישור הרבנות הראשית לישראל",
    kosher_type_en: "Badatz Mehadrin & Chief Rabbinate",
    certifications: ["IFS Food", "BRCGS A+", "Gluten Free"],
    packshot_url: "https://images.unsplash.com/photo-1527751171053-6ac5ec50000b?w=600&auto=format&fit=crop&q=80",
    sensory_notes_he: "ריכוז של 165 גרם עגבניות לכל 100 גרם קטשופ, סמיכות עשירה ללא חומרים משמרים או מייצבים סינתטיים.",
    sensory_notes_en: "Concentration of 165g ripe tomatoes per 100g ketchup, thick rich body, zero artificial preservatives or synthetic thickeners.",
    shelf_life_months: 18,
    moq_containers: 1,
  },
];
