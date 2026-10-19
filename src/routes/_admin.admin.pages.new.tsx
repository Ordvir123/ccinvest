import { createFileRoute } from "@tanstack/react-router";
import { PageEditor } from "@/components/admin/PageEditor";

/**
 * New page = an empty editor. Pages are normally created by Claude in Sarah's
 * project (see docs/claude-project); this screen is the manual fallback.
 */
export const Route = createFileRoute("/_admin/admin/pages/new")({
  component: () => <PageEditor initialSourceLang="fr" />,
});
