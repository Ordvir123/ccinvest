import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Phone-only bar that slides up once the hero has scrolled away: price on one
 * side, the page's own contact button on the other. Hidden again near the form.
 */
export function StickyContactBar({
  price,
  ctaLabel,
}: {
  price?: string;
  ctaLabel?: string;
}) {
  const [pastHero, setPastHero] = useState(false);
  const [atContact, setAtContact] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("page-hero");
    const contact = document.getElementById("contact");
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) setPastHero(!e.isIntersecting);
        if (e.target === contact) setAtContact(e.isIntersecting);
      }
    });
    setMounted(true);
    if (hero) io.observe(hero);
    if (contact) io.observe(contact);
    return () => io.disconnect();
  }, []);

  const visible = pastHero && !atContact && !!ctaLabel;
  // Lets the WhatsApp button step up above the bar (see WhatsAppButton).
  useEffect(() => {
    document.documentElement.classList.toggle("contact-bar-on", visible);
    return () => document.documentElement.classList.remove("contact-bar-on");
  }, [visible]);

  // Not inside the admin editor preview.
  if (!mounted || window.location.pathname.startsWith("/admin")) return null;
  // Portal: the hero is its own stacking context, the bar must sit above the whole page.
  return createPortal(
    <div
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-lg transition-transform duration-500 ease-out md:hidden",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {price ? (
          <span dir="ltr" className="font-display text-lg font-semibold text-ink">
            {price}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          tabIndex={visible ? 0 : -1}
          onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
          className="h-11 rounded-full bg-cta px-6 text-sm font-medium text-cta-foreground shadow-sm transition-transform active:scale-95"
        >
          {ctaLabel}
        </button>
      </div>
    </div>,
    document.body,
  );
}
