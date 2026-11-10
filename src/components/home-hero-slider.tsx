import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { homeHeroSlides } from "@/lib/home-hero";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  ember: "from-[#1a0a06]/75 via-[#e23b12]/35 to-[#1a0a06]/80",
  ink: "from-[#0b0b0b]/80 via-[#333]/30 to-[#0b0b0b]/85",
  warm: "from-[#3b1508]/80 via-[#c2410c]/40 to-[#1a0a06]/85",
};

function parseHref(href: string): { to: string; search?: Record<string, string> } {
  if (href.startsWith("/results?")) {
    const q = new URLSearchParams(href.slice("/results?".length));
    const search: Record<string, string> = {};
    q.forEach((v, k) => {
      search[k] = v;
    });
    return { to: "/results", search };
  }
  return { to: href };
}

/** CSS scroll-snap hero with touch drag, dots, autoplay, text fade-in. */
export function HomeHeroSlider() {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = usePrefersReducedMotion();

  // RTL-safe: in an RTL scroller scrollLeft runs 0 → negative, so derive the
  // slide from |scrollLeft| / width and scroll with the matching sign.
  const go = useCallback((i: number) => {
    const el = scroller.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const left = i * el.clientWidth * (rtl ? -1 : 1);
    el.scrollTo({ left, behavior: reduceMotion ? "auto" : "smooth" });
    setIndex(i);
  }, [reduceMotion]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const count = el.querySelectorAll("[data-hero-slide]").length;
        if (!count || !el.clientWidth) return;
        const best = Math.min(count - 1, Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
        setIndex(best);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion || homeHeroSlides.length < 2) return;
    const id = window.setInterval(() => {
      const el = scroller.current;
      if (!el || !el.clientWidth) return;
      const cur = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
      go((cur + 1) % homeHeroSlides.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, [paused, reduceMotion, go]);

  return (
    <section
      className="relative"
      aria-roledescription="קרוסלה"
      aria-label="באנרים"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={scroller}
        className="home-hero-scroller flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth"
        dir="rtl"
      >
        {homeHeroSlides.map((slide, i) => {
          const link = parseHref(slide.href);
          return (
            <article
              key={slide.id}
              data-hero-slide
              className="relative w-full min-w-full shrink-0 snap-center snap-always"
              aria-hidden={i !== index}
              inert={i !== index}
            >
              <div className="relative aspect-[5/4] max-h-[380px] w-full overflow-hidden bg-elevated md:aspect-[21/8] md:max-h-[360px]">
                {slide.image ? (
                  <img
                    src={slide.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-contain object-center p-6 md:object-cover md:p-0"
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                ) : null}
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-t",
                    TONE[slide.tone] || TONE.ember,
                  )}
                  aria-hidden
                />
                <div
                  className={cn(
                    "absolute inset-x-0 bottom-0 z-[1] space-y-2 px-5 pb-10 pt-16 text-white md:px-10 md:pb-12",
                    i === index && !reduceMotion ? "home-hero-copy-in" : "",
                  )}
                >
                  <h2 className="text-[26px] leading-tight font-black tracking-tight md:text-4xl">
                    {slide.title}
                  </h2>
                  <p className="max-w-xl text-sm text-white/90 md:text-base">{slide.subtitle}</p>
                  {link.to === "/results" ? (
                    <Link
                      to="/results"
                      search={link.search || {}}
                      className="sq-btn mt-2 inline-flex bg-accent px-4 py-2.5 text-sm font-extrabold text-on-accent shadow-ember hover:bg-accent-hot"
                    >
                      {slide.ctaLabel}
                    </Link>
                  ) : (
                    <Link
                      to="/help"
                      className="sq-btn mt-2 inline-flex bg-accent px-4 py-2.5 text-sm font-extrabold text-on-accent shadow-ember hover:bg-accent-hot"
                    >
                      {slide.ctaLabel}
                    </Link>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="absolute inset-x-0 bottom-3 z-[2] flex justify-center gap-1.5">
        {homeHeroSlides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`שקופית ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => go(i)}
            className={cn(
              "h-2 rounded-full transition-[width,background-color] duration-300",
              i === index ? "w-6 bg-accent" : "w-2 bg-white/70 hover:bg-white",
            )}
          />
        ))}
      </div>
    </section>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
