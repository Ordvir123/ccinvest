import { cn } from "@/lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: "section" | "div" | "main";
}

/** Reusable layout wrapper built from design tokens. */
export function Section({ as: Tag = "section", className, children, ...props }: SectionProps) {
  return (
    <Tag className={cn("w-full px-5 py-14 md:px-10 md:py-24", className)} {...props}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </Tag>
  );
}
