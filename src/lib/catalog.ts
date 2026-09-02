export type Product = {
  id: string;
  sku: string;
  oe: string;
  name: string;
  type: PartTypeId;
  category: CategoryId;
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  side: string;
  condition: string;
  price: number;
  originalPrice?: number;
  description: string;
  image?: string;
  universal?: boolean;
};

export type CategoryId =
  | "lights"
  | "mirrors"
  | "ac-compressor"
  | "ac-condenser"
  | "radiator"
  | "shocks"
  | "sensors"
  | "body"
  | "bumper"
  | "electrical"
  | "accessories"
  | "tools";

export type PartTypeId =
  | "headlight"
  | "taillight"
  | "foglight"
  | "mirror"
  | "compressor"
  | "condenser"
  | "radiator"
  | "shock"
  | "sensor"
  | "fender"
  | "bumper"
  | "battery"
  | "accessory";

export const brand = {
  name: "Hezi Orkor",
  nameHe: "חזי אורקור",
  tagline: "WE FIX EVERYTHING",
  taglineHe: "חלפים ואביזרים לרכב — מוצאים מהר",
  phone: "052-485-8516",
  phoneTel: "972524858516",
  whatsapp: "972524858516",
  freeShipFrom: 299,
  shipping: 49,
  hours: "א׳–ה׳ 08:00–17:00",
  city: "נהריה",
  street: "לוחמי הגטאות 24",
  address: "לוחמי הגטאות 24, נהריה",
  lat: 33.0058,
  lng: 35.0989,
  mapsQuery: "לוחמי הגטאות 24 נהריה",
} as const;

export const categories: { id: CategoryId; name: string }[] = [
  { id: "lights", name: "פנסים" },
  { id: "mirrors", name: "מראות" },
  { id: "ac-compressor", name: "מדחסי מזגן" },
  { id: "ac-condenser", name: "מעבים" },
  { id: "radiator", name: "רדיאטורים" },
  { id: "shocks", name: "בולמים" },
  { id: "sensors", name: "חיישנים" },
  { id: "body", name: "חלקי פח" },
  { id: "bumper", name: "טמבונים" },
  { id: "electrical", name: "חשמל" },
  { id: "accessories", name: "אביזרים" },
  { id: "tools", name: "כלים" },
];

export const partTypes: { id: PartTypeId; name: string; category: CategoryId }[] = [
  { id: "headlight", name: "פנס ראשי", category: "lights" },
  { id: "taillight", name: "פנס אחורי", category: "lights" },
  { id: "foglight", name: "פנס ערפל", category: "lights" },
  { id: "mirror", name: "מראה צד", category: "mirrors" },
  { id: "compressor", name: "מדחס מזגן", category: "ac-compressor" },
  { id: "condenser", name: "מעבה מזגן", category: "ac-condenser" },
  { id: "radiator", name: "רדיאטור", category: "radiator" },
  { id: "shock", name: "בולם זעזועים", category: "shocks" },
  { id: "sensor", name: "חיישן", category: "sensors" },
  { id: "fender", name: "כנף", category: "body" },
  { id: "bumper", name: "טמבון", category: "bumper" },
  { id: "battery", name: "מצבר / בוסטר", category: "electrical" },
  { id: "accessory", name: "אביזר כללי", category: "accessories" },
];

