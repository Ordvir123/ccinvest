import { Link } from "@tanstack/react-router";

const LOGO = "/brand/cc-invest-logo.png";

/** Branded public site header: logo + minimal nav. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={LOGO}
            alt="CC Invest"
            className="h-9 w-auto md:h-10"
            loading="eager"
          />
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            to="/"
            className="eyebrow text-xs text-foreground/80 transition-colors hover:text-primary"
          >
            Projects
          </Link>
        </nav>
      </div>
    </header>
  );
}
