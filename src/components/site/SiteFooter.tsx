const LOGO = "/brand/cc-invest-logo.png";

/** Branded public site footer: logo, contact line, copyright. */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-12 text-center md:px-6">
        <img src={LOGO} alt="CC Invest" className="h-10 w-auto" loading="lazy" />
        <p className="text-sm text-muted-foreground">
          CC Invest —{" "}
          <a href="mailto:contact@ccinvest.co.il" className="hover:text-primary">
            contact@ccinvest.co.il
          </a>
        </p>
        <hr className="hairline w-16" />
        <p className="text-xs text-muted-foreground">
          © {year} CC Invest. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
