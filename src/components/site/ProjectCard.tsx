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
      className="group block overflow-hidden rounded-lg bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-elegant"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {project.cover ? (
          <img
            src={project.cover}
            {...responsiveProps(project.cover, "(min-width: 768px) 33vw, 100vw")}
            alt={project.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted to-accent" />
        )}
      </div>
      <div className="p-5">
        {project.location && (
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {project.location}
          </p>
        )}
        <h3 className="mt-1 line-clamp-1 font-display text-xl">{project.title}</h3>
        <div className="mt-3 flex items-center justify-between">
          {project.priceFrom ? (
            <p className="font-display text-2xl text-primary">
              {project.priceIsFrom && (
                <span className="me-1.5 block font-sans text-xs uppercase tracking-wider text-muted-foreground">
                  {from}
                </span>
              )}
              <span dir="ltr" className="inline-block">{project.priceFrom}</span>
            </p>
          ) : (
            <span />
          )}
          <ArrowUpRight className="h-5 w-5 text-cta transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </Link>
  );
}