export const products: Product[] = [
  {
    id: "HO-000001",
    sku: "14020004016",
    oe: "164000D400, 16400-0D400, 164000D410, 16400-0D410, 164000D470, 164000D480",
    name: "רדיאטור לטויוטה קורולה 2008–2018",
    type: "radiator",
    category: "radiator",
    make: "טויוטה",
    model: "קורולה",
    yearFrom: 2008,
    yearTo: 2018,
    side: "",
    condition: "חלק חדש",
    price: 579,
    originalPrice: 679,
    image: "/products/14020004016.jpg",
    description: "רדיאטור תואם לטויוטה קורולה 2008–2018. מק״ט 14020004016. מותג החלק REACH. מתאים לגיר אוטומט.",
  },
  {
    id: "HO-000002",
    sku: "PA5012210",
    oe: "25310B9100",
    name: "רדיאטור ליונדאי i10 2013–2019",
    type: "radiator",
    category: "radiator",
    make: "יונדאי",
    model: "i10",
    yearFrom: 2013,
    yearTo: 2019,
    side: "",
    condition: "חלק חדש",
    price: 579,
    originalPrice: 679,
    image: "/products/PA5012210.jpg",
    description: "רדיאטור תואם ליונדאי i10 2013–2019. מק״ט PA5012210. מותג החלק CARZONE. מתאים לגיר ידני.",
  },
  {
    id: "HO-000003",
    sku: "2015012300",
    oe: "1.41.2817.016, 164000P130, 1640028630, 1640028631, 1640031410, 1640031520",
    name: "רדיאטור לטויוטה קאמרי 2007–2011",
    type: "radiator",
    category: "radiator",
    make: "טויוטה",
    model: "קאמרי",
    yearFrom: 2007,
    yearTo: 2011,
    side: "",
    condition: "חלק חדש",
    price: 829,
    originalPrice: 979,
    image: "/products/2015012300.jpg",
    description: "רדיאטור תואם לטויוטה קאמרי 2007–2011. מק״ט 2015012300. מותג החלק CARZONE. מתאים לגיר אוטומט.",
  },
  {
    id: "HO-000004",
    sku: "14024257016",
    oe: "164000T370, 164000T371, 164000T431, 1640037310, 1640037311, DRM50150",
    name: "רדיאטור לטויוטה פריוס 2016–2019",
    type: "radiator",
    category: "radiator",
    make: "טויוטה",
    model: "פריוס",
    yearFrom: 2016,
    yearTo: 2019,
    side: "",
    condition: "חלק חדש",
    price: 639,
    originalPrice: 749,
    image: "/products/14024257016.jpg",
    description: "רדיאטור תואם לטויוטה פריוס 2016–2019. מק״ט 14024257016. מותג החלק REACH.",
  },
  {
    id: "HO-000005",
    sku: "22-327291",
    oe: "543039714B",
    name: "בולם זעזועים קדמי שמאל לרנו ארקנה 2020–2025",
    type: "shock",
    category: "shocks",
    make: "רנו",
    model: "ארקנה",
    yearFrom: 2020,
    yearTo: 2025,
    side: "קדמי שמאל",
    condition: "חלק חדש",
    price: 709,
    originalPrice: 839,
    image: "/products/22-327291.jpg",
    description: "בולם זעזועים קדמי שמאל תואם לרנו ארקנה 2020–2025. מק״ט 22-327291. מותג החלק BILSTEIN.",
  },
  {
    id: "HO-000006",
    sku: "22-327307",
    oe: "543022015R, 543022911R",
    name: "בולם זעזועים קדמי ימין לרנו ארקנה 2020–2025",
    type: "shock",
    category: "shocks",
    make: "רנו",
    model: "ארקנה",
    yearFrom: 2020,
    yearTo: 2025,
    side: "קדמי ימין",
    condition: "חלק חדש",
    price: 709,
    originalPrice: 839,
    image: "/products/22-327307.jpg",
    description: "בולם זעזועים קדמי ימין תואם לרנו ארקנה 2020–2025. מק״ט 22-327307. מותג החלק BILSTEIN.",
  },
  {
    id: "HO-000007",
    sku: "2025011952",
    oe: "22883363, 20979496, 23104892, 65653",
    name: "רדיאטור לשברולט מליבו 2012–2016",
    type: "radiator",
    category: "radiator",
    make: "שברולט",
    model: "מליבו",
    yearFrom: 2012,
    yearTo: 2016,
    side: "",
    condition: "חלק חדש",
    price: 729,
    originalPrice: 859,
    image: "/products/2025011952.jpg",
    description: "רדיאטור תואם לשברולט מליבו 2012–2016. מק״ט 2025011952. מותג החלק CARZONE. דגם שוק אמריקאי — יש להשוות מק״ט.",
  },
  {
    id: "HO-000008",
    sku: "2035012090",
    oe: "25952758, 25952759",
    name: "רדיאטור לשברולט אקווינוקס 2016–2018",
    type: "radiator",
    category: "radiator",
    make: "שברולט",
    model: "אקווינוקס",
    yearFrom: 2016,
    yearTo: 2018,
    side: "",
    condition: "חלק חדש",
    price: 1029,
    originalPrice: 1209,
    image: "/products/2035012090.jpg",
    description: "רדיאטור תואם לשברולט אקווינוקס 2016–2018. מק״ט 2035012090. מותג החלק CARZONE. דגם שוק אמריקאי — יש להשוות מק״ט.",
  },
  {
    id: "HO-000009",
    sku: "2015012381",
    oe: "25310B9050, 25310B9150",
    name: "רדיאטור ליונדאי i10 2014–2018",
    type: "radiator",
    category: "radiator",
    make: "יונדאי",
    model: "i10",
    yearFrom: 2014,
    yearTo: 2018,
    side: "",
    condition: "חלק חדש",
    price: 499,
    originalPrice: 589,
    image: "/products/2015012381.jpg",
    description: "רדיאטור תואם ליונדאי i10 2014–2018. מק״ט 2015012381. מותג החלק CARZONE. מתאים לגיר אוטומט.",
  },
  {
    id: "HO-000010",
    sku: "14014736126",
    oe: "16400-0H120, 164000H120, 16400-0H121, 164000H121, 16400-0H180, 164000H180",
    name: "רדיאטור לטויוטה אוונסיס 2003–2009",
    type: "radiator",
    category: "radiator",
    make: "טויוטה",
    model: "אוונסיס",
    yearFrom: 2003,
    yearTo: 2009,
    side: "",
    condition: "חלק חדש",
    price: 779,
    originalPrice: 919,
    image: "/products/14014736126.jpg",
    description: "רדיאטור תואם לטויוטה אוונסיס 2003–2009. מק״ט 14014736126. מותג החלק REACH. מתאים לגיר אוטומט.",
  },
  {
    id: "HO-000011",
    sku: "4025011981",
    oe: "4818254, 4819583, 20982435, 42400244, 95192590, 550086",
    name: "רדיאטור לשברולט קפטיבה 2011–2015",
    type: "radiator",
    category: "radiator",
    make: "שברולט",
    model: "קפטיבה",
    yearFrom: 2011,
    yearTo: 2015,
    side: "",
    condition: "חלק חדש",
    price: 1079,
    originalPrice: 1269,
    image: "/products/4025011981.jpg",
    description: "רדיאטור תואם לשברולט קפטיבה 2011–2015. מק״ט 4025011981. מותג החלק CARZONE. דגם שוק אמריקאי — יש להשוות מק״ט.",
  },
  {
    id: "HO-000012",
    sku: "1025012091",
    oe: "95160949, 95316049, A14NET",
    name: "רדיאטור לשברולט סוניק 2013",
    type: "radiator",
    category: "radiator",
    make: "שברולט",
    model: "סוניק",
    yearFrom: 2013,
    yearTo: 2013,
    side: "",
    condition: "חלק חדש",
    price: 889,
    originalPrice: 1049,
    image: "/products/1025012091.jpg",
    description: "רדיאטור תואם לשברולט סוניק 2013. מק״ט 1025012091. מותג החלק CARZONE. חיבור צינור תחתון מהיר. דגם שוק אמריקאי — יש להשוות מק״ט.",
  },
  {
    id: "HO-000013",
    sku: "19-325835",
    oe: "562100741R, 562102173R",
    name: "בולם זעזועים אחורי לרנו ארקנה 2020–2025",
    type: "shock",
    category: "shocks",
    make: "רנו",
    model: "ארקנה",
    yearFrom: 2020,
    yearTo: 2025,
    side: "אחורי",
    condition: "חלק חדש",
    price: 469,
    originalPrice: 549,
    image: "/products/19-325835.jpg",
    description: "בולם זעזועים אחורי תואם לרנו ארקנה 2020–2025. מק״ט 19-325835. מותג החלק BILSTEIN.",
  },
  {
    id: "HO-000014",
    sku: "344712",
    oe: "8R0513035AB, 8R0513035AE, 8R0513035C, 8R0513035D, 8R0513035H, 8R0513035J",
    name: "בולם זעזועים אחורי לאאודי Q5 2008–2017",
    type: "shock",
    category: "shocks",
    make: "אאודי",
    model: "Q5",
    yearFrom: 2008,
    yearTo: 2017,
    side: "אחורי",
    condition: "חלק חדש",
    price: 399,
    originalPrice: 469,
    image: "/products/344712.jpg",
    description: "בולם זעזועים אחורי תואם לאאודי Q5 2008–2017. מק״ט 344712. מותג החלק KYB.",
  },
  {
    id: "HO-000015",
    sku: "376049SP",
    oe: "8R0413031AF, 8R0413031AK, 8R0413031AL, 8R0413031AP, 8R0413031BB, 8R0413031BC",
    name: "בולם זעזועים קדמי לאאודי Q5 2008–2017",
    type: "shock",
    category: "shocks",
    make: "אאודי",
    model: "Q5",
    yearFrom: 2008,
    yearTo: 2017,
    side: "קדמי",
    condition: "חלק חדש",
    price: 489,
    originalPrice: 579,
    image: "/products/376049SP.jpg",
    description: "בולם זעזועים קדמי תואם לאאודי Q5 2008–2017. מק״ט 376049SP. מותג החלק MONROE.",
  },
  {
    id: "HO-000016",
    sku: "3418007",
    oe: "80A513035L, 80A513035M, 80A513035N, 32-X68-A, 19-281360, 19-282237",
    name: "בולם זעזועים אחורי לאאודי Q5 2017–2018",
    type: "shock",
    category: "shocks",
    make: "אאודי",
    model: "Q5",
    yearFrom: 2017,
    yearTo: 2018,
    side: "אחורי",
    condition: "חלק חדש",
    price: 639,
    originalPrice: 749,
    image: "/products/3418007.jpg",
    description: "בולם זעזועים אחורי תואם לאאודי Q5 2017–2018. מק״ט 3418007. מותג החלק KYB.",
  },
  {
    id: "HO-000017",
    sku: "3418006",
    oe: "80A413031AA, 80A413031AB, 80A413031AD, 80A413031AE, 80A413031AG, 80A413031AH",
    name: "בולם זעזועים קדמי לאאודי Q5 2017–2018",
    type: "shock",
    category: "shocks",
    make: "אאודי",
    model: "Q5",
    yearFrom: 2017,
    yearTo: 2018,
    side: "קדמי",
    condition: "חלק חדש",
    price: 639,
    originalPrice: 749,
    image: "/products/3418006.jpg",
    description: "בולם זעזועים קדמי תואם לאאודי Q5 2017–2018. מק״ט 3418006. מותג החלק KYB.",
  },
  {
    id: "HO-000018",
    sku: "90392N",
    oe: "1588A214, 06F906262F, 1K0998262AD, 1K0998262K, 1K0998262L, UAR9000EE003",
    name: "חיישן חמצן לסקודה אוקטביה 2006",
    type: "sensor",
    category: "sensors",
    make: "סקודה",
    model: "אוקטביה",
    yearFrom: 2006,
    yearTo: 2006,
    side: "",
    condition: "חלק חדש",
    price: 619,
    originalPrice: 729,
    image: "/products/90392N.jpg",
    description: "חיישן חמצן תואם לסקודה אוקטביה 2006. מק״ט 90392N. מותג החלק NTK.",
  },
  {
    id: "HO-000019",
    sku: "12671387",
    oe: "12594935, 12596688, 12616506, 19209817, 88971384, 88975496",
    name: "חיישן חמצן לשברולט סילברדו 2011",
    type: "sensor",
    category: "sensors",
    make: "שברולט",
    model: "סילברדו",
    yearFrom: 2011,
    yearTo: 2011,
    side: "",
    condition: "חלק חדש",
    price: 909,
    originalPrice: 1069,
    image: "/products/12671387.jpg",
    description: "חיישן חמצן תואם לשברולט סילברדו 2011. מק״ט 12671387. מותג החלק ACDelco. דגם שוק אמריקאי — יש להשוות מק״ט.",
  },
  {
    id: "HO-000020",
    sku: "96418965A",
    oe: "9F172, 9F472, FSC1-18-861B, 96291099, 96418965, F16D3",
    name: "חיישן חמצן לשברולט אוואו 2007",
    type: "sensor",
    category: "sensors",
    make: "שברולט",
    model: "אוואו",
    yearFrom: 2007,
    yearTo: 2007,
    side: "",
    condition: "חלק חדש",
    price: 459,
    originalPrice: 539,
    image: "/products/96418965A.jpg",
    description: "חיישן חמצן תואם לשברולט אוואו 2007. מק״ט 96418965A. דגם שוק אמריקאי — יש להשוות מק״ט.",
  }
];

