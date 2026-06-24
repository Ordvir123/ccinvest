import { createFileRoute } from "@tanstack/react-router";

import { PageEditor } from "@/components/admin/PageEditor";

export const Route = createFileRoute("/_admin/admin/pages/new")({
  component: () => <PageEditor />,
});
