import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { FileText, FilePlus2, Settings, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/use-auth";

export const Route = createFileRoute("/_admin")({
  // Supabase session lives in localStorage, so the guard runs client-side only.
  ssr: false,
  component: AdminLayout,
});

const navItems = [
  { to: "/admin", labelKey: "nav.pages", icon: FileText, exact: true },
  { to: "/admin/new", labelKey: "nav.newPage", icon: FilePlus2, exact: false },
  { to: "/admin/settings", labelKey: "nav.settings", icon: Settings, exact: false },
] as const;

function AdminLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        …
      </div>
    );
  }

  if (!user) {
    navigate({ to: "/admin/login", replace: true });
    return null;
  }

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  };

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="px-6 py-6">
          <span className="font-serif text-xl font-semibold">{t("app.name")}</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive(item.to, item.exact)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {t("nav.logout")}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border px-6">
          <span className="truncate text-sm text-muted-foreground">{user.email}</span>
          <LanguageSwitcher />
        </header>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
