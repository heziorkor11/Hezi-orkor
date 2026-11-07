export type Permission =
  "products" | "add-products" | "prices" | "promotions" | "orders" | "homepage";
export const PERMISSIONS: Permission[] = [
  "products",
  "add-products",
  "prices",
  "promotions",
  "orders",
  "homepage",
];
export type ProductOverride = {
  created?: true;
  sub?: string;
  description?: string;
  vehicleFitment?: string;
  inStock?: boolean;
  name?: string;
  category?: string;
  price?: number | null;
  hidden?: boolean;
  image?: string;
  brand?: string;
};
export type Promotion = {
  id: string;
  title: string;
  targetType: "product" | "category" | "brand";
  target: string;
  kind: "percent" | "fixed";
  value: number;
  start: string;
  end: string;
  badge: string;
  homepage: boolean;
  enabled: boolean;
};
export type Banner = {
  id: string;
  title: string;
  text: string;
  href: string;
  image?: string;
  enabled: boolean;
};
export type HomeSettings = { banners: Banner[]; featuredSkus?: string[]; categoryOrder: string[] };
export type PublicAdminState = {
  mode?: "disabled" | "local" | "preview-demo";
  enabled: boolean;
  revision: number;
  products: Record<string, ProductOverride>;
  promotions: Promotion[];
  home: HomeSettings;
};
export const emptyPublicState = (): PublicAdminState => ({
  mode: "disabled",
  enabled: false,
  revision: 0,
  products: {},
  promotions: [],
  home: { banners: [], categoryOrder: [] },
});
export type AdminUser = {
  id: string;
  username: string;
  name: string;
  role: "owner" | "employee";
  permissions: Permission[];
  active: boolean;
  version: number;
  passwordHash: string;
};
export type SafeUser = Omit<AdminUser, "passwordHash" | "version">;
export type OrderCustomerRecord = {
  name: string;
  phone: string;
  plate: string;
  city?: string;
  make?: string;
  model?: string;
  year?: string;
  engine?: string;
  delivery?: string;
  notes?: string;
};
export type StoredOrder = {
  id: string;
  requestId: string;
  ref: string;
  createdAt: string;
  status: "waiting" | "handled";
  customer: OrderCustomerRecord;
  lines: { sku: string; name: string; qty: number; price: number | null; total: number | null }[];
  subtotal: number;
  quoteCount: number;
  pdfFile?: string;
  source: "pdf-share-attempt";
  handledBy?: string;
};
export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  before: unknown;
  after: unknown;
};
export type AdminState = {
  assets: string[];
  revision: number;
  products: Record<string, ProductOverride>;
  promotions: Promotion[];
  home: HomeSettings;
  users: AdminUser[];
  sessions: { hash: string; userId: string; authVersion: string; expires: number }[];
  orders: StoredOrder[];
  audit: AuditEntry[];
};
export const initialAdminState = (): AdminState => ({
  assets: [],
  revision: 0,
  products: {},
  promotions: [],
  home: { banners: [], categoryOrder: [] },
  users: [],
  sessions: [],
  orders: [],
  audit: [],
});
export function toPublicState(
  s: AdminState,
  mode: "local" | "preview-demo" = "local",
): PublicAdminState {
  return {
    mode,
    enabled: true,
    revision: s.revision,
    products: s.products,
    promotions: s.promotions,
    home: s.home,
  };
}
export function safeUser(u: AdminUser): SafeUser {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    permissions: u.permissions,
    active: u.active,
  };
}
