import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Section } from "@/components/ui/section";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { listPublishedPages } from "@/lib/pages";

const LOGO = "/brand/cc-invest-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CC Invest — Premium Real Estate" },
      {
        name: "description",
        content: "Discover CC Invest's curated real estate projects.",
      },
      { property: "og:title", content: "CC Invest — Premium Real Estate" },
      {
        property: "og:description",
        content: "Discover CC Invest's curated real estate projects.",
      },
      { property: "og:url", content: "https://ccinvest.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://ccinvest.lovable.app/" }],
  }),
  component: Home,
});

function Home() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["published-pages"],
    queryFn: listPublishedPages,
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Branded landing intro */}
        <section className="bg-gradient-brand text-primary-foreground">
          <Section className="flex flex-col items-center py-24 text-center md:py-32">
            <img
              src={LOGO}
              alt="CC Invest"
              className="mb-10 h-16 w-auto rounded bg-card px-5 py-3 shadow-sm md:h-20"
            />
            <p className="eyebrow mb-5 text-xs text-primary-foreground/70">
              CC Invest
            </p>
            <h1 className="max-w-3xl text-balance text-4xl text-primary-foreground md:text-6xl">
              Exceptional addresses, thoughtfully selected
            </h1>
            <p className="mt-6 max-w-xl text-lg text-primary-foreground/80">
              A curated portfolio of premium real estate projects.
            </p>
          </Section>
        </section>

        {/* Published projects grid */}
        <Section className="py-16 md:py-24">
          <div className="mb-12 text-center">
            <p className="eyebrow mb-3 text-xs text-primary">Portfolio</p>
            <h2 className="text-3xl text-ink md:text-4xl">Our projects</h2>
            <hr className="hairline mx-auto mt-6 w-16" />
          </div>

          {isLoading ? (
            <p className="text-center text-muted-foreground">Loading…</p>
          ) : !projects || projects.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No published projects yet.
            </p>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Link
                  key={p.slug}
                  to="/$slug"
                  params={{ slug: p.slug }}
                  className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-secondary">
                    {p.cover ? (
                      <img
                        src={p.cover}
                        alt={p.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <img src={LOGO} alt="" className="h-10 w-auto opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-2xl text-ink">{p.title}</h3>
                    {p.location && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {p.location}
                      </p>
                    )}
                    {p.priceFrom && (
                      <p className="mt-4 text-lg font-semibold text-primary">
                        {p.priceFrom}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
}
