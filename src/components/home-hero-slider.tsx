import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { currentHomeHeroSlides, fallbackHelpSlide, hrefForSlide, type HomeHeroSlide } from "@/lib/home-hero";
import {
  countdownToIsraelEnd,
  formatCountdownHe,
  slideShowsTimer,
  timerPositionOf,
  visibleHeroSlides,
} from "@/lib/home-hero-schedule";
import { useCatalogOverlayRev } from "@/components/catalog-overlay-sync";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  ember: "from-[#1a0a06]/75 via-[#e23b12]/35 to-[#1a0a06]/80",
  ink: "from-[#0b0b0b]/80 via-[#333]/30 to-[#0b0b0b]/85",
  warm: "from-[#3b1508]/80 via-[#c2410c]/40 to-[#1a0a06]/85",
};

function parseHref(href: string): { kind: "results" | "internal" | "external"; to?: string; search?: Record<string, string> } {
  if (href.startsWith("http://") || href.startsWith("https://")) return { kind: "external", to: href };
  if (href.startsWith("/results?")) {
    const q = new URLSearchParams(href.slice("/results?".length));
    const search: Record<string, string> = {};
    q.forEach((v, k) => {
      search[k] = v;
    });
    return { kind: "results", to: "/results", search };
  }
  return { kind: "internal", to: href || "/" };
}

function Cta({ href, label }: { href: string; label: string }) {
  const link = parseHref(href);
  const className =
    "sq-btn mt-2 inline-flex bg-accent px-4 py-2.5 text-sm font-extrabold text-on-accent shadow-ember hover:bg-accent-hot";
  if (link.kind === "external" && link.to) {
    return (
      <a href={link.to} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    );
  }
  if (link.kind === "results") {
    return (
      <Link to="/results" search={link.search || {}} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <Link to={link.to || "/"} className={className}>
      {label}
    </Link>
  );
}

function Countdown({ endDate, now }: { endDate: string; now: Date }) {
  const parts = countdownToIsraelEnd(endDate, now);
  if (parts.expired) return null;
  return (
    <div className="hero-timer" aria-live="polite" suppressHydrationWarning>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 1.5" />
        <path d="M9 3h6" />
      </svg>
      <span>
        נשארו <span className="hero-timer-unit">{parts.days} ימים</span>{" "}
        <span className="hero-timer-clock">{formatCountdownHe(parts).split(" ").at(-1)}</span>
      </span>
    </div>
  );
}

function SlideCopy({ slide, now, reduceMotion, active }: { slide: HomeHeroSlide; now: Date; reduceMotion: boolean; active: boolean }) {
  const href = hrefForSlide(slide);
  const showTimer = slideShowsTimer(slide, now) && slide.endDate;
  const pos = timerPositionOf(slide);
  return (
    <div className={cn("absolute inset-x-0 bottom-0 z-[1] space-y-2 px-5 pb-10 pt-16 text-white md:px-10 md:pb-12", active && !reduceMotion ? "home-hero-copy-in" : "")}>
      <h2 className="text-[26px] leading-tight font-black tracking-tight md:text-4xl">{slide.title}</h2>
      <p className="max-w-xl text-sm text-white/90 md:text-base">{slide.subtitle}</p>
      {showTimer && pos === "button" ? (
        <div className="hero-cta-row">
          <Cta href={href} label={slide.ctaLabel} />
          <Countdown endDate={slide.endDate!} now={now} />
        </div>
      ) : (
        <Cta href={href} label={slide.ctaLabel} />
      )}
      {showTimer && pos === "bottom" ? (
        <div className="hero-timer-below">
          <Countdown endDate={slide.endDate!} now={now} />
        </div>
      ) : null}
    </div>
  );
}

/** CSS scroll-snap hero with touch drag, dots, autoplay, optional sale countdown. */
export function HomeHeroSlider() {
  const overlayRev = useCatalogOverlayRev();
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const slides = visibleHeroSlides(currentHomeHeroSlides(), now, fallbackHelpSlide);
  void overlayRev;

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

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
  }, [slides.length]);

  useEffect(() => {
    if (paused || reduceMotion || slides.length < 2) return;
    const id = window.setInterval(() => {
      const el = scroller.current;
      if (!el || !el.clientWidth) return;
      const cur = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
      go((cur + 1) % slides.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, [paused, reduceMotion, go, slides.length]);

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
        {slides.map((slide, i) => {
          const showTop = slideShowsTimer(slide, now) && timerPositionOf(slide) === "top" && slide.endDate;
          return (
            <article
              key={slide.id}
              data-hero-slide
              className="relative w-full min-w-full shrink-0 snap-center snap-always"
              aria-hidden={i !== index}
              inert={i !== index}
            >
              <div className={cn("relative aspect-[5/4] max-h-[380px] w-full overflow-hidden bg-elevated md:aspect-[21/8] md:max-h-[360px]", showTop || (slideShowsTimer(slide, now) && timerPositionOf(slide) === "bottom") ? "hero-frame-timer" : "")}>
                {slide.image ? (
                  <img
                    src={slide.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-contain object-center p-6 md:object-cover md:p-0"
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                ) : null}
                <div className={cn("absolute inset-0 bg-gradient-to-t", TONE[slide.tone] || TONE.ember)} aria-hidden />
                {showTop ? (
                  <div className="hero-timer-top">
                    <Countdown endDate={slide.endDate!} now={now} />
                  </div>
                ) : null}
                <SlideCopy slide={slide} now={now} reduceMotion={reduceMotion} active={i === index} />
              </div>
            </article>
          );
        })}
      </div>
      {slides.length > 1 ? (
        <div className="absolute inset-x-0 bottom-3 z-[2] flex justify-center gap-1.5">
          {slides.map((s, i) => (
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
      ) : null}
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
