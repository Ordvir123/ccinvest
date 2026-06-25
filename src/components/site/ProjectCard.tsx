import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import type { PublishedCard } from "@/lib/pages";

/** Public project card (ported design), adapted to the `pages` data model. */
export function ProjectCard({ project }: { project: PublishedCard }) {
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
            <p className="font-display text-2xl text-primary">{project.priceFrom}</p>
          ) : (
            <span />
          )}
          <ArrowUpRight className="h-5 w-5 text-cta transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </Link>
  );
}
