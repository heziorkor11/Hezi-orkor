import { BulkPacksPage } from "@/components/bulk-packs-page";
import { subcategories, normalizeDisplayCategory } from "@/lib/display-taxonomy";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ActiveFilters } from "@/components/active-filters";
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
    loadListing(
      deps.category === "workshop-packs"
        ? {
            ...deps,
            make: undefined,
            model: undefined,
            year: undefined,
            type: undefined,
            fluidKind: undefined,
            oilBrand: undefined,
          }
        : deps,
    ),
  pendingComponent: PendingResults,
  head: ({ match }) => {
    const s = match.search;
    const kindLabel =
      s.fluidKind && FLUID_KIND_LABELS[s.fluidKind as FluidKind]
        ? FLUID_KIND_LABELS[s.fluidKind as FluidKind]
        : undefined;
    const topic = s.q
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
          content: pageDescription(`${topic} בחזי אורקור, נהריה. סינון לפי סוג שמן, מותג ומק״ט.`),
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
  if (state.category === "workshop-packs") return <BulkPacksPage listing={listing} state={state} />;
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
        ) : null}
        {state.category && state.category !== "fluids" && subcategories[state.category] ? (
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
    </>
  );
}
