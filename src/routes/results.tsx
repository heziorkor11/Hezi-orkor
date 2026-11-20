import { subcategories, normalizeDisplayCategory, isHiddenCategory } from "@/lib/display-taxonomy";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ActiveFilters } from "@/components/active-filters";
import { ListingSortControl } from "@/components/listing-sort-control";
import { CategoryPhotoTiles } from "@/components/category-photo-tiles";
import { DemoBanner } from "@/components/demo-banner";
import { Finder } from "@/components/finder";
import { PlateSearch } from "@/components/plate-search";
import { PlateVehicleBar, PlateVehicleCard } from "@/components/plate-vehicle-card";
import { FluidsFilters } from "@/components/fluids-filters";
import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import {
  categoryName,
  loadCategoryTiles,
  loadFittedCategoryIds,
  loadListing,
  visibleCategories,
  type ListingSearch,
} from "@/lib/catalog";
import { categoryImage } from "@/lib/category-images";
import {
  buildCategoryInquiry,
  buildOverviewInquiries,
  hasInquiryVehicle,
} from "@/lib/inquiry-placeholders";
import { InquiryCard, InquiryRail } from "@/components/inquiry-placeholder";
import { parseListingSort } from "@/lib/listing-sort";
import { canonicalMake } from "@/lib/search-intent";
import { brand } from "@/lib/brand";
import { FLUID_KIND_LABELS, type FluidKind } from "@/lib/fluid-classify";
import { pageDescription, pageTitle } from "@/lib/seo";
import { bootAdminOverlay } from "@/lib/admin/boot-overlay";
import { isMappedPlateResult, readPlateSession, type StoredPlateVehicle } from "@/lib/plate-session";
import { clearIdentifiedVehicle } from "@/lib/order-form";
import { applyPlateLookup, fetchVehicleByPlate } from "@/lib/plate-lookup-client";
import { useEffect, useState } from "react";

export type ResultsSearch = ListingSearch;

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 1 ? Math.floor(n) : undefined;
}

function sortParam(v: unknown): ResultsSearch["sort"] {
  const parsed = parseListingSort(v);
  return parsed === "recommended" ? undefined : parsed;
}

