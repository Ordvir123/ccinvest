import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageEditor } from "@/components/admin/PageEditor";
import { fetchPageById } from "@/lib/pages";

export const Route = createFileRoute("/_admin/admin/pages/$id")({
  component: EditPage,
});

function EditPage() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-page", id],
    queryFn: () => fetchPageById(id),
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl text-foreground">Page not found</h1>
        <p className="text-muted-foreground">It may have been deleted.</p>
      </div>
    );
  }

  return <PageEditor initialPage={data} />;
}
