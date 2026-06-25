import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/** Branded public site header: logo + nav + language switcher (ported design). */
export function SiteHeader() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const items = [
    { to: "/", label: t("nav.home") },
    { to: "/appartements", label: t("nav.properties") },
    { to: "/about", label: t("nav.about") },
  ] as const;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary font-display text-lg font-bold text-primary-foreground">
            CC
          </div>
          <span className="hidden font-display text-lg tracking-tight sm:inline">
            CC Invest
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors hover:text-primary",
                pathname === item.to ? "text-primary" : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/40 bg-background md:hidden">
          <nav className="container mx-auto flex flex-col px-4 py-2">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "border-b border-border/40 py-3 text-sm font-medium last:border-0",
                  pathname === item.to ? "text-primary" : "text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