export const Route = createFileRoute("/results")({
  beforeLoad: ({ search }) => {
    const category = normalizeDisplayCategory(
      typeof search.category === "string" && search.category.length > 0 ? search.category : undefined,
    );
    // Removed storefront category כללי — old bookmarks go home, no crash.
    if (category === "general") throw redirect({ to: "/" });
    // Hidden categories (see public/catalog/hidden-categories.json) disappear completely.
    if (isHiddenCategory(category)) throw redirect({ to: "/results" });
  },
  validateSearch: (search: Record<string, unknown>): ResultsSearch => ({
    type: str(search.type),
    make: canonicalMake(str(search.make)) || str(search.make),
    model: str(search.model),
    year: str(search.year),
    q: str(search.q),
    category: normalizeDisplayCategory(str(search.category)),
    sub: str(search.sub),
    fluidKind: str(search.fluidKind),
    oilBrand: str(search.oilBrand),
    viscosity: str(search.viscosity),
    axle: str(search.axle),
    hand: str(search.hand),
    page: num(search.page),
    sort: sortParam(search.sort),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    await bootAdminOverlay();
    if (deps.category && !categoryName(deps.category)) {
      return { items: [], total: 0, page: 1, pages: 0, tiles: [], fitted: null as string[] | null };
    }
    const listing = await loadListing(deps);
    const tiles = await loadCategoryTiles(deps);
    // "לבירור" placeholders: which categories have a fitting product for the vehicle.
    const overview =
      hasInquiryVehicle(deps) && !deps.category && !deps.q && !deps.type && !deps.fluidKind && !deps.oilBrand;
    const fittedSet = overview ? await loadFittedCategoryIds(deps) : null;
    const fitted = fittedSet ? [...fittedSet] : null;
    return { ...listing, tiles, fitted };
  },
  pendingComponent: PendingResults,
  head: ({ match }) => {
    const s = match.search;
    const kindLabel =
      s.fluidKind && FLUID_KIND_LABELS[s.fluidKind as FluidKind]
        ? FLUID_KIND_LABELS[s.fluidKind as FluidKind]
        : undefined;
    const unknownCategory = s.category && !categoryName(s.category);
    const topic = unknownCategory
      ? "קטגוריה לא נמצאה"
      : s.q
        ? `חיפוש: ${s.q}`
        : kindLabel
          ? kindLabel
          : s.category
            ? categoryName(s.category) || "קטגוריה"
            : "תוצאות חיפוש חלקים";
    return {
      meta: [
        { title: pageTitle(topic) },
        {
          name: "description",
          content: pageDescription(
            unknownCategory
              ? "הקטגוריה המבוקשת אינה קיימת בקטלוג חזי אורקור."
              : `${topic} בחזי אורקור, נהריה. חיפוש וסינון חלקי חילוף.`,
          ),
        },
      ],
    };
  },
  component: ResultsPage,
});

function PendingResults() {
  return (
    <div className="mx-auto max-w-[1180px] px-5 py-16 text-center text-muted">טוען קטלוג…</div>
  );
}

function ResultsPage() {
  const state = Route.useSearch();
  const listing = Route.useLoaderData();
  const plate = usePlateSession(state);
  const showCatalog = plate.showCatalog;
  const [changeOpen, setChangeOpen] = useState(false);
  // Overview = vehicle identified, nothing picked yet: keep the full card with category buttons.
  const overviewMode =
    !state.category && !state.q && !state.type && !state.fluidKind && !state.oilBrand;
  // After a category / search was picked for a plate-identified vehicle: compact bar instead of the big card.
  const compactVehicle = Boolean(plate.entry && plate.mapped && !overviewMode);
  const searchKey = JSON.stringify({ ...state, page: undefined, sort: undefined });
  useEffect(() => {
    setChangeOpen(false);
  }, [searchKey]);
  const overviewInquiries =
    showCatalog && listing.fitted
      ? buildOverviewInquiries({
          state,
          categories: visibleCategories,
          fittedCategoryIds: new Set(listing.fitted),
          imageFor: categoryImage,
          isHidden: isHiddenCategory,
        })
      : [];
  const categoryInquiry = showCatalog
    ? buildCategoryInquiry({
        state,
        total: listing.total,
        categories: visibleCategories,
        imageFor: categoryImage,
        isHidden: isHiddenCategory,
        subName:
          state.category && state.sub
            ? subcategories[state.category]?.find((s) => s.id === state.sub)?.name
            : undefined,
      })
    : null;
  const isFluids =
    state.category === "fluids" || Boolean(state.fluidKind) || Boolean(state.oilBrand);
  const kindLabel =
    state.fluidKind && FLUID_KIND_LABELS[state.fluidKind as FluidKind]
      ? FLUID_KIND_LABELS[state.fluidKind as FluidKind]
      : undefined;
  const title = state.q
    ? `חיפוש: ${state.q}`
    : kindLabel
      ? `${kindLabel}${state.oilBrand ? ` · ${state.oilBrand}` : ""}`
      : state.category
        ? `${categoryName(state.category) || "קטגוריה"}${state.oilBrand ? ` · ${state.oilBrand}` : ""}`
        : "תוצאות לפי הרכב";

  if (state.category && !categoryName(state.category)) {
    return (
      <section className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="mb-3 text-2xl">קטגוריה לא נמצאה</h1>
        <p className="mb-6 text-muted">
          הקטגוריה שבקישור אינה קיימת. אפשר לבחור קטגוריה מדף הבית או לחפש מק״ט.
        </p>
        <Link to="/">
          <Button>חזרה לקטגוריות</Button>
        </Link>
      </section>
    );
  }
  const changeSearchSection = (
    <section
      className={`flex justify-center border border-line bg-panel px-3.5 py-5 md:px-5 md:py-7 ${compactVehicle ? "mb-4" : "mb-6"}`}
      id={compactVehicle ? "change-search" : "search"}
    >
      <div className="flex w-full max-w-[720px] flex-col gap-3">
        <PlateSearch compact showInlineResult={false} />
        <Finder key={JSON.stringify({ ...state, page: undefined })} state={state} />
        {compactVehicle ? (
          <button
            type="button"
            onClick={plate.clear}
            className="self-start text-xs text-muted underline"
          >
            נקו את זיהוי הרכב
          </button>
        ) : null}
      </div>
    </section>
  );
  const pagesNote = listing.pages > 1 ? ` · עמוד ${listing.page} מתוך ${listing.pages}` : "";
  return (
    <>
      <div className="mx-auto max-w-[1180px] px-5 pt-7 pb-16">
        {compactVehicle ? null : <DemoBanner />}
        {compactVehicle && plate.entry ? (
          <>
            <PlateVehicleBar
              plate={plate.entry.plate}
              result={plate.entry.result}
              open={changeOpen}
              onToggle={() => setChangeOpen((v) => !v)}
            />
            {changeOpen ? changeSearchSection : null}
          </>
        ) : (
          <ResultsPlateBlock
            tiles={showCatalog ? listing.tiles || [] : []}
            state={state}
            entry={plate.entry}
            onClear={plate.clear}
            onRefresh={plate.refresh}
          />
        )}
        <div className={compactVehicle ? "mb-3 flex items-baseline gap-2.5" : "mb-4.5"}>
          <h1 className={compactVehicle ? "text-[22px] font-extrabold tracking-tight" : "text-[26px] tracking-tight"}>
            {title}
          </h1>
          {showCatalog ? (
            <p className={compactVehicle ? "text-sm text-muted" : "text-muted"}>
              {listing.total} פריטים
              {pagesNote}
            </p>
          ) : (
            <p className="text-muted">בחרו יצרן, דגם ושנה ידנית כדי לראות חלקים מתאימים.</p>
          )}
        </div>
        {showCatalog ? <CategoryPhotoTiles tiles={listing.tiles || []} /> : null}
        {overviewInquiries.length ? (
          <InquiryRail items={overviewInquiries} state={state} plate={plate.plateNumber} />
        ) : null}
        {isFluids ? (
          <FluidsFilters state={{ ...state, category: state.category || "fluids" }} />
        ) : compactVehicle ? null : (
          changeSearchSection
        )}
        {showCatalog && !listing.tiles?.length && state.category && state.category !== "fluids" && subcategories[state.category] ? (
          <nav aria-label="תתי קטגוריות" className="mb-5 flex flex-wrap gap-2">
            <Link
              to="/results"
              search={{ ...state, sub: undefined, fluidKind: undefined, page: undefined }}
              className={`rounded-full border px-4 py-2 text-sm ${!state.sub ? "bg-accent text-on-accent" : "bg-card"}`}
            >
              הכל
            </Link>
            {subcategories[state.category]
              .filter((s) => s.count > 0)
              .map((s) => (
                <Link
                  key={s.id}
                  to="/results"
                  search={{ ...state, sub: s.id, fluidKind: undefined, page: undefined }}
                  className={`rounded-full border px-4 py-2 text-sm ${state.sub === s.id ? "bg-accent text-on-accent" : "bg-card"}`}
                >
                  {s.name} ({s.count})
                </Link>
              ))}
          </nav>
        ) : null}
        {showCatalog ? <ActiveFilters state={state} hideVehicleAndCategory={compactVehicle} /> : null}
        {showCatalog ? <ListingSortControl state={state} compact={compactVehicle} /> : null}
        {showCatalog && listing.items.length ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {listing.items.map((p) => (
                <ProductCard key={p.id} product={p} filter={state} />
              ))}
            </div>
            <Pagination page={listing.page} total={listing.total} search={state} />
          </>
        ) : showCatalog && categoryInquiry ? (
          <InquiryCard item={categoryInquiry} state={state} plate={plate.plateNumber} />
        ) : showCatalog ? (
          <div className="rounded-xl border border-line bg-card p-7 text-center">
            <h2 className="mb-2 text-lg font-semibold">לא מצאנו התאמה בקטלוג</h2>
            <p className="mb-4 text-muted">
              {state.q ? `לא מצאנו תוצאות ל«${state.q}». ` : ""}
              שלחו לנו מק״ט או תמונה בוואטסאפ — נעזור למצוא את החלק.
            </p>
            <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
              <a href={`https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(state.q ? `שלום, חיפשתי "${state.q}" באתר ולא מצאתי` : "שלום, לא מצאתי את החלק באתר")}`} target="_blank" rel="noopener noreferrer">
                <Button variant="accent">שלחו לנו בוואטסאפ</Button>
              </a>
              <Link to="/help">
                <Button variant="ghost">לא מצאת? דברו איתנו</Button>
              </Link>
            </div>
          </div>
        ) : null}
        {/* On the compact vehicle layout the notice sits below the products. */}
        {compactVehicle ? <DemoBanner className="mt-6" /> : null}
      </div>
    </>
  );
}

