import { subcategories, normalizeDisplayCategory, isHiddenCategory } from "@/lib/display-taxonomy";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ActiveFilters } from "@/components/active-filters";
import { ListingSortControl } from "@/components/listing-sort-control";
import { CategoryPhotoTiles } from "@/components/category-photo-tiles";
import { DemoBanner } from "@/components/demo-banner";
import { Finder } from "@/components/finder";
import { FluidsFilters } from "@/components/fluids-filters";
import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { categoryName, loadCategoryTiles, loadListing, type ListingSearch } from "@/lib/catalog";
import { parseListingSort } from "@/lib/listing-sort";
import { canonicalMake } from "@/lib/search-intent";
import { brand } from "@/lib/brand";
import { FLUID_KIND_LABELS, type FluidKind } from "@/lib/fluid-classify";
import { pageDescription, pageTitle } from "@/lib/seo";
import { bootAdminOverlay } from "@/lib/admin/boot-overlay";

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
      return { items: [], total: 0, page: 1, pages: 0, tiles: [] };
    }
    const listing = await loadListing(deps);
    const tiles = await loadCategoryTiles(deps);
    return { ...listing, tiles };
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
  return (
    <>
      <div className="mx-auto max-w-[1180px] px-5 pt-7 pb-16">
        <DemoBanner />
        <div className="mb-4.5">
          <h1 className="text-[26px] tracking-tight">{title}</h1>
          <p className="text-muted">
            {listing.total} פריטים
            {listing.pages > 1 ? ` · עמוד ${listing.page} מתוך ${listing.pages}` : ""}
          </p>
        </div>
        <CategoryPhotoTiles tiles={listing.tiles || []} />
        {isFluids ? (
          <FluidsFilters state={{ ...state, category: state.category || "fluids" }} />
        ) : (
          <section
            className="mb-6 flex justify-center border border-line bg-panel px-3.5 py-5 md:px-5 md:py-7"
            id="search"
          >
            <Finder key={JSON.stringify({ ...state, page: undefined })} state={state} />
          </section>
        )}
        {!listing.tiles?.length && state.category && state.category !== "fluids" && subcategories[state.category] ? (
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
        <ActiveFilters state={state} />
        <ListingSortControl state={state} />
        {listing.items.length ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {listing.items.map((p) => (
                <ProductCard key={p.id} product={p} filter={state} />
              ))}
            </div>
            <Pagination page={listing.page} total={listing.total} search={state} />
          </>
        ) : (
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
        )}
      </div>
    </>
  );
}
