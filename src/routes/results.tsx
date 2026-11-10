import { normalizeDisplayCategory } from "@/lib/display-taxonomy";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ActiveFilters } from "@/components/active-filters";
import { FilterSheet } from "@/components/filter-sheet";
import { ResultsCategoryRail } from "@/components/results-category-rail";
import { DemoBanner } from "@/components/demo-banner";
import { Finder } from "@/components/finder";
import { FluidsFilters } from "@/components/fluids-filters";
import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { categoryName, loadListing, type ListingSearch } from "@/lib/catalog";
import { FLUID_KIND_LABELS, type FluidKind } from "@/lib/fluid-classify";
import { pageDescription, pageTitle } from "@/lib/seo";

export type ResultsSearch = ListingSearch;

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 1 ? Math.floor(n) : undefined;
}

export const Route = createFileRoute("/results")({
  beforeLoad: ({ search }) => {
    const category = normalizeDisplayCategory(
      typeof search.category === "string" && search.category.length > 0 ? search.category : undefined,
    );
    // Removed storefront category כללי — old bookmarks go home, no crash.
    if (category === "general") throw redirect({ to: "/" });
  },
  validateSearch: (search: Record<string, unknown>): ResultsSearch => ({
    type: str(search.type),
    make: str(search.make),
    model: str(search.model),
    year: str(search.year),
    q: str(search.q),
    category: normalizeDisplayCategory(str(search.category)),
    sub: str(search.sub),
    fluidKind: str(search.fluidKind),
    oilBrand: str(search.oilBrand),
    page: num(search.page),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    deps.category && !categoryName(deps.category)
      ? { items: [], total: 0, page: 1, pages: 0 }
      : loadListing(deps),
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
      {!isFluids ? (
        <section
          className="flex justify-center border-b border-line bg-panel px-3.5 py-5 md:px-5 md:py-7"
          id="search"
        >
          <Finder key={JSON.stringify({ ...state, page: undefined })} state={state} />
        </section>
      ) : null}
      <div className="mx-auto max-w-[1180px] px-5 pt-7 pb-16">
        <DemoBanner />
        <div className="mb-4.5">
          <h1 className="text-[26px] tracking-tight">{title}</h1>
          <p className="text-muted">
            {listing.total} פריטים
            {listing.pages > 1 ? ` · עמוד ${listing.page} מתוך ${listing.pages}` : ""}
          </p>
        </div>
        {isFluids ? (
          <FluidsFilters state={{ ...state, category: state.category || "fluids" }} />
        ) : (
          <ResultsCategoryRail state={state} />
        )}
        <ActiveFilters state={state} />
        {listing.items.length ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
              {listing.items.map((p) => (
                <ProductCard key={p.id} product={p} filter={state} />
              ))}
            </div>
            <Pagination page={listing.page} total={listing.total} search={state} />
          </>
        ) : state.category === "lights" ? (
          <section className="rounded-xl border border-line bg-card p-7 text-center">
            <h2 className="mb-2 text-lg font-semibold">פנסים ראשיים אינם מוצגים כרגע באתר</h2>
            <p className="mb-4 text-muted">
              לפנייה לגבי פנס ראשי שלחו מק״ט או מספר רכב לחנות. אין כאן מוצרים מקטגוריית רדיאטורים.
            </p>
            <Link to="/help">
              <Button>דברו איתנו</Button>
            </Link>
          </section>
        ) : (
          <div className="rounded-xl border border-line bg-card p-7 text-center">
            <h2 className="mb-2 text-lg font-semibold">לא מצאנו התאמה בקטלוג</h2>
            <p className="mb-4 text-muted">שלחו לנו מק״ט או תמונה בוואטסאפ — נאתר את השמן.</p>
            <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
              <Link to="/results" search={{ category: "fluids" }}>
                <Button variant="ghost">כל השמנים</Button>
              </Link>
              <Link to="/help">
                <Button variant="accent">לא מצאת? דברו איתנו</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
      <FilterSheet state={state} total={listing.total} />
    </>
  );
}
