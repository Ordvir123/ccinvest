import { createFileRoute } from "@tanstack/react-router";

import { Section } from "@/components/ui/section";

export const Route = createFileRoute("/$slug")({
  head: () => ({
    meta: [{ title: "Project — CC Invest" }],
  }),
  component: ProjectPage,
});

// SLICE 0: public page renderer is intentionally a stub.
function ProjectPage() {
  const { slug } = Route.useParams();

  return (
    <main className="min-h-screen bg-background">
      <Section className="flex min-h-screen flex-col items-center justify-center text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-accent">
          CC Invest
        </p>
        <h1 className="text-4xl text-foreground md:text-5xl">Project page</h1>
        <p className="mt-4 font-mono text-sm text-muted-foreground">/{slug}</p>
        <p className="mt-6 max-w-md text-muted-foreground">
          Public page renderer stub. Content rendering arrives in a later slice.
        </p>
      </Section>
    </main>
  );
}
