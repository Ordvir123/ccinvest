import { useEffect } from "react";

/**
 * Photos marked with `data-reveal` open like shutters when they scroll into view
 * (styles in styles.css). The hidden start state only applies once this hook
 * has run, so server-rendered HTML and no-JS visitors always see every photo.
 */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    const root = document.documentElement;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // In view, or already scrolled past (jump links): show it.
          if (e.isIntersecting || e.boundingClientRect.top < 0) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    const watch = () =>
      document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => io.observe(el));
    watch();
    root.classList.add("reveal-ready");
    // Sections that render later (gallery layouts, translations) get picked up too.
    let queued = 0;
    const mo = new MutationObserver(() => {
      if (!queued) queued = requestAnimationFrame(() => ((queued = 0), watch()));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(queued);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
