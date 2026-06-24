import { createFileRoute, Link } from "@tanstack/react-router";

import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CC Invest — Real Estate" },
      { name: "description", content: "CC Invest real estate project pages." },
      { property: "og:title", content: "CC Invest — Real Estate" },
      { property: "og:description", content: "CC Invest real estate project pages." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Section className="flex min-h-screen flex-col items-center justify-center text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-accent">
          CC Invest
        </p>
        <h1 className="max-w-2xl text-balance text-5xl text-foreground md:text-6xl">
          Real Estate Landing Page Builder
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Public site placeholder. Project pages will be rendered here in a later slice.
        </p>
        <div className="mt-10">
          <Button asChild variant="default">
            <Link to="/admin">Admin area</Link>
          </Button>
        </div>
      </Section>
    </main>
  );
}