export const reviews = [
  { name: "אורן כ.", text: "מצאתי פנס לפי דגם ושנה בלי להתקשר שלוש פעמים. הגיע מהר.", stars: 5 },
  { name: "דנה ל.", text: "שלחתי מק״ט בוואטסאפ ואישרו התאמה לפני ששילמתי. ככה צריך.", stars: 5 },
  { name: "מוסך ר.", text: "ברור מה צד ומה שנים. חוסך טעויות הזמנה.", stars: 5 },
];

export const faqs = [
  {
    q: "איך מוצאים חלק לפי הרכב?",
    a: "בבורר בראש העמוד בוחרים סוג חלק, יצרן, דגם ושנה. אפשר גם לחפש לפי מק״ט או מספר OE בשורת החיפוש.",
  },
  {
    q: "מה אם החלק לא מופיע באתר?",
    a: "זה נורמלי — המלאי באתר הוא דגימה. שלחו מספר רכב, מק״ט מהחלק הישן או תמונה בוואטסאפ ונאתר התאמה.",
  },
  {
    q: "איך מזמינים ומשלמים?",
    a: "מוסיפים לסל ושולחים אלינו בוואטסאפ לאישור. אין סליקה באתר בגרסה הזו — מאשרים מחיר והתאמה לפני תשלום.",
  },
  {
    q: "יש איסוף עצמי מנהריה?",
    a: "כן. אפשר לאסוף מלוחמי הגטאות 24, נהריה, בימים א׳–ה׳ 08:00–17:00, או לקבל משלוח. משלוח ₪49, חינם מ־₪299.",
  },
  {
    q: "צריך לאשר התאמה לפני התקנה?",
    a: "כן. המחיר לפי מחירון המוסך. לפני התקנה מאשרים לפי מספר רכב או מק״ט OE — כדי לא להחליף חלק לא נכון.",
  },
] as const;

