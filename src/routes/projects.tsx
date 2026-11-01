import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { ListingBrowser, validateListingSearch, type ListingSearch } from "@/components/site/ListingBrowser";
import { Skeleton } from "@/components/ui/skeleton";
import { listPublishedPages } from "@/lib/pages";

export const Route = createFileRoute("/projects")({
  validateSearch: validateListingSearch,
  head: () => ({
    meta: [
      { title: "Projets — CC Invest" },
      {
        name: "description",
        content: "Découvrez tous nos projets immobiliers à Tel Aviv.",
      },
      { property: "og:title", content: "Projets — CC Invest" },
      {
        property: "og:description",
        content: "Découvrez tous nos projets immobiliers à Tel Aviv.",
      },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const setSearch = useCallback(
    (next: ListingSearch) => navigate({ search: next, replace: true, resetScroll: false }),
    [navigate],
  );
  const { data, isLoading } = useQuery({
    queryKey: ["published-pages", "project"],
    queryFn: () => listPublishedPages("project"),
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto flex-1 px-5 py-10 md:px-10 md:py-16">
        <h1 className="animate-rise mb-2 font-display text-[2.6rem] leading-[1.02] md:text-6xl">
          {t("public.projects.title")}
        </h1>
        <p className="mb-8 text-muted-foreground md:mb-10">
          {t("public.projects.subtitle")}
        </p>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-80 w-full rounded-3xl" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">
            {t("public.projects.empty")}
          </p>
        ) : (
          <ListingBrowser items={data} search={search} onSearchChange={setSearch} />
        )}
      </main>
      <SiteFooter />
      <WhatsAppButton />
    </div>
  );
}
