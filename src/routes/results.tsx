import { createFileRoute, Link } from "@tanstack/react-router";
import { ActiveFilters } from "@/components/active-filters";
import { DemoBanner } from "@/components/demo-banner";
import { Finder } from "@/components/finder";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { categoryName, filterProducts, type ListingSearch } from "@/lib/catalog";
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
    category: str(search.category),
    page: num(search.page),
  }),
  head: ({ match }) => {
    const s = match.search;
    const topic = s.q
      ? `חיפוש: ${s.q}`
      : s.category
        ? categoryName(s.category) || "קטגוריה"
        : "תוצאות חיפוש חלקים";
    return {
      meta: [
        { title: pageTitle(topic) },
        {
          name: "description",
          content: pageDescription(`${topic} בחזי אורקור, נהריה. סינון לפי יצרן, דגם, שנה ומק״ט.`),
        },
      ],
    };
  },
  component: ResultsPage,
});

function ResultsPage() {
  const state = Route.useSearch();
  const list = filterProducts(state);
  const page = state.page ?? 1;
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const title = state.q
    ? `חיפוש: ${state.q}`
    : state.category
      ? categoryName(state.category) || "קטגוריה"
      : "תוצאות לפי הרכב";

  return (
    <>
      <section className="flex justify-center bg-panel px-5 py-7">
        <Finder key={JSON.stringify({ ...state, page: undefined })} state={state} />
      </section>
      <div className="mx-auto max-w-[1180px] px-5 pt-7 pb-16">
        <DemoBanner />
        <div className="mb-4.5">
          <h1 className="text-[26px] tracking-tight">{title}</h1>
          <p className="text-muted">
            {list.length} חלקים תואמים
            {pages > 1 ? ` · עמוד ${current} מתוך ${pages}` : ""}
          </p>
        </div>
        <ActiveFilters state={state} />
        {list.length ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {slice.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            <Pagination page={current} total={list.length} search={state} />
          </>
        ) : (
          <div className="rounded-xl border border-line bg-card p-7 text-center">
            <h2 className="mb-2 text-lg font-semibold">לא מצאנו התאמה בקטלוג</h2>
            <p className="mb-4 text-muted">שלחו לנו מק״ט, תמונה או מספר רכב — נאתר את החלק.</p>
            <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
              <Link to="/results">
                <Button variant="ghost">נקה סינון</Button>
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