export type ProductFilter = {
  type?: string;
  make?: string;
  model?: string;
  year?: string;
  q?: string;
  category?: string;
};

export type ListingSearch = ProductFilter & { page?: number };

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr.filter(Boolean))];
}

export function filterProducts(state: ProductFilter): Product[] {
  return products.filter((p) => {
    if (state.category && p.category !== state.category) return false;
    if (state.type && p.type !== state.type) return false;
    if (state.make && p.make !== state.make) return false;
    if (state.model && p.model !== state.model) return false;
    if (state.year) {
      const y = Number(state.year);
      if (!p.universal && (y < p.yearFrom || y > p.yearTo)) return false;
    }
    if (state.q) {
      const s = state.q.trim().toLowerCase();
      const blob = [p.name, p.sku, p.oe, p.make, p.model, p.side, p.description]
        .join(" ")
        .toLowerCase();
      if (!blob.includes(s)) return false;
    }
    return true;
  });
}

export function getProduct(id: string) {
  return products.find((p) => p.id === id);
}

export function categoryName(id?: string) {
  return categories.find((c) => c.id === id)?.name;
}

export function makesFor(_state?: ProductFilter) {
  return unique(products.map((p) => p.make));
}

export function modelsFor(state: ProductFilter) {
  return unique(
    products.filter((p) => !state.make || p.make === state.make).map((p) => p.model),
  );
}

export function yearsFor(state: ProductFilter) {
  const years: number[] = [];
  products.forEach((p) => {
    if (state.make && p.make !== state.make) return;
    if (state.model && p.model !== state.model) return;
    if (p.yearFrom) {
      for (let y = p.yearFrom; y <= p.yearTo; y++) years.push(y);
    }
  });
  return unique(years).sort((a, b) => b - a);
}

export function waLink(text: string) {
  return `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(text)}`;
}
