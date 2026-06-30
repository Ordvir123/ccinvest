import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ProjectCard } from "@/components/site/ProjectCard";
import { Skeleton } from "@/components/ui/skeleton";
import { listPublishedPages } from "@/lib/pages";

export const Route = createFileRoute("/appartements")({
  head: () => ({
    meta: [
      { title: "Appartements — CC Invest" },
      {
        name: "description",
        content: "Découvrez tous nos appartements à vendre à Tel Aviv.",
      },
    ],
  }),
  component: PropertiesPage,
});

function PropertiesPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["published-pages", "apartment"],
    queryFn: () => listPublishedPages("apartment"),
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto flex-1 px-4 py-16">
        <h1 className="mb-2 font-display text-4xl md:text-5xl">
          {t("public.properties.title")}
        </h1>
        <p className="mb-10 text-muted-foreground">
          {t("public.properties.subtitle")}
        </p>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">
            {t("public.properties.empty")}
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.map((p) => (
              <ProjectCard key={p.slug} project={p} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
