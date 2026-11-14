export type AdminRole = "master" | "worker";

export type TagDef = { id: string; label: string; color: string };

export type ProductTagsFile = { version: 1; description?: string; bySku: Record<string, string[]> };
export type TagLibraryFile = { version: 1; tags: TagDef[] };
export type HomeDealsFile = { version: 1; description?: string; skus: string[] };
export type ActivityFile = { version: 1; description?: string; entries: ActivityEntry[] };

export type ActivityEntry = {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  actorRole: AdminRole;
  action: string;
  sku?: string;
  target: string;
  before: unknown;
  after: unknown;
  reverted?: boolean;
  revertedAt?: string;
  revertedBy?: string;
};

export type SafeUser = {
  id: string;
  username: string;
  name: string;
  role: AdminRole;
  active: boolean;
};

export type AdminUser = SafeUser & {
  passwordHash: string;
};

export type OrderStatus = "new" | "checking" | "preparing" | "shipped" | "done";

export const ORDER_STATUSES: { id: OrderStatus; label: string }[] = [
  { id: "new", label: "חדשה" },
  { id: "checking", label: "בבדיקה" },
  { id: "preparing", label: "בהכנה" },
  { id: "shipped", label: "נשלחה / נאספה" },
  { id: "done", label: "הושלמה" },
];

export type StoredOrderLine = {
  sku: string;
  name: string;
  qty: number;
  unitPrice: number | null;
  lineTotal: number | null;
  picked?: boolean;
  verified?: boolean;
};

export type StoredOrder = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  customer: {
    name: string;
    phone: string;
    plate?: string;
    city?: string;
    make?: string;
    model?: string;
    year?: string;
    engine?: string;
    notes?: string;
  };
  delivery: "pickup" | "delivery" | "";
  lines: StoredOrderLine[];
  subtotal: number;
  shipping: number;
  total: number;
  assignedTo?: string;
  scheduledDate?: string;
  internalNotes?: string;
  source: "whatsapp-cart";
};

export type PublicOverlay = {
  priceBySku?: Record<string, number>;
  priceHideSkus?: string[];
  nameBySku?: Record<string, string>;
  hiddenSkus?: Record<string, boolean>;
  hiddenCategories?: string[];
  categoryLabels?: Record<string, string>;
  categoryOrder?: string[];
  categoryBySku?: Record<string, string>;
  tagLibrary?: TagDef[];
  productTags?: Record<string, string[]>;
  homeDeals?: string[];
};

export const PUBLIC_GIT_PATHS = [
  "public/catalog/price-overrides.json",
  "public/catalog/price-hide-overrides.json",
  "public/catalog/name-overrides.json",
  "public/catalog/visibility-overrides.json",
  "public/catalog/display-category-overrides.json",
  "public/catalog/hidden-categories.json",
  "public/catalog/tag-library.json",
  "public/catalog/product-tags.json",
  "public/catalog/home-deals-overrides.json",
  "public/catalog/admin-activity.json",
  "public/catalog/category-label-overrides.json",
  "public/catalog/category-order-overrides.json",
] as const;

export type PublicGitPath = (typeof PUBLIC_GIT_PATHS)[number];


export type AdminProductRow = {
  sku: string;
  name: string;
  category: string;
  categoryHe: string;
  price: number | null;
  workshop: boolean;
  quote: boolean;
  hidden: boolean;
  hasImage: boolean;
  image?: string;
  tags: { id: string; label: string; color: string }[];
};
