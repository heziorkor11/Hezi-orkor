import { overlayStock } from "@/lib/admin/public-overlay";
import { isOutOfStock } from "@/lib/admin/stock-qty";
import { useCatalogOverlayRev } from "@/components/catalog-overlay-sync";

export function OutOfStockBadge({ sku }: { sku: string }) {
  useCatalogOverlayRev();
  if (!isOutOfStock(overlayStock(sku))) return null;
  return <span className="product-out-of-stock">אזל מהמלאי</span>;
}