function usePlateSession(state: ResultsSearch) {
  const [entry, setEntry] = useState<StoredPlateVehicle | null>(null);
  useEffect(() => {
    setEntry(readPlateSession());
  }, [state.make, state.model, state.year, state.category, state.q]);
  const mappedMatch = Boolean(
    entry &&
      isMappedPlateResult(entry.result) &&
      entry.result.ok &&
      entry.result.found &&
      entry.result.vehicle.mapping.make === state.make &&
      entry.result.vehicle.mapping.model === state.model &&
      (!entry.result.vehicle.mapping.year || entry.result.vehicle.mapping.year === state.year),
  );
  const userChoseVehicle = Boolean(state.make && state.model);
  // Hide the catalog for an unmapped/failed plate lookup, unless the user picked a vehicle manually.
  const allowCatalog = !entry || mappedMatch || userChoseVehicle;
  return {
    entry,
    /** The stored plate vehicle is exactly the vehicle in the URL (mapped, found). */
    mapped: mappedMatch,
    showCatalog: allowCatalog,
    /** Plate only when it identified exactly this vehicle. */
    plateNumber: mappedMatch && entry ? entry.plate : undefined,
    clear: () => {
      clearIdentifiedVehicle();
      setEntry(null);
    },
    /** Re-read after a manual "נסו שוב" that did not change the URL. */
    refresh: () => setEntry(readPlateSession()),
  };
}

function ResultsPlateBlock({
  tiles,
  state,
  entry,
  onClear,
  onRefresh,
}: {
  tiles: import("@/lib/category-tiles").CategoryTile[];
  state: ResultsSearch;
  entry: StoredPlateVehicle | null;
  onClear: () => void;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const [retrying, setRetrying] = useState(false);
  if (!entry) return null;
  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const result = await fetchVehicleByPlate(entry.plate);
      await applyPlateLookup({
        plate: entry.plate,
        result,
        path: "/results",
        search: state,
        navigate: navigate as never,
      });
    } finally {
      setRetrying(false);
      onRefresh();
    }
  };
  const mapped =
    isMappedPlateResult(entry.result) &&
    entry.result.ok &&
    entry.result.found &&
    entry.result.vehicle.mapping.make === state.make &&
    entry.result.vehicle.mapping.model === state.model &&
    (!entry.result.vehicle.mapping.year || entry.result.vehicle.mapping.year === state.year);
  return (
    <div className="mb-4">
      <PlateVehicleCard
        plate={entry.plate}
        result={entry.result}
        tiles={mapped ? tiles : []}
        onClear={onClear}
        onRetry={retry}
        retrying={retrying}
      />
    </div>
  );
}
