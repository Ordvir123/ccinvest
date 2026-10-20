import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { useTranslation } from "react-i18next";
import type { PublishedCard } from "@/lib/pages";
import { responsiveProps } from "@/lib/responsive-image";

const FROM: Record<string, string> = { fr: "À partir de", he: "החל מ־", en: "From" };

/** Public project card (ported design), adapted to the `pages` data model. */
export function ProjectCard({ project }: { project: PublishedCard }) {
  const { i18n } = useTranslation();
  const from = FROM[i18n.language?.slice(0, 2)] ?? FROM.fr;
  return (
    <Link
      to="/$slug"
      params={{ slug: project.slug }}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-3xl bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant active:scale-[0.99]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {project.cover ? (
          <img
            src={project.cover}
            {...responsiveProps(project.cover, "(min-width: 768px) 33vw, 100vw")}
            alt={project.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted to-accent" />
        )}
      </div>
      <div className="p-5">
        {project.location && (
          <p className="text-sm text-muted-foreground">
            {project.location}
          </p>
        )}
        <h3 className="mt-1 line-clamp-1 font-display text-2xl font-semibold tracking-tight">{project.title}</h3>
        <div className="mt-3 flex items-center justify-between">
          {project.priceFrom ? (
            <p className="font-display text-2xl font-semibold text-primary">
              {project.priceIsFrom && (
                <span className="me-1.5 block font-sans text-xs font-normal text-muted-foreground">
                  {from}
                </span>
              )}
              <span dir="ltr" className="inline-block">{project.priceFrom}</span>
            </p>
          ) : (
            <span />
          )}
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary transition-colors group-hover:bg-cta group-hover:text-cta-foreground"><ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100" /></span>
        </div>
      </div>
    </Link>
  );
}
