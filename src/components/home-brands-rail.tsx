import { Link } from "@tanstack/react-router";
import { homeBrands } from "@/lib/home-brands";

/** Free-scroll brand chips (squircle buttons). */
export function HomeBrandsRail() {
  return (
    <section className="px-3.5 pt-10 md:px-5" aria-labelledby="home-brands-title">
      <div className="mx-auto max-w-[1180px]">
        <h2 id="home-brands-title" className="text-[18px] font-extrabold tracking-tight md:text-2xl">
          מותגים בקטלוג
        </h2>
        <span className="mt-1 block h-0.5 w-10 rounded-sm bg-accent" aria-hidden />
        <div
          className="home-h-scroll home-hero-scroller mt-3 gap-2.5 pb-1"
          role="list"
          aria-label="מותגים"
        >
          {homeBrands.map((b) => (
            <Link
              key={b}
              role="listitem"
              to="/results"
              search={{ q: b }}
              className="sq-btn grid h-14 min-w-[104px] shrink-0 place-items-center border border-line bg-card px-4 text-[15px] font-black tracking-wide text-fg-soft hover:border-accent hover:text-accent"
            >
              {b}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
