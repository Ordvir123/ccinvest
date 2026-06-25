import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

/** Branded public site footer (ported design). */
export function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 bg-primary text-primary-foreground">
      <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-cta font-display text-lg font-bold text-cta-foreground">
              CC
            </div>
            <span className="font-display text-lg">CC Invest</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-primary-foreground/70">
            {t("public.about.body")}
          </p>
        </div>

        <div>
          <h4 className="mb-3 font-display text-sm uppercase tracking-wider">
            {t("nav.home")}
          </h4>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li>
              <Link to="/" className="hover:text-cta">
                {t("nav.home")}
              </Link>
            </li>
            <li>
              <Link to="/appartements" className="hover:text-cta">
                {t("nav.properties")}
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-cta">
                {t("nav.about")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-display text-sm uppercase tracking-wider">
            {t("nav.contact")}
          </h4>
          <p className="text-sm text-primary-foreground/80">Tel Aviv-Yafo, Israel</p>
          <a
            href="mailto:contact@ccinvest.co.il"
            className="text-sm text-primary-foreground/80 hover:text-cta"
          >
            contact@ccinvest.co.il
          </a>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10">
        <div className="container mx-auto flex justify-between px-4 py-4 text-xs text-primary-foreground/60">
          <span>© {year} CC Invest</span>
          <span>{t("footer.rights")}</span>
        </div>
      </div>
    </footer>
  );
}
